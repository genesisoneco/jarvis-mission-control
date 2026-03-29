param()
$statePath = 'C:\Users\Richard Yoon\.openclaw\workspace-operator\autobot-trader\runtime\paper_state_100kkrw.json'
$outPath = 'C:\Users\Richard Yoon\.openclaw\workspace-operator\autobot-trader\runtime\paper_recommendations_100kkrw.json'
$baseUsd = 70.0
if (-not (Test-Path $statePath)) { throw "State file not found: $statePath" }
$state = Get-Content $statePath -Raw | ConvertFrom-Json
$equity = [double]$state.portfolio.totalEquityUsd
$pnlUsd = $equity - $baseUsd
$pnlPct = if ($baseUsd -ne 0) { ($pnlUsd / $baseUsd) * 100 } else { 0 }
$fills = @($state.fills)
$notes = New-Object System.Collections.Generic.List[string]
if ($fills.Count -lt 5) { $notes.Add('Sample size is tiny; do not change live strategy based on current data.') }
if ($fills.Count -ge 1 -and $equity -eq $baseUsd) { $notes.Add('No realized paper edge yet; continue gathering data before changing core logic.') }
if ($baseUsd -le 100) { $notes.Add('Small-bankroll simulation is heavily constrained by percent caps; consider a parallel larger paper account for strategy validation.') }
$clusters = $state.performance.clusters
foreach ($prop in $clusters.PSObject.Properties) {
  $c = $prop.Value
  $notes.Add("Cluster $($c.intentType)/$($c.regime): trades=$($c.tradeCount), totalNotionalUsd=$($c.totalNotionalUsd)")
}
$result = [ordered]@{
  ok = $true
  generatedAt = (Get-Date).ToString('o')
  equityUsd = [math]::Round($equity, 4)
  pnlUsd = [math]::Round($pnlUsd, 4)
  pnlPct = [math]::Round($pnlPct, 4)
  tradeCount = $fills.Count
  recommendations = $notes
}
$result | ConvertTo-Json -Depth 6 | Set-Content $outPath -Encoding utf8
$result | ConvertTo-Json -Depth 6
