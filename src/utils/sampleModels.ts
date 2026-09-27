import * as THREE from 'three';
import { ensureGeometryAttributes } from './proceduralTextures';
import { createSampleBlendFileBuffer } from './blendParser';

export interface SampleModelPreset {
  id: string;
  name: string;
  formatBadge: 'BLEND' | 'STL';
  subtitle: string;
  buildGroup: () => THREE.Group;
}

/**
 * Builds a multi-part mechanical precision turbine impeller (simulating a high-resolution CAD .STL assembly)
 */
function buildTurbineImpellerGroup(): THREE.Group {
  const group = new THREE.Group();

  const hubMat = new THREE.MeshPhysicalMaterial({
    name: 'Merkez_Gobek_Alasim',
    color: 0x475569,
    roughness: 0.26,
    metalness: 0.88,
    clearcoat: 0.2,
    side: THREE.DoubleSide,
  });

  const shaftMat = new THREE.MeshPhysicalMaterial({
    name: 'Mil_Flansi_Bronz',
    color: 0xe5a93c,
    roughness: 0.2,
    metalness: 0.94,
    clearcoat: 0.3,
    side: THREE.DoubleSide,
  });

  const diskMat = new THREE.MeshPhysicalMaterial({
    name: 'Taban_Diski_Karbon',
    color: 0x1e293b,
    roughness: 0.34,
    metalness: 0.75,
    clearcoat: 0.4,
    side: THREE.DoubleSide,
  });

  const bladeMat = new THREE.MeshPhysicalMaterial({
    name: 'Kanatcik_Titanyum',
    color: 0xcbd5e1,
    roughness: 0.22,
    metalness: 0.92,
    clearcoat: 0.15,
    side: THREE.DoubleSide,
  });

  // Central hub
  const hubGeo = new THREE.CylinderGeometry(0.55, 0.85, 1.35, 48, 16);
  ensureGeometryAttributes(hubGeo);
  const hubMesh = new THREE.Mesh(hubGeo, hubMat);
  hubMesh.userData.originalMaterial = hubMat.clone();
  hubMesh.name = 'Turbin_Merkez_Gobek';
  group.add(hubMesh);

  // Bore ring on top
  const shaftGeo = new THREE.TorusGeometry(0.42, 0.12, 24, 48);
  shaftGeo.rotateX(Math.PI / 2);
  shaftGeo.translate(0, 0.68, 0);
  ensureGeometryAttributes(shaftGeo);
  const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
  shaftMesh.userData.originalMaterial = shaftMat.clone();
  shaftMesh.name = 'Mil_Flansi';
  group.add(shaftMesh);

  // Base disk
  const diskGeo = new THREE.CylinderGeometry(1.85, 1.92, 0.16, 64);
  diskGeo.translate(0, -0.62, 0);
  ensureGeometryAttributes(diskGeo);
  const diskMesh = new THREE.Mesh(diskGeo, diskMat);
  diskMesh.userData.originalMaterial = diskMat.clone();
  diskMesh.name = 'Alt_Taban_Diski';
  group.add(diskMesh);

  // 12 Curved aerodynamic blades
  const bladeCount = 12;
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, -0.58);
  bladeShape.quadraticCurveTo(0.85, -0.35, 1.68, -0.52);
  bladeShape.lineTo(1.62, 0.25);
  bladeShape.quadraticCurveTo(0.95, 0.42, 0.45, 0.62);
  bladeShape.closePath();

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps: 12,
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 3,
  };

  const baseBladeGeo = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
  // Subtle helical twist along radial X
  const pos = baseBladeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const twistAngle = (x / 1.7) * 0.52;
    const nz = z * Math.cos(twistAngle) - y * Math.sin(twistAngle) * 0.25;
    pos.setZ(i, nz);
  }
  baseBladeGeo.computeVertexNormals();
  ensureGeometryAttributes(baseBladeGeo);

  for (let b = 0; b < bladeCount; b++) {
    const angle = (b / bladeCount) * Math.PI * 2;
    const bladeGeo = baseBladeGeo.clone();
    bladeGeo.rotateY(angle);
    const bMat = bladeMat.clone();
    const bladeMesh = new THREE.Mesh(bladeGeo, bMat);
    bladeMesh.userData.originalMaterial = bMat.clone();
    bladeMesh.name = `Kanatcik_${String(b + 1).padStart(2, '0')}`;
    group.add(bladeMesh);
  }

  return group;
}

/**
 * Builds a sculptural parametric torus knot assembly (simulating an organic Blender .blend asset)
 */
function buildParametricSculptureGroup(): THREE.Group {
  const group = new THREE.Group();

  const knotMat = new THREE.MeshPhysicalMaterial({
    name: 'Blender_Seramik_Kobalt',
    color: 0x38bdf8,
    roughness: 0.22,
    metalness: 0.15,
    clearcoat: 0.85,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide,
  });

  const ringMat = new THREE.MeshPhysicalMaterial({
    name: 'Blender_Altin_Halka',
    color: 0xf59e0b,
    roughness: 0.18,
    metalness: 0.95,
    clearcoat: 0.3,
    side: THREE.DoubleSide,
  });

  const coreMat = new THREE.MeshPhysicalMaterial({
    name: 'Blender_Merkez_Cekirdek',
    color: 0xf43f5e,
    roughness: 0.25,
    metalness: 0.4,
    emissive: new THREE.Color(0x881337),
    emissiveIntensity: 0.35,
    clearcoat: 0.6,
    side: THREE.DoubleSide,
  });

  const knotGeo = new THREE.TorusKnotGeometry(1.1, 0.34, 220, 36, 2, 3);
  ensureGeometryAttributes(knotGeo);
  const knotMesh = new THREE.Mesh(knotGeo, knotMat);
  knotMesh.userData.originalMaterial = knotMat.clone();
  knotMesh.name = 'Parametrik_Dugum_Govde';
  group.add(knotMesh);

  const ringGeo = new THREE.TorusGeometry(1.72, 0.06, 24, 96);
  ringGeo.rotateX(Math.PI / 3);
  ensureGeometryAttributes(ringGeo);
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.userData.originalMaterial = ringMat.clone();
  ringMesh.name = 'Yorunge_Cemberi_Dis';
  group.add(ringMesh);

  const coreGeo = new THREE.IcosahedronGeometry(0.48, 3);
  ensureGeometryAttributes(coreGeo);
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.userData.originalMaterial = coreMat.clone();
  coreMesh.name = 'Merkez_Kure_Cekirdek';
  group.add(coreMesh);

  return group;
}

/**
 * Builds a precision robotic gimbal joint housing (.STL style)
 */
function buildRoboticGimbalGroup(): THREE.Group {
  const group = new THREE.Group();

  const outerMat = new THREE.MeshPhysicalMaterial({
    name: 'Dis_Kardan_Titanyum',
    color: 0x94a3b8,
    roughness: 0.25,
    metalness: 0.9,
    side: THREE.DoubleSide,
  });

  const midMat = new THREE.MeshPhysicalMaterial({
    name: 'Orta_Mafsal_Bakir',
    color: 0xd9734e,
    roughness: 0.22,
    metalness: 0.92,
    side: THREE.DoubleSide,
  });

  const coreMat = new THREE.MeshPhysicalMaterial({
    name: 'Merkez_Rulman_Celik',
    color: 0xe2e8f0,
    roughness: 0.16,
    metalness: 0.95,
    side: THREE.DoubleSide,
  });

  const pedMat = new THREE.MeshPhysicalMaterial({
    name: 'Kaide_Mat_Aluminyum',
    color: 0x334155,
    roughness: 0.45,
    metalness: 0.65,
    side: THREE.DoubleSide,
  });

  const outerRingGeo = new THREE.TorusGeometry(1.55, 0.16, 32, 72);
  ensureGeometryAttributes(outerRingGeo);
  const outerRing = new THREE.Mesh(outerRingGeo, outerMat);
  outerRing.userData.originalMaterial = outerMat.clone();
  outerRing.name = 'Dis_Kardan_Halkasi';
  group.add(outerRing);

  const midRingGeo = new THREE.TorusGeometry(1.15, 0.14, 32, 64);
  midRingGeo.rotateY(Math.PI / 4);
  midRingGeo.rotateX(Math.PI / 6);
  ensureGeometryAttributes(midRingGeo);
  const midRing = new THREE.Mesh(midRingGeo, midMat);
  midRing.userData.originalMaterial = midMat.clone();
  midRing.name = 'Orta_Eksen_Mafsali';
  group.add(midRing);

  const coreCylinderGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.9, 40);
  coreCylinderGeo.rotateZ(Math.PI / 4);
  ensureGeometryAttributes(coreCylinderGeo);
  const coreCylinder = new THREE.Mesh(coreCylinderGeo, coreMat);
  coreCylinder.userData.originalMaterial = coreMat.clone();
  coreCylinder.name = 'Merkez_Rulman_Yuvasi';
  group.add(coreCylinder);

  const pedestalGeo = new THREE.CylinderGeometry(0.95, 1.25, 0.32, 48);
  pedestalGeo.translate(0, -1.78, 0);
  ensureGeometryAttributes(pedestalGeo);
  const pedestal = new THREE.Mesh(pedestalGeo, pedMat);
  pedestal.userData.originalMaterial = pedMat.clone();
  pedestal.name = 'Sabitleme_Kaidesi';
  group.add(pedestal);

  return group;
}

export const SAMPLE_MODELS: SampleModelPreset[] = [
  {
    id: 'turbine_stl',
    name: 'Aero-Türbin Çarkı (12 Kanatlı)',
    formatBadge: 'STL',
    subtitle: 'Endüstriyel CAD Prototipi · Çok Parçalı',
    buildGroup: buildTurbineImpellerGroup,
  },
  {
    id: 'parametric_blend',
    name: 'Parametrik Torus Heykeli',
    formatBadge: 'BLEND',
    subtitle: 'Blender 4.0 SDNA Ağ Yapısı · Yüksek Poligon',
    buildGroup: buildParametricSculptureGroup,
  },
  {
    id: 'robotic_gimbal',
    name: 'Robotik Kardan Mafsalı',
    formatBadge: 'STL',
    subtitle: 'Mekanik Eksen Takımı · 4 Alt Parça',
    buildGroup: buildRoboticGimbalGroup,
  },
];

/**
 * Generates a downloadable binary .blend sample file so the user can test uploading a real .blend file.
 */
export function downloadSampleBlendFile() {
  const geo = new THREE.TorusKnotGeometry(1.1, 0.34, 128, 24, 2, 3);
  const buffer = createSampleBlendFileBuffer(geo, 'Ornek_TorusKnot_Blend');
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ornek_model_blender4.blend';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
