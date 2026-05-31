<#
  PinPlay one-command installer (Windows).

  Does everything a brand-new teacher needs, from a fresh PC:
    1. Installs Node.js if missing (winget first, then the official LTS MSI).
    2. Downloads + unpacks the latest PinPlay code (no git required).
    3. Launches the guided setup wizard (setup/pinplay-setup.mjs).

  Teacher runs ONE line in PowerShell:
    iwr https://raw.githubusercontent.com/audiophrases/pinplay/main/setup/install.ps1 | iex

  This script changes NOTHING about the owner's setup — it only provisions the
  teacher's own machine and then hands off to the wizard (which itself only
  touches the teacher's own Cloudflare account).
#>

$ErrorActionPreference = 'Stop'

function Info($m)  { Write-Host $m -ForegroundColor Cyan }
function Ok($m)    { Write-Host $m -ForegroundColor Green }
function Warn($m)  { Write-Host $m -ForegroundColor Yellow }
function Fail($m)  { Write-Host $m -ForegroundColor Red }

# ---- Config ----
$RepoOwner   = 'audiophrases'
$RepoName    = 'pinplay'
$Branch      = 'main'
$TarballUrl  = "https://codeload.github.com/$RepoOwner/$RepoName/tar.gz/refs/heads/$Branch"
$InstallRoot = Join-Path $env:USERPROFILE 'PinPlay'   # where the repo lands

Write-Host ''
Info '=== PinPlay Installer (Windows) ==='
Write-Host 'This sets up your own free copy of PinPlay. It may take a few minutes.'
Write-Host ''

# ---------------------------------------------------------------------------
# Recompute PATH from the registry so tools installed in THIS run are visible
# without reopening the terminal (the classic "installed but not found" gotcha).
# ---------------------------------------------------------------------------
function Update-SessionPath {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = (@($machine, $user) | Where-Object { $_ } ) -join ';'
}

function Get-NodeCmd {
  # Prefer PATH; fall back to the standard install location.
  $c = Get-Command node -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  $std = Join-Path $env:ProgramFiles 'nodejs\node.exe'
  if (Test-Path $std) { return $std }
  return $null
}

# ---------------------------------------------------------------------------
# Step 1 — Node.js
# ---------------------------------------------------------------------------
function Install-Node {
  if (Get-NodeCmd) { Ok "[1/3] Node.js already installed ($(Get-NodeCmd))"; return }

  Info '[1/3] Installing Node.js…'

  # Try winget first (present on Win10 1709+/Win11).
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if ($winget) {
    try {
      Write-Host '      Using Windows Package Manager (winget)…'
      & winget install --id OpenJS.NodeJS.LTS -e --source winget `
        --accept-package-agreements --accept-source-agreements --silent | Out-Null
      Update-SessionPath
      if (Get-NodeCmd) { Ok '      ✓ Node.js installed via winget.'; return }
    } catch {
      Warn "      winget install didn't complete ($($_.Exception.Message)). Trying direct download…"
    }
  } else {
    Warn '      winget not available; downloading the official installer instead…'
  }

  # Fallback: download + silently install the latest LTS MSI.
  try {
    Write-Host '      Finding the latest Node.js LTS…'
    $idx = Invoke-RestMethod 'https://nodejs.org/dist/index.json'
    $lts = $idx | Where-Object { $_.lts } | Select-Object -First 1
    if (-not $lts) { throw 'could not determine the latest LTS version' }
    $ver = $lts.version
    $msiUrl = "https://nodejs.org/dist/$ver/node-$ver-x64.msi"
    $msiPath = Join-Path $env:TEMP "node-$ver-x64.msi"
    Write-Host "      Downloading Node.js $ver…"
    Invoke-WebRequest -UseBasicParsing -Uri $msiUrl -OutFile $msiPath
    Write-Host '      Installing (you may see a Windows permission prompt)…'
    Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /qn /norestart" -Wait
    Remove-Item $msiPath -ErrorAction SilentlyContinue
    Update-SessionPath
    if (Get-NodeCmd) { Ok '      ✓ Node.js installed.'; return }
  } catch {
    Fail "      Could not install Node.js automatically: $($_.Exception.Message)"
  }

  Fail ''
  Fail '      Please install Node.js (the "LTS" button) from https://nodejs.org,'
  Fail '      then run this installer again.'
  Start-Process 'https://nodejs.org'
  exit 1
}

# ---------------------------------------------------------------------------
# Step 2 — Download + unpack the latest PinPlay code (no git).
# ---------------------------------------------------------------------------
function Get-Repo {
  Info '[2/3] Downloading the latest PinPlay code…'
  $tmp = Join-Path $env:TEMP ("pinplay-dl-" + [Guid]::NewGuid().ToString('N').Substring(0,8))
  New-Item -ItemType Directory -Path $tmp -Force | Out-Null
  $tgz = Join-Path $tmp 'pinplay.tgz'

  Invoke-WebRequest -UseBasicParsing -Uri $TarballUrl -OutFile $tgz

  # GNU tar on Windows reads "C:\..." as a remote host → --force-local is required.
  & tar.exe --force-local -xzf "$tgz" -C "$tmp"
  if ($LASTEXITCODE -ne 0) { throw 'failed to unpack the download' }

  $extracted = Join-Path $tmp "$RepoName-$Branch"
  if (-not (Test-Path $extracted)) { throw 'unexpected download layout' }

  # Move into a stable folder. If one already exists, freshen files in place so a
  # re-run updates rather than fails.
  if (Test-Path $InstallRoot) {
    Warn "      Existing PinPlay folder found; refreshing it: $InstallRoot"
    Copy-Item -Path (Join-Path $extracted '*') -Destination $InstallRoot -Recurse -Force
  } else {
    Move-Item -Path $extracted -Destination $InstallRoot
  }
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
  Ok "      ✓ PinPlay code is in: $InstallRoot"
}

# ---------------------------------------------------------------------------
# Step 3 — Hand off to the guided wizard.
# ---------------------------------------------------------------------------
function Start-Wizard {
  Info '[3/3] Starting the PinPlay setup wizard…'
  Write-Host ''
  $node = Get-NodeCmd
  if (-not $node) { Fail 'Node.js still not found on PATH. Please reopen PowerShell and run the wizard manually.'; exit 1 }
  $wizard = Join-Path $InstallRoot 'setup\pinplay-setup.mjs'
  if (-not (Test-Path $wizard)) { Fail "Wizard not found at $wizard"; exit 1 }
  Set-Location $InstallRoot
  try {
    & $node $wizard
  } catch {
    Warn ''
    Warn 'The wizard could not start automatically. To run it yourself, open a NEW'
    Warn 'PowerShell window and run these two lines:'
    Warn "    cd `"$InstallRoot`""
    Warn '    node setup/pinplay-setup.mjs'
  }
}

# ---- Run ----
Install-Node
Get-Repo
Start-Wizard
