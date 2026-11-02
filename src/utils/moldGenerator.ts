import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { MoldSettings } from '../types/studio';

export interface MoldMetrics {
  outerDimensionsMm: { x: number; y: number; z: number };
  modelVolumeCm3: number;
  moldBoxVolumeCm3: number;
  siliconeVolumeCm3: number; // or mL
  siliconeWeightGrams: number;
  partAVolumeCm3: number;
  partBVolumeCm3: number;
}

/**
 * Calculates silicone volume and dimensions metrics for a given model group and mold settings.
 */
export function calculateMoldMetrics(
  modelGroup: THREE.Group | null,
  settings: MoldSettings
): MoldMetrics {
  if (!modelGroup) {
    return {
      outerDimensionsMm: { x: 100, y: 100, z: 100 },
      modelVolumeCm3: 10,
      moldBoxVolumeCm3: 150,
      siliconeVolumeCm3: 140,
      siliconeWeightGrams: 154,
      partAVolumeCm3: 70,
      partBVolumeCm3: 70,
    };
  }

  const box = new THREE.Box3().setFromObject(modelGroup);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Convert scene units to mm (assumes 1.0 unit = 10mm or 100mm based on scale)
  // Standard conversion factor: 1 scene unit = 20mm for comfortable defaults
  const UNIT_TO_MM = 20;

  const modelWidthMm = Math.max(size.x * UNIT_TO_MM, 10);
  const modelHeightMm = Math.max(size.y * UNIT_TO_MM, 10);
  const modelDepthMm = Math.max(size.z * UNIT_TO_MM, 10);

  const wallMm = Math.max(settings.wallThickness, 5);
  const bottomMm = Math.max(settings.bottomThickness, 5);

  const outerX = modelWidthMm + wallMm * 2;
  const outerY = modelHeightMm + (settings.moldType === 'two-part' ? wallMm * 2 : bottomMm + wallMm);
  const outerZ = modelDepthMm + wallMm * 2;

  // Approximate volumes (in cm³)
  const moldBoxVolumeCm3 = (outerX * outerY * outerZ) / 1000;
  
  // Model volume estimation (bounding box * average filling ratio ~ 0.42 for organic/mechanical shapes)
  const modelVolumeCm3 = (modelWidthMm * modelHeightMm * modelDepthMm * 0.42) / 1000;

  const siliconeVolumeCm3 = Math.max(1, moldBoxVolumeCm3 - modelVolumeCm3);
  const siliconeWeightGrams = siliconeVolumeCm3 * settings.siliconeDensity;

  return {
    outerDimensionsMm: {
      x: Math.round(outerX * 10) / 10,
      y: Math.round(outerY * 10) / 10,
      z: Math.round(outerZ * 10) / 10,
    },
    modelVolumeCm3: Math.round(modelVolumeCm3 * 10) / 10,
    moldBoxVolumeCm3: Math.round(moldBoxVolumeCm3 * 10) / 10,
    siliconeVolumeCm3: Math.round(siliconeVolumeCm3 * 10) / 10,
    siliconeWeightGrams: Math.round(siliconeWeightGrams * 10) / 10,
    partAVolumeCm3: Math.round((siliconeVolumeCm3 / 2) * 10) / 10,
    partBVolumeCm3: Math.round((siliconeVolumeCm3 / 2) * 10) / 10,
  };
}

/**
 * Procedurally constructs a 3D Mold Group (Part A and Part B with registration pins, sprue, air vents, and clamping lugs).
 */
export function createMoldGroup(
  modelGroup: THREE.Group | null,
  settings: MoldSettings
): { moldGroup: THREE.Group; partAGroup: THREE.Group; partBGroup: THREE.Group } {
  const container = new THREE.Group();
  container.name = 'SiliconeMoldContainer';

  const partAGroup = new THREE.Group();
  partAGroup.name = 'MoldPartA';

  const partBGroup = new THREE.Group();
  partBGroup.name = 'MoldPartB';

  if (!modelGroup || !settings.enabled) {
    container.add(partAGroup);
    container.add(partBGroup);
    return { moldGroup: container, partAGroup, partBGroup };
  }

  // Calculate bounding box and center
  const box = new THREE.Box3().setFromObject(modelGroup);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Scene scale factor (1 unit = 20mm)
  const MM_TO_UNIT = 1 / 20;

  const wallUnits = Math.max(settings.wallThickness * MM_TO_UNIT, 0.25);
  const bottomUnits = Math.max(settings.bottomThickness * MM_TO_UNIT, 0.25);

  const outerWidth = size.x + wallUnits * 2;
  const outerHeight = size.y + wallUnits * 2;
  const outerDepth = size.z + wallUnits * 2;

  // Split offset in scene units
  const splitOffsetUnits = (settings.splitOffset / 100) * (size.y / 2);

  // Silicone Translucent Material
  const moldMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(settings.moldColor || '#38BDF8'),
    transparent: settings.transparentMold,
    opacity: settings.transparentMold ? 0.65 : 0.95,
    roughness: 0.15,
    metalness: 0.05,
    transmission: settings.transparentMold ? 0.6 : 0,
    ior: 1.4,
    side: THREE.DoubleSide,
    depthWrite: !settings.transparentMold,
  });

  // Highlight material for pins and sprue
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#F59E0B'),
    roughness: 0.3,
    metalness: 0.6,
  });

  const pinMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#10B981'),
    roughness: 0.3,
    metalness: 0.5,
  });

  // -------------------------------------------------------------
  // BUILD 2-PART MOLD or 1-PART CONTAINER
  // -------------------------------------------------------------

  if (settings.moldType === 'two-part') {
    // Top Half (Part A) & Bottom Half (Part B)
    const partAHeight = outerHeight / 2 - splitOffsetUnits;
    const partBHeight = outerHeight / 2 + splitOffsetUnits;

    // Part A Outer Block
    const geoA = new THREE.BoxGeometry(outerWidth, partAHeight, outerDepth);
    const meshA = new THREE.Mesh(geoA, moldMaterial);
    meshA.position.set(
      center.x,
      center.y + splitOffsetUnits + partAHeight / 2,
      center.z
    );
    meshA.castShadow = true;
    meshA.receiveShadow = true;
    partAGroup.add(meshA);

    // Part B Outer Block
    const geoB = new THREE.BoxGeometry(outerWidth, partBHeight, outerDepth);
    const meshB = new THREE.Mesh(geoB, moldMaterial);
    meshB.position.set(
      center.x,
      center.y + splitOffsetUnits - partBHeight / 2,
      center.z
    );
    meshB.castShadow = true;
    meshB.receiveShadow = true;
    partBGroup.add(meshB);

    // -------------------------------------------------------------
    // REGISTRATION / ALIGNMENT PINS (Erkek/Dişi Kilit Pimleri)
    // -------------------------------------------------------------
    const pinR = Math.max(settings.pinRadius * MM_TO_UNIT, 0.1);
    const pinH = Math.max(settings.pinHeight * MM_TO_UNIT, 0.15);

    // 4 Corner positions on split plane
    const cornerX = outerWidth / 2 - wallUnits * 0.6;
    const cornerZ = outerDepth / 2 - wallUnits * 0.6;
    const splitY = center.y + splitOffsetUnits;

    const pinOffsets = [
      { x: cornerX, z: cornerZ },
      { x: -cornerX, z: cornerZ },
      { x: cornerX, z: -cornerZ },
      { x: -cornerX, z: -cornerZ },
    ];

    pinOffsets.forEach((pos) => {
      // Male Pin Cone on Part A
      const pinGeo = new THREE.ConeGeometry(pinR, pinH, 16);
      const malePin = new THREE.Mesh(pinGeo, pinMaterial);
      malePin.position.set(center.x + pos.x, splitY - pinH / 2, center.z + pos.z);
      malePin.rotation.x = Math.PI; // Points downwards into Part B
      partAGroup.add(malePin);

      // Female Socket Ring on Part B
      const socketGeo = new THREE.CylinderGeometry(pinR * 1.15, pinR * 1.3, pinH, 16);
      const femaleSocket = new THREE.Mesh(socketGeo, accentMaterial);
      femaleSocket.position.set(center.x + pos.x, splitY - pinH / 2, center.z + pos.z);
      partBGroup.add(femaleSocket);
    });

    // -------------------------------------------------------------
    // CLAMPING LUGS (Sıkıştırma Kulakçıkları)
    // -------------------------------------------------------------
    if (settings.addLugs) {
      const lugWidth = wallUnits * 0.8;
      const lugHeight = wallUnits * 0.6;
      const lugDepth = wallUnits * 0.8;

      const lugPositions = [
        { x: outerWidth / 2 + lugWidth / 2, z: 0 },
        { x: -outerWidth / 2 - lugWidth / 2, z: 0 },
        { x: 0, z: outerDepth / 2 + lugDepth / 2 },
        { x: 0, z: -outerDepth / 2 - lugDepth / 2 },
      ];

      lugPositions.forEach((pos) => {
        // Lug Part A
        const lugGeoA = new THREE.BoxGeometry(lugWidth, lugHeight, lugDepth);
        const lugA = new THREE.Mesh(lugGeoA, accentMaterial);
        lugA.position.set(center.x + pos.x, splitY + lugHeight / 2, center.z + pos.z);
        partAGroup.add(lugA);

        // Lug Part B
        const lugGeoB = new THREE.BoxGeometry(lugWidth, lugHeight, lugDepth);
        const lugB = new THREE.Mesh(lugGeoB, accentMaterial);
        lugB.position.set(center.x + pos.x, splitY - lugHeight / 2, center.z + pos.z);
        partBGroup.add(lugB);

        // Hole cylinder
        const holeGeo = new THREE.CylinderGeometry(
          pinR * 0.7,
          pinR * 0.7,
          lugHeight * 2.2,
          16
        );
        const holeA = new THREE.Mesh(holeGeo, pinMaterial);
        holeA.position.set(center.x + pos.x, splitY, center.z + pos.z);
        partAGroup.add(holeA);
      });
    }

    // -------------------------------------------------------------
    // POURING SPRUE (Döküm Hunisi)
    // -------------------------------------------------------------
    if (settings.addSprue) {
      const sprueTopR = Math.max(settings.sprueRadius * MM_TO_UNIT, 0.2);
      const sprueBottomR = sprueTopR * 0.4;
      const funnelHeight = partAHeight * 0.9;

      const sprueGeo = new THREE.CylinderGeometry(
        sprueTopR,
        sprueBottomR,
        funnelHeight,
        24
      );
      const sprueMesh = new THREE.Mesh(sprueGeo, accentMaterial);
      sprueMesh.position.set(
        center.x,
        center.y + splitOffsetUnits + partAHeight / 2 + funnelHeight * 0.1,
        center.z
      );
      partAGroup.add(sprueMesh);
    }

    // -------------------------------------------------------------
    // AIR VENTS (Hava Kanalları)
    // -------------------------------------------------------------
    if (settings.addAirVents) {
      const ventR = Math.max((settings.sprueRadius * 0.3) * MM_TO_UNIT, 0.08);
      const ventH = partAHeight * 0.8;

      const ventGeo = new THREE.CylinderGeometry(ventR, ventR, ventH, 12);

      // Vent Left
      const vent1 = new THREE.Mesh(ventGeo, pinMaterial);
      vent1.position.set(
        center.x - size.x * 0.35,
        center.y + splitOffsetUnits + partAHeight / 2,
        center.z - size.z * 0.35
      );
      vent1.rotation.z = Math.PI * 0.1;
      partAGroup.add(vent1);

      // Vent Right
      const vent2 = new THREE.Mesh(ventGeo, pinMaterial);
      vent2.position.set(
        center.x + size.x * 0.35,
        center.y + splitOffsetUnits + partAHeight / 2,
        center.z + size.z * 0.35
      );
      vent2.rotation.z = -Math.PI * 0.1;
      partAGroup.add(vent2);
    }

    // -------------------------------------------------------------
    // EXPLODED VIEW POSITIONING
    // -------------------------------------------------------------
    const explodeUnits = settings.explodedDistance * MM_TO_UNIT;
    if (explodeUnits > 0) {
      if (settings.splitAxis === 'y') {
        partAGroup.position.y = explodeUnits;
        partBGroup.position.y = -explodeUnits;
      } else if (settings.splitAxis === 'x') {
        partAGroup.position.x = explodeUnits;
        partBGroup.position.x = -explodeUnits;
      } else {
        partAGroup.position.z = explodeUnits;
        partBGroup.position.z = -explodeUnits;
      }
    } else {
      partAGroup.position.set(0, 0, 0);
      partBGroup.position.set(0, 0, 0);
    }

    // Preview Mode Filter
    partAGroup.visible =
      settings.previewMode === 'assembly' || settings.previewMode === 'partA';
    partBGroup.visible =
      settings.previewMode === 'assembly' || settings.previewMode === 'partB';
  } else {
    // -------------------------------------------------------------
    // 1-PART OPEN CONTAINER MOLD
    // -------------------------------------------------------------
    const containerHeight = size.y + bottomUnits;
    const geoContainer = new THREE.BoxGeometry(
      outerWidth,
      containerHeight,
      outerDepth
    );

    const meshContainer = new THREE.Mesh(geoContainer, moldMaterial);
    meshContainer.position.set(
      center.x,
      center.y - size.y / 2 + containerHeight / 2 - bottomUnits,
      center.z
    );
    meshContainer.castShadow = true;
    meshContainer.receiveShadow = true;
    partAGroup.add(meshContainer);

    partAGroup.visible = settings.previewMode !== 'modelOnly';
    partBGroup.visible = false;
  }

  container.add(partAGroup);
  container.add(partBGroup);

  return { moldGroup: container, partAGroup, partBGroup };
}

/**
 * Download Part A or Part B as .STL file
 */
export function exportMoldPartToSTL(
  group: THREE.Group,
  filename: string
): void {
  const exporter = new STLExporter();
  const result = exporter.parse(group, { binary: true });

  const blob = new Blob([result], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.stl') ? filename : `${filename}.stl`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download full Mold Assembly as .GLB file
 */
export function exportMoldAssemblyToGLTF(
  group: THREE.Group,
  filename: string
): void {
  const exporter = new GLTFExporter();
  exporter.parse(
    group,
    (gltf) => {
      const output = gltf instanceof ArrayBuffer ? gltf : JSON.stringify(gltf, null, 2);
      const blob = new Blob([output], {
        type: gltf instanceof ArrayBuffer ? 'application/octet-stream' : 'application/json',
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename.endsWith('.glb') ? filename : `${filename}.glb`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    (err) => {
      console.error('GLTF Export Error:', err);
    },
    { binary: true }
  );
}
