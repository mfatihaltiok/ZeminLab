$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Venv = Join-Path $Root 'python-runtime'
$Python = Join-Path $Venv 'Scripts\python.exe'
if (-not (Test-Path $Python)) { py -3.12 -m venv $Venv }
& $Python -m pip install --upgrade pip
& $Python -m pip install paddlepaddle 'paddleocr[doc-parser]' pymupdf openpyxl ezdxf pillow
& $Python (Join-Path $PSScriptRoot 'install_source_pack.py') --output (Join-Path $Root 'source-pack')
& $Python (Join-Path $PSScriptRoot 'source_pack_indexer.py') --pdf (Join-Path $Root 'source-pack\erol-2014\saha-deneyleri-2014.pdf') --source-key EROL-CHEKINMEZ-2014 --pdf (Join-Path $Root 'source-pack\erol-2018\jet-enjeksiyon-2018.pdf') --source-key EROL-CHEKINMEZ-BAYRAM-2018-JET --output (Join-Path $Root 'source-pack\indexed')
Write-Host 'ZeminLab Stage 3 Python runtime, PaddleOCR ve source-pack hazır.'
