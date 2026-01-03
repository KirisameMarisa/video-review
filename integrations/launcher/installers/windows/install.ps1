$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ExeName = "videoreview-launcher.exe"
$SourceExe = Join-Path $ScriptDir $ExeName

if (!(Test-Path $SourceExe)) {
    Write-Error "Launcher exe not found: $SourceExe"
    exit 1
}

# default install dir
$DefaultInstallDir = "$env:LOCALAPPDATA\VideoReview"
$InstallDir = Read-Host "Install directory (default: $DefaultInstallDir)"
if ([string]::IsNullOrWhiteSpace($InstallDir)) {
    $InstallDir = $DefaultInstallDir
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$DestExe = Join-Path $InstallDir $ExeName
Copy-Item $SourceExe $DestExe -Force

# register protocol
$Command = "`"$DestExe`" `"%1`""

$RootKey    = "Registry::HKEY_CURRENT_USER\Software\Classes\videoreview"
$CommandKey = "$RootKey\shell\open\command"

New-Item -Force $CommandKey | Out-Null

Set-ItemProperty `
    -Path $RootKey `
    -Name "URL Protocol" `
    -Value ""

# mark as URL protocol
Set-ItemProperty `
    -Path $CommandKey `
    -Name "(default)" `
    -Value $Command

Write-Host ""
Write-Host "VideoReview launcher installed successfully."
Write-Host "Installed to: $DestExe"
