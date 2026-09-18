$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root "resources\python-runtime\python.exe"
$marker = Join-Path $root "resources\paddleocr-v5\zeminlab-document-intelligence.ready"
$runner = Join-Path $root "tools\document_intelligence.py"

if ((Test-Path $python) -and (Test-Path $marker) -and (Test-Path $runner)) {
  Write-Host "ZeminLab belge motorları hazır."
  exit 0
}

& (Join-Path $PSScriptRoot "prepare-document-intelligence.ps1")
if ($LASTEXITCODE -ne 0) { throw "Belge istihbarat runtime hazırlanamadı." }
