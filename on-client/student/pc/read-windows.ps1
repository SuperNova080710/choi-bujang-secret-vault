# Read-only, Windows PowerShell 5.1. No event messages, identities, IPs or MACs are returned.
Set-StrictMode -Version 3
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$output = [ordered]@{}
function Read-Metric([string]$name, [scriptblock]$read) {
  try {
    $value = & $read
    $output[$name] = @{ status='ok'; observedAt=[DateTime]::UtcNow.ToString('o'); value=$value }
  } catch {
    $output[$name] = @{ status='unknown'; observedAt=[DateTime]::UtcNow.ToString('o') }
  }
}
Read-Metric 'disk' {
  $disk = @(Get-CimInstance Win32_LogicalDisk -OperationTimeoutSec 3 | Where-Object { $_.DeviceID -eq $env:SystemDrive })
  if ($disk.Count -ne 1 -or $null -eq $disk[0].FreeSpace -or $null -eq $disk[0].Size) { throw 'UNAVAILABLE' }
  @{ freeBytes=[double]$disk[0].FreeSpace; totalBytes=[double]$disk[0].Size }
}
Read-Metric 'network' {
  $adapters = @(Get-NetAdapter -ErrorAction Stop)
  @{ total=$adapters.Count; up=@($adapters | Where-Object { $_.Status -eq 'Up' }).Count }
}
Read-Metric 'firewall' {
  $profiles = @(Get-NetFirewallProfile -ErrorAction Stop)
  $values = @{}
  foreach ($name in @('Domain','Private','Public')) {
    $profile = @($profiles | Where-Object { $_.Name -eq $name })
    if ($profile.Count -ne 1 -or [int]$profile[0].Enabled -notin @(0,1)) { throw 'UNAVAILABLE' }
    $values[$name.ToLowerInvariant()] = ([int]$profile[0].Enabled -eq 1)
  }
  $values
}
foreach ($log in @('System','Application')) {
  $key = if ($log -eq 'System') { 'systemEvents' } else { 'applicationEvents' }
  Read-Metric $key {
    $end = [DateTime]::UtcNow
    $start = $end.AddHours(-24)
    $events = @()
    try {
      $events = @(Get-WinEvent -FilterHashtable @{ LogName=$log; Level=@(2,3); StartTime=$start; EndTime=$end } -MaxEvents 10001 -ErrorAction Stop)
    } catch {
      # Only a successful query with no matches is zero; access errors stay unknown.
      if ($_.FullyQualifiedErrorId -notlike 'NoMatchingEventsFound*') { throw }
    }
    $capped = $events.Count -gt 10000
    $rows = @($events | Select-Object -First 10000)
    @{ warnings=@($rows | Where-Object { $_.Level -eq 3 }).Count;
       errors=@($rows | Where-Object { $_.Level -eq 2 }).Count;
       capped=$capped; windowStart=$start.ToString('o'); windowEnd=$end.ToString('o') }
  }
}
$output | ConvertTo-Json -Depth 5 -Compress
