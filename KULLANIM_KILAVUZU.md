# FALUZMN - Geoteknik Mühendisliği Hesaplama Yazılımı

## Kurulum ve Kullanım Kılavuzu

---

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Sistem Gereksinimleri](#sistem-gereksinimleri)
3. [Windows Kurulumu](#windows-kurulumu)
4. [Hesaplama Modülleri](#hesaplama-modülleri)
   - SPT Düzeltmeleri
   - Taşıma Gücü
   - Oturma Hesapları
   - Sıvılaşma
   - **Jet Grout Zemin İyileştirme** (YENİ)
5. [Jet Grout Modülü Kullanımı](#jet-grout-modülü-kullanımı)
6. [Geliştirme](#geliştirme)
7. [Referanslar](#referanslar)

---

## Genel Bakış

FALUZMN, geoteknik mühendisliği hesaplamaları için geliştirilmiş bir masaüstü uygulamasıdır. TBDY 2018 (Türkiye Bina Deprem Yönetmeliği) ve ilgili standartlara uygun hesaplamalar yapar.

### Temel Özellikler

- ✅ SPT düzeltmeleri ve korelasyonlar
- ✅ Yüzeysel temel taşıma gücü (Terzaghi, Meyerhof, Hansen, Vesic, TBDY 2018)
- ✅ Oturma hesapları (Elastik, konsolidasyon, Burland-Burbidge, Schmertmann)
- ✅ Sıvılaşma analizi (TBDY 2018 Ek 16B)
- ✅ **Jet Grout zemin iyileştirme tasarımı** (YENİ)
- ✅ Yatak katsayısı hesabı
- ✅ Gerilme profili hesapları

---

## Sistem Gereksinimleri

### Minimum
- **İşletim Sistemi:** Windows 10 (64-bit) veya üzeri
- **Node.js:** v18.0.0 veya üzeri (LTS sürüm önerilir)
- **RAM:** 4 GB
- **Disk Alanı:** 500 MB

### Önerilen
- **İşletim Sistemi:** Windows 11
- **Node.js:** v20.x LTS
- **RAM:** 8 GB
- **Disk Alanı:** 1 GB

---

## Windows Kurulumu

### Yöntem 1: Otomatik Kurulum (Önerilen)

1. **PowerShell'i Yönetici Olarak Açın**
   - Başlat menüsünde "PowerShell" arayın
   - Sağ tıklayın → "Yönetici olarak çalıştır"

2. **Proje Klasörüne Gidin**
   ```powershell
   cd C:\path\to\ZeminLab
   ```

3. **Kurulum Scriptini Çalıştırın**
   ```powershell
   .\tools\setup_windows.ps1
   ```

   Bu script otomatik olarak:
   - Node.js kurulu değilse kurulum talimatları verir
   - npm bağımlılıklarını yükler
   - Electron uygulamasını derler
   - Windows installer (.exe) oluşturur

### Yöntem 2: Manuel Kurulum

1. **Node.js Kurun**
   - https://nodejs.org adresinden LTS sürümünü indirin
   - Kurulum sihirbazını takip edin
   - Kurulumu doğrulayın:
     ```cmd
     node --version
     npm --version
     ```

2. **Bağımlılıkları Yükleyin**
   ```cmd
   npm install
   ```

3. **Windows Installer Oluşturun**
   ```cmd
   npm run build:win
   ```

4. **Uygulamayı Kurun**
   - `dist` klasöründeki `.exe` dosyasını çalıştırın
   - Kurulum sihirbazını takip edin

### Yöntem 3: Batch Dosyası ile Kurulum

1. `kurulum.bat` dosyasını çift tıklayın
2. Kurulumun tamamlanmasını bekleyin
3. `dist` klasöründeki installer'ı çalıştırın

---

## Hesaplama Modülleri

### 1. SPT Düzeltmeleri

**Girdiler:**
- Ham SPT N değeri
- Enerji oranı (CE)
- Sondaj çapı (CB)
- Numune alıcı tipi (CS)
- Tij boyu (CR)
- Efektif gerilme (CN)
- İnce dane içeriği

**Çıktılar:**
- N60, (N1)60, (N1)60f
- Tüm düzeltme katsayıları
- Hesaplama detayları

**Referans:** TBDY 2018 Ek 16B, Erol & Çekinmez (2014)

---

### 2. Taşıma Gücü Hesapları

**Yöntemler:**
- Terzaghi
- Meyerhof
- Hansen
- Vesic
- TBDY 2018

**Girdiler:**
- Temel boyutları (B, L, Df)
- Zemin parametreleri (c, φ, γ)
- Yükler (N, V, M)
- Yeraltı suyu seviyesi

**Çıktılar:**
- Nq, Nc, Nγ taşıma gücü katsayıları
- Şekil, derinlik, eğiklik faktörleri
- Karakteristik ve tasarım taşıma gücü
- Güvenlik kontrolü

**Referans:** TBDY 2018 Bölüm 16.8

---

### 3. Oturma Hesapları

**Yöntemler:**
- **Elastik:** Anlık oturma (Es, ν)
- **Konsolidasyon:** Birincil ve ikincil oturma (Cc, Cr, e0)
- **Burland-Burbidge:** Kum ve çakıl için ampirik yöntem
- **Schmertmann:** SPT'den elastik oturma

**Girdiler:**
- Temel boyutları ve yük
- Zemin profili (katman kalınlıkları)
- Zemin parametreleri (Es, ν, Cc, Cr, e0)
- Yeraltı suyu seviyesi

**Çıktılar:**
- Katman bazlı oturma
- Toplam oturma
- Zaman bağımlı oturma (konsolidasyon)

---

### 4. Sıvılaşma Analizi

**Yöntem:** TBDY 2018 Ek 16B SPT Tabanlı

**Girdiler:**
- Deprem büyüklüğü (Mw)
- Tasarım spektral ivme (SDS)
- SPT profili
- Zemin parametreleri
- Yeraltı suyu seviyesi

**Çıktılar:**
- CSR (Cyclic Stress Ratio)
- CRR (Cyclic Resistance Ratio)
- Güvenlik faktörü (FS)
- Sıvılaşma potansiyeli

**Kontrol:** FS ≥ 1.1 → Sıvılaşma yok

---

### 5. Jet Grout Zemin İyileştirme (YENİ)

Detaylı kullanım için [Jet Grout Modülü Kullanımı](#jet-grout-modülü-kullanımı) bölümüne bakın.

---

## Jet Grout Modülü Kullanımı

### Genel Bakış

Jet Grout modülü, zemin iyileştirme amaçlı jet grout kolonlarının tasarımını yapar. Erol & Çekinmez Bayram (2018) referans kitabına dayalı hesaplamalar içerir.

### Temel Hesaplamalar

#### 1. Kompozit Zemin Parametreleri

**Alan Değiştirme Oranı (ρ):**
```
ρ = Ac / Acell
```
- Ac: Kolon kesit alanı
- Acell: Birim hücre alanı (kare veya üçgen düzen)

**Kompozit Taşıma Gücü:**
```
qcomp = ρ × qcolumn + (1 - ρ) × qsoil
```

**Kompozit Elastisite Modülü:**
```
Ecomp = ρ × Ecolumn + (1 - ρ) × Esoil
```

#### 2. Yük Paylaşımı

**Gerilme Konsantrasyon Faktörü (β):**
```
β = (kolon üzerindeki gerilme) / (ortalama gerilme)
```

**Kolon Yük Paylaşımı:**
```
n = Ecolumn / Esoil
Kolon yükü = (n × ρ) / (1 + (n-1)×ρ) × Toplam yük
```

#### 3. Oturma Azaltma

**Sanal Radye Yöntemi:**
```
İşlenmemiş oturma = q × H × (1-ν²) / Esoil
İşlenmiş oturma = q × H × (1-ν²) / Ecomp
Azaltma oranı = (1 - Ecomp/Esoil) × 100%
```

#### 4. Kayma Güvenliği

**Mohr-Coulomb Kriteri:**
```
τ = c' + σ'n × tan(φ')
FS = τ / τdemand
```

#### 5. Eksenel Kolon Kapasitesi

**Şaft Direnci:**
```
Qshaft = Σ (α × c' + σ'n × tan(δ')) × π × D × Δz
```

**Uç Direnci:**
```
Qtip = (c' × Nc + σ'v × Nq) × Ab
```

**Grup Verimi:**
- Bireysel kolon modu
- Blok kolon modu

### Kullanım Örnekleri

#### Örnek 1: Basit Kompozit Zemin Hesabı

```typescript
import { jetGroutAdvanced } from './src/core/engineering/advanced-geotech'

const result = jetGroutAdvanced({
  columnDiameter: 0.6,      // m
  spacing: 1.5,             // m
  layout: 'square',         // veya 'triangular'
  qSoil: 100,               // kPa
  qColumn: 2000,            // kPa
  EsSoil: 5000,             // kPa
  EsColumn: 50000,          // kPa
  cSoil: 10,                // kPa
  cColumn: 200              // kPa
})

console.log('Alan değiştirme oranı:', result.areaReplacementRatio)
console.log('Kompozit taşıma gücü:', result.compositeCapacity, 'kPa')
console.log('Kolon yük paylaşımı:', result.columnLoadShare * 100, '%')
```

#### Örnek 2: Tam Tasarım Hesabı

```typescript
import { calculateJetGroutDesign } from './src/core/engineering/jet-grout'

const design = calculateJetGroutDesign({
  // Kolon geometrisi
  columnDiameter: 0.6,
  spacing: 1.5,
  layout: 'square',
  columnLength: 5,
  
  // Zemin parametreleri
  soilUnitWeight: 18,
  soilCohesion: 10,
  soilFrictionAngle: 25,
  soilEs: 5000,
  soilNu: 0.3,
  
  // Kolon parametreleri
  columnStrength: 2500,
  columnEs: 50000,
  
  // Temel parametreleri
  foundationWidth: 10,
  foundationLength: 10,
  foundationDepth: 1.5,
  verticalLoad: 5000,
  
  // Güvenlik katsayıları
  safetyFactorBearing: 3,
  safetyFactorSliding: 1.5
})

console.log('Taşıma gücü yeterli mi?', design.bearingCapacitySafe)
console.log('Oturma azaltma:', design.settlementReduction, '%')
console.log('Kayma güvenlik faktörü:', design.slidingSafetyFactor)
console.log('Kolon kapasitesi:', design.axialCapacity.totalCapacity, 'kN')
```

#### Örnek 3: Kolon Sayısı ve İyileştirme Oranı

```typescript
import { calculateNumberOfColumns, calculateImprovementRatio } 
  from './src/core/engineering/jet-grout'

// 10x10 m temel için kolon sayısı
const numColumns = calculateNumberOfColumns(
  10,    // temel genişliği (m)
  10,    // temel uzunluğu (m)
  1.5,   // kolon aralığı (m)
  'square'  // düzen
)

console.log('Gerekli kolon sayısı:', numColumns)

// İyileştirme oranı
const ratio = calculateImprovementRatio(
  0.6,   // kolon çapı (m)
  1.5,   // kolon aralığı (m)
  'square'
)

console.log('İyileştirme oranı:', (ratio * 100).toFixed(1), '%')
```

#### Örnek 4: Tahmini Parametreler

```typescript
import { estimateColumnDiameter, estimateColumnStrength } 
  from './src/core/engineering/jet-grout'

// Killi zemin için kolon çapı tahmini
const diameter = estimateColumnDiameter('clay', 'double')
console.log('Tahmini kolon çapı:', diameter.typical, 'm')
console.log('Aralık:', diameter.min, '-', diameter.max, 'm')

// Kolon dayanımı tahmini
const strength = estimateColumnStrength('clay', 300)  // 300 kg/m³ çimento
console.log('Tahmini dayanım:', strength.typical, 'kPa')
```

### Tasarım Kriterleri

#### Alan Değiştirme Oranı (ρ)
- **Tipik aralık:** %10 - %30
- **Minimum:** %5 (ekonomik değil)
- **Maksimum:** %40 (çok pahalı)

#### Oturma Azaltma
- **Hedef:** > %50 azaltma
- **Minimum:** > %30 azaltma
- **Optimum:** %60-80 azaltma

#### Kayma Güvenliği
- **Gerekli FS:** ≥ 1.5
- **Deprem durumu:** FS ≥ 1.2

#### Kolon Kapasitesi
- **Güvenlik faktörü:** 2.0 - 3.0
- **Grup verimi:** > %80 tercih edilir

### Tasarım İpuçları

1. **Kolon Çapı Seçimi**
   - Killi zemin: 0.6-1.2 m (double/triple jet)
   - Kumlu zemin: 0.5-0.9 m (double jet)
   - Çakıllı zemin: 0.4-0.8 m (single/double jet)

2. **Kolon Aralığı**
   - Tipik: 1.5-3.0 m
   - Üçgen düzen daha verimli (daha az kolon)
   - Kare düzen daha kolay uygulama

3. **Kolon Uzunluğu**
   - Zemin iyileştirme: 3-10 m
   - Taşıyıcı tabakaya ulaşmalı
   - Ekonomi: Minimum gerekli uzunluk

4. **Kolon Dayanımı**
   - Tipik: 1000-5000 kPa
   - Çimento içeriği: 200-400 kg/m³
   - Laboratuvar testleri ile doğrulama gerekli

### Kalite Kontrol

**Saha Testleri:**
- Karot alma ve basınç testi
- SPT (iyileştirilmiş zeminde)
- Plate yükleme testi

**Laboratuvar Testleri:**
- Serbest basınç dayanımı
- Elastisite modülü
- Dayanıklılık testi

---

## Geliştirme

### Geliştirme Modu

```bash
npm run dev
```

Bu komut uygulamayı geliştirme modunda başlatır. Kod değişiklikleri otomatik olarak yüklenir.

### Test Çalıştırma

```bash
npm run test:engineering
```

Tüm mühendislik hesaplamaları için regression testleri çalıştırılır.

### Kod Formatlama

```bash
npm run format
```

### Lint Kontrolü

```bash
npm run lint
```

### Tip Kontrolü

```bash
npm run typecheck
```

---

## Referanslar

### Yönetmelik ve Standartlar

1. **TBDY 2018** - Türkiye Bina Deprem Yönetmeliği
   - Bölüm 16: Temeller
   - Ek 16A: Zemin Araştırmaları
   - Ek 16B: Sıvılaşma Değerlendirmesi

2. **TS EN 1997-1/2** - Eurocode 7: Geoteknik Tasarım

3. **TS 500** - Betonarme Yapıların Tasarım ve Yapım Kuralları

### Kitaplar

1. **Erol, A. O. & Çekinmez, Z. (2014)**
   - "Geoteknik Mühendisliğinde Saha Deneyleri"
   - Yüksel Proje Yayınları No: 14-01, Ankara

2. **Erol, A. O. & Çekinmez Bayram, Z. (2018)**
   - "Jet Enjeksiyon Yöntemi"
   - Yüksel Proje Uluslararası A.Ş., Ankara

### Korelasyonlar

- **SPT → φ:** Kulhawy & Mayne (1990), Hatanaka & Uchida (1996)
- **SPT → Es:** Kulhawy & Mayne (1990)
- **Sıvılaşma:** Seed & Idriss (1971), Youd et al. (2001)
- **Oturma:** Burland & Burbidge (1985), Schmertmann (1978)

---

## Destek ve İletişim

### Sorun Bildirme

GitHub Issues: https://github.com/mfatihaltiok/FALUZMN/issues

### Katkıda Bulunma

Pull request'ler memnuniyetle karşılanır. Lütfen:
1. Kod formatlama kurallarına uyun (`npm run format`)
2. Regression testlerini çalıştırın (`npm run test:engineering`)
3. Commit mesajlarını açıklayıcı yazın

---

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

---

## Sürüm Notları

### v1.0.0 (2024)
- ✅ Jet Grout zemin iyileştirme modülü eklendi
- ✅ Tam tasarım hesabı (kompozit parametreler, oturma, kayma, eksenel kapasite)
- ✅ Tahmini parametre hesaplamaları
- ✅ Regression testleri eklendi
- ✅ Windows build scriptleri eklendi

### v0.9.0
- TBDY 2018 uyumluluk düzeltmeleri
- Taşıma gücü hesapları iyileştirildi
- Sıvılaşma analizi güncellendi

### v0.8.0
- İlk sürüm
- Temel hesaplama modülleri
