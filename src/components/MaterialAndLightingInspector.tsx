import React, { useState } from 'react';
import {
  LightingSettings,
  MaterialSettings,
  SingleLightConfig,
  SurfacePatternType,
} from '../types/studio';
import {
  COLOR_SWATCHES,
  LIGHTING_PRESETS,
  MATERIAL_PRESETS,
} from '../utils/studioPresets';
import { RotateCcw, Sun, Palette, X } from 'lucide-react';

interface MaterialAndLightingInspectorProps {
  activeTab: 'material' | 'lighting';
  onTabChange: (tab: 'material' | 'lighting') => void;
  materialSettings: MaterialSettings;
  lightingSettings: LightingSettings;
  onUpdateMaterial: (partial: Partial<MaterialSettings>) => void;
  onApplyMaterialPreset: (presetId: string) => void;
  onResetMaterial: () => void;
  onUpdateLighting: (partial: Partial<LightingSettings>) => void;
  onApplyLightingPreset: (presetId: string) => void;
  onResetLighting: () => void;
  onClose?: () => void;
}

export const MaterialAndLightingInspector: React.FC<
  MaterialAndLightingInspectorProps
> = ({
  activeTab,
  onTabChange,
  materialSettings,
  lightingSettings,
  onUpdateMaterial,
  onApplyMaterialPreset,
  onResetMaterial,
  onUpdateLighting,
  onApplyLightingPreset,
  onResetLighting,
  onClose,
}) => {
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

  const currentLight = lightingSettings[selectedLightKey];

  return (
    <aside className="w-full lg:w-96 shrink-0 h-full bg-[#12151C] lg:border-l border-white/[0.07] flex flex-col overflow-hidden">
      {/* Mobile Drawer Header with Close Button */}
      {onClose && (
        <div className="lg:hidden flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] bg-[#0E1017]">
          <span className="text-xs font-semibold text-slate-200">
            {activeTab === 'material' ? 'Malzeme Laboratuvarı' : 'Işık ve Sahne Stüdyosu'}
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
            <span>Malzeme Ayarları</span>
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
            <span>Işık ve Sahne</span>
          </button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.07]">
        {activeTab === 'material' ? (
          <>
            {/* 1. Original File Material & Studio Presets */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-slate-200">
                  Malzeme Kaynağı ve Hazır Profiller
                </h2>
                <button
                  type="button"
                  onClick={onResetMaterial}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Orijinale Dön</span>
                </button>
              </div>

              {/* Original File Material & Textures Toggle Card */}
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
                    : 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-slate-300'
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
                      Dosyanın Orijinal Materyal & Dokuları
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      Aktarılan modelin kendi yüzey renklerini ve dokularını korur
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold shrink-0 ${
                    materialSettings.useOriginalMaterials
                      ? 'text-emerald-300'
                      : 'text-slate-400'
                  }`}
                >
                  {materialSettings.useOriginalMaterials ? 'Aktif' : 'Seç'}
                </span>
              </button>

              <div className="text-[11px] text-slate-400 mb-2">
                Stüdyo PBR Malzeme Kütüphanesi (Üzerine Uygula)
              </div>

              <div className="grid grid-cols-2 gap-2">
                {MATERIAL_PRESETS.map((preset) => {
                  const isActive =
                    !materialSettings.useOriginalMaterials &&
                    materialSettings.presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onApplyMaterialPreset(preset.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/15 border border-amber-500/45 text-white'
                          : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] text-slate-300'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full shrink-0 border border-white/20 shadow-inner"
                        style={{ background: preset.swatchGradient }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {preset.category}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Base Albedo Color & Curated Swatches */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-200">
                  Ana Yüzey Rengi (Albedo)
                </span>
                <span className="text-xs font-mono-tabular text-slate-400 uppercase">
                  {materialSettings.color}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <label className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 cursor-pointer hover:border-white/25 transition-colors">
                  <input
                    type="color"
                    value={materialSettings.color}
                    onChange={(e) =>
                      onUpdateMaterial({
                        color: e.target.value,
                        presetId: 'custom',
                      })
                    }
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs text-slate-200">Özel Renk Seç</span>
                </label>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_SWATCHES.map((sw) => (
                    <button
                      key={sw.hex}
                      type="button"
                      onClick={() =>
                        onUpdateMaterial({ color: sw.hex, presetId: 'custom' })
                      }
                      title={sw.name}
                      className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                        materialSettings.color.toLowerCase() ===
                        sw.hex.toLowerCase()
                          ? 'border-amber-400 scale-110'
                          : 'border-white/15 hover:scale-105'
                      }`}
                      style={{ backgroundColor: sw.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Physical PBR Sliders */}
            <div className="p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-200">
                Fiziksel Yüzey Parametreleri
              </h3>

              {/* Metalness */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300">Metaliklik (Metalness)</span>
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
                      presetId: 'custom',
                    })
                  }
                  className="w-full studio-slider"
                />
              </div>

              {/* Roughness */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300">Pürüzlülük (Roughness)</span>
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
                      presetId: 'custom',
                    })
                  }
                  className="w-full studio-slider"
                />
              </div>

              {/* Clearcoat */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300">Vernik Katmanı (Clearcoat)</span>
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
                      presetId: 'custom',
                    })
                  }
                  className="w-full studio-slider"
                />
              </div>

              {/* Clearcoat Roughness */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300">Vernik Pürüzlülüğü</span>
                  <span className="font-mono-tabular text-slate-300">
                    {Math.round(materialSettings.clearcoatRoughness * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={materialSettings.clearcoatRoughness}
                  onChange={(e) =>
                    onUpdateMaterial({
                      clearcoatRoughness: parseFloat(e.target.value),
                      presetId: 'custom',
                    })
                  }
                  className="w-full studio-slider"
                />
              </div>

              {/* Transmission / Glass */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300">
                    Işık Geçirgenliği (Cam / Reçine)
                  </span>
                  <span className="font-mono-tabular text-slate-300">
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
                      presetId: 'custom',
                    })
                  }
                  className="w-full studio-slider"
                />
              </div>

              {/* IOR */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300">Kırılma İndisi (IOR)</span>
                  <span className="font-mono-tabular text-slate-300">
                    {materialSettings.ior.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.33"
                  step="0.01"
                  value={materialSettings.ior}
                  onChange={(e) =>
                    onUpdateMaterial({
                      ior: parseFloat(e.target.value),
                      presetId: 'custom',
                    })
                  }
                  className="w-full studio-slider"
                />
              </div>

              {/* Opacity */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300">Opaklık (Opacity)</span>
                  <span className="font-mono-tabular text-slate-300">
                    {Math.round(materialSettings.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="1"
                  step="0.01"
                  value={materialSettings.opacity}
                  onChange={(e) =>
                    onUpdateMaterial({
                      opacity: parseFloat(e.target.value),
                      presetId: 'custom',
                    })
                  }
                  className="w-full studio-slider"
                />
              </div>
            </div>

            {/* 4. Procedural Micro-Surface Pattern (Exports to USDZ) */}
            <div className="p-5 space-y-3.5">
              <h3 className="text-xs font-semibold text-slate-200">
                Mikro Yüzey Dokusu (USDZ Uyumlu)
              </h3>

              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'none', label: 'Pürüzsüz (Yok)' },
                    { id: 'brushed_metal', label: 'Fırçalanmış Metal' },
                    { id: 'micro_sand', label: 'Mikro Kumlama' },
                    { id: 'carbon_weave', label: 'Karbon Dokuma' },
                    { id: 'print_layers', label: '3B Baskı Katmanı' },
                  ] as { id: SurfacePatternType; label: string }[]
                ).map((pat) => (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() =>
                      onUpdateMaterial({
                        surfacePattern: pat.id,
                        presetId: 'custom',
                      })
                    }
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer whitespace-nowrap truncate ${
                      materialSettings.surfacePattern === pat.id
                        ? 'bg-amber-500/15 border border-amber-500/45 text-amber-300'
                        : 'bg-white/[0.02] border border-white/[0.06] text-slate-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    {pat.label}
                  </button>
                ))}
              </div>

              {materialSettings.surfacePattern !== 'none' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Doku Sıklığı</span>
                      <span className="font-mono-tabular text-slate-300">
                        {materialSettings.patternScale}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="1"
                      value={materialSettings.patternScale}
                      onChange={(e) =>
                        onUpdateMaterial({
                          patternScale: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full studio-slider"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Kabartma Derinliği</span>
                      <span className="font-mono-tabular text-slate-300">
                        {(materialSettings.bumpScale * 1000).toFixed(0)} µm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.005"
                      max="0.1"
                      step="0.005"
                      value={materialSettings.bumpScale}
                      onChange={(e) =>
                        onUpdateMaterial({
                          bumpScale: parseFloat(e.target.value),
                        })
                      }
                      className="w-full studio-slider"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Emissive Glow */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-200">
                  Işıma (Emissive) Katmanı
                </h3>
                <input
                  type="color"
                  value={materialSettings.emissiveColor}
                  onChange={(e) =>
                    onUpdateMaterial({ emissiveColor: e.target.value })
                  }
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Işıma Şiddeti</span>
                  <span className="font-mono-tabular text-slate-300">
                    {materialSettings.emissiveIntensity.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={materialSettings.emissiveIntensity}
                  onChange={(e) =>
                    onUpdateMaterial({
                      emissiveIntensity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full studio-slider"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* LIGHTING TAB */}
            {/* 1. Studio Lighting Presets */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-slate-200">
                  Stüdyo Aydınlatma Senaryoları
                </h2>
                <button
                  type="button"
                  onClick={onResetLighting}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Sıfırla</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {LIGHTING_PRESETS.map((preset) => {
                  const isActive = lightingSettings.presetId === preset.id;
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
                      <div className="text-xs font-semibold">{preset.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {preset.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Three-Point Light Rig Controls (Key / Fill / Rim) */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-200">
                  3 Noktalı Işık Kaynakları
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
                  <span>Vektörleri Göster</span>
                </label>
              </div>

              {/* Light Selector Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#0B0D11] rounded-lg border border-white/[0.06]">
                {(
                  [
                    { key: 'keyLight', label: 'Ana Işık' },
                    { key: 'fillLight', label: 'Dolgu Işığı' },
                    { key: 'rimLight', label: 'Kontur (Rim)' },
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
                    <span>Işık Kaynağı Aktif</span>
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
                    <span className="text-slate-300">Işık Şiddeti (Lümen)</span>
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
                    <span className="text-slate-300">Yatay Yörünge Açısı</span>
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
                    <span className="text-slate-300">Dikey Yükseklik Açısı</span>
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
            <div className="p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-200">
                Ortam Yansıması ve Pozlama
              </h3>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">
                    Stüdyo HDRI Yansıma Gücü
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
                  <span className="text-slate-300">Ortam Işığı (Ambient)</span>
                  <span className="font-mono-tabular text-slate-300">
                    {lightingSettings.ambientIntensity.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={lightingSettings.ambientIntensity}
                  onChange={(e) =>
                    onUpdateLighting({
                      ambientIntensity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full studio-slider"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Kamera Pozlama (ACES)</span>
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
            </div>

            {/* 4. Shadows & Background */}
            <div className="p-5 space-y-3.5">
              <h3 className="text-xs font-semibold text-slate-200">
                Gölgeler ve Sahne Arka Planı
              </h3>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-slate-300">
                  Yumuşak Zemin Gölgeleri
                </span>
                <input
                  type="checkbox"
                  checked={lightingSettings.shadowsEnabled}
                  onChange={(e) =>
                    onUpdateLighting({ shadowsEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </label>

              {lightingSettings.shadowsEnabled && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Gölge Yumuşaklığı</span>
                    <span className="font-mono-tabular text-slate-300">
                      {lightingSettings.shadowSoftness} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="0.5"
                    value={lightingSettings.shadowSoftness}
                    onChange={(e) =>
                      onUpdateLighting({
                        shadowSoftness: parseFloat(e.target.value),
                      })
                    }
                    className="w-full studio-slider"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-300">
                  Stüdyo Arka Plan Rengi
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
