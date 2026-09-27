import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { ModelStats, SubMeshInfo } from '../types/studio';
import { parseBlendFile } from './blendParser';
import { ensureGeometryAttributes } from './proceduralTextures';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function computeGroupStats(
  group: THREE.Group,
  fileName: string,
  fileFormat: ModelStats['fileFormat'],
  fileSize: string,
  blenderVersion?: string
): ModelStats {
  let vertexCount = 0;
  let triangleCount = 0;
  let meshCount = 0;
  const subMeshes: SubMeshInfo[] = [];

  group.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  if (!bbox.isEmpty()) {
    bbox.getSize(size);
  }

  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const geo = mesh.geometry as THREE.BufferGeometry;
      ensureGeometryAttributes(geo);

      const vCount = geo.attributes.position ? geo.attributes.position.count : 0;
      const tCount = geo.index
        ? Math.floor(geo.index.count / 3)
        : Math.floor(vCount / 3);

      const subId = mesh.uuid;
      const subName = mesh.name || `Alt_Parca_${meshCount + 1}`;
      mesh.name = subName;

      vertexCount += vCount;
      triangleCount += tCount;
      meshCount += 1;

      subMeshes.push({
        id: subId,
        name: subName,
        vertices: vCount,
        triangles: tCount,
        visible: mesh.visible,
      });
    }
  });

  return {
    fileName,
    fileFormat,
    fileSize,
    blenderVersion,
    meshCount,
    vertexCount,
    triangleCount,
    dimensions: {
      x: size.x,
      y: size.y,
      z: size.z,
    },
    subMeshes,
  };
}

export async function load3DFile(
  file: File
): Promise<{ group: THREE.Group; stats: ModelStats }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const buffer = await file.arrayBuffer();
  const fileSizeStr = formatBytes(file.size);

  // Detect .blend / .blend1 / .blend2 or Blender binary/compressed magic bytes
  const headerBytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 16));
  const isBlenderAscii =
    headerBytes.length >= 7 &&
    headerBytes[0] === 0x42 && // B
    headerBytes[1] === 0x4c && // L
    headerBytes[2] === 0x45 && // E
    headerBytes[3] === 0x4e && // N
    headerBytes[4] === 0x44 && // D
    headerBytes[5] === 0x45 && // E
    headerBytes[6] === 0x52; // R
  const isZstdMagic =
    headerBytes.length >= 4 &&
    headerBytes[0] === 0x28 &&
    headerBytes[1] === 0xb5 &&
    headerBytes[2] === 0x2f &&
    headerBytes[3] === 0xfd;
  const isGzipMagic =
    headerBytes.length >= 2 &&
    headerBytes[0] === 0x1f &&
    headerBytes[1] === 0x8b;

  if (/^blend\d*$/.test(ext) || isBlenderAscii || isZstdMagic || isGzipMagic) {
    const res = await parseBlendFile(buffer);
    const stats = computeGroupStats(
      res.group,
      file.name,
      'BLEND',
      fileSizeStr,
      res.blenderVersion
    );
    return { group: res.group, stats };
  }

  if (ext === 'stl') {
    const loader = new STLLoader();
    const geometry = loader.parse(buffer);
    ensureGeometryAttributes(geometry);
    const hasVertexColors = geometry.hasAttribute('color');
    const stlMat = new THREE.MeshPhysicalMaterial({
      name: 'STL_Orijinal_Yuzey',
      color: hasVertexColors ? 0xffffff : 0xb8c2cc,
      vertexColors: hasVertexColors,
      roughness: 0.32,
      metalness: 0.78,
      clearcoat: 0.15,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, stlMat);
    mesh.userData.originalMaterial = stlMat.clone();
    mesh.name = file.name.replace(/\.stl$/i, '') || 'STL_Katmani';
    const group = new THREE.Group();
    group.add(mesh);

    const stats = computeGroupStats(group, file.name, 'STL', fileSizeStr);
    return { group, stats };
  }

  if (ext === 'obj') {
    const text = new TextDecoder('utf-8').decode(buffer);
    const loader = new OBJLoader();
    const objGroup = loader.parse(text);
    const group = new THREE.Group();
    let idx = 1;
    objGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = (child as THREE.Mesh).clone();
        ensureGeometryAttributes(m.geometry);
        if (m.material) {
          m.userData.originalMaterial = Array.isArray(m.material)
            ? m.material.map((mat) => mat.clone())
            : m.material.clone();
        }
        m.name = m.name || `OBJ_Parca_${idx++}`;
        group.add(m);
      }
    });
    if (group.children.length === 0) {
      throw new Error('OBJ dosyası içinde geçerli bir 3B yüzey bulunamadı.');
    }
    const stats = computeGroupStats(group, file.name, 'OBJ', fileSizeStr);
    return { group, stats };
  }

  if (ext === 'glb' || ext === 'gltf') {
    const loader = new GLTFLoader();
    const gltf = await new Promise<any>((resolve, reject) => {
      loader.parse(buffer, '', resolve, reject);
    });
    const group = new THREE.Group();
    let idx = 1;
    gltf.scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const src = child as THREE.Mesh;
        const g = src.geometry.clone();
        src.updateMatrixWorld(true);
        g.applyMatrix4(src.matrixWorld);
        ensureGeometryAttributes(g);
        const origMat = Array.isArray(src.material)
          ? src.material.map((mat) => mat.clone())
          : src.material
            ? src.material.clone()
            : new THREE.MeshPhysicalMaterial({ color: 0xd4d8de, roughness: 0.35 });
        const m = new THREE.Mesh(g, origMat);
        m.userData.originalMaterial = Array.isArray(origMat)
          ? origMat.map((mat) => mat.clone())
          : origMat.clone();
        m.name = src.name || `GLTF_Parca_${idx++}`;
        group.add(m);
      }
    });
    if (group.children.length === 0) {
      throw new Error('GLB/GLTF dosyası içinde 3B ağ yapısı bulunamadı.');
    }
    const stats = computeGroupStats(group, file.name, 'GLB', fileSizeStr);
    return { group, stats };
  }

  if (ext === 'ply') {
    const loader = new PLYLoader();
    const geometry = loader.parse(buffer);
    ensureGeometryAttributes(geometry);
    const hasColors = geometry.hasAttribute('color');
    const plyMat = new THREE.MeshPhysicalMaterial({
      name: 'PLY_Orijinal_Yuzey',
      color: hasColors ? 0xffffff : 0x94a3b8,
      vertexColors: hasColors,
      roughness: 0.38,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, plyMat);
    mesh.userData.originalMaterial = plyMat.clone();
    mesh.name = file.name.replace(/\.ply$/i, '') || 'PLY_Model';
    const group = new THREE.Group();
    group.add(mesh);
    const stats = computeGroupStats(group, file.name, 'PLY', fileSizeStr);
    return { group, stats };
  }

  if (ext === 'fbx') {
    const loader = new FBXLoader();
    const fbxGroup = loader.parse(buffer, '');
    const group = new THREE.Group();
    let idx = 1;
    fbxGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const src = child as THREE.Mesh;
        const g = src.geometry.clone();
        src.updateMatrixWorld(true);
        g.applyMatrix4(src.matrixWorld);
        ensureGeometryAttributes(g);
        const origMat = Array.isArray(src.material)
          ? src.material.map((mat) => mat.clone())
          : src.material
            ? src.material.clone()
            : new THREE.MeshPhysicalMaterial({ color: 0xc4cdd5, roughness: 0.4 });
        const m = new THREE.Mesh(g, origMat);
        m.userData.originalMaterial = Array.isArray(origMat)
          ? origMat.map((mat) => mat.clone())
          : origMat.clone();
        m.name = src.name || `FBX_Parca_${idx++}`;
        group.add(m);
      }
    });
    if (group.children.length === 0) {
      throw new Error('FBX dosyası içinde 3B ağ geometrisi bulunamadı.');
    }
    const stats = computeGroupStats(group, file.name, 'FBX', fileSizeStr);
    return { group, stats };
  }

  if (ext === '3ds') {
    const loader = new TDSLoader();
    const tdsGroup = loader.parse(buffer, '');
    const group = new THREE.Group();
    let idx = 1;
    tdsGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const src = child as THREE.Mesh;
        const g = src.geometry.clone();
        src.updateMatrixWorld(true);
        g.applyMatrix4(src.matrixWorld);
        ensureGeometryAttributes(g);
        const origMat = Array.isArray(src.material)
          ? src.material.map((mat) => mat.clone())
          : src.material
            ? src.material.clone()
            : new THREE.MeshPhysicalMaterial({ color: 0x94a3b8, roughness: 0.3 });
        const m = new THREE.Mesh(g, origMat);
        m.userData.originalMaterial = Array.isArray(origMat)
          ? origMat.map((mat) => mat.clone())
          : origMat.clone();
        m.name = src.name || `3DS_Parca_${idx++}`;
        group.add(m);
      }
    });
    if (group.children.length === 0) {
      throw new Error('3DS dosyası içinde 3B nesne bulunamadı.');
    }
    const stats = computeGroupStats(group, file.name, '3DS', fileSizeStr);
    return { group, stats };
  }

  if (ext === 'dae') {
    const text = new TextDecoder('utf-8').decode(buffer);
    const loader = new ColladaLoader();
    const collada = loader.parse(text, '');
    if (!collada || !collada.scene) {
      throw new Error('DAE (Collada) dosyası içinde geçerli bir 3B sahne bulunamadı.');
    }
    const group = new THREE.Group();
    let idx = 1;
    collada.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const src = child as THREE.Mesh;
        const g = src.geometry.clone();
        src.updateMatrixWorld(true);
        g.applyMatrix4(src.matrixWorld);
        ensureGeometryAttributes(g);
        const origMat = Array.isArray(src.material)
          ? src.material.map((mat) => mat.clone())
          : src.material
            ? src.material.clone()
            : new THREE.MeshPhysicalMaterial({ color: 0xd1d5db, roughness: 0.35 });
        const m = new THREE.Mesh(g, origMat);
        m.userData.originalMaterial = Array.isArray(origMat)
          ? origMat.map((mat) => mat.clone())
          : origMat.clone();
        m.name = src.name || `DAE_Parca_${idx++}`;
        group.add(m);
      }
    });
    if (group.children.length === 0) {
      throw new Error('DAE (Collada) dosyası içinde 3B geometri bulunamadı.');
    }
    const stats = computeGroupStats(group, file.name, 'DAE', fileSizeStr);
    return { group, stats };
  }

  throw new Error(
    `Desteklenmeyen dosya formatı (.${ext}). Desteklenen formatlar: .blend, .blend1, .stl, .obj, .glb, .gltf, .ply, .fbx, .3ds, .dae`
  );
}
