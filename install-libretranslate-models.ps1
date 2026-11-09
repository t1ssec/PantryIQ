$ErrorActionPreference = "Stop"

if (-not (Get-Command libretranslate -ErrorAction SilentlyContinue)) {
    throw "LibreTranslate is not installed. Install it with: python -m pip install libretranslate"
}

$modelDirectory = Join-Path $PSScriptRoot "assets\libretranslate\models"
$downloadDirectory = Join-Path $PSScriptRoot "assets\libretranslate\downloads"
New-Item -ItemType Directory -Force -Path $modelDirectory, $downloadDirectory | Out-Null
$env:ARGOS_PACKAGES_DIR = $modelDirectory

$models = @(
    @{ Name = "translate-en_bg-1_9"; Url = "https://argos-net.com/v1/translate-en_bg-1_9.argosmodel" },
    @{ Name = "translate-bg_en-1_9"; Url = "https://argos-net.com/v1/translate-bg_en-1_9.argosmodel" }
)

foreach ($model in $models) {
    $installedPath = Join-Path $modelDirectory $model.Name
    if (Test-Path (Join-Path $installedPath "metadata.json")) {
        Write-Output "$($model.Name) is already installed"
        continue
    }

    $packagePath = Join-Path $downloadDirectory "$($model.Name).argosmodel"
    curl.exe -L --fail --silent --show-error -o $packagePath $model.Url
    if ($LASTEXITCODE -ne 0) {
        throw "Could not download $($model.Name)"
    }

    python -c "import sys; from argostranslate import package; package.install_from_path(sys.argv[1])" $packagePath
    if ($LASTEXITCODE -ne 0) {
        throw "Could not install $($model.Name)"
    }
    Remove-Item -LiteralPath $packagePath -Force
    Write-Output "$($model.Name) installed"
}
