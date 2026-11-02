# 3D Silicone Mold Generation Feature (Silikon Döküm Kalıbı Üretim Modülü)

Forma3D Studio'ya her türlü 3D modelden (`.blend`, `.stl`, `.obj`, `.glb`, `.ply`, `.fbx`) doğrudan 3D yazıcı ile basılabilir, profesyonel silikon döküm kalıpları (1 parçalı ve 2 parçalı döküm kutuları, hizalama pimleri, döküm hunisi/sprue, hava tahliye kanalları ve sıkıştırma kulakçıkları ile) üreten ve silikon hacmini hesaplayan modülün entegrasyon planı.

## Confirmed User Preferences & Decisions

> [!IMPORTANT]
> Kullanıcı yanıtları doğrultusunda konfigüre edilen ana tasarım kararları:
> 
> - **Kalıp Yapısı Tipi**: Esnek Yapı (Hem 2 Parçalı Ayrılabilir Kalıp Kutusu hem de Tek Parçalı Açık Silikon Havuzu modları desteklenecek).
> - **Montaj & Döküm Elemanları**: Kilit Pimleri (Erkek/Dişi pimler), Döküm Haznesi (Sprue / Pouring Funnel), Hava Tahliye Kanalları (Air Vents) ve Kalıp Sıkıştırma / Sabitleme Kulakçıkları (Clamping Lugs) otomatik üretilecek.
> - **Parametreler & Önizleme**: Duvar Et Kalınlığı (mm), Ayırma Düzlemi (X/Y/Z ekseni ve mesafe), Esneklik Toleransı ve Gerçek Zamanlı Silikon Hacmi / Gram Ağırlığı Hesabı sunulacak.

---

## 1. Overview & Core Concept

- **Ne Yapıyor?**: Kullanıcının sahneye yüklediği herhangi bir 3D modelin etrafında otomatik olarak döküm kutusu hesaplar. Seçilen eksende (X, Y veya Z) modeli iki parçalı (Part A / Upper Mold, Part B / Lower Mold) veya tek parçalı açık kalıp havuzu olarak böler.
- **Eklenen Elemanlar**:
  1. *Hizalama / Kilit Pimleri (Registration Keys/Pins)*: Kalıp yarımlarının milimetrik hassasiyetle birleşmesini sağlayan konik dişi/erkek kilit mekanizmaları.
  2. *Döküm Hunisi (Pouring Sprue)*: Sıvı silikon veya reçinenin kalıp içine pürüzsüz akması için üst kısımda huni şeklindeki besleme kanalı.
  3. *Hava Tahliye Kanalları (Air Vents)*: Hava kabarcığı kalmasını önleyen açılı mikro havalandırma bacaları.
  4. *Sıkıştırma Kulakçıkları (Clamping Lugs)*: Kalıp yarımlarını cıvata veya kelepçe ile sabitlemek için dış cidar kulakçıkları.
  5. *Silikon Miktar Hesaplayıcı*: Kalıp kutusu hacminden model hacmini çıkararak gerekli sıvı silikon hacmini ($cm^3 / mL$) ve ağırlığı ($gram$, yoğunluk çarpanı ile) anlık hesaplar.
- **Hedef Kitle**: 3D baskı meraklıları, kuyumcular, hobi üreticileri, endüstriyel tasarımcılar ve silikon döküm sanatçıları.

---

## 2. User Experience & Visual Design

### Key User Flow

1. **Model Yükleme veya Seçme**: Kullanıcı mevcut 3D modellerden birini açar veya `.stl`/`.obj`/`.glb` yükler.
2. **Kalıp Modunu Etkinleştirme**: Sağ panelde veya üst araç çubuğunda **"Silikon Kalıbı Oluştur" (Mold Studio)** sekmesine tıklar.
3. **Parametre Ayarları**:
   - Kalıp Tipi: `2 Parçalı Ayrılabilir Kalıp` vs. `Tek Parçalı Havuz`.
   - Ayırma Ekseni: `X`, `Y` veya `Z` ekseni ve ayırma mesafesi sürgüsü.
   - Et Kalınlığı (Wall Thickness): `5mm - 40mm` arası ayarlanabilir.
   - Tolerans & Şifreleme: Erkek/dişi kilit pimi yarıçapı ve derinliği.
   - Döküm & Hava Kanalları: Kanal genişliği, huni konumu ve açısı.
4. **Gerçek Zamanlı 3D Kalıp Önizleme**:
   - **X-Ray / Şeffaf Mod**: Silikon malzemenin esnekliğini simüle eden yarım şeffaf silikon dokusu.
   - **Patlatılmış Görünüm (Exploded View)**: Kalıp yarımlarının (Part A ve Part B) birbirinden uzaklaşarak iç detayları göstermesi.
   - **Parça Gizleme**: Sadece Parça A, Sadece Parça B veya Tüm Montajı görüntüleme toggles.
5. **Döküm Metrikleri**: Gerekli silikon miktarı ($mL$) ve tahmini gram ağırlığı bilgi kartında canlı olarak güncellenir.
6. **Dışa Aktarma (Export)**:
   - `Parça A'yı İndir (.STL)`
   - `Parça B'yi İndir (.STL)`
   - `Tam Kalıp Montajını İndir (.GLB / .USDZ)`

### Visual Identity & Layout Integrations

- **Aesthetic Direction**: Endüstriyel CAD / Laboratuvar hassasiyetinde koyu tema (`#0F172A` tuval, titanyum gri pencereler, elektro turkuaz `#06B6D4` vurgular).
- **Typography**: Tablo verileri ve mm boyutlandırmaları için `font-mono tabular-nums`, başlıklar ve kontroller için `Plus Jakarta Sans`.
- **Top Bar & Navigation Integrity**: Top Bar contract korunarak sağ tarafa "Kalıp Üretici" aksiyon paneli butonları eklenecek.

---

## 3. Key Product Decisions & Trade-Offs

- **Karar 1: Geometri Üretim Yaklaşımı (Procedural Constructive Box & Split Engine)**
  - *Seçilen Yaklaşım*: Three.js `BoxGeometry`, `CylinderGeometry` ve `ExtrudeGeometry` kullanarak hassas yönlendirilmiş sınır kutuları (Oriented Bounding Box) üzerinden gerçek zamanlı dinamik kalıp blokları üretilmesi.
  - *Neden*: WebGL ortamında sıfır gecikmeli, 60fps akıcı sürgü etkileşimleri sağlar.
  - *Alternatif*: Ağır kütüphaneler (OpenCASCADE WASM gibi) yavaş yüklenir ve mobilde tarayıcıyı kilitler.

- **Karar 2: Dışa Aktarma Formatı ve Bütünlük**
  - *Seçilen Yaklaşım*: `Three.js STLExporter` ve `GLTFExporter` ile 3D yazıcı yazılımlarına (Cura, PrusaSlicer, Bambu Studio) doğrudan aktarılabilir katı mesh üretimi.
  - *Neden*: Tüm döküm kanalları ve kilit pimleri tek bir birleşik mesh manifold yapısıyla kusursuz basılabilir.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Forma3D Studio Root App                            │
└──────────────────────┬───────────────────────────────┬──────────────────────┘
                       │                               │
                       ▼                               ▼
      ┌─────────────────────────────────┐   ┌────────────────────────────────┐
      │  FileAndScenePanel & Inspector  │   │     Viewport3D Scene Canvas    │
      └────────────────┬────────────────┘   └────────────────┬───────────────┘
                       │                                     │
                       ▼                                     ▼
      ┌──────────────────────────────────────────────────────────────────────┐
      │                      SiliconeMoldInspector Panel                     │
      │  - Mold Type Selector (2-Part Split / 1-Part Container)              │
      │  - Axis & Split Offset Sliders                                       │
      │  - Wall Thickness & Pin/Lug Controls                                 │
      │  - Realtime Silicone Volume (mL) & Grams Calculator                 │
      │  - Exploded View Distance & Transparency Controls                    │
      └────────────────┬─────────────────────────────────────────────────────┘
                       │
                       ▼
      ┌──────────────────────────────────────────────────────────────────────┐
      │                       moldGenerator Engine                           │
      │  - Model Bounding Box & Center Computation                           │
      │  - Procedural Mold Blocks (Part A / Part B Boundary Shells)          │
      │  - Registration Keys (Male/Female Cone Pins) & Clamping Lugs         │
      │  - Pouring Sprue Funnel & Micro Air Vent Chimneys Geometry           │
      │  - Volume Delta Calculation: V_silicone = V_mold_box - V_model       │
      └────────────────┬─────────────────────────────────────────────────────┘
                       │
                       ▼
      ┌──────────────────────────────────────────────────────────────────────┐
      │                      Export & Download System                        │
      │  - STLExporter for Part A / Part B (.stl for 3D Printing)           │
      │  - GLTFExporter / USDZExporter for Assembly & AR View               │
      └──────────────────────────────────────────────────────────────────────┘
```

### State Store Mapping (`MoldSettings` State Interface)

```typescript
export interface MoldSettings {
  enabled: boolean;
  moldType: 'two-part' | 'one-part';
  splitAxis: 'x' | 'y' | 'z';
  splitOffset: number; // -50% to +50% of bounding box
  wallThickness: number; // in mm (default 15mm)
  bottomThickness: number; // in mm (default 10mm)
  pinRadius: number; // in mm (default 4mm)
  pinHeight: number; // in mm (default 6mm)
  addSprue: boolean; // Pouring funnel
  sprueRadius: number; // Top funnel radius in mm
  addAirVents: boolean; // Air escape vents
  addLugs: boolean; // Clamping ears
  siliconeDensity: number; // g/cm³ (default 1.1 g/cm³ for RTV silicone)
  explodedDistance: number; // 0mm to 100mm for view separation
  previewMode: 'assembly' | 'partA' | 'partB' | 'modelOnly';
  transparentMold: boolean;
}
```

---

## Verification Plan

1. **Bileşen Derleme & Tip Kontrolü**: `compile_applet` ile TypeScript ve Vite derlemesini doğrulama.
2. **Kalıp Oluşturma Testi**: Farklı karmaşıklıktaki modellerde (örn. Stanford Bunny, Dişli çark, Sanat heykeli) 2 parçalı ve 1 parçalı kalıpların doğru bounding box hesaplaması.
3. **Döküm Elemanları Testi**: Kilit pimlerinin dişi/erkek eşleşmesi, döküm hunisi ve hava kanallarının doğru konumu.
4. **Hacim Hesaplama Testi**: Modellere göre silikon mililitre ve gram değerlerinin doğru güncellenmesi.
5. **Dışa Aktarma Testi**: `.stl` indirme işlemlerinin başarılı şekilde tetiklenmesi.
