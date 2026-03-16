# Jarvis Mission Control

Mission Control is a focused operator dashboard for monitoring Jarvis/OpenClaw health, approvals, agents, events, and intervention points.

## Current state
- GitHub Pages still exists as a static UI preview.
- The local Express adapter now doubles as the **private live host** for the built dashboard.
- Live runtime data stays on Richard's machine and is exposed only through the local adapter.

## Modes

### 1) Static preview mode
Useful for UI review only.

```powershell
cd apps/mission-control
npm install
npm run build
```

The GitHub Pages deploy uses `VITE_BASE_PATH=/jarvis-mission-control/` and falls back to `public/overview-snapshot.json`.

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
