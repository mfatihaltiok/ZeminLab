$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runtimePython = Join-Path $root "resources\python-runtime\python.exe"
$modelRoot = Join-Path $root "resources\paddleocr-vl-v1"

$requiredModels = @(
  "PaddleOCR-VL",
  "PP-DocLayoutV2"
)

$runtimeReady = Test-Path $runtimePython
$modelsReady = $true
foreach ($name in $requiredModels) {
  if (-not (Test-Path (Join-Path $modelRoot $name))) {
    $modelsReady = $false
    break
  }
}

if ($runtimeReady -and $modelsReady) {
  Write-Host "ZeminLab OCR runtime hazır. Hazırlama atlandı."
  exit 0
}

Write-Host "ZeminLab OCR runtime eksik. Yerel Python + PaddleOCR-VL hazırlanıyor..."
& (Join-Path $PSScriptRoot "prepare-paddleocr-vl.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "ZeminLab OCR runtime hazırlanamadı."
}
