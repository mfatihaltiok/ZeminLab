$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$resourceRoot = Join-Path $root "resources\paddleocr-vl-v1"
$python = if ($env:ZEMINLAB_PYTHON) { $env:ZEMINLAB_PYTHON } else { "python" }

New-Item -ItemType Directory -Force -Path $resourceRoot | Out-Null

Write-Host "PaddleOCR-VL v1 model paketi hazırlanıyor..."
Write-Host "Model boyutu yaklaşık 2.4 GB olabilir."

& $python -m pip install -U "paddleocr[doc-parser]" "paddlepaddle>=3.2.1" "huggingface_hub>=0.34"
if ($LASTEXITCODE -ne 0) { throw "PaddleOCR/PaddlePaddle kurulumu başarısız." }

$bootstrap = @'
from pathlib import Path
from paddleocr import PaddleOCRVL

print("PaddleOCR-VL v1 modelleri indiriliyor...")
pipeline = PaddleOCRVL(
    pipeline_version="v1",
    use_doc_orientation_classify=True,
    use_doc_unwarping=True,
    use_layout_detection=True,
)
print("Model indirme/önbelleğe alma tamamlandı.")
'@

$temp = Join-Path $env:TEMP "zeminlab_prepare_paddleocr_vl.py"
Set-Content -Path $temp -Value $bootstrap -Encoding UTF8

$cache = Join-Path $env:USERPROFILE ".paddlex\official_models"
& $python $temp
if ($LASTEXITCODE -ne 0) { throw "PaddleOCR-VL model indirme/önbelleğe alma başarısız." }

$required = @(
  "PaddleOCR-VL",
  "PP-DocLayoutV2",
  "PP-LCNet_x1_0_doc_ori",
  "UVDoc"
)

foreach ($name in $required) {
  $source = Join-Path $cache $name
  $target = Join-Path $resourceRoot $name
  if (-not (Test-Path $source)) {
    throw "Beklenen model önbellekte bulunamadı: $source"
  }
  if (Test-Path $target) { Remove-Item -Recurse -Force $target }
  Copy-Item -Recurse -Force $source $target
  Write-Host "Paketlendi: $name"
}

Remove-Item -Force $temp -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "PaddleOCR-VL v1 tamamen yerel model paketi hazır:"
Write-Host $resourceRoot
