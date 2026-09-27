export type Language = 'tr' | 'en';

export interface LocalizedText {
  tr: string;
  en: string;
}

export function t(lang: Language, trText: string, enText: string): string {
  return lang === 'en' ? enText : trText;
}

export const SAMPLE_MODEL_TRANSLATIONS: Record<
  string,
  { name: LocalizedText; subtitle: LocalizedText }
> = {
  turbine_stl: {
    name: {
      tr: 'Aero-Türbin Çarkı (12 Kanatlı)',
      en: 'Aero-Turbine Impeller (12-Blade)',
    },
    subtitle: {
      tr: 'Endüstriyel CAD Prototipi · Çok Parçalı',
      en: 'Industrial CAD Prototype · Multi-Part',
    },
  },
  parametric_blend: {
    name: {
      tr: 'Parametrik Torus Heykeli',
      en: 'Parametric Torus Sculpture',
    },
    subtitle: {
      tr: 'Blender 4.0 SDNA Ağ Yapısı · Yüksek Poligon',
      en: 'Blender 4.0 SDNA Mesh · High Polygon',
    },
  },
  robotic_gimbal: {
    name: {
      tr: 'Robotik Kardan Mafsalı',
      en: 'Robotic Gimbal Joint',
    },
    subtitle: {
      tr: 'Mekanik Eksen Takımı · 4 Alt Parça',
      en: 'Mechanical Axis Assembly · 4 Sub-Parts',
    },
  },
};

export const FINISH_TRANSLATIONS: Record<
  'matte' | 'glossy' | 'transparent' | 'metallic',
  { name: LocalizedText; description: LocalizedText }
> = {
  matte: {
    name: { tr: 'Mat', en: 'Matte' },
    description: {
      tr: 'Işık yansıtmayan pürüzsüz saten kaplama',
      en: 'Non-reflective smooth satin finish',
    },
  },
  glossy: {
    name: { tr: 'Parlak', en: 'Glossy' },
    description: {
      tr: 'Yüksek yansımalı berrak vernikli kaplama',
      en: 'High-gloss clear-coated reflective finish',
    },
  },
  transparent: {
    name: { tr: 'Şeffaf', en: 'Transparent' },
    description: {
      tr: 'Işık geçiren berrak cam ve kristal doku',
      en: 'Light-transmitting clear glass & acrylic',
    },
  },
  metallic: {
    name: { tr: 'Metalik', en: 'Metallic' },
    description: {
      tr: 'Ayna parlaklığında krom ve alaşım yansıma',
      en: 'Mirror-like chrome and alloy reflection',
    },
  },
};

export const COLOR_SWATCH_TRANSLATIONS: Record<string, LocalizedText> = {
  '#181A20': { tr: 'Obsidyen Siyah', en: 'Obsidian Black' },
  '#94A3B8': { tr: 'Titanyum Gri', en: 'Titanium Gray' },
  '#F8FAFC': { tr: 'Saf Beyaz', en: 'Pure White' },
  '#F59E0B': { tr: 'Kehribar Altın', en: 'Amber Gold' },
  '#EA580C': { tr: 'Bakır Bronz', en: 'Copper Bronze' },
  '#E11D48': { tr: 'Yakut Kırmızı', en: 'Ruby Red' },
  '#2563EB': { tr: 'Safir Mavi', en: 'Sapphire Blue' },
  '#059669': { tr: 'Zümrüt Yeşil', en: 'Emerald Green' },
  '#38BDF8': { tr: 'Gökyüzü Mavisi', en: 'Sky Blue' },
  '#D4B996': { tr: 'Sıcak Bej', en: 'Warm Beige' },
};

export const LIGHTING_PRESET_TRANSLATIONS: Record<
  string,
  { name: LocalizedText; description: LocalizedText }
> = {
  studio_three_point: {
    name: {
      tr: 'Üç Noktalı Ürün Stüdyosu',
      en: 'Three-Point Product Studio',
    },
    description: {
      tr: 'Dengeli ana ışık, soğuk dolgu ve keskin kontur aydınlatması',
      en: 'Balanced key light, cool fill, and crisp rim illumination',
    },
  },
  golden_hour: {
    name: {
      tr: 'Sıcak Altın Saat',
      en: 'Warm Golden Hour',
    },
    description: {
      tr: 'Kehribar ana ışık ve derin atmosferik kontrast',
      en: 'Amber key light with deep atmospheric contrast',
    },
  },
  technical_lab: {
    name: {
      tr: 'Endüstriyel CAD Laboratuvarı',
      en: 'Industrial CAD Lab',
    },
    description: {
      tr: 'Yüksek netlikli nötr beyaz mühendislik inceleme ışığı',
      en: 'High-clarity neutral white engineering inspection rig',
    },
  },
  dramatic_rim: {
    name: {
      tr: 'Dramatik Kontur & Silüet',
      en: 'Dramatic Rim & Silhouette',
    },
    description: {
      tr: 'Düşük dolgu ışığı ve keskin kenar vurguları',
      en: 'Low fill light with sharp edge highlights',
    },
  },
};
