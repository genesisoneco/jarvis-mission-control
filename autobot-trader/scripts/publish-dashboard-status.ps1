param()
$updateJson = powershell -NoProfile -ExecutionPolicy Bypass -File 'C:\Users\Richard Yoon\.openclaw\workspace-operator\autobot-trader\scripts\autobot-update.ps1' | ConvertFrom-Json
$outPath = 'C:\Users\Richard Yoon\.openclaw\workspace-operator\autobot-trader-dashboard\status.json'
$payload = [ordered]@{
  updatedAt = (Get-Date).ToString('o')
  equityUsd = $updateJson.equityUsd
  pnlUsd = $updateJson.pnlUsd
  pnlPct = $updateJson.pnlPct
  solBalance = $updateJson.solBalance
  usdcBalance = $updateJson.usdcBalance
  netSolAccumulated = $updateJson.solBalance
  tradeCount = $updateJson.tradeCount
  latestTrade = $updateJson.latestTrade
  recommendations = $updateJson.recommendations
}
$payload | ConvertTo-Json -Depth 8 | Set-Content $outPath -Encoding utf8
Get-Content $outPath -Raw
