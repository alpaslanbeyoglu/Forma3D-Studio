import React, { useRef } from 'react';
import {
  Download,
  Eye,
  EyeOff,
  FileUp,
  Layers,
  RotateCcw,
  Sliders,
  X,
} from 'lucide-react';
import { ModelStats, TransformSettings } from '../types/studio';
import { SAMPLE_MODELS, downloadSampleBlendFile } from '../utils/sampleModels';
import { Language, SAMPLE_MODEL_TRANSLATIONS, t } from '../utils/i18n';

interface FileAndScenePanelProps {
  language: Language;
  modelStats: ModelStats;
  activeSampleId: string | null;
  transformSettings: TransformSettings;
  onSelectFile: (file: File) => void;
  onSelectSample: (sampleId: string) => void;
  onToggleSubMeshVisibility: (subMeshId: string) => void;
  onUpdateTransform: (partial: Partial<TransformSettings>) => void;
  onResetTransform: () => void;
  onClose?: () => void;
}

export const FileAndScenePanel: React.FC<FileAndScenePanelProps> = ({
  language,
  modelStats,
  activeSampleId,
  transformSettings,
  onSelectFile,
  onSelectSample,
  onToggleSubMeshVisibility,
  onUpdateTransform,
  onResetTransform,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const numLocale = language === 'en' ? 'en-US' : 'tr-TR';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectFile(file);
      e.target.value = '';
    }
  };

  return (
    <aside className="w-full lg:w-80 shrink-0 h-full bg-[#12151C] lg:border-r border-white/[0.07] flex flex-col overflow-y-auto">
      {/* Mobile Drawer Header with Close Button */}
      {onClose && (
        <div className="lg:hidden flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] bg-[#0E1017]">
          <span className="text-xs font-semibold text-slate-200">
            {t(language, 'Model & Dosya Gezgini', 'Model & Scene Explorer')}
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

      {/* 1. Upload Dropzone Section */}
      <div className="p-4 sm:p-5 border-b border-white/[0.07]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white tracking-tight">
            {t(language, 'Model İçe Aktar', 'Import 3D Model')}
          </h2>
          <span className="text-[11px] text-slate-400">
            BLEND · STL · OBJ · GLB · PLY · FBX · 3DS · DAE
          </span>
        </div>

        {/* Do not set restrictive accept attribute so iOS/iPhone Files app enables .blend and .blend1 files */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full group relative flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-white/15 hover:border-amber-500/60 bg-white/[0.02] hover:bg-amber-500/[0.04] transition-colors text-center cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <FileUp className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-white">
            {t(language, '3B Model Dosyası Seçin', 'Select 3D Model File')}
          </span>
          <span className="text-[11px] text-slate-400 mt-1">
            {t(
              language,
              '.blend, .stl, .obj, .glb, .ply, .fbx, .3ds veya .dae',
              '.blend, .stl, .obj, .glb, .ply, .fbx, .3ds, or .dae'
            )}
          </span>
        </button>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {t(language, 'Test için gerçek .blend dosyası:', 'Sample binary .blend file:')}
          </span>
          <button
            type="button"
            onClick={downloadSampleBlendFile}
            className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3 h-3" />
            <span>{t(language, 'Örnek .blend İndir', 'Download .blend')}</span>
          </button>
        </div>
      </div>

      {/* 2. Built-in Sample CAD / Blender Models */}
      <div className="p-5 border-b border-white/[0.07]">
        <h3 className="text-xs font-semibold text-slate-300 mb-3">
          {t(language, 'Hazır Stüdyo Modelleri', 'Built-in Studio Models')}
        </h3>
        <div className="space-y-1.5">
          {SAMPLE_MODELS.map((sample) => {
            const isSelected = activeSampleId === sample.id;
            const trInfo = SAMPLE_MODEL_TRANSLATIONS[sample.id];
            const displayName = trInfo ? trInfo.name[language] : sample.name;
            const displaySubtitle = trInfo ? trInfo.subtitle[language] : sample.subtitle;
            return (
              <button
                key={sample.id}
                type="button"
                onClick={() => onSelectSample(sample.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border border-amber-500/40 text-white'
                    : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.05] text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold truncate">
                    {displayName}
                  </span>
                  <span className="text-[11px] font-mono-tabular text-amber-400 shrink-0">
                    .{sample.formatBadge.toLowerCase()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {displaySubtitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Active Geometry Telemetry (Unboxed Metadata with Tabular Numerals) */}
      <div className="p-5 border-b border-white/[0.07]">
        <h3 className="text-xs font-semibold text-slate-300 mb-2.5">
          {t(language, 'Aktif Geometri Bilgisi', 'Active Geometry Info')}
        </h3>
        <div className="text-xs text-white font-medium truncate">
          {modelStats.fileName}
        </div>
        <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-slate-400 mt-1 font-mono-tabular">
          <span>Format: {modelStats.fileFormat}</span>
          <span aria-hidden="true">·</span>
          <span>{modelStats.fileSize}</span>
          {modelStats.blenderVersion && (
            <>
              <span aria-hidden="true">·</span>
              <span>Blender v{modelStats.blenderVersion}</span>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3.5 pt-3.5 border-t border-white/[0.06]">
          <div>
            <div className="text-[11px] text-slate-400">
              {t(language, 'Köşe (Vertex)', 'Vertices')}
            </div>
            <div className="text-sm font-semibold text-white font-mono-tabular mt-0.5">
              {modelStats.vertexCount.toLocaleString(numLocale)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">
              {t(language, 'Üçgen Yüzey', 'Triangles')}
            </div>
            <div className="text-sm font-semibold text-white font-mono-tabular mt-0.5">
              {modelStats.triangleCount.toLocaleString(numLocale)}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-[11px] text-slate-400 mb-1">
            {t(
              language,
              'Sınırlayıcı Kutu Boyutları (X · Y · Z)',
              'Bounding Box Dimensions (X · Y · Z)'
            )}
          </div>
          <div className="text-xs text-slate-200 font-mono-tabular">
            {modelStats.dimensions.x.toFixed(2)} × {modelStats.dimensions.y.toFixed(2)} ×{' '}
            {modelStats.dimensions.z.toFixed(2)} {t(language, 'birim', 'units')}
          </div>
        </div>
      </div>

      {/* 4. Sub-Meshes Hierarchy List */}
      <div className="p-5 border-b border-white/[0.07]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-300">
              {t(language, 'Alt Katmanlar', 'Sub-Meshes')} ({modelStats.subMeshes.length})
            </h3>
          </div>
        </div>

        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {modelStats.subMeshes.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between py-1.5 px-2.5 rounded-md hover:bg-white/[0.04] transition-colors"
            >
              <div className="min-w-0 pr-2">
                <div
                  className={`text-xs truncate ${
                    sub.visible ? 'text-slate-200' : 'text-slate-500 line-through'
                  }`}
                >
                  {sub.name}
                </div>
                <div className="text-[10px] text-slate-500 font-mono-tabular">
                  {sub.triangles.toLocaleString(numLocale)}{' '}
                  {t(language, 'üçgen', 'tris')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleSubMeshVisibility(sub.id)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title={
                  sub.visible
                    ? t(language, 'Katmanı Gizle', 'Hide Sub-Mesh')
                    : t(language, 'Katmanı Göster', 'Show Sub-Mesh')
                }
              >
                {sub.visible ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Model Orientation & Scale Controls */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-300">
              {t(language, 'Dönüşüm ve Hizalama', 'Transform & Alignment')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onResetTransform}
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t(language, 'Sıfırla', 'Reset')}</span>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">
                {t(language, 'Model Ölçeği', 'Model Scale')}
              </span>
              <span className="font-mono-tabular text-slate-200">
                {transformSettings.scale.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.05"
              value={transformSettings.scale}
              onChange={(e) =>
                onUpdateTransform({ scale: parseFloat(e.target.value) })
              }
              className="w-full studio-slider"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {(
              [
                { key: 'rotationX', label: t(language, 'Eksen X', 'Axis X') },
                { key: 'rotationY', label: t(language, 'Eksen Y', 'Axis Y') },
                { key: 'rotationZ', label: t(language, 'Eksen Z', 'Axis Z') },
              ] as const
            ).map((axis) => (
              <div key={axis.key}>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>{axis.label}</span>
                  <span className="font-mono-tabular text-slate-300">
                    {transformSettings[axis.key]}°
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateTransform({
                      [axis.key]: (transformSettings[axis.key] + 90) % 360,
                    })
                  }
                  className="w-full py-1.5 px-2 rounded-md bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {t(language, '+90° Çevir', '+90° Rotate')}
                </button>
              </div>
            ))}
          </div>

          <label className="flex items-center justify-between pt-2 cursor-pointer">
            <span className="text-xs text-slate-300">
              {t(
                language,
                'Modeli Stüdyo Zeminine Oturt',
                'Align Model to Studio Floor'
              )}
            </span>
            <input
              type="checkbox"
              checked={transformSettings.alignToFloor}
              onChange={(e) =>
                onUpdateTransform({ alignToFloor: e.target.checked })
              }
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>
    </aside>
  );
};
