import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  Box,
  Layers,
  Download,
  Sliders,
  Scissors,
  Eye,
  Settings2,
  Check,
  AlertCircle,
  HelpCircle,
  Maximize2,
  Minimize2,
  Calculator,
  Scale,
  FlaskConical,
} from 'lucide-react';
import { MoldSettings, ModelStats } from '../types/studio';
import { Language, t } from '../utils/i18n';
import {
  calculateMoldMetrics,
  exportMoldPartToSTL,
  exportMoldAssemblyToGLTF,
} from '../utils/moldGenerator';

interface SiliconeMoldInspectorProps {
  language: Language;
  moldSettings: MoldSettings;
  modelStats: ModelStats;
  modelGroup: THREE.Group | null;
  partAGroup: THREE.Group | null;
  partBGroup: THREE.Group | null;
  moldGroup: THREE.Group | null;
  onUpdateMoldSettings: (partial: Partial<MoldSettings>) => void;
  onResetMoldSettings: () => void;
}

export const SiliconeMoldInspector: React.FC<SiliconeMoldInspectorProps> = ({
  language,
  moldSettings,
  modelStats,
  modelGroup,
  partAGroup,
  partBGroup,
  moldGroup,
  onUpdateMoldSettings,
  onResetMoldSettings,
}) => {
  const metrics = useMemo(
    () => calculateMoldMetrics(modelGroup, moldSettings),
    [modelGroup, moldSettings]
  );

  const handleDownloadPartA = () => {
    if (!partAGroup) return;
    const name = modelStats.fileName.replace(/\.[^/.]+$/, '');
    exportMoldPartToSTL(
      partAGroup,
      `${name}_Silikon_Kalip_Parca_A_${moldSettings.splitAxis.toUpperCase()}.stl`
    );
  };

  const handleDownloadPartB = () => {
    if (!partBGroup) return;
    const name = modelStats.fileName.replace(/\.[^/.]+$/, '');
    exportMoldPartToSTL(
      partBGroup,
      `${name}_Silikon_Kalip_Parca_B_${moldSettings.splitAxis.toUpperCase()}.stl`
    );
  };

  const handleDownloadFullAssembly = () => {
    if (!moldGroup) return;
    const name = modelStats.fileName.replace(/\.[^/.]+$/, '');
    exportMoldAssemblyToGLTF(moldGroup, `${name}_Silikon_Kalip_Montaji.glb`);
  };

  return (
    <div className="flex flex-col h-full bg-[#12151C] text-slate-100 border-l border-white/10 w-full lg:w-[360px] shrink-0 overflow-y-auto custom-scrollbar select-none">
      {/* Panel Header */}
      <div className="p-4 border-b border-white/10 bg-[#0E1017] flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              {t(language, '3D Silikon Kalıp Üretici', '3D Silicone Mold Studio')}
            </h3>
            <p className="text-[11px] text-slate-400">
              {t(
                language,
                'Döküm kutusu, kilit pimleri & sprue kanalı',
                'Mold box, registration pins & sprue funnel'
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetMoldSettings}
          className="text-[11px] font-medium text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          {t(language, 'Sıfırla', 'Reset')}
        </button>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Enable Mold Switch */}
        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FlaskConical className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-200">
              {t(language, 'Kalıp Görünümünü Etkinleştir', 'Enable Mold View')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onUpdateMoldSettings({ enabled: !moldSettings.enabled })}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              moldSettings.enabled ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                moldSettings.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {moldSettings.enabled && (
          <>
            {/* Mold Structure Type */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>{t(language, 'Kalıp Yapısı Tipi', 'Mold Structure Type')}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {moldSettings.moldType === 'two-part'
                    ? t(language, '2 Parçalı Ayrılabilir', '2-Part Split Box')
                    : t(language, 'Tek Parçalı Açık', '1-Part Container')}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateMoldSettings({ moldType: 'two-part' })}
                  className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    moldSettings.moldType === 'two-part'
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    {moldSettings.moldType === 'two-part' && (
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </div>
                  <span className="text-xs font-medium">
                    {t(language, '2 Parçalı Kalıp', '2-Part Split')}
                  </span>
                  <span className="text-[10px] opacity-70">
                    {t(language, 'Erkek/dişi kilitli', 'With locking pins')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateMoldSettings({ moldType: 'one-part' })}
                  className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    moldSettings.moldType === 'one-part'
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Box className="w-4 h-4 text-cyan-400" />
                    {moldSettings.moldType === 'one-part' && (
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </div>
                  <span className="text-xs font-medium">
                    {t(language, 'Tek Parçalı Havuz', '1-Part Open')}
                  </span>
                  <span className="text-[10px] opacity-70">
                    {t(language, 'Üstü açık kutu', 'Top-open container')}
                  </span>
                </button>
              </div>
            </div>

            {/* Split Axis & Offset (Only for 2-Part Mold) */}
            {moldSettings.moldType === 'two-part' && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-amber-400" />
                    {t(language, 'Ayırma Ekseni & Yüksekliği', 'Split Axis & Offset')}
                  </span>
                  <span className="text-[11px] font-mono text-cyan-300">
                    {moldSettings.splitAxis.toUpperCase()} ({moldSettings.splitOffset > 0 ? `+${moldSettings.splitOffset}%` : `${moldSettings.splitOffset}%`})
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-lg">
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <button
                      key={axis}
                      type="button"
                      onClick={() => onUpdateMoldSettings({ splitAxis: axis })}
                      className={`py-1 text-xs font-semibold rounded uppercase transition-colors cursor-pointer ${
                        moldSettings.splitAxis === axis
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {axis} {axis === 'y' ? t(language, '(Yatay)', '(Horiz)') : ''}
                    </button>
                  ))}
                </div>

                {/* Offset Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{t(language, 'Ayırma Düzlemi Konumu', 'Split Plane Position')}</span>
                    <span className="font-mono text-amber-300">{moldSettings.splitOffset}%</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="1"
                    value={moldSettings.splitOffset}
                    onChange={(e) =>
                      onUpdateMoldSettings({ splitOffset: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Wall Thickness & Pin Geometry Settings */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
                {t(language, 'Ölçü & Tolerans Ayarları', 'Dimensions & Tolerance')}
              </span>

              {/* Wall Thickness Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{t(language, 'Duvar Et Kalınlığı', 'Wall Thickness')}</span>
                  <span className="font-mono text-cyan-300">{moldSettings.wallThickness} mm</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={moldSettings.wallThickness}
                  onChange={(e) =>
                    onUpdateMoldSettings({ wallThickness: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Bottom Thickness Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{t(language, 'Taban/Tavan Et Kalınlığı', 'Bottom/Top Thickness')}</span>
                  <span className="font-mono text-cyan-300">{moldSettings.bottomThickness} mm</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={moldSettings.bottomThickness}
                  onChange={(e) =>
                    onUpdateMoldSettings({ bottomThickness: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Pouring & Assembly Elements Checkboxes */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
              <span className="text-xs font-medium text-slate-300">
                {t(language, 'Döküm ve Montaj Elemanları', 'Pouring & Assembly Elements')}
              </span>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={moldSettings.addSprue}
                  onChange={(e) => onUpdateMoldSettings({ addSprue: e.target.checked })}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 accent-cyan-400 cursor-pointer"
                />
                <span>{t(language, 'Döküm Hunisi (Sprue Funnel)', 'Pouring Sprue Funnel')}</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={moldSettings.addAirVents}
                  onChange={(e) => onUpdateMoldSettings({ addAirVents: e.target.checked })}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 accent-cyan-400 cursor-pointer"
                />
                <span>{t(language, 'Hava Tahliye Kanalları', 'Air Escape Vents')}</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={moldSettings.addLugs}
                  onChange={(e) => onUpdateMoldSettings({ addLugs: e.target.checked })}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 accent-cyan-400 cursor-pointer"
                />
                <span>{t(language, 'Cıvata / Kelepçe Kulakçıkları', 'Clamping Lug Ears')}</span>
              </label>
            </div>

            {/* Silicone Volume & Mass Metrics Card */}
            <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-200 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-cyan-400" />
                  {t(language, 'Silikon Miktar Hesaplayıcı', 'Silicone Volume Calculator')}
                </span>
                <span className="text-[10px] text-cyan-400/80 font-mono">RTV 1.1 g/cm³</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-lg bg-black/40 border border-cyan-500/20">
                  <div className="text-[10px] text-slate-400">
                    {t(language, 'Gerekli Silikon Hacmi', 'Required Volume')}
                  </div>
                  <div className="text-sm font-mono font-bold text-cyan-300">
                    {metrics.siliconeVolumeCm3} <span className="text-xs">mL (cm³)</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-black/40 border border-cyan-500/20">
                  <div className="text-[10px] text-slate-400">
                    {t(language, 'Tahmini Ağırlık', 'Estimated Weight')}
                  </div>
                  <div className="text-sm font-mono font-bold text-amber-300">
                    {metrics.siliconeWeightGrams} <span className="text-xs">Gram</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-cyan-500/20 font-mono">
                <div className="flex justify-between">
                  <span>{t(language, 'Dış Kalıp Boyutları:', 'Outer Mold Dimensions:')}</span>
                  <span className="text-slate-200">
                    {metrics.outerDimensionsMm.x} × {metrics.outerDimensionsMm.y} × {metrics.outerDimensionsMm.z} mm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t(language, 'Model Tahmini Hacmi:', 'Model Approx Volume:')}</span>
                  <span className="text-slate-200">{metrics.modelVolumeCm3} cm³</span>
                </div>
              </div>
            </div>

            {/* Exploded View & Preview Mode */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                {t(language, '3D Görünüm & Patlatma', '3D View & Exploded Mode')}
              </span>

              {/* Exploded Slider */}
              {moldSettings.moldType === 'two-part' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{t(language, 'Patlatılmış Görünüm Mesafesi', 'Exploded View Distance')}</span>
                    <span className="font-mono text-amber-300">{moldSettings.explodedDistance} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="2"
                    value={moldSettings.explodedDistance}
                    onChange={(e) =>
                      onUpdateMoldSettings({ explodedDistance: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              )}

              {/* Translucent Toggle */}
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={moldSettings.transparentMold}
                  onChange={(e) => onUpdateMoldSettings({ transparentMold: e.target.checked })}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 accent-cyan-400 cursor-pointer"
                />
                <span>{t(language, 'Şeffaf Silikon Görünümü', 'Transparent Mold Material')}</span>
              </label>

              {/* Part Selector Tabs */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => onUpdateMoldSettings({ previewMode: 'assembly' })}
                  className={`py-1.5 px-2 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                    moldSettings.previewMode === 'assembly'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                      : 'bg-black/30 text-slate-400 hover:text-white'
                  }`}
                >
                  {t(language, 'Tüm Montaj', 'Full Assembly')}
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateMoldSettings({ previewMode: 'partA' })}
                  className={`py-1.5 px-2 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                    moldSettings.previewMode === 'partA'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                      : 'bg-black/30 text-slate-400 hover:text-white'
                  }`}
                >
                  {t(language, 'Sadece Parça A', 'Part A Only')}
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateMoldSettings({ previewMode: 'partB' })}
                  className={`py-1.5 px-2 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                    moldSettings.previewMode === 'partB'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                      : 'bg-black/30 text-slate-400 hover:text-white'
                  }`}
                >
                  {t(language, 'Sadece Parça B', 'Part B Only')}
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateMoldSettings({ previewMode: 'modelOnly' })}
                  className={`py-1.5 px-2 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                    moldSettings.previewMode === 'modelOnly'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                      : 'bg-black/30 text-slate-400 hover:text-white'
                  }`}
                >
                  {t(language, 'Sadece Model', 'Model Only')}
                </button>
              </div>
            </div>

            {/* Export Actions */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-300 block">
                {t(language, '3D Yazıcı İçin İndir', 'Export Mold for 3D Printing')}
              </span>

              {moldSettings.moldType === 'two-part' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPartA}
                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t(language, 'Parça A (.STL)', 'Part A (.STL)')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPartB}
                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t(language, 'Parça B (.STL)', 'Part B (.STL)')}</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDownloadPartA}
                  className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t(language, 'Kalıp Kutusunu İndir (.STL)', 'Download Mold Container (.STL)')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadFullAssembly}
                className="w-full flex items-center justify-center gap-1.5 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>{t(language, 'Tam Kalıp Montajı (.GLB)', 'Full Assembly (.GLB)')}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
