import React, { useState } from 'react';
import {
  LightingSettings,
  MaterialSettings,
  SingleLightConfig,
  SurfacePatternType,
} from '../types/studio';
import {
  COLOR_SWATCHES,
  CORE_MATERIAL_FINISHES,
  LIGHTING_PRESETS,
} from '../utils/studioPresets';
import {
  COLOR_SWATCH_TRANSLATIONS,
  FINISH_TRANSLATIONS,
  LIGHTING_PRESET_TRANSLATIONS,
  Language,
  t,
} from '../utils/i18n';
import {
  RotateCcw,
  Sun,
  Palette,
  X,
  Sliders,
  Check,
} from 'lucide-react';

interface MaterialAndLightingInspectorProps {
  language: Language;
  activeTab: 'material' | 'lighting';
  onTabChange: (tab: 'material' | 'lighting') => void;
  materialSettings: MaterialSettings;
  lightingSettings: LightingSettings;
  onUpdateMaterial: (partial: Partial<MaterialSettings>) => void;
  onApplyMaterialPreset?: (presetId: string) => void;
  onResetMaterial: () => void;
  onUpdateLighting: (partial: Partial<LightingSettings>) => void;
  onApplyLightingPreset: (presetId: string) => void;
  onResetLighting: () => void;
  onClose?: () => void;
}

export const MaterialAndLightingInspector: React.FC<
  MaterialAndLightingInspectorProps
> = ({
  language,
  activeTab,
  onTabChange,
  materialSettings,
  lightingSettings,
  onUpdateMaterial,
  onResetMaterial,
  onUpdateLighting,
  onApplyLightingPreset,
  onResetLighting,
  onClose,
}) => {
  const [showAdvancedSliders, setShowAdvancedSliders] = useState(false);
  const [selectedLightKey, setSelectedLightKey] = useState<
    'keyLight' | 'fillLight' | 'rimLight'
  >('keyLight');

  const updateSingleLight = (
    lightKey: 'keyLight' | 'fillLight' | 'rimLight',
    partial: Partial<SingleLightConfig>
  ) => {
    onUpdateLighting({
      [lightKey]: {
        ...lightingSettings[lightKey],
        ...partial,
      },
    });
  };

  const handleApplyFinish = (finishId: 'matte' | 'glossy' | 'transparent' | 'metallic') => {
    const finish = CORE_MATERIAL_FINISHES.find((f) => f.id === finishId);
    if (!finish) return;
    onUpdateMaterial({
      useOriginalMaterials: false,
      presetId: finishId,
      ...finish.settings,
    });
  };

  const currentLight = lightingSettings[selectedLightKey];

  // Determine active finish
  const activeFinishId = !materialSettings.useOriginalMaterials
    ? materialSettings.presetId
    : null;

  return (
    <aside className="w-full lg:w-96 shrink-0 h-full bg-[#12151C] lg:border-l border-white/[0.07] flex flex-col overflow-hidden">
      {/* Mobile Drawer Header with Close Button */}
      {onClose && (
        <div className="lg:hidden flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] bg-[#0E1017]">
          <span className="text-xs font-semibold text-slate-200">
            {activeTab === 'material'
              ? t(language, 'Malzeme & Doku Stüdyosu', 'Material & Texture Studio')
              : t(language, 'Işık ve Sahne Stüdyosu', 'Lighting & Scene Studio')}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Segmented Inspector Mode Switcher */}
      <div className="p-3.5 sm:p-4 border-b border-white/[0.07]">
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#0B0D11] rounded-lg border border-white/[0.06]">
          <button
            type="button"
            onClick={() => onTabChange('material')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'material'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{t(language, 'Malzeme ve Renk', 'Material & Color')}</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('lighting')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'lighting'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>{t(language, 'Işık ve Sahne', 'Lighting & Scene')}</span>
          </button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.07]">
        {activeTab === 'material' ? (
          <>
            {/* 1. Core Material Finish Selector (Mat, Parlak, Şeffaf, Metalik) */}
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xs font-semibold text-white">
                    {t(language, 'Malzeme Türü', 'Material Finish')}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {t(
                      language,
                      'Modelinize uygulamak istediğiniz ana kaplama tarzını seçin',
                      'Select the primary surface finish for your model'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onResetMaterial}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t(language, 'Sıfırla', 'Reset')}</span>
                </button>
              </div>

              {/* Original File Material Toggle */}
              <button
                type="button"
                onClick={() =>
                  onUpdateMaterial({
                    useOriginalMaterials: true,
                    presetId: 'original',
                  })
                }
                className={`w-full flex items-center justify-between gap-3 p-3 mb-3 rounded-xl text-left transition-colors cursor-pointer ${
                  materialSettings.useOriginalMaterials
                    ? 'bg-emerald-500/15 border border-emerald-500/50 text-white'
                    : 'bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.05] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-7 h-7 rounded-full shrink-0 border border-white/25 shadow-inner"
                    style={{
                      background:
                        'conic-gradient(from 45deg, #38bdf8, #f59e0b, #10b981, #f43f5e, #38bdf8)',
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {t(
                        language,
                        'Dosyanın Orijinal Malzemesi & Dokusu',
                        "Original File Materials & Textures"
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {t(
                        language,
                        'Yüklenen dosyanın kendi yüzey renk ve dokularını kullan',
                        'Preserve native colors and textures from imported file'
                      )}
                    </div>
                  </div>
                </div>
                {materialSettings.useOriginalMaterials && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 shrink-0">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t(language, 'Aktif', 'Active')}</span>
                  </span>
                )}
              </button>

              {/* 4 Core Finishes: Mat, Parlak, Şeffaf, Metalik */}
              <div className="grid grid-cols-2 gap-2">
                {CORE_MATERIAL_FINISHES.map((finish) => {
                  const isSelected =
                    !materialSettings.useOriginalMaterials &&
                    activeFinishId === finish.id;
                  const fTr = FINISH_TRANSLATIONS[finish.id];
                  return (
                    <button
                      key={finish.id}
                      type="button"
                      onClick={() => handleApplyFinish(finish.id)}
                      className={`relative flex flex-col p-3 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 border-2 border-amber-400 text-white shadow-md'
                          : 'bg-white/[0.02] border border-white/[0.07] hover:bg-white/[0.06] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="w-7 h-7 rounded-full border border-white/20 shadow-inner shrink-0"
                          style={{ background: finish.iconGradient }}
                        />
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-white tracking-tight">
                        {fTr ? fTr.name[language] : finish.name}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 leading-snug">
                        {fTr ? fTr.description[language] : finish.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Color Palette & Options (Renk Seçenekleri) */}
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-white">
                  {t(language, 'Renk Seçenekleri', 'Color Options')}
                </h3>
                <span className="text-xs font-mono-tabular text-slate-400 uppercase">
                  {materialSettings.color}
                </span>
              </div>

              {/* Curated Color Swatches Grid */}
              <div className="grid grid-cols-5 gap-2 mb-3.5">
                {COLOR_SWATCHES.map((sw) => {
                  const isCurrent =
                    materialSettings.color.toLowerCase() === sw.hex.toLowerCase();
                  const swName = COLOR_SWATCH_TRANSLATIONS[sw.hex]
                    ? COLOR_SWATCH_TRANSLATIONS[sw.hex][language]
                    : sw.name;
                  return (
                    <button
                      key={sw.hex}
                      type="button"
                      onClick={() =>
                        onUpdateMaterial({
                          color: sw.hex,
                          useOriginalMaterials: false,
                        })
                      }
                      title={swName}
                      className={`group relative flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-amber-400 bg-amber-500/10 scale-105 shadow-sm'
                          : 'border-white/10 hover:border-white/25 bg-white/[0.02]'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full border border-black/30 shadow-inner"
                        style={{ backgroundColor: sw.hex }}
                      />
                      <span className="text-[9px] text-slate-400 truncate max-w-full">
                        {swName.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Input */}
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={materialSettings.color}
                    onChange={(e) =>
                      onUpdateMaterial({
                        color: e.target.value,
                        useOriginalMaterials: false,
                      })
                    }
                    className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <div>
                    <div className="text-xs font-medium text-white">
                      {t(language, 'Özel Renk Paletinden Seç', 'Custom Color Picker')}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {t(
                        language,
                        'İstediğiniz ton veya Hex kodunu uygulayın',
                        'Pick any custom shade or Hex code'
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono-tabular text-amber-400 font-semibold px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                  {materialSettings.color.toUpperCase()}
                </span>
              </label>
            </div>

            {/* 3. Surface Texture Selection (Doku Seçenekleri) */}
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    {t(language, 'Yüzey Dokusu', 'Surface Texture')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t(
                      language,
                      'Modele mikro yüzey kabartması ekleyin',
                      'Apply micro-surface relief pattern to the model'
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    {
                      id: 'none',
                      label: t(language, 'Düz (Pürüzsüz)', 'Smooth (None)'),
                    },
                    {
                      id: 'brushed_metal',
                      label: t(language, 'Fırçalanmış Metal', 'Brushed Metal'),
                    },
                    {
                      id: 'micro_sand',
                      label: t(language, 'Mikro Kumlama', 'Micro Sandblast'),
                    },
                    {
                      id: 'carbon_weave',
                      label: t(language, 'Karbon Fiber', 'Carbon Weave'),
                    },
                    {
                      id: 'print_layers',
                      label: t(language, '3B Baskı Katmanı', '3D Print Layers'),
                    },
                  ] as { id: SurfacePatternType; label: string }[]
                ).map((pat) => {
                  const isSelected = materialSettings.surfacePattern === pat.id;
                  return (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() =>
                        onUpdateMaterial({
                          surfacePattern: pat.id,
                          useOriginalMaterials: false,
                        })
                      }
                      className={`py-2 px-2.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer truncate ${
                        isSelected
                          ? 'bg-amber-500/20 border border-amber-400 text-amber-300 font-semibold'
                          : 'bg-white/[0.02] border border-white/[0.07] text-slate-300 hover:bg-white/[0.05]'
                      }`}
                    >
                      {pat.label}
                    </button>
                  );
                })}
              </div>

              {materialSettings.surfacePattern !== 'none' && (
                <div className="pt-2 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">
                        {t(
                          language,
                          'Doku Belirginliği (Kabartma)',
                          'Texture Relief Depth (Bump)'
                        )}
                      </span>
                      <span className="font-mono-tabular text-amber-400">
                        {(materialSettings.bumpScale * 1000).toFixed(0)} µm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.005"
                      max="0.08"
                      step="0.005"
                      value={materialSettings.bumpScale}
                      onChange={(e) =>
                        onUpdateMaterial({
                          bumpScale: parseFloat(e.target.value),
                          useOriginalMaterials: false,
                        })
                      }
                      className="w-full studio-slider"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Optional Fine-Tuning Sliders Accordion (İnce Ayarlar) */}
            <div className="p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setShowAdvancedSliders(!showAdvancedSliders)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer py-1"
              >
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {t(language, 'Hassas Ayar Kaydırıcıları', 'Fine-Tuning Sliders')}
                  </span>
                </div>
                <span className="text-[11px] text-amber-400">
                  {showAdvancedSliders
                    ? t(language, 'Gizle', 'Hide')
                    : t(language, 'Göster', 'Show')}
                </span>
              </button>

              {showAdvancedSliders && (
                <div className="space-y-3.5 pt-3.5 mt-2 border-t border-white/[0.06]">
                  {/* Roughness (Matlık) */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">
                        {t(
                          language,
                          'Matlık ↔ Parlaklık (Roughness)',
                          'Roughness (Matte ↔ Gloss)'
                        )}
                      </span>
                      <span className="font-mono-tabular text-amber-400">
                        {Math.round(materialSettings.roughness * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={materialSettings.roughness}
                      onChange={(e) =>
                        onUpdateMaterial({
                          roughness: parseFloat(e.target.value),
                          useOriginalMaterials: false,
                        })
                      }
                      className="w-full studio-slider"
                    />
                  </div>

                  {/* Metalness (Metalik Oranı) */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">
                        {t(language, 'Metalik Oranı (Metalness)', 'Metalness')}
                      </span>
                      <span className="font-mono-tabular text-amber-400">
                        {Math.round(materialSettings.metalness * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={materialSettings.metalness}
                      onChange={(e) =>
                        onUpdateMaterial({
                          metalness: parseFloat(e.target.value),
                          useOriginalMaterials: false,
                        })
                      }
                      className="w-full studio-slider"
                    />
                  </div>

                  {/* Transmission (Şeffaflık) */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">
                        {t(
                          language,
                          'Şeffaflık / Cam Oranı (Transmission)',
                          'Transparency / Glass (Transmission)'
                        )}
                      </span>
                      <span className="font-mono-tabular text-amber-400">
                        {Math.round(materialSettings.transmission * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={materialSettings.transmission}
                      onChange={(e) =>
                        onUpdateMaterial({
                          transmission: parseFloat(e.target.value),
                          useOriginalMaterials: false,
                        })
                      }
                      className="w-full studio-slider"
                    />
                  </div>

                  {/* Clearcoat (Cila) */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">
                        {t(
                          language,
                          'Vernik / Cila Katmanı (Clearcoat)',
                          'Clearcoat Layer'
                        )}
                      </span>
                      <span className="font-mono-tabular text-slate-300">
                        {Math.round(materialSettings.clearcoat * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={materialSettings.clearcoat}
                      onChange={(e) =>
                        onUpdateMaterial({
                          clearcoat: parseFloat(e.target.value),
                          useOriginalMaterials: false,
                        })
                      }
                      className="w-full studio-slider"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Viewport Geometry Toggles */}
            <div className="p-4 sm:p-5 space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-300">
                {t(language, 'Görünüm Seçenekleri', 'Display Options')}
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateMaterial({ wireframe: !materialSettings.wireframe })
                  }
                  className={`py-2 px-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                    materialSettings.wireframe
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 font-semibold'
                      : 'bg-white/[0.02] border border-white/[0.06] text-slate-300 hover:bg-white/[0.05]'
                  }`}
                >
                  {t(language, 'Tel Kafes', 'Wireframe')}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateMaterial({ flatShading: !materialSettings.flatShading })
                  }
                  className={`py-2 px-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                    materialSettings.flatShading
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 font-semibold'
                      : 'bg-white/[0.02] border border-white/[0.06] text-slate-300 hover:bg-white/[0.05]'
                  }`}
                >
                  {materialSettings.flatShading
                    ? t(language, 'Fasetli', 'Flat')
                    : t(language, 'Pürüzsüz', 'Smooth')}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateMaterial({ doubleSided: !materialSettings.doubleSided })
                  }
                  className={`py-2 px-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                    materialSettings.doubleSided
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 font-semibold'
                      : 'bg-white/[0.02] border border-white/[0.06] text-slate-300 hover:bg-white/[0.05]'
                  }`}
                >
                  {t(language, 'Çift Yüzey', '2-Sided')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* LIGHTING TAB */}
            {/* 1. Studio Lighting Presets */}
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-white">
                  {t(language, 'Stüdyo Işık Senaryoları', 'Studio Lighting Presets')}
                </h2>
                <button
                  type="button"
                  onClick={onResetLighting}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t(language, 'Sıfırla', 'Reset')}</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {LIGHTING_PRESETS.map((preset) => {
                  const isActive = lightingSettings.presetId === preset.id;
                  const lTr = LIGHTING_PRESET_TRANSLATIONS[preset.id];
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onApplyLightingPreset(preset.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/15 border border-amber-500/45 text-white'
                          : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-semibold">
                        {lTr ? lTr.name[language] : preset.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {lTr ? lTr.description[language] : preset.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Three-Point Light Rig Controls (Key / Fill / Rim) */}
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white">
                  {t(language, '3 Noktalı Işık Kaynakları', '3-Point Light Rig')}
                </h3>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lightingSettings.showLightHelpers}
                    onChange={(e) =>
                      onUpdateLighting({ showLightHelpers: e.target.checked })
                    }
                    className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                  />
                  <span>{t(language, 'Işıkları Göster', 'Show Helpers')}</span>
                </label>
              </div>

              {/* Light Selector Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#0B0D11] rounded-lg border border-white/[0.06]">
                {(
                  [
                    {
                      key: 'keyLight',
                      label: t(language, 'Ana Işık', 'Key Light'),
                    },
                    {
                      key: 'fillLight',
                      label: t(language, 'Dolgu Işığı', 'Fill Light'),
                    },
                    {
                      key: 'rimLight',
                      label: t(language, 'Kontur (Rim)', 'Rim Light'),
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedLightKey(tab.key)}
                    className={`py-1.5 px-2 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      selectedLightKey === tab.key
                        ? 'bg-white/10 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Selected Light Controls */}
              <div className="space-y-3.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentLight.enabled}
                      onChange={(e) =>
                        updateSingleLight(selectedLightKey, {
                          enabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <span>{t(language, 'Işık Kaynağı Aktif', 'Light Enabled')}</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono-tabular text-slate-400 uppercase">
                      {currentLight.color}
                    </span>
                    <input
                      type="color"
                      value={currentLight.color}
                      onChange={(e) =>
                        updateSingleLight(selectedLightKey, {
                          color: e.target.value,
                        })
                      }
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">
                      {t(language, 'Işık Şiddeti', 'Light Intensity')}
                    </span>
                    <span className="font-mono-tabular text-amber-400">
                      {currentLight.intensity.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="0.05"
                    value={currentLight.intensity}
                    onChange={(e) =>
                      updateSingleLight(selectedLightKey, {
                        intensity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full studio-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">
                      {t(language, 'Yatay Açı (Azimuth)', 'Horizontal Angle (Azimuth)')}
                    </span>
                    <span className="font-mono-tabular text-slate-300">
                      {currentLight.azimuth}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={currentLight.azimuth}
                    onChange={(e) =>
                      updateSingleLight(selectedLightKey, {
                        azimuth: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full studio-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">
                      {t(language, 'Yükseklik Açısı', 'Elevation Angle')}
                    </span>
                    <span className="font-mono-tabular text-slate-300">
                      {currentLight.elevation}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="88"
                    step="1"
                    value={currentLight.elevation}
                    onChange={(e) =>
                      updateSingleLight(selectedLightKey, {
                        elevation: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full studio-slider"
                  />
                </div>
              </div>
            </div>

            {/* 3. Studio Environment Reflection & Exposure */}
            <div className="p-4 sm:p-5 space-y-4">
              <h3 className="text-xs font-semibold text-white">
                {t(
                  language,
                  'Ortam Yansıması ve Pozlama',
                  'Environment Reflection & Exposure'
                )}
              </h3>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">
                    {t(
                      language,
                      'Stüdyo HDRI Yansıma Gücü',
                      'Studio HDRI Reflection Intensity'
                    )}
                  </span>
                  <span className="font-mono-tabular text-amber-400">
                    {lightingSettings.envIntensity.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.5"
                  step="0.05"
                  value={lightingSettings.envIntensity}
                  onChange={(e) =>
                    onUpdateLighting({
                      envIntensity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full studio-slider"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">
                    {t(language, 'Kamera Pozlama (ACES)', 'Camera Exposure (ACES)')}
                  </span>
                  <span className="font-mono-tabular text-slate-300">
                    {lightingSettings.exposure.toFixed(2)} EV
                  </span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.2"
                  step="0.05"
                  value={lightingSettings.exposure}
                  onChange={(e) =>
                    onUpdateLighting({
                      exposure: parseFloat(e.target.value),
                    })
                  }
                  className="w-full studio-slider"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-300">
                  {t(language, 'Stüdyo Arka Plan Rengi', 'Studio Background Color')}
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    '#0B0D11',
                    '#131822',
                    '#1C1917',
                    '#06161E',
                    '#27272A',
                  ].map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => onUpdateLighting({ backgroundColor: bg })}
                      className={`w-5 h-5 rounded-full border cursor-pointer ${
                        lightingSettings.backgroundColor.toLowerCase() ===
                        bg.toLowerCase()
                          ? 'border-amber-400 scale-110'
                          : 'border-white/20'
                      }`}
                      style={{ backgroundColor: bg }}
                    />
                  ))}
                  <input
                    type="color"
                    value={lightingSettings.backgroundColor}
                    onChange={(e) =>
                      onUpdateLighting({ backgroundColor: e.target.value })
                    }
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
