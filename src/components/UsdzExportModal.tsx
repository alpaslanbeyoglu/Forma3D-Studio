import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import {
  CheckCircle2,
  Download,
  FileBox,
  Smartphone,
  X,
} from 'lucide-react';
import {
  MaterialSettings,
  ModelStats,
  UsdzExportOptions,
} from '../types/studio';
import {
  exportToBinaryStl,
  exportToGlb,
  generateUsdzPackage,
} from '../utils/exporters';
import { Language, t } from '../utils/i18n';

interface UsdzExportModalProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  modelGroup: THREE.Group | null;
  materialSettings: MaterialSettings;
  modelStats: ModelStats;
}

export const UsdzExportModal: React.FC<UsdzExportModalProps> = ({
  language,
  isOpen,
  onClose,
  modelGroup,
  materialSettings,
  modelStats,
}) => {
  const numLocale = language === 'en' ? 'en-US' : 'tr-TR';
  const defaultBaseName = modelStats.fileName
    .replace(/\.(blend|blend1|blend2|stl|obj|glb|gltf|ply|fbx|3ds|dae|usdz)$/i, '')
    .trim();

  const [options, setOptions] = useState<UsdzExportOptions>({
    fileName: defaultBaseName || 'forma3d_model',
    scaleUnit: 'm',
    placeOnFloor: true,
    bakeProceduralTextures: true,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [usdzResult, setUsdzResult] = useState<{
    blobUrl: string;
    fileName: string;
    byteSize: number;
  } | null>(null);

  useEffect(() => {
    const clean = modelStats.fileName
      .replace(/\.(blend|blend1|blend2|stl|obj|glb|gltf|ply|fbx|3ds|dae|usdz)$/i, '')
      .trim();
    setOptions((prev) => ({ ...prev, fileName: clean || 'forma3d_model' }));
    setUsdzResult(null);
    setExportError(null);
  }, [modelStats.fileName, isOpen]);

  if (!isOpen) return null;

  const handleGenerateUsdz = async () => {
    if (!modelGroup) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const res = await generateUsdzPackage(
        modelGroup,
        materialSettings,
        options
      );
      setUsdzResult(res);

      // Trigger direct download
      const a = document.createElement('a');
      a.href = res.blobUrl;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : t(
              language,
              'USDZ paketi oluşturulurken beklenmeyen bir hata oluştu.',
              'An unexpected error occurred while building the USDZ package.'
            )
      );
    } finally {
      setIsExporting(false);
    }
  };

  const formatByteSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#12151C] border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-sm sm:text-base font-display font-bold text-white">
              {t(language, '.USDZ Dışa Aktar', 'Export .USDZ')}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              {t(
                language,
                'Apple AR QuickLook ve iOS/VisionOS ile tam uyumlu PBR çıktı',
                'PBR output fully compatible with Apple AR QuickLook & iOS/VisionOS'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* File Name Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t(language, 'Çıktı Dosya Adı', 'Output File Name')}
            </label>
            <div className="flex items-center rounded-lg bg-[#0B0D11] border border-white/10 focus-within:border-amber-500/60 overflow-hidden">
              <input
                type="text"
                value={options.fileName}
                onChange={(e) =>
                  setOptions({ ...options, fileName: e.target.value })
                }
                className="flex-1 bg-transparent px-3.5 py-2 text-xs text-white outline-none font-mono-tabular"
                placeholder={t(language, 'model_adi', 'model_name')}
              />
              <span className="px-3 py-2 text-xs font-mono-tabular text-amber-400 bg-white/[0.03] border-l border-white/10">
                .usdz
              </span>
            </div>
          </div>

          {/* Scale Unit Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t(language, 'AR Sahne Ölçek Birimi', 'AR Scene Scale Unit')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    id: 'm',
                    label: t(language, 'Metre (1:1 Standart)', 'Meters (1:1 Std)'),
                  },
                  {
                    id: 'cm',
                    label: t(language, 'Santimetre (1:100)', 'Centimeters (1:100)'),
                  },
                  {
                    id: 'mm',
                    label: t(language, 'Milimetre (CAD)', 'Millimeters (CAD)'),
                  },
                ] as const
              ).map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => setOptions({ ...options, scaleUnit: unit.id })}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    options.scaleUnit === unit.id
                      ? 'bg-amber-500/15 border border-amber-500/50 text-amber-300'
                      : 'bg-[#0B0D11] border border-white/[0.08] text-slate-300 hover:bg-white/[0.04]'
                  }`}
                >
                  {unit.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-xs font-medium text-slate-200">
                  {t(
                    language,
                    'AR Zemin Hizalaması (Y = 0)',
                    'AR Floor Alignment (Y = 0)'
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {t(
                    language,
                    'Modelin alt tabanını gerçek masa/zemin düzlemine oturtur',
                    'Aligns the bottom of the model to real-world table/floor planes'
                  )}
                </div>
              </div>
              <input
                type="checkbox"
                checked={options.placeOnFloor}
                onChange={(e) =>
                  setOptions({ ...options, placeOnFloor: e.target.checked })
                }
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-xs font-medium text-slate-200">
                  {t(
                    language,
                    'PBR Malzeme ve Yüzey Dokusunu Göm',
                    'Embed PBR Materials & Surface Textures'
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {t(
                    language,
                    'Renk, metaliklik, pürüzlülük ve prosedürel dokuyu USDZ içine paketler',
                    'Bakes color, metalness, roughness, and surface relief into USDZ'
                  )}
                </div>
              </div>
              <input
                type="checkbox"
                checked={options.bakeProceduralTextures}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    bakeProceduralTextures: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>
          </div>

          {/* Summary Telemetry */}
          <div className="p-3.5 rounded-xl bg-[#0B0D11] border border-white/[0.06] flex items-center justify-between text-xs">
            <div className="text-slate-400">
              <span>{t(language, 'Kaynak: ', 'Source: ')}</span>
              <span className="text-slate-200 font-medium">
                {modelStats.fileFormat}
              </span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span className="font-mono-tabular">
                {modelStats.triangleCount.toLocaleString(numLocale)}{' '}
                {t(language, 'üçgen', 'tris')}
              </span>
            </div>
            <div className="text-slate-400 font-mono-tabular">
              {t(language, 'Metal', 'Metal')}:{' '}
              {Math.round(materialSettings.metalness * 100)}% ·{' '}
              {t(language, 'Pürüz', 'Rough')}:{' '}
              {Math.round(materialSettings.roughness * 100)}%
            </div>
          </div>

          {exportError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {exportError}
            </div>
          )}

          {usdzResult && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-emerald-200 truncate">
                    {usdzResult.fileName}{' '}
                    {t(language, 'hazır', 'ready')} (
                    {formatByteSize(usdzResult.byteSize)})
                  </div>
                  <div className="text-[11px] text-emerald-300/80">
                    {t(
                      language,
                      'iOS/iPadOS cihazlarda doğrudan AR QuickLook ile açabilirsiniz',
                      'Open directly in AR QuickLook on iOS/iPadOS devices'
                    )}
                  </div>
                </div>
              </div>
              <a
                href={usdzResult.blobUrl}
                download={usdzResult.fileName}
                rel="ar"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{t(language, 'AR / İndir', 'AR / Download')}</span>
              </a>
            </div>
          )}

          {/* Primary USDZ Action & Secondary Formats */}
          <div className="pt-2 space-y-2.5">
            <button
              type="button"
              disabled={isExporting || !modelGroup}
              onClick={handleGenerateUsdz}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {isExporting
                  ? t(
                      language,
                      '.USDZ Paketi Derleniyor...',
                      'Compiling .USDZ Package...'
                    )
                  : t(
                      language,
                      '.USDZ Formatında Dışa Aktar',
                      'Export as .USDZ'
                    )}
              </span>
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <span className="text-[11px] text-slate-400">
                {t(
                  language,
                  'Alternatif 3B Çıktı Formatları:',
                  'Alternative 3D Output Formats:'
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    modelGroup &&
                    exportToGlb(modelGroup, materialSettings, options.fileName)
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.09] text-xs text-slate-300 transition-colors cursor-pointer"
                >
                  <FileBox className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t(language, '.GLB İndir', 'Download .GLB')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    modelGroup &&
                    exportToBinaryStl(modelGroup, options.fileName)
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.09] text-xs text-slate-300 transition-colors cursor-pointer"
                >
                  <FileBox className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t(language, '.STL İndir', 'Download .STL')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
