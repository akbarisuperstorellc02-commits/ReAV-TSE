param(
    [string]$PartsFolder = $PSScriptRoot,
    [string]$OutputFile = (Join-Path $PSScriptRoot 'ReAV-TSE-BH-Setup-1.0.0-Windows-x64.exe')
)

$ErrorActionPreference = 'Stop'
$manifestPath = Join-Path $PartsFolder 'SHA256-MANIFEST.txt'
if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "SHA256-MANIFEST.txt not found in: $PartsFolder"
}

$manifest = Get-Content -LiteralPath $manifestPath
$originalHashLine = $manifest | Where-Object { $_ -match '^Original SHA256: ([a-fA-F0-9]{64})$' } | Select-Object -First 1
if (-not $originalHashLine) { throw 'Original SHA256 is missing or invalid in manifest.' }
$expectedOriginalHash = ($originalHashLine -replace '^Original SHA256: ', '').ToLowerInvariant()

$entries = @()
foreach ($line in $manifest) {
    if ($line -match '^([a-fA-F0-9]{64})\s+(.+)$') {
        $entries += [pscustomobject]@{ Hash = $matches[1].ToLowerInvariant(); Name = $matches[2].Trim() }
    }
}
if ($entries.Count -lt 2) { throw 'Manifest does not contain the expected installer parts.' }

$tempOutput = "$OutputFile.partial"
if (Test-Path -LiteralPath $tempOutput) { Remove-Item -LiteralPath $tempOutput -Force }
$outStream = [System.IO.File]::Create($tempOutput)
try {
    foreach ($entry in $entries) {
        $partPath = Join-Path $PartsFolder $entry.Name
        if (-not (Test-Path -LiteralPath $partPath)) { throw "Missing part: $($entry.Name)" }
        $actualPartHash = (Get-FileHash -LiteralPath $partPath -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actualPartHash -ne $entry.Hash) { throw "Checksum mismatch for $($entry.Name). Download that part again." }
        $inStream = [System.IO.File]::OpenRead($partPath)
        try { $inStream.CopyTo($outStream) } finally { $inStream.Dispose() }
        Write-Host "Verified and joined: $($entry.Name)"
    }
}
catch {
    $outStream.Dispose()
    if (Test-Path -LiteralPath $tempOutput) { Remove-Item -LiteralPath $tempOutput -Force }
    throw
}
finally {
    if ($outStream) { $outStream.Dispose() }
}

$actualOriginalHash = (Get-FileHash -LiteralPath $tempOutput -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualOriginalHash -ne $expectedOriginalHash) {
    Remove-Item -LiteralPath $tempOutput -Force
    throw "Final installer checksum mismatch. Expected $expectedOriginalHash but got $actualOriginalHash"
}
Move-Item -LiteralPath $tempOutput -Destination $OutputFile -Force
Write-Host ''
Write-Host 'SUCCESS: All parts are valid and the installer was rebuilt.'
Write-Host "Installer: $OutputFile"
Write-Host "SHA256:    $actualOriginalHash"
