param()
$update = Get-Content 'C:\Users\Richard Yoon\.openclaw\workspace-operator\autobot-trader\scripts\autotrade-update.ps1' -Raw | Out-Null
$statePath = 'C:\Users\Richard Yoon\.openclaw\workspace-operator\autobot-trader\runtime\paper_state_100kkrw.json'
$recPath = 'C:\Users\Richard Yoon\.openclaw\workspace-operator\autobot-trader\runtime\paper_recommendations_100kkrw.json'
$baseUsd = 70.0
$state = Get-Content $statePath -Raw | ConvertFrom-Json
$equity = [double]$state.portfolio.totalEquityUsd
$pnlUsd = $equity - $baseUsd
$pnlPct = if ($baseUsd -ne 0) { ($pnlUsd / $baseUsd) * 100 } else { 0 }
$fills = @($state.fills)
$latestFill = if ($fills.Count -gt 0) { $fills[-1] } else { $null }
$rec = @()
if (Test-Path $recPath) {
  $recFile = Get-Content $recPath -Raw | ConvertFrom-Json
  if ($recFile.recommendations) { $rec = @($recFile.recommendations) }
}
[ordered]@{
  ok = $true
  equityUsd = [math]::Round($equity, 4)
  pnlUsd = [math]::Round($pnlUsd, 4)
  pnlPct = [math]::Round($pnlPct, 4)
  solBalance = [double]$state.portfolio.solBalance
  usdcBalance = [double]$state.portfolio.usdcBalance
  tradeCount = $fills.Count
  latestTrade = $latestFill
  recommendations = $rec
} | ConvertTo-Json -Depth 6
