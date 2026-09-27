import * as THREE from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { MaterialSettings, UsdzExportOptions } from '../types/studio';
import { ensureGeometryAttributes, getProceduralSurfaceTexture } from './proceduralTextures';

function prepareCleanExportGroup(
  sourceGroup: THREE.Group,
  materialSettings: MaterialSettings,
  options: UsdzExportOptions
): THREE.Group {
  const exportRoot = new THREE.Group();
  exportRoot.name = options.fileName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Forma3D_Model';

  let unitMultiplier = 1.0;
  if (options.scaleUnit === 'cm') unitMultiplier = 0.01;
  if (options.scaleUnit === 'mm') unitMultiplier = 0.001;

  sourceGroup.updateMatrixWorld(true);

  const surfaceTex = options.bakeProceduralTextures
    ? getProceduralSurfaceTexture(materialSettings.surfacePattern, materialSettings.patternScale)
    : null;

  let meshIndex = 0;
  sourceGroup.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child.visible) {
      const srcMesh = child as THREE.Mesh;
      const clonedGeo = srcMesh.geometry.clone();

      // Bake mesh world matrix into geometry so USDZ coordinates are exact and self-contained
      clonedGeo.applyMatrix4(srcMesh.matrixWorld);
      if (unitMultiplier !== 1.0) {
        clonedGeo.scale(unitMultiplier, unitMultiplier, unitMultiplier);
      }

      const buildExportMaterial = (): THREE.Material | THREE.Material[] => {
        if (materialSettings.useOriginalMaterials && srcMesh.userData.originalMaterial) {
          const convertToStd = (m: any): THREE.MeshStandardMaterial => {
            if (m && m.isMeshStandardMaterial) {
              return m.clone();
            }
            return new THREE.MeshStandardMaterial({
              color: m?.color ? m.color.clone() : new THREE.Color(0xd4d8de),
              map: m?.map || null,
              normalMap: m?.normalMap || null,
              roughnessMap: m?.roughnessMap || null,
              metalnessMap: m?.metalnessMap || null,
              emissiveMap: m?.emissiveMap || null,
              roughness: typeof m?.roughness === 'number' ? m.roughness : 0.4,
              metalness: typeof m?.metalness === 'number' ? m.metalness : 0.1,
              opacity: typeof m?.opacity === 'number' ? m.opacity : 1.0,
              transparent: Boolean(m?.transparent),
              vertexColors: Boolean(m?.vertexColors),
            });
          };

          const orig = srcMesh.userData.originalMaterial;
          return Array.isArray(orig) ? orig.map(convertToStd) : convertToStd(orig);
        }

        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(materialSettings.color),
          roughness: materialSettings.roughness,
          metalness: materialSettings.metalness,
          emissive: new THREE.Color(materialSettings.emissiveColor),
          emissiveIntensity: materialSettings.emissiveIntensity,
          opacity: materialSettings.opacity,
          transparent: materialSettings.opacity < 0.99 || materialSettings.transmission > 0.05,
          roughnessMap: surfaceTex || null,
        });
      };

      if (materialSettings.flatShading && clonedGeo.index) {
        const nonIndexed = clonedGeo.toNonIndexed();
        nonIndexed.computeVertexNormals();
        ensureGeometryAttributes(nonIndexed);
        const cleanMesh = new THREE.Mesh(nonIndexed, buildExportMaterial());
        cleanMesh.name =
          (srcMesh.name || `Parca_${meshIndex + 1}`).replace(/[^a-zA-Z0-9_]/g, '_') +
          `_${meshIndex}`;
        exportRoot.add(cleanMesh);
      } else {
        clonedGeo.computeVertexNormals();
        ensureGeometryAttributes(clonedGeo);

        const cleanMesh = new THREE.Mesh(clonedGeo, buildExportMaterial());
        cleanMesh.name =
          (srcMesh.name || `Parca_${meshIndex + 1}`).replace(/[^a-zA-Z0-9_]/g, '_') +
          `_${meshIndex}`;
        exportRoot.add(cleanMesh);
      }
      meshIndex++;
    }
  });

  // Optionally align minimum Y to 0.0 so Apple AR QuickLook rests model directly on surface
  if (options.placeOnFloor && exportRoot.children.length > 0) {
    const bbox = new THREE.Box3().setFromObject(exportRoot);
    const minY = bbox.min.y;
    if (isFinite(minY) && Math.abs(minY) > 1e-6) {
      exportRoot.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).geometry.translate(0, -minY, 0);
        }
      });
    }
  }

  return exportRoot;
}

/**
 * Generates a .usdz binary buffer and returns both a downloadable Blob URL and byte size.
 */
export async function generateUsdzPackage(
  sourceGroup: THREE.Group,
  materialSettings: MaterialSettings,
  options: UsdzExportOptions
): Promise<{ blobUrl: string; fileName: string; byteSize: number }> {
  const cleanGroup = prepareCleanExportGroup(sourceGroup, materialSettings, options);
  const exporter = new USDZExporter();

  const arrayBuffer = await exporter.parseAsync(cleanGroup);
  const blob = new Blob([arrayBuffer], { type: 'model/vnd.usdz+zip' });
  const blobUrl = URL.createObjectURL(blob);

  const sanitizedBase = options.fileName
    .replace(/\.(blend|stl|obj|glb|gltf|usdz)$/i, '')
    .trim();
  const finalName = `${sanitizedBase || 'model'}.usdz`;

  return {
    blobUrl,
    fileName: finalName,
    byteSize: arrayBuffer.byteLength,
  };
}

/**
 * Exports the current model as Binary .STL
 */
export function exportToBinaryStl(sourceGroup: THREE.Group, baseFileName: string) {
  const exporter = new STLExporter();
  const result = exporter.parse(sourceGroup, { binary: true });
  const blob = new Blob([result], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const sanitized = baseFileName.replace(/\.(blend|stl|obj|glb|gltf|usdz)$/i, '').trim();
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitized || 'model'}_export.stl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Exports the current model with PBR materials as Binary .GLB
 */
export function exportToGlb(
  sourceGroup: THREE.Group,
  materialSettings: MaterialSettings,
  baseFileName: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanGroup = prepareCleanExportGroup(sourceGroup, materialSettings, {
      fileName: baseFileName,
      scaleUnit: 'm',
      placeOnFloor: true,
      bakeProceduralTextures: true,
    });
    const exporter = new GLTFExporter();
    exporter.parse(
      cleanGroup,
      (result) => {
        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: 'model/gltf-binary' });
          const url = URL.createObjectURL(blob);
          const sanitized = baseFileName.replace(/\.(blend|stl|obj|glb|gltf|usdz)$/i, '').trim();
          const a = document.createElement('a');
          a.href = url;
          a.download = `${sanitized || 'model'}.glb`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 3000);
          resolve();
        } else {
          reject(new Error('GLB dışa aktarma beklenmeyen çıktı üretti.'));
        }
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}
