# Jarvis Mission Control

Mission Control is a focused operator dashboard for monitoring Jarvis/OpenClaw health, approvals, agents, events, and intervention points.

## Current state
- GitHub Pages still exists as a static UI preview.
- The local Express adapter now doubles as the **private live host** for the built dashboard.
- Live runtime data stays on Richard's machine and is exposed only through the local adapter.
- The overview now includes **virtual workspace v2**: a living 2D office sim with moving agent characters, distinct zones (command desk, engineering bay, research corner, comms desk, meeting area, alert wall, break area), runtime-driven movement targets when signals are available, and fallback demo motion when live data is sparse.

## Virtual workspace v2
- The simulation layer lives in `src/components/VirtualWorkspace.tsx`.
- Jarvis, Elon, Jensen, and Trinity now move from a more explicit truth layer exposed by `server.mjs`: session-derived `explicitActivityState`, `explicitActivityLabel`, `explicitActivitySource`, `explicitActivityConfidence`, task-summary provenance, and spawned-session collaboration context.
- Clicking an agent focuses its current office position, state, nearby signals, runtime/task readout, and the truth/source note that drove the current embodiment.
- The room now has a stronger ambient-state layer: calm, busy, collaboration, incident, and watch/focus modes change how the office breathes without inventing fake work.
- Props now carry more of the storytelling load. Screens, boards, coffee, lamps, windows, plants, and servers react through light ambient/support/alert/engaged states instead of a single generic glow.
- Agent motion now includes small settle phases after movement plus role-weighted pacing/personality differences so Jarvis feels steadier, Elon brisker, Jensen more measured, and Trinity smoother.
- Focus/fullscreen mode now leans into a watchable scene with stronger room framing instead of just making the same view bigger.
- The rest of Mission Control remains the same operational dashboard around the sim.

## Modes

### 1) Static preview mode
Useful for UI review only.

```powershell
cd apps/mission-control
npm install
npm run build:pages
```

The GitHub Pages deploy uses `/jarvis-mission-control/` and falls back to `public/overview-snapshot.json`.

### Build defaults
- `npm run build` and `npm run build:live` now target the local live host (`/`) so `http://127.0.0.1:8787/` works correctly.
- Use `npm run build:pages` only for the GitHub Pages/static preview path.

### 2) Local live mode
Useful for live runtime state on the same machine.

```powershell
cd apps/mission-control
npm install
npm run dev
```

- Vite serves the frontend.
- `server.mjs` serves the local adapter on `http://127.0.0.1:8787`.
- Localhost can access without a token by default.

### 3) Private remote live mode
This is the real answer for secure web viewing.

```powershell
cd apps/mission-control
Copy-Item .env.example .env
# Set a strong MISSION_CONTROL_ACCESS_TOKEN first
$env:MISSION_CONTROL_ACCESS_TOKEN = 'replace-with-a-long-random-secret'
$env:MISSION_CONTROL_PUBLIC_ORIGIN = 'https://mission-control.example.com'
$env:VITE_BASE_PATH = '/'
npm run build
npm run start
```

Then put a private tunnel or private network in front of `http://127.0.0.1:8787`.

## Recommended remote access pattern

### Best small viable path: tunnel the local host
Keep the dashboard running on Richard's machine and expose it through a private tunnel.

Recommended order:
1. **Tailscale Funnel / Serve** if Richard already uses Tailscale and wants tailnet-scoped access.
2. **Cloudflare Tunnel + Access** if he wants browser-friendly access with identity gating.
3. Any other reverse proxy is fine **only if** TLS is used and `MISSION_CONTROL_ACCESS_TOKEN` remains enabled.

The app already includes its own login page at `/login`, so even if the tunnel layer is misconfigured, the dashboard is not naked.

## Production notes
- `npm run start` serves the API plus `dist/` from one Express process.
- All `/api/*` routes require auth for non-local access.
- Browser sessions use an `HttpOnly` cookie set by `/auth/login`.
- `POST /auth/logout` clears the session.
- `GET /healthz` is intentionally lightweight for tunnel/reverse-proxy health checks.

## Environment variables
See `.env.example`.

Important ones:
- `MISSION_CONTROL_ACCESS_TOKEN` — required for any non-local access
- `MISSION_CONTROL_PUBLIC_ORIGIN` — optional but recommended when fronted by a public HTTPS hostname
- `MISSION_CONTROL_DISABLE_LOCAL_BYPASS=true` — forces auth even on localhost
- `VITE_BASE_PATH=/` — required for the private live host build

## Security stance
- Runtime/admin data is **not** pushed to GitHub Pages.
- Remote access is denied unless a host-side token is configured.
- The live dashboard should stay behind a private network or tunnel even with the app token enabled.
- Quick actions are still UI placeholders; no destructive controls were exposed just to make the screen feel powerful.

## Build

```powershell
npm run build
```

## Related docs
- `../../docs/mission-control/mission-control-v1.md`
- `../../docs/mission-control/mission-control-architecture.md`
- `../../docs/mission-control/private-live-deployment.md`
- `../../docs/mission-control/virtual-workspace-v2-ambient-ui.md`
