# CI only (not shipped to users). Builds OpenDash-Setup-<version>.exe.
#   -SourceDir  an extracted release (the folder holding start-opendash.bat)
#   -Version    e.g. 2.19.7
#   -OutDir     where the .exe goes
param(
  [Parameter(Mandatory)][string]$SourceDir,
  [Parameter(Mandatory)][string]$Version,
  [Parameter(Mandatory)][string]$OutDir
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path (Join-Path $SourceDir 'start-opendash.bat'))) { throw "$SourceDir is not an OpenDash folder" }
$runtime = Join-Path ([IO.Path]::GetTempPath()) ("opendash-runtime-" + [guid]::NewGuid())
& (Join-Path $PSScriptRoot 'fetch-node.ps1') -OutDir $runtime

function Find-Iscc {
  $c = Get-Command ISCC.exe -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  foreach ($p in @("${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe", "$env:ProgramFiles\Inno Setup 6\ISCC.exe", "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe")) {
    if (Test-Path $p) { return $p }
  }
  return $null
}
$iscc = Find-Iscc
if (-not $iscc) {
  choco install innosetup -y --no-progress
  $iscc = Find-Iscc
}
if (-not $iscc) { throw 'Inno Setup (ISCC.exe) is not installed' }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
& $iscc "/DAppVersion=$Version" "/DSourceDir=$((Resolve-Path $SourceDir).Path)" "/DRuntimeDir=$runtime" "/O$((Resolve-Path $OutDir).Path)" (Join-Path $PSScriptRoot 'opendash.iss')
if ($LASTEXITCODE -ne 0) { throw "ISCC failed ($LASTEXITCODE)" }
Remove-Item $runtime -Recurse -Force
Get-Item (Join-Path $OutDir "OpenDash-Setup-$Version.exe")
