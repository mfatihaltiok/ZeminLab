$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$resourceRoot = Join-Path $root "resources"
$runtimeRoot = Join-Path $resourceRoot "python-runtime"
$modelRoot = Join-Path $resourceRoot "paddleocr-vl-v1"
$pythonVersion = "3.12.10"
$pythonZip = "python-$pythonVersion-embed-amd64.zip"
$pythonUrl = "https://www.python.org/ftp/python/$pythonVersion/$pythonZip"
$tempRoot = Join-Path $env:TEMP "zeminlab-paddleocr-build"

New-Item -ItemType Directory -Force -Path $resourceRoot,$tempRoot | Out-Null

Write-Host "ZeminLab yerel PaddleOCR runtime hazırlanıyor..."
if (Test-Path $runtimeRoot) { Remove-Item -Recurse -Force $runtimeRoot }
if (Test-Path $modelRoot) { Remove-Item -Recurse -Force $modelRoot }
New-Item -ItemType Directory -Force -Path $runtimeRoot,$modelRoot | Out-Null

$zipPath = Join-Path $tempRoot $pythonZip
Write-Host "1/4 Python embedded runtime indiriliyor..."
Invoke-WebRequest -Uri $pythonUrl -OutFile $zipPath
Expand-Archive -Path $zipPath -DestinationPath $runtimeRoot -Force

$pth = Get-ChildItem $runtimeRoot -Filter "python*._pth" | Select-Object -First 1
if (-not $pth) { throw "Embedded Python ._pth dosyası bulunamadı." }
$pthLines = Get-Content $pth.FullName
if ($pthLines -notcontains "Lib\site-packages") { Add-Content -Path $pth.FullName -Value "Lib\site-packages" }
if ($pthLines -notcontains "import site") { Add-Content -Path $pth.FullName -Value "import site" }

$runtimePython = Join-Path $runtimeRoot "python.exe"
if (-not (Test-Path $runtimePython)) { throw "Bundled Python bulunamadı: $runtimePython" }

Write-Host "2/4 pip bootstrap ediliyor..."
$getPip = Join-Path $tempRoot "get-pip.py"
Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $getPip
& $runtimePython $getPip --disable-pip-version-check --no-warn-script-location
if ($LASTEXITCODE -ne 0) { throw "Bundled Python pip kurulumu başarısız." }

Write-Host "3/4 CPU uyumlu PaddleOCR bağımlılıkları kuruluyor..."
& $runtimePython -m pip install --disable-pip-version-check --no-warn-script-location --upgrade `
    "numpy==1.26.4" `
    "scipy==1.13.1" `
    "scikit-learn==1.7.1" `
    "paddleocr==3.3.2" `
    "paddlepaddle==3.2.2"
if ($LASTEXITCODE -ne 0) { throw "PaddleOCR/PaddlePaddle bundled runtime kurulumu başarısız." }

Write-Host "4/4 PP-OCRv5 Türkçe modelleri yerel pakete alınıyor..."
$env:PADDLE_PDX_CACHE_HOME = $modelRoot
$env:PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK = "1"

$bootstrap = @'
import os
from paddleocr import PaddleOCR

pipeline = PaddleOCR(
    lang="tr",
    ocr_version="PP-OCRv5",
    device="cpu",
    use_doc_orientation_classify=True,
    use_doc_unwarping=True,
    use_textline_orientation=True,
    enable_mkldnn=True,
    cpu_threads=8,
)
print("PP-OCRv5 Türkçe yerel model önbelleği hazır.")
'@

$tempScript = Join-Path $tempRoot "download-models.py"
Set-Content -Path $tempScript -Value $bootstrap -Encoding UTF8
& $runtimePython $tempScript
if ($LASTEXITCODE -ne 0) { throw "PP-OCRv5 modellerinin indirilmesi başarısız." }

$marker = Join-Path $modelRoot "zeminlab-ocr-runtime.ready"
Set-Content -Path $marker -Value "PaddleOCR 3.3.2 / PaddlePaddle 3.2.2 / PP-OCRv5 / tr / CPU" -Encoding UTF8

Remove-Item -Force $getPip,$tempScript,$zipPath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "ZeminLab yerel OCR runtime hazır:"
Write-Host "  Python : $runtimeRoot"
Write-Host "  Modeller: $modelRoot"
Write-Host "  Motor  : PP-OCRv5 / Türkçe / CPU"
