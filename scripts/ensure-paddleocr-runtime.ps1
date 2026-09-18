$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runtimePython = Join-Path $root "resources\python-runtime\python.exe"
$modelRoot = Join-Path $root "resources\paddleocr-vl-v1"
$marker = Join-Path $modelRoot "zeminlab-ocr-runtime.ready"

if ((Test-Path $runtimePython) -and (Test-Path $marker)) {
  Write-Host "ZeminLab OCR runtime hazır. Hazırlama atlandı."
  exit 0
}

Write-Host "ZeminLab OCR runtime eksik. Yerel CPU PaddleOCR hazırlanıyor..."
& (Join-Path $PSScriptRoot "prepare-paddleocr-vl.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "ZeminLab OCR runtime hazırlanamadı."
}
