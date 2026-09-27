export type SurfacePatternType =
  | 'none'
  | 'brushed_metal'
  | 'micro_sand'
  | 'carbon_weave'
  | 'print_layers';

export interface MaterialSettings {
  useOriginalMaterials: boolean;
  presetId: string;
  color: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  ior: number;
  transmission: number;
  opacity: number;
  emissiveColor: string;
  emissiveIntensity: number;
  wireframe: boolean;
  flatShading: boolean;
  doubleSided: boolean;
  surfacePattern: SurfacePatternType;
  patternScale: number;
  bumpScale: number;
}

export interface SingleLightConfig {
  enabled: boolean;
  color: string;
  intensity: number;
  azimuth: number; // -180 to 180 degrees
  elevation: number; // 5 to 90 degrees
  distance: number;
  castShadow?: boolean;
}

export interface LightingSettings {
  presetId: string;
  keyLight: SingleLightConfig;
  fillLight: SingleLightConfig;
  rimLight: SingleLightConfig;
  ambientIntensity: number;
  ambientColor: string;
  envIntensity: number;
  exposure: number;
  shadowsEnabled: boolean;
  shadowSoftness: number;
  showLightHelpers: boolean;
  backgroundColor: string;
  showGrid: boolean;
  showAxes: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
}

export interface SubMeshInfo {
  id: string;
  name: string;
  vertices: number;
  triangles: number;
  visible: boolean;
}

export interface ModelStats {
  fileName: string;
  fileFormat: 'BLEND' | 'STL' | 'OBJ' | 'GLB' | 'PLY' | 'FBX' | '3DS' | 'DAE' | 'PRESET';
  fileSize: string;
  blenderVersion?: string;
  meshCount: number;
  vertexCount: number;
  triangleCount: number;
  dimensions: { x: number; y: number; z: number };
  subMeshes: SubMeshInfo[];
  parseNotes?: string;
}

export interface TransformSettings {
  scale: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  alignToFloor: boolean;
}

export interface UsdzExportOptions {
  fileName: string;
  scaleUnit: 'm' | 'cm' | 'mm';
  placeOnFloor: boolean;
  bakeProceduralTextures: boolean;
}

export type CameraPresetView = 'perspective' | 'front' | 'right' | 'top' | 'iso';

export interface MaterialPreset {
  id: string;
  name: string;
  category: string;
  swatchGradient: string;
  settings: Omit<MaterialSettings, 'useOriginalMaterials' | 'presetId' | 'wireframe'>;
}

export interface LightingPreset {
  id: string;
  name: string;
  description: string;
  settings: Partial<LightingSettings>;
}
