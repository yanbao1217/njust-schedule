$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$packageJson = Get-Content (Join-Path $projectRoot "package.json") | ConvertFrom-Json
$version = $packageJson.version
$bundleName = "opencli-njust-v$version"
$releaseRoot = Join-Path $projectRoot "release"
$bundleDir = Join-Path $releaseRoot $bundleName
$zipPath = Join-Path $releaseRoot "$bundleName.zip"

node (Join-Path $projectRoot "scripts/prepare-release.mjs")

if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}

Compress-Archive -Path $bundleDir -DestinationPath $zipPath
Write-Host "Created release archive: $zipPath"

