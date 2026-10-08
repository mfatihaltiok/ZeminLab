# FALUZMN Windows Otomatik Kurulum Scripti
# Bu script Node.js, npm bağımlılıkları ve Electron uygulamasını otomatik kurar

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FALUZMN Windows Otomatik Kurulum" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Node.js kontrolü
Write-Host "[1/5] Node.js kontrol ediliyor..." -ForegroundColor Yellow
$nodeInstalled = $false
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "  ✓ Node.js $nodeVersion yüklü" -ForegroundColor Green
        $nodeInstalled = $true
    }
} catch {
    Write-Host "  ✗ Node.js bulunamadı" -ForegroundColor Red
}

if (-not $nodeInstalled) {
    Write-Host ""
    Write-Host "Node.js yüklü değil. Kurulum için:" -ForegroundColor Yellow
    Write-Host "1. https://nodejs.org adresinden Node.js LTS sürümünü indirin" -ForegroundColor White
    Write-Host "2. Kurulum sihirbazını takip edin" -ForegroundColor White
    Write-Host "3. Bu scripti tekrar çalıştırın" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternatif: winget ile kurulum" -ForegroundColor Yellow
    Write-Host "  winget install OpenJS.NodeJS.LTS" -ForegroundColor White
    
    $install = Read-Host "Node.js otomatik kurulsun mu? (e/h)"
    if ($install -eq 'e' -or $install -eq 'E') {
        Write-Host "Node.js kuruluyor..." -ForegroundColor Yellow
        try {
            winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
            Write-Host "  ✓ Node.js kuruldu" -ForegroundColor Green
            Write-Host "  PowerShell'i yeniden başlatmanız gerekebilir." -ForegroundColor Yellow
            Read-Host "Devam etmek için Enter'a basın"
        } catch {
            Write-Host "  ✗ Otomatik kurulum başarısız. Lütfen manuel kurun." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Kurulum iptal edildi." -ForegroundColor Red
        exit 1
    }
}

# npm versiyon kontrolü
Write-Host "[2/5] npm kontrol ediliyor..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "  ✓ npm $npmVersion yüklü" -ForegroundColor Green
} catch {
    Write-Host "  ✗ npm bulunamadı" -ForegroundColor Red
    exit 1
}

# Proje bağımlılıklarını yükle
Write-Host "[3/5] npm bağımlılıkları yükleniyor..." -ForegroundColor Yellow
Write-Host "  Bu işlem birkaç dakika sürebilir..." -ForegroundColor Gray

try {
    # Electron mirror ayarla (Türkiye'de daha hızlı indirme için)
    $env:ELECTRON_MIRROR = "https://github.com/electron/electron/releases/download/"
    
    npm install 2>&1 | ForEach-Object {
        if ($_ -match "ERR!") {
            Write-Host "  ✗ $_" -ForegroundColor Red
        } elseif ($_ -match "added|updated") {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ npm bağımlılıkları yüklendi" -ForegroundColor Green
    } else {
        throw "npm install başarısız oldu"
    }
} catch {
    Write-Host "  ✗ npm install hatası: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Çözüm önerileri:" -ForegroundColor Yellow
    Write-Host "  1. İnternet bağlantınızı kontrol edin" -ForegroundColor White
    Write-Host "  2. npm cache clean --force komutunu çalıştırın" -ForegroundColor White
    Write-Host "  3. Antivirüs/güvenlik duvarını geçici olarak kapatın" -ForegroundColor White
    exit 1
}

# TypeScript tip kontrolü
Write-Host "[4/5] TypeScript derlemesi kontrol ediliyor..." -ForegroundColor Yellow
try {
    npm run typecheck 2>&1 | ForEach-Object {
        if ($_ -match "error TS") {
            Write-Host "  ✗ $_" -ForegroundColor Red
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ TypeScript derlemesi başarılı" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ TypeScript hataları var ama devam ediliyor..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠ Tip kontrolü atlandı" -ForegroundColor Yellow
}

# Windows installer oluştur
Write-Host "[5/5] Windows kurulum dosyası oluşturuluyor..." -ForegroundColor Yellow
Write-Host "  Bu işlem 5-10 dakika sürebilir..." -ForegroundColor Gray

try {
    npm run build:win 2>&1 | ForEach-Object {
        if ($_ -match "error|Error") {
            Write-Host "  ✗ $_" -ForegroundColor Red
        } elseif ($_ -match "building|packaging") {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Windows kurulum dosyası oluşturuldu" -ForegroundColor Green
    } else {
        throw "build:win başarısız oldu"
    }
} catch {
    Write-Host "  ✗ Build hatası: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternatif: Geliştirme modunda çalıştırın" -ForegroundColor Yellow
    Write-Host "  npm run dev" -ForegroundColor White
    exit 1
}

# Kurulum dosyasını bul
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Kurulum Tamamlandı!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$exePath = Get-ChildItem -Path "dist" -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($exePath) {
    Write-Host "Kurulum dosyası:" -ForegroundColor Yellow
    Write-Host "  $($exePath.FullName)" -ForegroundColor White
    Write-Host ""
    
    $install = Read-Host "Uygulamayı şimdi kurmak ister misiniz? (e/h)"
    if ($install -eq 'e' -or $install -eq 'E') {
        Write-Host "Kurulum başlatılıyor..." -ForegroundColor Yellow
        Start-Process $exePath.FullName
    } else {
        Write-Host ""
        Write-Host "Daha sonra kurmak için:" -ForegroundColor Yellow
        Write-Host "  $($exePath.FullName)" -ForegroundColor White
    }
} else {
    Write-Host "Kurulum dosyası bulunamadı." -ForegroundColor Red
    Write-Host "dist klasörünü kontrol edin." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Geliştirme modunda çalıştırmak için:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
