$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Dist = Join-Path $Root "dist"

$ExeName = "videoreview-launcher.exe"

Write-Host "Building VideoReview Launcher (Windows)..."

if (!(Test-Path $Dist)) {
    New-Item -ItemType Directory -Path $Dist | Out-Null
}

$env:GOOS = "windows"
$env:GOARCH = "amd64"

go build -o (Join-Path $Dist $ExeName) .

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed"
    exit 1
}

Write-Host "Build succeeded: $Dist\$ExeName"