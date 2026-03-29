$env:PAPER_STATE_PATH = 'C:\Users\Richard Yoon\.openclaw\workspace-operator\autobot-trader\runtime\paper_state_100kkrw.json'
$env:PAPER_INITIAL_USDC = '70'
Set-Location 'C:\Users\Richard Yoon\.openclaw\workspace-operator\autobot-trader'
npm run paper:once *>> 'C:\Users\Richard Yoon\.openclaw\workspace-operator\autobot-trader\runtime\paper_loop_100kkrw.log'
powershell -NoProfile -ExecutionPolicy Bypass -File 'C:\Users\Richard Yoon\.openclaw\workspace-operator\autobot-trader\scripts\publish-dashboard-status.ps1' *> $null
Copy-Item 'C:\Users\Richard Yoon\.openclaw\workspace-operator\autobot-trader-dashboard\status.json' 'C:\Users\Richard Yoon\.openclaw\workspace-operator\apps\mission-control\public\autobot-trader\status.json' -Force
Set-Location 'C:\Users\Richard Yoon\.openclaw\workspace-operator'
git add apps/mission-control/public/autobot-trader/status.json
$changes = git diff --cached --name-only
if ($changes) {
  git commit -m "chore: refresh autobot dashboard status"
  git push origin HEAD
}
