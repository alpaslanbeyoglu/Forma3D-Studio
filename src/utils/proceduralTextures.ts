import * as THREE from 'three';
import { SurfacePatternType } from '../types/studio';

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Generates a tileable procedural bump/roughness CanvasTexture for 3D meshes
 * so that .STL and .BLEND models without external image files can have rich
 * physical surface micro-textures that also export into .USDZ.
 */
export function getProceduralSurfaceTexture(
  pattern: SurfacePatternType,
  scale: number = 4
): THREE.CanvasTexture | null {
  if (pattern === 'none') return null;

  const cacheKey = `${pattern}_${scale}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  if (pattern === 'brushed_metal') {
    // Directional anisotropic streaks
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let y = 0; y < size; y++) {
      const rowBias = (Math.sin(y * 0.35) * 14 + (Math.random() - 0.5) * 32) | 0;
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const fine = Math.sin(x * 0.04 + y * 0.8) * 10;
        const grain = (Math.random() - 0.5) * 18;
        const val = Math.max(0, Math.min(255, 128 + rowBias + fine + grain));
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } else if (pattern === 'micro_sand') {
    // Fine isotropic bead-blasted / ceramic grain
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const val = Math.max(0, Math.min(255, 128 + (Math.random() - 0.5) * 70));
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  } else if (pattern === 'carbon_weave') {
    // Twill carbon fiber weave pattern
    const cell = 16;
    for (let y = 0; y < size; y += cell) {
      for (let x = 0; x < size; x += cell) {
        const isAlt = ((x / cell + y / cell) & 1) === 0;
        const grad = ctx.createLinearGradient(
          x,
          y,
          x + (isAlt ? cell : 0),
          y + (isAlt ? 0 : cell)
        );
        grad.addColorStop(0, '#454545');
        grad.addColorStop(0.5, '#d4d4d4');
        grad.addColorStop(1, '#383838');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, cell, cell);
        ctx.strokeStyle = '#1f1f1f';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cell, cell);
      }
    }
  } else if (pattern === 'print_layers') {
    // Horizontal 3D printing FDM/SLA layer striations
    for (let y = 0; y < size; y++) {
      const wave = Math.sin((y / 6) * Math.PI * 2);
      const shade = Math.round(128 + wave * 55 + (Math.random() - 0.5) * 10);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(0, y, size, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(scale, scale);
  texture.needsUpdate = true;

  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Ensures a BufferGeometry has valid normals and box/triplanar UV coordinates.
 * Essential for .STL and .BLEND meshes so that procedural textures and Apple .USDZ export work reliably.
 */
export function ensureGeometryAttributes(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geometry.attributes.position) return geometry;

  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }

  if (!geometry.attributes.uv) {
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox || new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const min = bbox.min;

    const sx = size.x > 1e-5 ? size.x : 1;
    const sy = size.y > 1e-5 ? size.y : 1;
    const sz = size.z > 1e-5 ? size.z : 1;

    const posAttr = geometry.attributes.position;
    const normAttr = geometry.attributes.normal;
    const count = posAttr.count;
    const uvs = new Float32Array(count * 2);

    for (let i = 0; i < count; i++) {
      const px = (posAttr.getX(i) - min.x) / sx;
      const py = (posAttr.getY(i) - min.y) / sy;
      const pz = (posAttr.getZ(i) - min.z) / sz;

      const nx = normAttr ? Math.abs(normAttr.getX(i)) : 0;
      const ny = normAttr ? Math.abs(normAttr.getY(i)) : 1;
      const nz = normAttr ? Math.abs(normAttr.getZ(i)) : 0;

      if (nx >= ny && nx >= nz) {
        uvs[i * 2] = pz;
        uvs[i * 2 + 1] = py;
      } else if (ny >= nx && ny >= nz) {
        uvs[i * 2] = px;
        uvs[i * 2 + 1] = pz;
      } else {
        uvs[i * 2] = px;
        uvs[i * 2 + 1] = py;
      }
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }

  return geometry;
}
