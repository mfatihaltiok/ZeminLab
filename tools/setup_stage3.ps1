$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Venv = Join-Path $Root 'python-runtime'
$Python = Join-Path $Venv 'Scripts\python.exe'

if (-not (Test-Path $Python)) { py -3.12 -m venv $Venv }
& $Python -m pip install --upgrade pip

# Stable Windows baseline. CPU Paddle is deliberately the default so the installer
# is not tied to one NVIDIA/CUDA combination. GPU acceleration can be enabled later
# with a hardware-specific PaddlePaddle wheel without changing the application.
& $Python -m pip install paddlepaddle==3.2.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
& $Python -m pip install paddleocr pymupdf openpyxl ezdxf pillow

$env:PADDLE_PDX_MODEL_SOURCE = 'BOS'
& $Python -c "from paddleocr import PaddleOCR; PaddleOCR(lang='tr', use_doc_orientation_classify=True, use_doc_unwarping=True, use_textline_orientation=True); print('PaddleOCR Turkish model cache prepared.')"

& $Python (Join-Path $PSScriptRoot 'install_source_pack.py') --output (Join-Path $Root 'source-pack')
& $Python (Join-Path $PSScriptRoot 'source_pack_indexer.py') --pdf (Join-Path $Root 'source-pack\erol-2014\saha-deneyleri-2014.pdf') --source-key EROL-CHEKINMEZ-2014 --pdf (Join-Path $Root 'source-pack\erol-2018\jet-enjeksiyon-2018.pdf') --source-key EROL-CHEKINMEZ-BAYRAM-2018-JET --output (Join-Path $Root 'source-pack\indexed')

Write-Host 'ZeminLab Stage 3 Python runtime, local PaddleOCR models and source-pack hazır.'
