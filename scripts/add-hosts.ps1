#Requires -RunAsAdministrator
# Add Kar1n Tease Paradise player-site local domain mappings.
# Admin is http://127.0.0.1:3001 — no hosts entry needed.
# Right-click → Run with PowerShell (Admin), or:
#   powershell -ExecutionPolicy Bypass -File scripts\add-hosts.ps1

$hostsPath = "$env:WINDIR\System32\drivers\etc\hosts"
$markers = @(
  "www.kar1nteaseparadise.com",
  "kar1nteaseparadise.com"
)
$block = @"
127.0.0.1 www.kar1nteaseparadise.com
127.0.0.1 kar1nteaseparadise.com
"@

$content = Get-Content -Path $hostsPath -Raw -ErrorAction Stop
$changed = $false
foreach ($m in $markers) {
  if ($content -notmatch [regex]::Escape($m)) {
    $changed = $true
    break
  }
}

if (-not $changed) {
  Write-Host "hosts already contains Kar1n Tease Paradise player entries."
  exit 0
}

Add-Content -Path $hostsPath -Value "`r`n# Kar1n Tease Paradise (local player)`r`n$block`r`n"
Write-Host "OK: wrote hosts entries for www.kar1nteaseparadise.com"
Write-Host "Admin stays at http://127.0.0.1:3001 (no hosts entry)."
ipconfig /flushdns | Out-Null
