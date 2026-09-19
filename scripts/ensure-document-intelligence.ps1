$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root "resources\python-runtime\python.exe"
$paddleRoot = Join-Path $root "resources\paddleocr-v5"
$marker = Join-Path $paddleRoot "faluzmn-document-intelligence.ready"
$detModel = Join-Path $paddleRoot "official_models\PP-OCRv5_mobile_det\inference.pdiparams"
$recModel = Join-Path $paddleRoot "official_models\latin_PP-OCRv5_mobile_rec\inference.pdiparams"
$runner = Join-Path $root "tools\document_intelligence.py"

if (
  (Test-Path $python) -and
  (Test-Path $marker) -and
  (Test-Path $detModel) -and
  (Test-Path $recModel) -and
  (Test-Path $runner)
) {
  Write-Host "FALUZMN belge motorları hazır."
  exit 0
}

& (Join-Path $PSScriptRoot "prepare-document-intelligence.ps1")
if ($LASTEXITCODE -ne 0) { throw "FALUZMN belge motorları hazırlanamadı." }
