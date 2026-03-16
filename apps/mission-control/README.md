# Jarvis Mission Control

Mission Control is a focused operator dashboard for monitoring Jarvis/OpenClaw health, approvals, agents, events, and intervention points.

## Current state
MVP scaffold with mocked operational data.

## Run locally

```powershell
cd apps/mission-control
npm install
npm run dev
```

## Build

```powershell
npm run build
```

## Initial focus
- high-signal overview
- approvals queue
- agent/session visibility
- cron health
- quick intervention actions

## Engineering routing note
- Mission Control remains an Elon-owned engineering surface.
- For Mission Control maintenance, progress updates, routine UI iteration, and other low-complexity update passes, prefer model routing: local Qwen -> Gemini Flash -> OpenAI.
- For larger architecture, critical debugging, or substantial implementation work, use Elon's default engineering lane instead.
- The app's machine-readable routing source of truth lives in `routing-policy.json`.

## Related docs
- `../../docs/mission-control/mission-control-v1.md`
- `../../docs/mission-control/mission-control-architecture.md`
