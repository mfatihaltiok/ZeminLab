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

Write-Host "ZeminLab yerel OCR runtime hazırlanıyor..."
if (Test-Path $runtimeRoot) { Remove-Item -Recurse -Force $runtimeRoot }
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null

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

Write-Host "3/4 PaddleOCR bağımlılıkları bundled runtime içine kuruluyor..."
& $runtimePython -m pip install --disable-pip-version-check --no-warn-script-location "paddleocr[doc-parser]==3.3.2" "paddlepaddle>=3.2.1,<3.3"
if ($LASTEXITCODE -ne 0) { throw "PaddleOCR/PaddlePaddle bundled runtime kurulumu başarısız." }

Write-Host "4/4 PaddleOCR-VL modelleri bundled paket içine alınıyor..."
if (Test-Path $modelRoot) { Remove-Item -Recurse -Force $modelRoot }
New-Item -ItemType Directory -Force -Path $modelRoot | Out-Null

$env:PADDLE_PDX_CACHE_HOME = $modelRoot
$env:PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK = "1"

$bootstrap = @'
from paddleocr import PaddleOCRVL
pipeline = PaddleOCRVL(
    pipeline_version="v1",
    use_doc_orientation_classify=True,
    use_doc_unwarping=True,
    use_layout_detection=True,
)
print("PaddleOCR-VL v1 model indirme/önbelleğe alma tamamlandı.")
'@

$tempScript = Join-Path $tempRoot "download-models.py"
Set-Content -Path $tempScript -Value $bootstrap -Encoding UTF8
& $runtimePython $tempScript
if ($LASTEXITCODE -ne 0) { throw "PaddleOCR-VL modellerinin indirilmesi başarısız." }

$cache = Join-Path $modelRoot "official_models"
$required = @("PaddleOCR-VL","PP-DocLayoutV2","PP-LCNet_x1_0_doc_ori","UVDoc")
foreach ($name in $required) {
  $source = Join-Path $cache $name
  $target = Join-Path $modelRoot $name
  if (-not (Test-Path $source)) { throw "Beklenen model bulunamadı: $source" }
  if (Test-Path $target) { Remove-Item -Recurse -Force $target }
  Move-Item -Path $source -Destination $target
  Write-Host "Paketlendi: $name"
}
if (Test-Path $cache) { Remove-Item -Recurse -Force $cache }
Remove-Item -Force $getPip,$tempScript,$zipPath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "ZeminLab OCR runtime hazır:"
Write-Host "  Python : $runtimeRoot"
Write-Host "  Modeller: $modelRoot"
