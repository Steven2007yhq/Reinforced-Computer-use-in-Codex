param()

$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$userRoot = [Environment]::GetFolderPath('UserProfile')
$targetRoot = Join-Path $userRoot 'plugins\reinforced-computer-use'
$marketplacePath = Join-Path $userRoot '.agents\plugins\marketplace.json'

# Complete dependency and CLI checks before changing the installation or marketplace.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is missing. Install Node.js 22 or later, then open a new terminal.'
}
$nodeVersion = (& node --version | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v(\d+)\.') {
    throw 'Unable to determine the Node.js version.'
}
if ([int]$Matches[1] -lt 22) {
    throw "Node.js 22 or later is required; found $nodeVersion."
}
if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
    throw 'The Codex CLI is missing from PATH. Open a terminal with the Codex CLI available.'
}
$marketplaceInventoryText = (& codex plugin marketplace list --json | Out-String)
if ($LASTEXITCODE -ne 0) {
    throw 'The Codex CLI must support plugin marketplace list --json.'
}
try {
    $marketplaceInventory = $marketplaceInventoryText | ConvertFrom-Json
} catch {
    throw 'The Codex CLI returned an invalid marketplace inventory.'
}
if (-not $marketplaceInventory.PSObject.Properties['marketplaces']) {
    throw 'The Codex CLI returned an unsupported marketplace inventory.'
}

if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot 'node_modules\jpeg-js') -PathType Container) -or
    -not (Test-Path -LiteralPath (Join-Path $sourceRoot 'node_modules\pngjs') -PathType Container)) {
    throw "Screenshot dependencies are missing in $sourceRoot. Run 'npm ci --omit=dev --ignore-scripts' there, then retry."
}
foreach ($required in @('package.json', 'package-lock.json', '.codex-plugin\plugin.json', 'LICENSE', 'NOTICE')) {
    if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot $required) -PathType Leaf)) {
        throw "Required package file is missing: $required"
    }
}

$marketplaceExists = Test-Path -LiteralPath $marketplacePath -PathType Leaf
if ($marketplaceExists) {
    $marketplace = Get-Content -Raw -LiteralPath $marketplacePath | ConvertFrom-Json
} else {
    $marketplace = [pscustomobject]@{
        name = 'personal'
        interface = [pscustomobject]@{ displayName = 'Personal' }
        plugins = @()
    }
}
if (-not ($marketplace.name -is [string]) -or [string]::IsNullOrWhiteSpace($marketplace.name) -or
    -not $marketplace.PSObject.Properties['plugins']) {
    throw "Marketplace file must have a name and plugins array: $marketplacePath"
}
if ($null -ne $marketplace.plugins -and $marketplace.plugins -isnot [array]) {
    throw "Marketplace plugins must be an array: $marketplacePath"
}
$registered = @($marketplaceInventory.marketplaces | Where-Object { $_.name -eq $marketplace.name })
if ($registered.Count -gt 1) {
    throw "More than one marketplace has the name '$($marketplace.name)'. Resolve that conflict before installing."
}
if ($registered.Count -eq 1 -and
    -not [StringComparer]::OrdinalIgnoreCase.Equals(
        [IO.Path]::GetFullPath($registered[0].root).TrimEnd('\', '/'),
        [IO.Path]::GetFullPath($userRoot).TrimEnd('\', '/'))) {
    throw "Marketplace '$($marketplace.name)' is registered at a different root. Resolve that conflict before installing."
}

$copyRequired = -not [StringComparer]::OrdinalIgnoreCase.Equals($sourceRoot, $targetRoot)
if ($copyRequired -and (Test-Path -LiteralPath $targetRoot)) {
    throw "Target already exists: $targetRoot. Move or remove that exact old plugin directory, then rerun; this installer will not overwrite it."
}

# Only published package content and the two runtime dependencies enter the installation.
# Git history, local configuration, scratch output, and unrelated dependencies are excluded.
$packageFiles = @(
    'package.json', 'package-lock.json', 'LICENSE', 'NOTICE',
    'README.md', 'README.zh-CN.md', 'README.en.md', 'SECURITY.md', 'CHANGELOG.md'
)
$packageDirectories = @(
    '.codex-plugin', 'scripts', 'skills', 'tests', 'docs', 'assets',
    'node_modules\jpeg-js', 'node_modules\pngjs'
)
$copyItems = @()
foreach ($relative in $packageFiles) {
    $path = Join-Path $sourceRoot $relative
    if (Test-Path -LiteralPath $path -PathType Leaf) {
        $copyItems += Get-Item -Force -LiteralPath $path
    }
}
foreach ($relative in $packageDirectories) {
    $path = Join-Path $sourceRoot $relative
    if (Test-Path -LiteralPath $path -PathType Container) {
        $copyItems += Get-Item -Force -LiteralPath $path
        $copyItems += @(Get-ChildItem -Force -Recurse -LiteralPath $path)
    }
}
foreach ($item in $copyItems) {
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        throw "Package contains a symbolic link or junction: $($item.FullName). Use regular package files."
    }
}

if ($copyRequired) {
    New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
    foreach ($item in $copyItems) {
        $relative = $item.FullName.Substring($sourceRoot.Length).TrimStart('\', '/')
        $destination = Join-Path $targetRoot $relative
        if ($item.PSIsContainer) {
            New-Item -ItemType Directory -Force -Path $destination | Out-Null
        } else {
            New-Item -ItemType Directory -Force -Path (Split-Path $destination -Parent) | Out-Null
            Copy-Item -LiteralPath $item.FullName -Destination $destination
        }
    }
}

New-Item -ItemType Directory -Force -Path (Split-Path $marketplacePath -Parent) | Out-Null
if ($marketplaceExists) {
    $backup = "$marketplacePath.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')-$([guid]::NewGuid().ToString('N'))"
    Copy-Item -LiteralPath $marketplacePath -Destination $backup
}
$kept = @($marketplace.plugins | Where-Object { $_.name -ne 'reinforced-computer-use' })
$entry = [pscustomobject]@{
    name = 'reinforced-computer-use'
    source = [pscustomobject]@{ source = 'local'; path = './plugins/reinforced-computer-use' }
    policy = [pscustomobject]@{ installation = 'AVAILABLE'; authentication = 'ON_USE' }
    category = 'productivity'
}
$marketplace.plugins = @($kept) + @($entry)
$temporary = "$marketplacePath.tmp-$([guid]::NewGuid().ToString('N'))"
# Explicit no-BOM UTF-8 works in both Windows PowerShell 5.1 and PowerShell 7.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
try {
    [IO.File]::WriteAllText($temporary, ($marketplace | ConvertTo-Json -Depth 20) + [Environment]::NewLine, $utf8NoBom)
    Move-Item -Force -LiteralPath $temporary -Destination $marketplacePath
} finally {
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary }
}

if ($registered.Count -eq 0) {
    & codex plugin marketplace add $userRoot
    if ($LASTEXITCODE -ne 0) { throw "Codex marketplace registration failed with exit code $LASTEXITCODE" }
}
& codex plugin add "reinforced-computer-use@$($marketplace.name)"
if ($LASTEXITCODE -ne 0) { throw "Codex plugin installation failed with exit code $LASTEXITCODE" }

Write-Host ''
Write-Host 'Reinforced Computer Use installed. Restart Codex and start a new task before testing it.'
Write-Host 'The local deterministic fast path needs no API key. Jev adaptive mode is optional.'