$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$resourceRoot = Join-Path $root "resources"
$runtimeRoot = Join-Path $resourceRoot "python-runtime"
$paddleRoot = Join-Path $resourceRoot "paddleocr-v5"
$doclingRoot = Join-Path $resourceRoot "docling"
$pythonVersion = "3.12.10"
$pythonZip = "python-$pythonVersion-embed-amd64.zip"
$pythonUrl = "https://www.python.org/ftp/python/$pythonVersion/$pythonZip"
$tempRoot = Join-Path $env:TEMP "zeminlab-document-intelligence-build"

New-Item -ItemType Directory -Force -Path $resourceRoot,$tempRoot | Out-Null
if (Test-Path $runtimeRoot) { Remove-Item -Recurse -Force $runtimeRoot }
if (Test-Path $paddleRoot) { Remove-Item -Recurse -Force $paddleRoot }
if (Test-Path $doclingRoot) { Remove-Item -Recurse -Force $doclingRoot }
New-Item -ItemType Directory -Force -Path $runtimeRoot,$paddleRoot,$doclingRoot | Out-Null

$zipPath = Join-Path $tempRoot $pythonZip
Write-Host "1/6 Bundled Python hazırlanıyor..."
Invoke-WebRequest -Uri $pythonUrl -OutFile $zipPath
Expand-Archive -Path $zipPath -DestinationPath $runtimeRoot -Force

$pth = Get-ChildItem $runtimeRoot -Filter "python*._pth" | Select-Object -First 1
if (-not $pth) { throw "Embedded Python ._pth dosyası bulunamadı." }
$pthLines = Get-Content $pth.FullName
if ($pthLines -notcontains "Lib\site-packages") { Add-Content -Path $pth.FullName -Value "Lib\site-packages" }
if ($pthLines -notcontains "import site") { Add-Content -Path $pth.FullName -Value "import site" }

$runtimePython = Join-Path $runtimeRoot "python.exe"
if (-not (Test-Path $runtimePython)) { throw "Bundled Python bulunamadı: $runtimePython" }

$getPip = Join-Path $tempRoot "get-pip.py"
Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $getPip
& $runtimePython $getPip --disable-pip-version-check --no-warn-script-location
if ($LASTEXITCODE -ne 0) { throw "Bundled Python pip kurulumu başarısız." }

Write-Host "2/6 PaddleOCR PP-OCRv5 kuruluyor..."
$paddlePackages = @("numpy==1.26.4","scipy==1.13.1","scikit-learn==1.7.1","paddleocr==3.3.2","paddlepaddle==3.2.2")
& $runtimePython -m pip install --disable-pip-version-check --no-warn-script-location $paddlePackages
if ($LASTEXITCODE -ne 0) { throw "PaddleOCR runtime kurulumu başarısız." }

Write-Host "3/6 Docling belge yapısı motoru kuruluyor..."
& $runtimePython -m pip install --disable-pip-version-check --no-warn-script-location "docling==2.128.0"
if ($LASTEXITCODE -ne 0) { throw "Docling kurulumu başarısız." }

Write-Host "4/6 Yalnızca gerekli Docling layout + table modelleri indiriliyor..."
$env:DOCLING_ARTIFACTS_PATH = $doclingRoot
$doclingTools = Join-Path $runtimeRoot "Scripts\docling-tools.exe"
& $doclingTools models download layout tableformer -o $doclingRoot
if ($LASTEXITCODE -ne 0) { throw "Docling modelleri indirilemedi." }

Write-Host "5/6 PaddleOCR modelleri yerel cache içine indiriliyor..."
$env:PADDLE_PDX_CACHE_HOME = $paddleRoot
$env:PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK = "1"
$env:PYTHONNOUSERSITE = "1"
& $runtimePython -c "from paddleocr import TextDetection, TextRecognition; TextDetection(model_name='PP-OCRv5_mobile_det', model_dir=r'$paddleRoot\models\det'); TextRecognition(model_name='latin_PP-OCRv5_mobile_rec', model_dir=r'$paddleRoot\models\rec')"
if ($LASTEXITCODE -ne 0) { throw "PP-OCRv5 modelleri yerel cache içine indirilemedi." }

Write-Host "6/6 Offline runtime doğrulanıyor..."
$env:PADDLE_PDX_CACHE_HOME = $paddleRoot
$env:PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK = "1"
$env:PADDLE_PDX_OFFLINE = "1"
$env:PYTHONNOUSERSITE = "1"
& $runtimePython -c "import paddle, paddleocr, docling; print('Paddle', paddle.__version__); print('PaddleOCR', paddleocr.__version__); print('Docling', docling.__version__)"
if ($LASTEXITCODE -ne 0) { throw "Yerel belge motorları import edilemedi." }

$marker = Join-Path $paddleRoot "faluzmn-document-intelligence.ready"
Set-Content -Path $marker -Value "FALUZMN PaddleOCR 3.3.2 / PaddlePaddle 3.2.2 / PP-OCRv5 / Docling 2.128.0 / CPU / offline" -Encoding UTF8

Remove-Item -Force $getPip,$zipPath -ErrorAction SilentlyContinue
Write-Host "FALUZMN belge istihbarat runtime hazır."
