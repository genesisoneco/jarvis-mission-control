# Mission Control private live deployment

## Objective
Turn Mission Control into a live dashboard Richard can open on the web **without** publishing private OpenClaw runtime state to GitHub Pages or another public static host.

## Chosen architecture

### Keep the runtime local
The OpenClaw status, sessions, cron state, and logs all live on Richard's machine already. The smallest safe architecture is:

```text
browser
  -> private tunnel / private network
  -> apps/mission-control/server.mjs
  -> local OpenClaw CLI + local state files
```

That means:
- no separate cloud backend
- no copying runtime state into a public repo or object store
- no pretending GitHub Pages can become a secure control plane

## Why this path
- smallest viable implementation
- lowest blast radius
- runtime truth stays on the operator machine
- works today with the existing Express adapter
- supports eventual nicer front-door options later

## What changed in the app
- `server.mjs` now serves both API and built frontend for production use
- `/login` provides a minimal auth wall for browser access
- `/auth/login` sets an `HttpOnly` cookie when `MISSION_CONTROL_ACCESS_TOKEN` matches
- `/auth/logout` clears the session
- `/api/*` is protected for non-local access
- `/healthz` is available for tunnel/reverse-proxy health checks
- Vite build base is now configurable with `VITE_BASE_PATH`

## Access patterns

### Option A: Tailscale Serve / Funnel
Best if Richard already uses Tailscale.

High-level flow:
1. Run Mission Control locally on port `8787`
2. Authenticate to Tailscale on the machine
3. Publish the local service via Tailscale Serve or Funnel
4. Open the generated Tailscale HTTPS URL
5. Log into Mission Control using `MISSION_CONTROL_ACCESS_TOKEN`

Pros:
- private-by-default if scoped to the tailnet
- low setup friction
- good fit for personal operator access

### Option B: Cloudflare Tunnel + Access
Best if Richard wants a stable browser URL with identity gating.

High-level flow:
1. Create a tunnel to `http://127.0.0.1:8787`
2. Attach a hostname like `mission-control.example.com`
3. Protect that hostname with Cloudflare Access
4. Keep `MISSION_CONTROL_ACCESS_TOKEN` enabled anyway
5. Open the hostname and log in

Pros:
- polished remote browser experience
- strong identity gate in front of the app
- good stepping stone to a permanent operator domain

## Recommended environment

```powershell
$env:MISSION_CONTROL_ACCESS_TOKEN = 'replace-with-a-long-random-secret'
$env:MISSION_CONTROL_PUBLIC_ORIGIN = 'https://mission-control.example.com'
$env:VITE_BASE_PATH = '/'
```

Then:

```powershell
cd apps/mission-control
npm run build
npm run start
```

## Operational cautions
- Do not treat GitHub Pages as the live runtime surface.
- Do not disable the token just because the tunnel has its own auth.
- Do not expose quick actions until each action has confirmation, auditability, and tight authorization handling.
- The current app is read-focused. That is intentional.

## Exact next-step URL shape
If the tunnel is configured but DNS or hostname choice is still pending, the target path is simply:

```text
https://<your-private-hostname>/login
```

After login, the dashboard lives at:

```text
https://<your-private-hostname>/
```

## Future upgrades
- add live approvals feed
- wire safe quick actions with explicit confirmation flows
- add websocket/SSE push instead of polling if needed
- add Cloudflare Access or Tailscale identity claims awareness for nicer session UX
