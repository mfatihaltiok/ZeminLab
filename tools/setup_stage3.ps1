$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

Write-Host '1/2 Yerel belge istihbarat runtime hazırlanıyor...'
& (Join-Path $Root 'scripts\prepare-document-intelligence.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Belge istihbarat runtime hazırlanamadı.' }

Write-Host '2/2 Yerel mühendislik kaynak paketi hazırlanıyor...'
$VenvPython = Join-Path $Root 'resources\python-runtime\python.exe'
$SourcePack = Join-Path $Root 'source-pack'
& $VenvPython (Join-Path $PSScriptRoot 'install_source_pack.py') --output $SourcePack
if ($LASTEXITCODE -ne 0) { throw 'Kaynak paketi hazırlanamadı.' }

& $VenvPython (Join-Path $PSScriptRoot 'source_pack_indexer.py') --pdf (Join-Path $SourcePack 'erol-2014\saha-deneyleri-2014.pdf') --source-key EROL-CHEKINMEZ-2014 --pdf (Join-Path $SourcePack 'erol-2018\jet-enjeksiyon-2018.pdf') --source-key EROL-CHEKINMEZ-BAYRAM-2018-JET --output (Join-Path $SourcePack 'indexed')
if ($LASTEXITCODE -ne 0) { throw 'Kaynak paketi indekslenemedi.' }

Write-Host 'ZeminLab Stage 3 yerel runtime ve kaynak paketi hazır.'
