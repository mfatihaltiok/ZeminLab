# FALUZMN (ZeminLab) Windows Kurulum Rehberi

Bu belge, FALUZMN geoteknik mühendisliği uygulamasını Windows bilgisayarınızda kurma ve çalıştırma adımlarını açıklar.

## Gereksinimler

- Windows 10 veya üzeri (64-bit)
- Node.js 18.x veya üzeri (otomatik kurulacak)
- İnternet bağlantısı (ilk kurulum için)

## Otomatik Kurulum (Önerilen)

### Adım 1: PowerShell'i Yönetici Olarak Açın

Başlat menüsünden "PowerShell" araması yapın ve "Yönetici olarak çalıştır" seçeneğini seçin.

### Adım 2: Kurulum Scriptini Çalıştırın

Proje klasöründe PowerShell'i açın ve şu komutu çalıştırın:

```powershell
.\tools\setup_windows.ps1
```

Bu script otomatik olarak:
1. Node.js yüklü değilse indirip kurar
2. npm bağımlılıklarını yükler
3. Electron ikili dosyalarını indirir
4. Windows kurulum dosyasını (installer) oluşturur

### Adım 3: Kurulum Dosyasını Çalıştırın

Kurulum tamamlandığında `dist` klasöründe `.exe` dosyası oluşur:

```
dist\FALUZMN-Setup-1.0.0.exe
```

Bu dosyayı çift tıklayarak uygulamayı kurun.

## Manuel Kurulum

Otomatik kurulum başarısız olursa, aşağıdaki adımları izleyin:

### 1. Node.js Kurulumu

Node.js resmi sitesinden indirin: https://nodejs.org/

LTS (Long Term Support) sürümünü indirip kurun. Kurulumu doğrulayın:

```powershell
node --version
npm --version
```

### 2. Bağımlılıkları Yükleyin

Proje klasöründe PowerShell veya CMD açın:

```powershell
npm install
```

Bu komut:
- Tüm npm paketlerini indirir
- Electron ikili dosyalarını kurar
- electron-builder bağımlılıklarını hazırlar

### 3. Windows Installer Oluşturun

```powershell
npm run build:win
```

Bu komut:
1. TypeScript kodunu derler
2. React arayüzünü build eder
3. Electron uygulamasını paketler
4. Windows installer (.exe) oluşturur

### 4. Uygulamayı Kurun

`dist` klasöründeki `.exe` dosyasını çalıştırın ve kurulum sihirbazını izleyin.

## Geliştirme Modu

Kaynak kodu üzerinde çalışmak için:

```powershell
npm run dev
```

Bu komut uygulamayı geliştirme modunda başlatır. Kod değişiklikleri otomatik yüklenir.

## Sorun Giderme

### Electron İndirme Hatası

Eğer Electron indirilemiyorsa:

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm install
```

### SSL Sertifika Hatası

Kurumsal ağlarda SSL hatası alıyorsanız:

```powershell
npm config set strict-ssl false
npm install
npm config set strict-ssl true
```

### npm Cache Temizleme

Sorun devam ederse:

```powershell
npm cache clean --force
rm -rf node_modules
npm install
```

## Uygulama Özellikleri

FALUZMN (ZeminLab) aşağıdaki geoteknik mühendisliği hesaplamalarını yapar:

### Temel Hesaplamalar
- **SPT Düzeltmeleri**: CE, CB, CS, CR, CN, (N1)60, (N1)60f
- **Taşıma Gücü**: Terzaghi, Meyerhof, Hansen, Vesic, TBDY 2018
- **Oturma**: Burland-Burbidge, Schmertmann, Boussinesq, 2:1, Konsolidasyon
- **Sıvılaşma**: TBDY 2018 Ek 16B SPT tabanlı değerlendirme
- **Yatak Katsayısı**: Winkler ks, Erol & Çekinmez plaka yükleme

### Zemin İyileştirme
- **Jet Grout**: Kompozit zemin kapasitesi, oturma azaltma, eksenel taşıma, kayma güvenliği

### Yardımcı Modüller
- Zemin sınıflandırma (ISO 14688-2, TBDY 2018)
- Sismik spektrum hesabı
- Gerilme profili (σv, σ'v, u)
- Temel kontrolü (kayma, eksantrisite, temas basıncı)

## Kaynak Referansları

- TBDY 2018 (Türkiye Bina Deprem Yönetmeliği)
- Erol & Çekinmez (2014) - Geoteknik Mühendisliğinde Saha Deneyleri
- Erol & Çekinmez Bayram (2018) - Jet Enjeksiyon Yöntemi

## Teknik Destek

Sorun yaşarsanız:
1. `npm-debug.log` dosyasını kontrol edin
2. GitHub Issues sayfasını ziyaret edin: https://github.com/mfatihaltiok/FALUZMN/issues
3. Node.js ve npm sürümlerinizin güncel olduğundan emin olun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
