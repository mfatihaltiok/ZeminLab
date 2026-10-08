# FALUZMN Windows Build Script
# Bu script FALUZMN uygulamasını Windows için derler ve kurulum dosyası oluşturur

param(
    [switch]$SkipInstall,
    [switch]$SkipBuild,
    [switch]$RunInstaller
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          FALUZMN Windows Build Script                     ║" -ForegroundColor Cyan
Write-Host "║          Geoteknik Mühendisliği Hesaplama Yazılımı       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Node.js kontrolü
Write-Host "[1/4] Node.js kontrol ediliyor..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    Write-Host "  ✓ Node.js $nodeVersion bulundu" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js bulunamadı!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Lütfen Node.js'i kurun:" -ForegroundColor Yellow
    Write-Host "  1. https://nodejs.org adresine gidin" -ForegroundColor White
    Write-Host "  2. LTS sürümünü indirin" -ForegroundColor White
    Write-Host "  3. Kurulum sihirbazını takip edin" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternatif (winget ile):" -ForegroundColor Cyan
    Write-Host "  winget install OpenJS.NodeJS.LTS" -ForegroundColor White
    exit 1
}

# 2. npm install
if (-not $SkipInstall) {
    Write-Host "[2/4] npm bağımlılıkları yükleniyor..." -ForegroundColor Yellow
    Write-Host "  Bu işlem birkaç dakika sürebilir..." -ForegroundColor Gray
    
    try {
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
            throw "npm install başarısız"
        }
    } catch {
        Write-Host "  ✗ npm install hatası: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[2/4] npm install atlandı (-SkipInstall)" -ForegroundColor Gray
}

# 3. Build
if (-not $SkipBuild) {
    Write-Host "[3/4] Windows installer oluşturuluyor..." -ForegroundColor Yellow
    Write-Host "  Bu işlem 5-10 dakika sürebilir..." -ForegroundColor Gray
    
    try {
        npm run build:win 2>&1 | ForEach-Object {
            if ($_ -match "error|Error") {
                Write-Host "  ✗ $_" -ForegroundColor Red
            } elseif ($_ -match "building|packaging|creating") {
                Write-Host "  $_" -ForegroundColor Gray
            }
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Windows installer oluşturuldu" -ForegroundColor Green
        } else {
            throw "Build başarısız"
        }
    } catch {
        Write-Host "  ✗ Build hatası: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[3/4] Build atlandı (-SkipBuild)" -ForegroundColor Gray
}

# 4. Installer dosyasını bul
Write-Host "[4/4] Kurulum dosyası aranıyor..." -ForegroundColor Yellow

$exeFiles = Get-ChildItem -Path "dist" -Filter "*.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending

if ($exeFiles.Count -eq 0) {
    Write-Host "  ✗ Kurulum dosyası bulunamadı" -ForegroundColor Red
    Write-Host "  dist klasörünü kontrol edin" -ForegroundColor Yellow
    exit 1
}

$installerPath = $exeFiles[0].FullName
Write-Host "  ✓ Kurulum dosyası: $installerPath" -ForegroundColor Green
Write-Host ""

# Özet
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    BUILD TAMAMLANDI                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Kurulum dosyası:" -ForegroundColor White
Write-Host "  $installerPath" -ForegroundColor Green
Write-Host ""

if ($RunInstaller) {
    Write-Host "Kurulum başlatılıyor..." -ForegroundColor Yellow
    Start-Process $installerPath
} else {
    Write-Host "Kurulumu başlatmak için:" -ForegroundColor Yellow
    Write-Host "  .\tools\build-windows.ps1 -RunInstaller" -ForegroundColor White
    Write-Host ""
    Write-Host "veya dosyayı çift tıklayın:" -ForegroundColor Yellow
    Write-Host "  $installerPath" -ForegroundColor White
}

Write-Host ""
Write-Host "Geliştirme modunda çalıştırmak için:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
