import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  Camera,
  Download,
  FileUp,
  AlertCircle,
  X,
  Palette,
  Sun,
  Layers,
  Globe,
} from 'lucide-react';
import {
  LightingSettings,
  MaterialSettings,
  ModelStats,
  TransformSettings,
} from './types/studio';
import {
  DEFAULT_LIGHTING_SETTINGS,
  DEFAULT_MATERIAL_SETTINGS,
  LIGHTING_PRESETS,
  MATERIAL_PRESETS,
} from './utils/studioPresets';
import { SAMPLE_MODELS } from './utils/sampleModels';
import { computeGroupStats, load3DFile } from './utils/fileLoader';
import { createSampleBlendFileBuffer, parseBlendFile } from './utils/blendParser';
import { Language, t } from './utils/i18n';
import { Viewport3D } from './components/Viewport3D';
import { FileAndScenePanel } from './components/FileAndScenePanel';
import { MaterialAndLightingInspector } from './components/MaterialAndLightingInspector';
import { UsdzExportModal } from './components/UsdzExportModal';

const DEFAULT_TRANSFORM: TransformSettings = {
  scale: 1.0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  alignToFloor: true,
};

type MobileSheetType = 'none' | 'file' | 'material' | 'lighting';

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = window.localStorage.getItem('forma3d_lang');
      if (saved === 'en' || saved === 'tr') return saved;
    } catch {
      // ignore storage errors
    }
    return 'tr';
  });

  const [modelGroup, setModelGroup] = useState<THREE.Group | null>(null);
  const [activeSampleId, setActiveSampleId] = useState<string | null>('turbine_stl');
  const [inspectorTab, setInspectorTab] = useState<'material' | 'lighting'>('material');
  const [mobileSheet, setMobileSheet] = useState<MobileSheetType>('none');
  const [materialSettings, setMaterialSettings] = useState<MaterialSettings>(
    DEFAULT_MATERIAL_SETTINGS
  );
  const [lightingSettings, setLightingSettings] = useState<LightingSettings>(
    DEFAULT_LIGHTING_SETTINGS
  );
  const [transformSettings, setTransformSettings] =
    useState<TransformSettings>(DEFAULT_TRANSFORM);

  const [modelStats, setModelStats] = useState<ModelStats>({
    fileName: 'aero_turbin_carki.stl',
    fileFormat: 'STL',
    fileSize: '428.4 KB',
    meshCount: 1,
    vertexCount: 0,
    triangleCount: 0,
    dimensions: { x: 3.8, y: 1.4, z: 3.8 },
    subMeshes: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Model hazırlanıyor...');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const captureScreenshotRef = useRef<(() => void) | null>(null);
  const headerFileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next: Language = prev === 'tr' ? 'en' : 'tr';
      try {
        window.localStorage.setItem('forma3d_lang', next);
      } catch {
        // ignore storage errors
      }
      document.documentElement.lang = next;
      return next;
    });
  };

  const handleSelectSample = useCallback((sampleId: string) => {
    const sample = SAMPLE_MODELS.find((s) => s.id === sampleId);
    if (!sample) return;

    setErrorBanner(null);
    setActiveSampleId(sampleId);
    const group = sample.buildGroup();
    const ext = sample.formatBadge.toLowerCase();
    const stats = computeGroupStats(
      group,
      `${sample.id}.${ext}`,
      sample.formatBadge,
      sample.formatBadge === 'BLEND' ? '612.0 KB' : '428.4 KB',
      sample.formatBadge === 'BLEND' ? '4.0' : undefined
    );
    setModelGroup(group);
    setModelStats(stats);
    setTransformSettings(DEFAULT_TRANSFORM);
    setMaterialSettings((prev) => ({
      ...prev,
      useOriginalMaterials: true,
      presetId: 'original',
    }));
  }, []);

  // Load initial sample model on mount & sync iOS Safari visualViewport height
  useEffect(() => {
    handleSelectSample('turbine_stl');

    const updateAppHeight = () => {
      const vv = window.visualViewport;
      const vh = vv ? vv.height : window.innerHeight;
      const offsetTop = vv ? vv.offsetTop : 0;
      document.documentElement.style.setProperty('--app-height', `${vh}px`);
      document.documentElement.style.setProperty('--app-offset-top', `${offsetTop}px`);
    };

    updateAppHeight();
    window.addEventListener('resize', updateAppHeight);
    window.addEventListener('orientationchange', updateAppHeight);
    window.visualViewport?.addEventListener('resize', updateAppHeight);
    window.visualViewport?.addEventListener('scroll', updateAppHeight);

    return () => {
      window.removeEventListener('resize', updateAppHeight);
      window.removeEventListener('orientationchange', updateAppHeight);
      window.visualViewport?.removeEventListener('resize', updateAppHeight);
      window.visualViewport?.removeEventListener('scroll', updateAppHeight);
    };
  }, [handleSelectSample]);

  // Handle user uploading a 3D file (.blend, .blend1, .stl, .obj, .glb, .ply, .fbx, .3ds, .dae)
  const handleFileLoad = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setErrorBanner(null);
      const ext = file.name.split('.').pop()?.toUpperCase() || '';
      setLoadingMessage(
        ext.startsWith('BLEND')
          ? t(
              language,
              `${file.name} SDNA ikili blokları ve materyalleri çözümleniyor...`,
              `Parsing ${file.name} SDNA binary blocks & materials...`
            )
          : t(
              language,
              `${file.name} 3B geometri ve materyaller sahneye aktarılıyor...`,
              `Importing ${file.name} 3D geometry & materials into scene...`
            )
      );

      try {
        const { group, stats } = await load3DFile(file);
        setActiveSampleId(null);
        setModelGroup(group);
        setModelStats(stats);
        setTransformSettings(DEFAULT_TRANSFORM);
        setMaterialSettings((prev) => ({
          ...prev,
          useOriginalMaterials: true,
          presetId: 'original',
        }));
      } catch (err) {
        setErrorBanner(
          err instanceof Error
            ? err.message
            : t(
                language,
                'Dosya okunurken bir hata oluştu. Lütfen desteklenen bir 3B model dosyası seçin.',
                'Failed to read file. Please select a supported 3D model file.'
              )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [language]
  );

  // Live binary .blend parser verification test triggered from Top Bar
  const handleRunLiveBlendBinaryTest = async () => {
    setIsLoading(true);
    setErrorBanner(null);
    setLoadingMessage(
      t(
        language,
        'Gerçek ikili .blend (Blender 4.0 SDNA) dosyası oluşturulup ayrıştırılıyor...',
        'Generating and parsing live binary .blend (Blender 4.0 SDNA) file...'
      )
    );
    try {
      const geo = new THREE.TorusKnotGeometry(1.15, 0.34, 180, 32, 3, 4);
      const blendBuffer = createSampleBlendFileBuffer(geo, 'Canli_Blender4_SDNA_Mesh');
      const parsed = await parseBlendFile(blendBuffer);
      const stats = computeGroupStats(
        parsed.group,
        language === 'en' ? 'live_test_model.blend' : 'canli_test_modeli.blend',
        'BLEND',
        `${(blendBuffer.byteLength / 1024).toFixed(1)} KB`,
        parsed.blenderVersion
      );
      setActiveSampleId(null);
      setModelGroup(parsed.group);
      setModelStats(stats);
      setTransformSettings(DEFAULT_TRANSFORM);
      setMaterialSettings((prev) => ({
        ...prev,
        useOriginalMaterials: true,
        presetId: 'original',
      }));
    } catch (err) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : t(language, '.blend testi sırasında hata oluştu.', 'Error during .blend test.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSubMeshVisibility = (subMeshId: string) => {
    if (!modelGroup) return;
    modelGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child.uuid === subMeshId) {
        child.visible = !child.visible;
      }
    });
    setModelStats((prev) => ({
      ...prev,
      subMeshes: prev.subMeshes.map((sm) =>
        sm.id === subMeshId ? { ...sm, visible: !sm.visible } : sm
      ),
    }));
  };

  const handleUpdateMaterial = (partial: Partial<MaterialSettings>) => {
    setMaterialSettings((prev) => {
      const keys = Object.keys(partial);
      const isViewportFlagOnly = keys.every((k) =>
        ['wireframe', 'flatShading', 'doubleSided'].includes(k)
      );
      const nextUseOriginal =
        partial.useOriginalMaterials !== undefined
          ? partial.useOriginalMaterials
          : isViewportFlagOnly
            ? prev.useOriginalMaterials
            : false;

      return {
        ...prev,
        ...partial,
        useOriginalMaterials: nextUseOriginal,
      };
    });
  };

  const handleApplyMaterialPreset = (presetId: string) => {
    const found = MATERIAL_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setMaterialSettings((prev) => ({
      ...prev,
      useOriginalMaterials: false,
      presetId: found.id,
      ...found.settings,
    }));
  };

  const handleUpdateLighting = (partial: Partial<LightingSettings>) => {
    setLightingSettings((prev) => ({ ...prev, ...partial }));
  };

  const handleApplyLightingPreset = (presetId: string) => {
    const found = LIGHTING_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setLightingSettings((prev) => ({
      ...prev,
      presetId: found.id,
      ...found.settings,
    }));
  };

  const handleUpdateTransform = (partial: Partial<TransformSettings>) => {
    setTransformSettings((prev) => ({ ...prev, ...partial }));
  };

  const openMobileTab = (tab: MobileSheetType) => {
    if (tab === 'material' || tab === 'lighting') {
      setInspectorTab(tab);
    }
    setMobileSheet((current) => (current === tab ? 'none' : tab));
  };

  return (
    <div className="app-viewport-shell flex flex-col overflow-hidden bg-[#0B0D11] text-[#F1F5F9]">
      {/* Top Bar: Responsive header with Wordmark, Desktop Nav, and Action Buttons */}
      <header className="h-13 sm:h-14 shrink-0 flex items-center justify-between gap-2 px-2.5 sm:px-6 bg-[#12151C] border-b border-white/[0.07] z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            handleSelectSample('turbine_stl');
          }}
          className="text-base sm:text-lg font-display font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Forma3D
        </a>

        {/* Zone 2: Desktop clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <button
            type="button"
            onClick={() => handleSelectSample('turbine_stl')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap"
          >
            {t(language, 'CAD .STL Örneği', 'CAD .STL Sample')}
          </button>
          <button
            type="button"
            onClick={handleRunLiveBlendBinaryTest}
            className="hover:text-white hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap"
          >
            {t(language, 'Canlı .BLEND Ayrıştırıcı', 'Live .BLEND Parser')}
          </button>
          <button
            type="button"
            onClick={() => setInspectorTab('material')}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap ${
              inspectorTab === 'material' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            {t(language, 'Malzeme & Renk', 'Material & Color')}
          </button>
          <button
            type="button"
            onClick={() => setInspectorTab('lighting')}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap ${
              inspectorTab === 'lighting' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            {t(language, 'Işık Stüdyosu', 'Lighting Studio')}
          </button>
        </nav>

        {/* Zone 3: Language Switcher & Primary Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleLanguage}
            className="min-h-[36px] inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-[11px] font-semibold text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title={t(language, 'Switch to English', 'Türkçe diline geç')}
          >
            <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{language === 'tr' ? 'TR · EN' : 'EN · TR'}</span>
          </button>

          <input
            ref={headerFileInputRef}
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                handleFileLoad(f);
                e.target.value = '';
              }
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => headerFileInputRef.current?.click()}
            className="min-h-[36px] inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-xs font-semibold text-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title={t(
              language,
              '.blend, .stl, .obj, .glb, .ply, .fbx, .3ds veya .dae Yükle',
              'Import .blend, .stl, .obj, .glb, .ply, .fbx, .3ds, or .dae'
            )}
          >
            <FileUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{t(language, 'Model Yükle', 'Import')}</span>
          </button>

          <button
            type="button"
            onClick={() => captureScreenshotRef.current?.()}
            className="min-h-[36px] inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title={t(
              language,
              'Sahnenin PNG Render Görüntüsünü İndir',
              'Capture PNG Render Snapshot'
            )}
          >
            <Camera className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="hidden sm:inline">
              {t(language, 'Render Al', 'Snapshot')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="min-h-[36px] inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>.USDZ</span>
          </button>
        </div>
      </header>

      {/* Main Studio Workspace: 3 Columns on Desktop, Full-Screen Viewport with Bottom Navigation on Mobile */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Left Desktop Sidebar: File Upload, Sample Models, Telemetry & Sub-meshes */}
        <div className="hidden lg:flex shrink-0 h-full">
          <FileAndScenePanel
            language={language}
            modelStats={modelStats}
            activeSampleId={activeSampleId}
            transformSettings={transformSettings}
            onSelectFile={handleFileLoad}
            onSelectSample={handleSelectSample}
            onToggleSubMeshVisibility={handleToggleSubMeshVisibility}
            onUpdateTransform={handleUpdateTransform}
            onResetTransform={() => setTransformSettings(DEFAULT_TRANSFORM)}
          />
        </div>

        {/* Center Full 3D WebGL Viewport (Always 100% full screen on mobile & tablet) */}
        <main className="flex-1 relative min-w-0 h-full">
          {errorBanner && (
            <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-30 max-w-lg w-full px-4">
              <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-red-950/90 backdrop-blur-md border border-red-500/40 text-red-200 text-xs shadow-xl">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorBanner(null)}
                  className="text-red-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <Viewport3D
            language={language}
            modelGroup={modelGroup}
            materialSettings={materialSettings}
            lightingSettings={lightingSettings}
            transformSettings={transformSettings}
            onUpdateLighting={handleUpdateLighting}
            onUpdateMaterial={handleUpdateMaterial}
            onFileDrop={handleFileLoad}
            isLoading={isLoading}
            loadingMessage={loadingMessage}
            captureScreenshotRef={captureScreenshotRef}
          />
        </main>

        {/* Right Desktop Sidebar: Simplified Material Studio & 3-Point Lighting Inspector */}
        <div className="hidden lg:flex shrink-0 h-full">
          <MaterialAndLightingInspector
            language={language}
            activeTab={inspectorTab}
            onTabChange={setInspectorTab}
            materialSettings={materialSettings}
            lightingSettings={lightingSettings}
            onUpdateMaterial={handleUpdateMaterial}
            onApplyMaterialPreset={handleApplyMaterialPreset}
            onResetMaterial={() => setMaterialSettings(DEFAULT_MATERIAL_SETTINGS)}
            onUpdateLighting={handleUpdateLighting}
            onApplyLightingPreset={handleApplyLightingPreset}
            onResetLighting={() => setLightingSettings(DEFAULT_LIGHTING_SETTINGS)}
          />
        </div>

        {/* Mobile Slide-Up Drawer / Bottom Sheet */}
        {mobileSheet !== 'none' && (
          <div className="lg:hidden absolute inset-0 z-40 flex flex-col justify-end">
            {/* Backdrop Overlay */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileSheet('none')}
            />

            {/* Sheet Container */}
            <div className="relative z-10 w-full max-h-[82vh] h-[82vh] bg-[#12151C] rounded-t-2xl border-t border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
              {/* Drag Handle */}
              <div className="w-full flex items-center justify-center pt-2.5 pb-1 bg-[#12151C]">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Sheet Content */}
              <div className="flex-1 overflow-hidden">
                {mobileSheet === 'file' ? (
                  <FileAndScenePanel
                    language={language}
                    modelStats={modelStats}
                    activeSampleId={activeSampleId}
                    transformSettings={transformSettings}
                    onSelectFile={(file) => {
                      handleFileLoad(file);
                      setMobileSheet('none');
                    }}
                    onSelectSample={(sampleId) => {
                      handleSelectSample(sampleId);
                      setMobileSheet('none');
                    }}
                    onToggleSubMeshVisibility={handleToggleSubMeshVisibility}
                    onUpdateTransform={handleUpdateTransform}
                    onResetTransform={() => setTransformSettings(DEFAULT_TRANSFORM)}
                    onClose={() => setMobileSheet('none')}
                  />
                ) : (
                  <MaterialAndLightingInspector
                    language={language}
                    activeTab={inspectorTab}
                    onTabChange={setInspectorTab}
                    materialSettings={materialSettings}
                    lightingSettings={lightingSettings}
                    onUpdateMaterial={handleUpdateMaterial}
                    onApplyMaterialPreset={handleApplyMaterialPreset}
                    onResetMaterial={() => setMaterialSettings(DEFAULT_MATERIAL_SETTINGS)}
                    onUpdateLighting={handleUpdateLighting}
                    onApplyLightingPreset={handleApplyLightingPreset}
                    onResetLighting={() => setLightingSettings(DEFAULT_LIGHTING_SETTINGS)}
                    onClose={() => setMobileSheet('none')}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Studio Bottom Navigation Bar — raised above iOS Safari bottom bar */}
      <nav className="lg:hidden shrink-0 bg-[#12151C]/95 backdrop-blur-xl border-t border-white/[0.08] grid grid-cols-5 items-center px-1.5 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+18px)] z-30">
        <button
          type="button"
          onClick={() => headerFileInputRef.current?.click()}
          className="min-h-[44px] flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
        >
          <FileUp className="w-4 h-4 shrink-0" />
          <span>{t(language, 'Model Yükle', 'Import')}</span>
        </button>

        <button
          type="button"
          onClick={() => openMobileTab('file')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
            mobileSheet === 'file' ? 'text-amber-400 font-semibold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>{t(language, 'Sahne', 'Scene')}</span>
        </button>

        <button
          type="button"
          onClick={() => openMobileTab('material')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
            mobileSheet === 'material' || (mobileSheet !== 'none' && inspectorTab === 'material')
              ? 'text-amber-400 font-semibold'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4 shrink-0" />
          <span>{t(language, 'Malzeme', 'Material')}</span>
        </button>

        <button
          type="button"
          onClick={() => openMobileTab('lighting')}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
            mobileSheet === 'lighting' || (mobileSheet !== 'none' && inspectorTab === 'lighting')
              ? 'text-amber-400 font-semibold'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Sun className="w-4 h-4 shrink-0" />
          <span>{t(language, 'Işık', 'Lighting')}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsExportModalOpen(true)}
          className="min-h-[44px] flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>.USDZ</span>
        </button>
      </nav>

      {/* USDZ Export Configuration Modal */}
      <UsdzExportModal
        language={language}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        modelGroup={modelGroup}
        materialSettings={materialSettings}
        modelStats={modelStats}
      />
    </div>
  );
}

