$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$resourceRoot = Join-Path $root "resources"
$runtimeRoot = Join-Path $resourceRoot "python-runtime"
$paddleRoot = Join-Path $resourceRoot "paddleocr-v5"
$doclingRoot = Join-Path $resourceRoot "docling"
$pythonVersion = "3.12.10"
$pythonZip = "python-$pythonVersion-embed-amd64.zip"
$pythonUrl = "https://www.python.org/ftp/python/$pythonVersion/$pythonZip"
$tempRoot = Join-Path $env:TEMP "faluzmn-document-intelligence-build"

function Invoke-NativeCommand {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $false)][string[]]$Arguments = @()
  )

  $savedPreference = $ErrorActionPreference
  try {
    # Paddle/PaddleX on Windows may invoke "where ccache" during import.
    # Missing ccache is a benign diagnostic, not a runtime failure.
    $ErrorActionPreference = "Continue"
    $output = @(& $FilePath @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
    return [pscustomobject]@{
      ExitCode = $exitCode
      Output = ($output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
    }
  }
  finally {
    $ErrorActionPreference = $savedPreference
  }
}

function Invoke-BundledPython {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )
  return Invoke-NativeCommand -FilePath $runtimePython -Arguments $Arguments
}

function Assert-NativeSuccess {
  param(
    [Parameter(Mandatory = $true)][psobject]$Result,
    [Parameter(Mandatory = $true)][string]$Message
  )
  if ($Result.ExitCode -ne 0) {
    $details = if ([string]::IsNullOrWhiteSpace($Result.Output)) { "" } else { " " + $Result.Output }
    throw ($Message + " (exit code " + $Result.ExitCode + ")." + $details)
  }
}

New-Item -ItemType Directory -Force -Path $resourceRoot,$tempRoot | Out-Null
New-Item -ItemType Directory -Force -Path $runtimeRoot,$paddleRoot,$doclingRoot | Out-Null

$runtimePython = Join-Path $runtimeRoot "python.exe"
$zipPath = Join-Path $tempRoot $pythonZip
$getPip = $null

Write-Host "1/6 Bundled Python kontrol ediliyor..."
if (-not (Test-Path $runtimePython)) {
  Invoke-WebRequest -Uri $pythonUrl -OutFile $zipPath
  Expand-Archive -Path $zipPath -DestinationPath $runtimeRoot -Force
} else {
  Write-Host "Bundled Python zaten mevcut; yeniden indirilmiyor."
}

$pth = Get-ChildItem $runtimeRoot -Filter "python*._pth" | Select-Object -First 1
if (-not $pth) { throw "Embedded Python ._pth dosyası bulunamadı." }
$pthLines = Get-Content $pth.FullName
if ($pthLines -notcontains "Lib\site-packages") { Add-Content -Path $pth.FullName -Value "Lib\site-packages" }
if ($pthLines -notcontains "import site") { Add-Content -Path $pth.FullName -Value "import site" }

if (-not (Test-Path $runtimePython)) { throw "Bundled Python bulunamadı: $runtimePython" }

$pipCheck = Invoke-BundledPython -Arguments @("-m","pip","--version")
if ($pipCheck.ExitCode -ne 0) {
  $getPip = Join-Path $tempRoot "get-pip.py"
  Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $getPip
  $pipInstall = Invoke-BundledPython -Arguments @($getPip,"--disable-pip-version-check","--no-warn-script-location")
  Assert-NativeSuccess -Result $pipInstall -Message "Bundled Python pip kurulumu başarısız."
} else {
  Write-Host "pip zaten mevcut; yeniden kurulmayacak."
}

function Patch-PaddleXModelScopeImport {
  $officialModelsPath = Join-Path $runtimeRoot "Lib\site-packages\paddlex\inference\utils\official_models.py"
  if (-not (Test-Path $officialModelsPath)) {
    throw "PaddleX official_models.py bulunamadı: $officialModelsPath"
  }

  $source = Get-Content -Raw -Path $officialModelsPath
  $classStartText = "class _ModelScopeModelHoster(_BaseModelHoster):"
  $nextClassText = "class _AIStudioModelHoster(_BaseModelHoster):"
  $classStart = $source.IndexOf($classStartText)
  $classEnd = $source.IndexOf($nextClassText, $classStart)

  if ($classStart -lt 0 -or $classEnd -lt 0) {
    throw "PaddleX ModelScope hoster bölümü beklenen yapıda bulunamadı."
  }

  $source = [regex]::Replace(
    $source,
    '(?m)^import modelscope[ \t]*$',
    "# FALUZMN: ModelScope lazy-load edilir; temel OCR başlangıcında Torch yüklenmez."
  )

  $classSegment = $source.Substring($classStart, $classEnd - $classStart)
  if ($classSegment -notmatch '(?m)^[ \t]+import modelscope[ \t]*$') {
    $methodSignature = "    def _download(self, model_name, save_dir):"
    $methodIndex = $classSegment.IndexOf($methodSignature)
    if ($methodIndex -lt 0) {
      throw "PaddleX ModelScope _download metodu beklenen yapıda bulunamadı."
    }

    $insertAt = $methodIndex + $methodSignature.Length
    $lazyImport = [Environment]::NewLine + "        import modelscope"
    $classSegment = $classSegment.Insert($insertAt, $lazyImport)
    $source = $source.Substring(0, $classStart) + $classSegment + $source.Substring($classEnd)
  }

  Set-Content -Path $officialModelsPath -Value $source -Encoding UTF8

  $patchMarker = Join-Path $paddleRoot "faluzmn-paddlex-lazy-modelscope.ready"
  Set-Content -Path $patchMarker -Value "PaddleX ModelScope import lazy-loaded by FALUZMN runtime preparation." -Encoding UTF8
}

Patch-PaddleXModelScopeImport

Write-Host "2/6 PaddleOCR runtime kontrol ediliyor..."
Patch-PaddleXModelScopeImport

$paddleProbe = Invoke-BundledPython -Arguments @(
  "-c",
  "import paddle, paddleocr; print(paddle.__version__); print(paddleocr.__version__)"
)
$paddleText = $paddleProbe.Output
if ($paddleProbe.ExitCode -ne 0 -or $paddleText -notmatch "3\.2\.2" -or $paddleText -notmatch "3\.3\.2") {
  $paddlePackages = @("numpy==1.26.4","scipy==1.13.1","scikit-learn==1.7.1","paddleocr==3.3.2","paddlepaddle==3.2.2")
  $install = Invoke-BundledPython -Arguments (@("-m","pip","install","--disable-pip-version-check","--no-warn-script-location") + $paddlePackages)
  Assert-NativeSuccess -Result $install -Message "PaddleOCR runtime kurulumu başarısız."
} else {
  Write-Host "PaddleOCR 3.3.2 / PaddlePaddle 3.2.2 zaten kurulu; yeniden indirilmiyor."
}

Write-Host "3/6 Docling belge yapısı motoru kontrol ediliyor..."
$doclingProbe = Invoke-BundledPython -Arguments @("-c","import docling; print(docling.__version__)")
$doclingText = $doclingProbe.Output
if ($doclingProbe.ExitCode -ne 0 -or $doclingText -notmatch "2\.128\.0") {
  $installDocling = Invoke-BundledPython -Arguments @("-m","pip","install","--disable-pip-version-check","--no-warn-script-location","docling==2.128.0")
  Assert-NativeSuccess -Result $installDocling -Message "Docling kurulumu başarısız."
} else {
  Write-Host "Docling 2.128.0 zaten kurulu; yeniden indirilmiyor."
}

Write-Host "4/6 Yalnızca gerekli Docling layout + table modelleri indiriliyor..."
$env:DOCLING_ARTIFACTS_PATH = $doclingRoot
$doclingTools = Join-Path $runtimeRoot "Scripts\docling-tools.exe"
if (-not (Test-Path $doclingTools)) { throw "Docling CLI bulunamadı: $doclingTools" }
$doclingDownload = Invoke-NativeCommand -FilePath $doclingTools -Arguments @("models","download","layout","tableformer","-o",$doclingRoot)
Assert-NativeSuccess -Result $doclingDownload -Message "Docling modelleri indirilemedi."

Write-Host "5/6 PaddleOCR modelleri yerel cache içine indiriliyor..."
$env:PADDLE_PDX_CACHE_HOME = $paddleRoot
$env:PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK = "1"
$env:PYTHONNOUSERSITE = "1"
$env:PADDLE_PDX_OFFLINE = $null

# Do not pass model_dir while downloading. Official models are cached under:
# PADDLE_PDX_CACHE_HOME\official_models\<model-name>
$modelBootstrap = @(
  "from paddleocr import TextDetection, TextRecognition",
  "TextDetection(model_name='PP-OCRv5_mobile_det', device='cpu')",
  "TextRecognition(model_name='latin_PP-OCRv5_mobile_rec', device='cpu')"
) -join "; "
$paddleModels = Invoke-BundledPython -Arguments @("-c",$modelBootstrap)
Assert-NativeSuccess -Result $paddleModels -Message "PP-OCRv5 modelleri yerel cache içine indirilemedi."

$officialModelsRoot = Join-Path $paddleRoot "official_models"
$detModel = Join-Path $officialModelsRoot "PP-OCRv5_mobile_det"
$recModel = Join-Path $officialModelsRoot "latin_PP-OCRv5_mobile_rec"
if (-not (Test-Path (Join-Path $detModel "inference.pdiparams"))) {
  throw "PP-OCRv5 detection modeli beklenen cache yolunda bulunamadı: $detModel"
}
if (-not (Test-Path (Join-Path $recModel "inference.pdiparams"))) {
  throw "PP-OCRv5 recognition modeli beklenen cache yolunda bulunamadı: $recModel"
}

Write-Host "6/6 Offline runtime doğrulanıyor..."
$env:PADDLE_PDX_CACHE_HOME = $paddleRoot
$env:PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK = "1"
$env:PADDLE_PDX_OFFLINE = "1"
$env:PYTHONNOUSERSITE = "1"
$offlineProbe = Invoke-BundledPython -Arguments @(
  "-c",
  "import paddle, paddleocr, docling; print('Paddle', paddle.__version__); print('PaddleOCR', paddleocr.__version__); print('Docling', docling.__version__)"
)
Assert-NativeSuccess -Result $offlineProbe -Message "Yerel belge motorları import edilemedi."

$marker = Join-Path $paddleRoot "faluzmn-document-intelligence.ready"
Set-Content -Path $marker -Value "FALUZMN PaddleOCR 3.3.2 / PaddlePaddle 3.2.2 / PP-OCRv5 / Docling 2.128.0 / CPU / offline / official_models cache" -Encoding UTF8

if ($getPip -and (Test-Path $getPip)) { Remove-Item -Force $getPip -ErrorAction SilentlyContinue }
if ($zipPath -and (Test-Path $zipPath)) { Remove-Item -Force $zipPath -ErrorAction SilentlyContinue }
Write-Host "FALUZMN belge istihbarat runtime hazır."
