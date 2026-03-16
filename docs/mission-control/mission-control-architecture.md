# Jarvis Mission Control Architecture

## Intent
Mission Control is a thin operational UI over OpenClaw runtime state. It should prefer aggregation and actionability over becoming another heavy backend.

## v1 Architecture
- Frontend: React + Vite + TypeScript
- Styling: Tailwind CSS
- State/query: TanStack Query
- Charts: lightweight only if needed later
- Backend strategy: consume existing OpenClaw APIs where available; add a narrow local adapter layer only if necessary

## Data Domains

### 1. Gateway Health
Fields:
- reachable
- bind
- port
- rpcProbeOk
- lastSeenAt
- warnings[]
- authScopeOk

### 2. Channels
Fields:
- id
- type
- enabled
- state
- detail
- lastError
- reconnecting

### 3. Sessions
Fields:
- key
- kind
- age
- model
- tokenUsage
- cacheUsage
- state
- ownerAgent
- summary

### 4. Approvals
Fields:
- id
- type
- severity
- sourceAgent
- sourceSession
- requestedAt
- title
- summary
- controls
- status

### 5. Cron Jobs
Fields:
- id
- name
- agentId
- enabled
- schedule
- nextRunAt
- lastRunAt
- lastRunStatus
- consecutiveErrors
- deliveryStatus

### 6. Events
Fields:
- id
- at
- severity
- category
- source
- title
- details
- relatedEntityId

## API Strategy

### Phase 1: Mock + local adapters
Build the frontend around mocked data contracts first for speed.

Potential adapters:
- `openclaw status`
- `openclaw gateway status`
- `openclaw security audit`
- session APIs / session status
- cron store / runtime event summaries

### Phase 2: Live integration
Options:
1. read existing OpenClaw HTTP/WS surfaces directly if stable
2. expose a minimal local API wrapper inside the app
3. use server routes to normalize shell/API outputs

Preferred path for MVP:
- start with frontend mock contracts
- swap sections to live data incrementally

## Frontend Information Architecture

### Route Map
- `/` overview
- `/sessions` sessions and agents
- `/approvals` approvals queue
- `/automations` cron / jobs
- `/events` event feed
- `/settings` integration and refresh settings

## Component Map
- `HealthStrip`
- `GatewayCard`
- `ChannelStatusCard`
- `ApprovalQueueCard`
- `ActiveSessionsTable`
- `CronHealthCard`
- `EventFeed`
- `QuickActionsPanel`
- `AttentionQueue`

## Suggested File Structure

```text
apps/mission-control/
  src/
    app/
    components/
    features/
      overview/
      sessions/
      approvals/
      automations/
      events/
    data/
      mock/
      contracts/
    lib/
    styles/
```

## Security / Authorization
- This UI is Tier 1 operator-facing by default
- Any destructive or privileged action must surface explicit confirmation
- Approval actions should preserve exact command or action context
- Do not assume group channels are trusted admin surfaces

## UX Rules
- Default sort by urgency
- No noisy animations
- Color only for meaning
- Every red item should imply a next action
- Avoid raw logs on primary screens; summarize first, expand on demand

## Milestones

### Milestone 1
- repo setup
- docs
- app scaffold
- overview page with mocked data

### Milestone 2
- reusable cards/tables
- sessions, approvals, events pages
- filter/search shell

### Milestone 3
- live adapters for gateway/session/cron health
- first quick actions wired up

### Milestone 4
- polish, error states, auth/session repair workflows
