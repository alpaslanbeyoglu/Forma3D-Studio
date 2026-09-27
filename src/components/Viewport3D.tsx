import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CameraPresetView,
  LightingSettings,
  MaterialSettings,
  TransformSettings,
} from '../types/studio';
import { getProceduralSurfaceTexture } from '../utils/proceduralTextures';
import { Language, t } from '../utils/i18n';
import {
  Box,
  Compass,
  Eye,
  Grid,
  Maximize2,
  RotateCcw,
  Sparkles,
  Sun,
  Upload,
} from 'lucide-react';

interface Viewport3DProps {
  language: Language;
  modelGroup: THREE.Group | null;
  materialSettings: MaterialSettings;
  lightingSettings: LightingSettings;
  transformSettings: TransformSettings;
  onUpdateLighting: (partial: Partial<LightingSettings>) => void;
  onUpdateMaterial: (partial: Partial<MaterialSettings>) => void;
  onFileDrop: (file: File) => void;
  isLoading: boolean;
  loadingMessage: string;
  captureScreenshotRef: React.MutableRefObject<(() => void) | null>;
}

function sphericalToCartesian(
  azimuthDeg: number,
  elevationDeg: number,
  distance: number
): THREE.Vector3 {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const x = distance * Math.cos(el) * Math.sin(az);
  const y = distance * Math.sin(el);
  const z = distance * Math.cos(el) * Math.cos(az);
  return new THREE.Vector3(x, y, z);
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  language,
  modelGroup,
  materialSettings,
  lightingSettings,
  transformSettings,
  onUpdateLighting,
  onUpdateMaterial,
  onFileDrop,
  isLoading,
  loadingMessage,
  captureScreenshotRef,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelHolderRef = useRef<THREE.Group | null>(null);

  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  const lightHelpersGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const shadowPlaneRef = useRef<THREE.Mesh | null>(null);
  const sharedMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);

  // Camera smooth lerp target
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

  const [webglLost, setWebglLost] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [activeCameraPreset, setActiveCameraPreset] = useState<CameraPresetView>('perspective');

  const getPortraitDistanceFactor = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 1;
    const w = container.clientWidth || window.innerWidth || 430;
    const h = container.clientHeight || window.innerHeight || 740;
    const aspect = w / Math.max(h, 1);
    return aspect < 1 ? Math.min(1.55, 1 / Math.pow(Math.max(aspect, 0.35), 0.48)) : 1;
  }, []);

  // Initialize Three.js WebGL scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 640;
    const initAspect = width / Math.max(height, 1);
    const initDf =
      initAspect < 1 ? Math.min(1.55, 1 / Math.pow(Math.max(initAspect, 0.35), 0.48)) : 1;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightingSettings.backgroundColor);
    scene.fog = new THREE.FogExp2(lightingSettings.backgroundColor, 0.028);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, initAspect, 0.05, 250);
    camera.position.set(3.8 * initDf, 2.6 * initDf, 4.4 * initDf);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch {
      setWebglLost(true);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = lightingSettings.exposure;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const canvasEl = renderer.domElement;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const handleContextRestored = () => {
      setWebglLost(false);
    };
    canvasEl.addEventListener('webglcontextlost', handleContextLost, false);
    canvasEl.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Studio HDRI reflection environment via PMREMGenerator + RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.maxDistance = 30;
    controls.minDistance = 0.6;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Studio Grid & Axes
    const gridHelper = new THREE.GridHelper(16, 32, 0x334155, 0x1e293b);
    gridHelper.position.y = -1.6;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    const axesHelper = new THREE.AxesHelper(2.2);
    axesHelper.position.y = -1.59;
    axesHelper.visible = false;
    scene.add(axesHelper);
    axesHelperRef.current = axesHelper;

    // Shadow-Catcher Floor Plane
    const shadowPlaneGeo = new THREE.PlaneGeometry(30, 30);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.38 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.601;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);
    shadowPlaneRef.current = shadowPlane;

    // Three-Point Studio Lights + Ambient
    const ambientLight = new THREE.AmbientLight(0xe2e8f0, 0.45);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    const d = 4.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.radius = 3;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.35);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    const rimLight = new THREE.DirectionalLight(0xfde68a, 2.4);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    // Light Visual Helpers Group (Key, Fill, Rim indicators)
    const helpersGroup = new THREE.Group();
    helpersGroup.visible = false;
    scene.add(helpersGroup);
    lightHelpersGroupRef.current = helpersGroup;

    // Model Holder Group
    const modelHolder = new THREE.Group();
    scene.add(modelHolder);
    modelHolderRef.current = modelHolder;

    // Shared PBR Material
    const sharedMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(materialSettings.color),
      roughness: materialSettings.roughness,
      metalness: materialSettings.metalness,
      clearcoat: materialSettings.clearcoat,
      clearcoatRoughness: materialSettings.clearcoatRoughness,
      ior: materialSettings.ior,
      transmission: materialSettings.transmission,
      opacity: materialSettings.opacity,
      transparent: materialSettings.opacity < 0.99 || materialSettings.transmission > 0.01,
      side: THREE.DoubleSide,
    });
    sharedMaterialRef.current = sharedMat;

    // Animation loop
    let animFrameId = 0;
    const animate = () => {
      animFrameId = requestAnimationFrame(animate);

      if (targetCamPosRef.current && targetLookAtRef.current) {
        camera.position.lerp(targetCamPosRef.current, 0.12);
        controls.target.lerp(targetLookAtRef.current, 0.12);
        if (
          camera.position.distanceTo(targetCamPosRef.current) < 0.02 &&
          controls.target.distanceTo(targetLookAtRef.current) < 0.02
        ) {
          targetCamPosRef.current = null;
          targetLookAtRef.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && rendererRef.current && cameraRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      canvasEl.removeEventListener('webglcontextlost', handleContextLost);
      canvasEl.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      renderer.dispose();
      envTarget.dispose();
    };
  }, []);

  // Expose screenshot function
  useEffect(() => {
    captureScreenshotRef.current = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `forma3d_render_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
  }, [captureScreenshotRef]);

  // Mount / normalize modelGroup when changed
  useEffect(() => {
    const holder = modelHolderRef.current;
    const mat = sharedMaterialRef.current;
    if (!holder || !mat) return;

    holder.clear();
    if (!modelGroup) return;

    // Normalize model bounding box to fit comfortably in a 3.2-unit sphere centered at origin
    modelGroup.position.set(0, 0, 0);
    modelGroup.rotation.set(0, 0, 0);
    modelGroup.scale.set(1, 1, 1);
    modelGroup.updateMatrixWorld(true);

    const bbox = new THREE.Box3().setFromObject(modelGroup);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const normScale = 3.0 / maxDim;

    modelGroup.position.set(-center.x * normScale, -center.y * normScale, -center.z * normScale);
    modelGroup.scale.setScalar(normScale);

    modelGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!mesh.userData.originalMaterial && mesh.material) {
          mesh.userData.originalMaterial = Array.isArray(mesh.material)
            ? mesh.material.map((m) => m.clone())
            : mesh.material.clone();
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    holder.add(modelGroup);
  }, [modelGroup]);

  // Apply transform settings (scale, rotation, floor alignment)
  useEffect(() => {
    const holder = modelHolderRef.current;
    const grid = gridHelperRef.current;
    const shadowPlane = shadowPlaneRef.current;
    const axes = axesHelperRef.current;
    if (!holder) return;

    holder.scale.setScalar(transformSettings.scale);
    holder.rotation.set(
      THREE.MathUtils.degToRad(transformSettings.rotationX),
      THREE.MathUtils.degToRad(transformSettings.rotationY),
      THREE.MathUtils.degToRad(transformSettings.rotationZ)
    );
    holder.position.y = 0;
    holder.updateMatrixWorld(true);

    if (holder.children.length > 0) {
      const box = new THREE.Box3().setFromObject(holder);
      const minY = isFinite(box.min.y) ? box.min.y : -1.6;
      if (transformSettings.alignToFloor) {
        const floorY = -1.55;
        holder.position.y = floorY - minY;
        if (grid) grid.position.y = floorY;
        if (shadowPlane) shadowPlane.position.y = floorY - 0.002;
        if (axes) axes.position.y = floorY + 0.01;
      } else {
        if (grid) grid.position.y = Math.min(-1.6, minY - 0.05);
        if (shadowPlane) shadowPlane.position.y = Math.min(-1.6, minY - 0.052);
        if (axes) axes.position.y = Math.min(-1.59, minY - 0.04);
      }
    }
  }, [transformSettings, modelGroup]);

  // Sync MaterialSettings to Three.js Meshes (Original File Materials vs Custom Studio PBR)
  useEffect(() => {
    const mat = sharedMaterialRef.current;
    const holder = modelHolderRef.current;
    if (!mat || !holder) return;

    if (materialSettings.useOriginalMaterials) {
      holder.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          const orig = mesh.userData.originalMaterial;
          if (orig) {
            const applyOrigProps = (m: THREE.Material) => {
              const cloned = m.clone() as THREE.MeshStandardMaterial;
              if ('wireframe' in cloned) cloned.wireframe = materialSettings.wireframe;
              if ('flatShading' in cloned) cloned.flatShading = materialSettings.flatShading;
              if ('envMapIntensity' in cloned) {
                cloned.envMapIntensity = lightingSettings.envIntensity;
              }
              cloned.side = materialSettings.doubleSided
                ? THREE.DoubleSide
                : THREE.FrontSide;
              cloned.needsUpdate = true;
              return cloned;
            };

            mesh.material = Array.isArray(orig)
              ? orig.map(applyOrigProps)
              : applyOrigProps(orig);
          }
          mesh.geometry.computeVertexNormals();
        }
      });
      return;
    }

    mat.color.set(materialSettings.color);
    mat.roughness = materialSettings.roughness;
    mat.metalness = materialSettings.metalness;
    mat.clearcoat = materialSettings.clearcoat;
    mat.clearcoatRoughness = materialSettings.clearcoatRoughness;
    mat.ior = materialSettings.ior;
    mat.transmission = materialSettings.transmission;
    mat.thickness = materialSettings.transmission > 0 ? 1.2 : 0;
    mat.opacity = materialSettings.opacity;
    mat.transparent = materialSettings.opacity < 0.99 || materialSettings.transmission > 0.01;
    mat.emissive.set(materialSettings.emissiveColor);
    mat.emissiveIntensity = materialSettings.emissiveIntensity;
    mat.wireframe = materialSettings.wireframe;
    mat.flatShading = materialSettings.flatShading;
    mat.side = materialSettings.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
    mat.envMapIntensity = lightingSettings.envIntensity;

    const procTex = getProceduralSurfaceTexture(
      materialSettings.surfacePattern,
      materialSettings.patternScale
    );
    mat.bumpMap = procTex;
    mat.bumpScale = procTex ? materialSettings.bumpScale : 0;
    mat.roughnessMap = procTex;
    mat.needsUpdate = true;

    // Assign custom studio material and recompute normals if flatShading toggled
    holder.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.material = mat;
        mesh.geometry.computeVertexNormals();
      }
    });
  }, [modelGroup, materialSettings, lightingSettings.envIntensity]);

  // Sync LightingSettings to Three.js lights, helpers, and environment
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const controls = controlsRef.current;
    const keyLight = keyLightRef.current;
    const fillLight = fillLightRef.current;
    const rimLight = rimLightRef.current;
    const ambientLight = ambientLightRef.current;
    const helpersGroup = lightHelpersGroupRef.current;
    const grid = gridHelperRef.current;
    const axes = axesHelperRef.current;
    const shadowPlane = shadowPlaneRef.current;

    if (!scene || !renderer) return;

    scene.background = new THREE.Color(lightingSettings.backgroundColor);
    scene.fog = new THREE.FogExp2(lightingSettings.backgroundColor, 0.025);
    renderer.toneMappingExposure = lightingSettings.exposure;
    renderer.shadowMap.enabled = lightingSettings.shadowsEnabled;

    if (controls) {
      controls.autoRotate = lightingSettings.autoRotate;
      controls.autoRotateSpeed = lightingSettings.autoRotateSpeed;
    }

    if (grid) grid.visible = lightingSettings.showGrid;
    if (axes) axes.visible = lightingSettings.showAxes;
    if (shadowPlane) shadowPlane.visible = lightingSettings.shadowsEnabled;

    if (ambientLight) {
      ambientLight.color.set(lightingSettings.ambientColor);
      ambientLight.intensity = lightingSettings.ambientIntensity;
    }

    if (keyLight) {
      keyLight.visible = lightingSettings.keyLight.enabled;
      keyLight.color.set(lightingSettings.keyLight.color);
      keyLight.intensity = lightingSettings.keyLight.enabled
        ? lightingSettings.keyLight.intensity
        : 0;
      const pos = sphericalToCartesian(
        lightingSettings.keyLight.azimuth,
        lightingSettings.keyLight.elevation,
        lightingSettings.keyLight.distance
      );
      keyLight.position.copy(pos);
      keyLight.castShadow = lightingSettings.shadowsEnabled;
      keyLight.shadow.radius = lightingSettings.shadowSoftness;
    }

    if (fillLight) {
      fillLight.visible = lightingSettings.fillLight.enabled;
      fillLight.color.set(lightingSettings.fillLight.color);
      fillLight.intensity = lightingSettings.fillLight.enabled
        ? lightingSettings.fillLight.intensity
        : 0;
      const pos = sphericalToCartesian(
        lightingSettings.fillLight.azimuth,
        lightingSettings.fillLight.elevation,
        lightingSettings.fillLight.distance
      );
      fillLight.position.copy(pos);
    }

    if (rimLight) {
      rimLight.visible = lightingSettings.rimLight.enabled;
      rimLight.color.set(lightingSettings.rimLight.color);
      rimLight.intensity = lightingSettings.rimLight.enabled
        ? lightingSettings.rimLight.intensity
        : 0;
      const pos = sphericalToCartesian(
        lightingSettings.rimLight.azimuth,
        lightingSettings.rimLight.elevation,
        lightingSettings.rimLight.distance
      );
      rimLight.position.copy(pos);
    }

    // Rebuild visual light direction helpers
    if (helpersGroup) {
      helpersGroup.clear();
      helpersGroup.visible = lightingSettings.showLightHelpers;

      if (lightingSettings.showLightHelpers) {
        const configs = [
          { cfg: lightingSettings.keyLight, label: 'Key' },
          { cfg: lightingSettings.fillLight, label: 'Fill' },
          { cfg: lightingSettings.rimLight, label: 'Rim' },
        ];
        for (const item of configs) {
          if (!item.cfg.enabled) continue;
          const p = sphericalToCartesian(item.cfg.azimuth, item.cfg.elevation, 3.6);
          const bulbGeo = new THREE.SphereGeometry(0.12, 16, 16);
          const bulbMat = new THREE.MeshBasicMaterial({ color: item.cfg.color });
          const bulb = new THREE.Mesh(bulbGeo, bulbMat);
          bulb.position.copy(p);
          helpersGroup.add(bulb);

          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            p,
            new THREE.Vector3(0, 0, 0),
          ]);
          const lineMat = new THREE.LineDashedMaterial({
            color: item.cfg.color,
            dashSize: 0.15,
            gapSize: 0.1,
          });
          const line = new THREE.Line(lineGeo, lineMat);
          line.computeLineDistances();
          helpersGroup.add(line);
        }
      }
    }
  }, [lightingSettings]);

  const setCameraPreset = useCallback(
    (preset: CameraPresetView) => {
      setActiveCameraPreset(preset);
      const df = getPortraitDistanceFactor();
      targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
      if (preset === 'perspective') {
        targetCamPosRef.current = new THREE.Vector3(3.8 * df, 2.6 * df, 4.4 * df);
      } else if (preset === 'front') {
        targetCamPosRef.current = new THREE.Vector3(0, 0.2, 5.6 * df);
      } else if (preset === 'right') {
        targetCamPosRef.current = new THREE.Vector3(5.6 * df, 0.2, 0);
      } else if (preset === 'top') {
        targetCamPosRef.current = new THREE.Vector3(0, 6.2 * df, 0.01);
      } else if (preset === 'iso') {
        targetCamPosRef.current = new THREE.Vector3(4.0 * df, 4.0 * df, 4.0 * df);
      }
    },
    [getPortraitDistanceFactor]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileDrop(file);
    }
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none bg-[#0B0D11]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 3D WebGL Canvas Mount */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-Left Camera Angle Switcher HUD */}
      <div className="absolute top-2.5 left-2.5 md:top-4 md:left-4 z-10 flex items-center gap-0.5 sm:gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 max-w-[calc(100vw-76px)] overflow-x-auto no-scrollbar">
        {(
          [
            {
              id: 'perspective',
              label: t(language, 'Perspektif', 'Perspective'),
              shortLabel: t(language, 'Persp', 'Persp'),
            },
            {
              id: 'front',
              label: t(language, 'Ön', 'Front'),
              shortLabel: t(language, 'Ön', 'Front'),
            },
            {
              id: 'right',
              label: t(language, 'Sağ', 'Right'),
              shortLabel: t(language, 'Sağ', 'Right'),
            },
            {
              id: 'top',
              label: t(language, 'Üst', 'Top'),
              shortLabel: t(language, 'Üst', 'Top'),
            },
            {
              id: 'iso',
              label: t(language, 'İzometrik', 'Isometric'),
              shortLabel: t(language, 'İzo', 'Iso'),
            },
          ] as { id: CameraPresetView; label: string; shortLabel: string }[]
        ).map((cam) => (
          <button
            key={cam.id}
            type="button"
            onClick={() => setCameraPreset(cam.id)}
            className={`min-h-[34px] px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeCameraPreset === cam.id
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="sm:hidden">{cam.shortLabel}</span>
            <span className="hidden sm:inline">{cam.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile Right-Edge Vertical Quick-Toggle Dock (Prevents bottom bar stacking on iPhone) */}
      <div className="lg:hidden absolute top-2.5 right-2.5 z-10 flex flex-col items-center gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-xl">
        <button
          type="button"
          onClick={() => onUpdateLighting({ autoRotate: !lightingSettings.autoRotate })}
          className={`w-11 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
            lightingSettings.autoRotate
              ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>360°</span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateMaterial({ wireframe: !materialSettings.wireframe })}
          className={`w-11 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
            materialSettings.wireframe
              ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Box className="w-3.5 h-3.5 shrink-0" />
          <span>{t(language, 'Tel', 'Wire')}</span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateLighting({ showGrid: !lightingSettings.showGrid })}
          className={`w-11 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
            lightingSettings.showGrid
              ? 'bg-white/15 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Grid className="w-3.5 h-3.5 shrink-0" />
          <span>{t(language, 'Izgara', 'Grid')}</span>
        </button>

        <button
          type="button"
          onClick={() => setCameraPreset('perspective')}
          className="w-11 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5 shrink-0" />
          <span>{t(language, 'Odak', 'Focus')}</span>
        </button>
      </div>

      {/* Desktop Bottom Floating Viewport Quick Toolbar */}
      <div className="hidden lg:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-10 items-center gap-1.5 px-2 py-1.5 rounded-xl bg-black/65 backdrop-blur-md border border-white/10 shadow-xl">
        <button
          type="button"
          onClick={() => onUpdateMaterial({ wireframe: !materialSettings.wireframe })}
          className={`min-h-[36px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            materialSettings.wireframe
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
          title={t(language, 'Tel Kafes (Wireframe) Görünümü', 'Wireframe View')}
        >
          <Box className="w-3.5 h-3.5" />
          <span>{t(language, 'Tel Kafes', 'Wireframe')}</span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateMaterial({ flatShading: !materialSettings.flatShading })}
          className={`min-h-[36px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            materialSettings.flatShading
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
          title={t(
            language,
            'Fasetli (Flat) / Pürüzsüz (Smooth) Gölgelendirme',
            'Flat / Smooth Shading'
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {materialSettings.flatShading
              ? t(language, 'Fasetli', 'Flat')
              : t(language, 'Pürüzsüz', 'Smooth')}
          </span>
        </button>

        <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0" />

        <button
          type="button"
          onClick={() => onUpdateLighting({ showGrid: !lightingSettings.showGrid })}
          className={`min-h-[36px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            lightingSettings.showGrid
              ? 'bg-white/10 text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title={t(language, 'Stüdyo Zemin Izgarası', 'Studio Floor Grid')}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>{t(language, 'Izgara', 'Grid')}</span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateLighting({ showAxes: !lightingSettings.showAxes })}
          className={`min-h-[36px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            lightingSettings.showAxes
              ? 'bg-white/10 text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title={t(language, 'X/Y/Z Eksen Çizgileri', 'X/Y/Z Axis Lines')}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{t(language, 'Eksen', 'Axes')}</span>
        </button>

        <button
          type="button"
          onClick={() =>
            onUpdateLighting({ showLightHelpers: !lightingSettings.showLightHelpers })
          }
          className={`min-h-[36px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            lightingSettings.showLightHelpers
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title={t(language, 'Işık Kaynaklarını Sahnede Göster', 'Show Light Helpers')}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>{t(language, 'Işıklar', 'Lights')}</span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateLighting({ autoRotate: !lightingSettings.autoRotate })}
          className={`min-h-[36px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            lightingSettings.autoRotate
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title={t(language, 'Otomatik 360° Stüdyo Dönüşü', 'Auto 360° Turntable')}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>360°</span>
        </button>

        <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0" />

        <button
          type="button"
          onClick={() => setCameraPreset('perspective')}
          className="min-h-[36px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap cursor-pointer"
          title={t(language, 'Kamerayı Merkeze Sıfırla', 'Reset Camera Focus')}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>{t(language, 'Odakla', 'Focus')}</span>
        </button>
      </div>

      {/* Subtle Bottom-Left Controls Hint for Desktop / Mobile */}
      <div className="hidden lg:flex absolute bottom-4 left-4 z-10 items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 text-[11px] text-slate-300">
        <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>{t(language, 'Sol Tık: Döndür', 'Left Click: Orbit')}</span>
        <span aria-hidden="true" className="text-white/30">·</span>
        <span>{t(language, 'Sağ Tık: Kaydır', 'Right Click: Pan')}</span>
        <span aria-hidden="true" className="text-white/30">·</span>
        <span>
          {t(language, 'Tekerlek / Çimdik: Yakınlaştır', 'Scroll / Pinch: Zoom')}
        </span>
      </div>

      {/* Drag & Drop File Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md border-2 border-dashed border-amber-400 m-4 rounded-2xl pointer-events-none">
          <Upload className="w-12 h-12 text-amber-400 mb-3 animate-bounce" />
          <p className="text-lg font-display font-semibold text-white">
            {t(
              language,
              '3B Model Dosyasını Sahneye Bırakın',
              'Drop 3D Model File Into Viewport'
            )}
          </p>
          <p className="text-xs text-slate-300 mt-1">
            {t(
              language,
              '.blend, .stl, .obj, .glb, .ply, .fbx, .3ds ve .dae formatları desteklenir',
              'Supports .blend, .stl, .obj, .glb, .ply, .fbx, .3ds, and .dae formats'
            )}
          </p>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-3" />
          <p className="text-sm font-medium text-white">{loadingMessage}</p>
        </div>
      )}

      {/* WebGL Fallback Safety */}
      {webglLost && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0B0D11] p-6 text-center">
          <p className="text-base font-semibold text-white mb-2">
            {t(
              language,
              'WebGL Grafik Bağlamı Askıya Alındı',
              'WebGL Graphics Context Suspended'
            )}
          </p>
          <p className="text-xs text-slate-400 max-w-md mb-4">
            {t(
              language,
              'Tarayıcınız 3B donanım hızlandırmasını geçici olarak sıfırladı. Sahneyi yeniden başlatmak için sayfayı yenileyebilir veya varsayılan kameraya dönebilirsiniz.',
              'Your browser temporarily reset 3D hardware acceleration. Refresh the page or reset the camera to restore the scene.'
            )}
          </p>
        </div>
      )}
    </div>
  );
};
