$ErrorActionPreference = "Stop"

Write-Host "Building Monarch Lanucher..." -ForegroundColor Cyan

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host "The .NET 8 SDK or newer is required. Install it, then run this script again." -ForegroundColor Red
    exit 1
}

function Invoke-DotNet {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & dotnet @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
    }
}

$version = & dotnet --version
if ($LASTEXITCODE -ne 0) {
    throw "Unable to determine the installed .NET SDK version."
}
Write-Host "Using .NET SDK $version"

$artifacts = Join-Path $PSScriptRoot "artifacts"
$publishDir = Join-Path $artifacts "MonarchLauncher-win-x64"
$updaterPublishDir = Join-Path $artifacts "updater-temp"
$releaseZip = Join-Path $artifacts "MonarchLanucher-win-x64.zip"

if (Test-Path $publishDir) { Remove-Item $publishDir -Recurse -Force }
if (Test-Path $updaterPublishDir) { Remove-Item $updaterPublishDir -Recurse -Force }
if (Test-Path $releaseZip) { Remove-Item $releaseZip -Force }

Invoke-DotNet -Arguments @(
    "restore",
    ".\MonarchLauncher.sln"
)

Invoke-DotNet -Arguments @(
    "test",
    ".\MonarchLauncher.sln",
    "-c", "Release",
    "--no-restore"
)

Invoke-DotNet -Arguments @(
    "publish",
    ".\src\MonarchLauncher.App\MonarchLauncher.App.csproj",
    "-c", "Release",
    "-r", "win-x64",
    "--self-contained", "false",
    "-o", $publishDir
)

Invoke-DotNet -Arguments @(
    "publish",
    ".\src\MonarchLauncher.Updater\MonarchLauncher.Updater.csproj",
    "-c", "Release",
    "-r", "win-x64",
    "--self-contained", "false",
    "-p:PublishSingleFile=true",
    "-o", $updaterPublishDir
)

$updaterExe = Join-Path $updaterPublishDir "MonarchLauncher.Updater.exe"
if (-not (Test-Path $updaterExe)) {
    throw "Updater publish finished without creating: $updaterExe"
}
Copy-Item $updaterExe (Join-Path $publishDir "MonarchLauncher.Updater.exe") -Force

$exe = Join-Path $publishDir "MonarchLauncher.App.exe"
if (-not (Test-Path $exe)) {
    throw "Publish finished without creating the expected executable: $exe"
}

Compress-Archive -Path (Join-Path $publishDir "*") -DestinationPath $releaseZip -CompressionLevel Optimal
Remove-Item $updaterPublishDir -Recurse -Force

Write-Host ""
Write-Host "Build complete:" -ForegroundColor Green
Write-Host "  App:     $exe"
Write-Host "  Release: $releaseZip"
