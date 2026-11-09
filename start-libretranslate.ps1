$ErrorActionPreference = "Stop"

$serverUrl = "http://127.0.0.1:5000"
$serverIsRunning = $false
try {
    Invoke-RestMethod -Uri "$serverUrl/health" -TimeoutSec 2 | Out-Null
    $serverIsRunning = $true
} catch {
    # Start a local instance below when the health endpoint is unavailable.
}

if ($serverIsRunning) {
    $runningLanguages = Invoke-RestMethod -Uri "$serverUrl/languages" -TimeoutSec 2
    $runningCodes = @($runningLanguages | ForEach-Object { $_.code } | Sort-Object)
    if ($runningCodes.Count -ne 2 -or $runningCodes -notcontains "bg" -or $runningCodes -notcontains "en") {
        throw "A LibreTranslate server is running at $serverUrl with languages outside English and Bulgarian"
    }
    Write-Output "LibreTranslate is already running at $serverUrl (English <-> Bulgarian)"
    exit 0
}

$libreTranslate = Get-Command libretranslate -ErrorAction Stop
$modelDirectory = Join-Path $PSScriptRoot "assets\libretranslate\models"
if (-not (Test-Path (Join-Path $modelDirectory "translate-en_bg-1_9")) -or
    -not (Test-Path (Join-Path $modelDirectory "translate-bg_en-1_9"))) {
    throw "English and Bulgarian models are missing from $modelDirectory"
}
$env:ARGOS_PACKAGES_DIR = $modelDirectory

$logDirectory = Join-Path $env:LOCALAPPDATA "PantryIQ\LibreTranslate"
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$stdoutPath = Join-Path $logDirectory "server.log"
$stderrPath = Join-Path $logDirectory "server-error.log"

$process = Start-Process -FilePath $libreTranslate.Source `
    -ArgumentList @("--host", "127.0.0.1", "--port", "5000", "--load-only", "en,bg") `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -PassThru

for ($attempt = 0; $attempt -lt 60; $attempt++) {
    Start-Sleep -Seconds 1
    if ($process.HasExited) {
        throw "LibreTranslate exited during startup. Check $stderrPath"
    }
    try {
        Invoke-RestMethod -Uri "$serverUrl/health" -TimeoutSec 2 | Out-Null
        $runningLanguages = Invoke-RestMethod -Uri "$serverUrl/languages" -TimeoutSec 2
        $runningCodes = @($runningLanguages | ForEach-Object { $_.code } | Sort-Object)
        if ($runningCodes.Count -ne 2 -or $runningCodes -notcontains "bg" -or $runningCodes -notcontains "en") {
            throw "LibreTranslate started with languages outside English and Bulgarian"
        }
        Write-Output "LibreTranslate is ready at $serverUrl (English <-> Bulgarian)"
        exit 0
    } catch {
        # Wait while LibreTranslate loads its language models.
    }
}

throw "LibreTranslate did not become ready. Check $stderrPath"
