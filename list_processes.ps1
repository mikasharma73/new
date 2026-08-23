Get-Process | Sort-Object WorkingSet64 -Descending |
  Select-Object -First 25 Name, Id,
    @{N='Memory(MB)';E={[math]::Round($_.WorkingSet64/1MB,2)}},
    @{N='CPU(s)';E={if ($_.CPU) {[math]::Round($_.CPU,1)} else {'-'}}} |
  Format-Table -AutoSize

$os = Get-CimInstance Win32_OperatingSystem
$totalGB = [math]::Round($os.TotalVisibleMemorySize/1MB,2)
$freeGB  = [math]::Round($os.FreePhysicalMemory/1MB,2)
$usedGB  = [math]::Round($totalGB-$freeGB,2)
$pct     = [math]::Round(($usedGB/$totalGB)*100,1)
"`nTotal RAM: $totalGB GB | Used: $usedGB GB | Free: $freeGB GB | Usage: $pct%"
