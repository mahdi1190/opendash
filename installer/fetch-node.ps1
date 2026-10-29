# CI only (not shipped to users). Downloads the pinned portable Node.js
# (installer\node-version.txt), checks its SHA-256 against nodejs.org's
# SHASUMS256.txt, and keeps only node.exe and LICENSE in -OutDir.
param([Parameter(Mandatory)][string]$OutDir)
$ErrorActionPreference = 'Stop'
$ver = (Get-Content (Join-Path $PSScriptRoot 'node-version.txt') -Raw).Trim()
if ($ver -notmatch '^\d+\.\d+\.\d+$') { throw "bad node version '$ver'" }
$name = "node-v$ver-win-x64"
$base = "https://nodejs.org/dist/v$ver"
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("opendash-node-" + [guid]::NewGuid())
New-Item -ItemType Directory -Force -Path $tmp, $OutDir | Out-Null
$zip = Join-Path $tmp "$name.zip"
Invoke-WebRequest "$base/$name.zip" -OutFile $zip -UseBasicParsing
Invoke-WebRequest "$base/SHASUMS256.txt" -OutFile (Join-Path $tmp 'SHASUMS256.txt') -UseBasicParsing
$line = Get-Content (Join-Path $tmp 'SHASUMS256.txt') | Where-Object { $_ -match "\s$([regex]::Escape($name)).zip$" } | Select-Object -First 1
if (-not $line) { throw "no checksum for $name.zip in SHASUMS256.txt" }
$want = ($line -split '\s+')[0].ToLower()
$got = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
if ($got -ne $want) { throw "Node.js checksum mismatch: wanted $want, got $got" }
Write-Host "Node.js v$ver verified ($got)"
Expand-Archive $zip -DestinationPath $tmp -Force
Copy-Item (Join-Path $tmp "$name\node.exe") (Join-Path $OutDir 'node.exe') -Force
Copy-Item (Join-Path $tmp "$name\LICENSE") (Join-Path $OutDir 'LICENSE') -Force
Remove-Item $tmp -Recurse -Force
