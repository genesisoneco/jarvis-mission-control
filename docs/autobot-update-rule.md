# Autobot Update Runbook

When Richard (or the control UI) says **"autobot update"** without qualifiers, interpret it as:

> "Give me the total trade status for the 100,000 KRW paper Autobot account."

## Data Source

- Primary status file: `autobot-trader-dashboard/status.json`
- This represents the ~100,000 KRW (~$70) small-bankroll paper Autobot account that is connected to:
  - the dashboard
  - the Google Sheet
  - GitHub logging

## Fields To Report

On each `autobot update`, read `autobot-trader-dashboard/status.json` and report at least:

1. **Account summary**
   - Equity (USD)
   - PnL in USD
   - PnL in %
   - Last updated timestamp

2. **Balances**
   - SOL balance
   - USDC balance
   - Net SOL accumulated

3. **Trading activity**
   - Total trade count
   - Latest trade summary:
     - timestamp
     - notional (USD)
     - size in SOL
     - average price

4. **System notes**
   - Any `recommendations` included in `status.json`

## Future extensions

- If additional Autobot accounts are added later (e.g., a larger paper account or a live account), keep this 100k KRW paper account as the **default** for bare `autobot update`.
- Use explicit qualifiers if needed in future (e.g., `autobot update live`, `autobot update 10k paper`) and document those separately.
