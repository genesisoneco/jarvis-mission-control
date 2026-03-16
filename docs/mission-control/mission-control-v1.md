# Jarvis Mission Control v1

## Goal
Build a compact operator dashboard for Richard to monitor, approve, and intervene in Jarvis/OpenClaw operations in under 10 seconds.

## Product Principles
- Signal over spectacle
- One-screen situational awareness
- Fast intervention paths
- Clear human approval boundaries
- Designed for OpenClaw realities: agents, sessions, cron jobs, channels, auth, gateway health

## Primary User
Richard Yoon
- operator / owner
- needs to know what is running, what is blocked, what needs approval, and what is failing

## Core Questions the UI Must Answer
1. What is broken right now?
2. What is waiting on Richard?
3. Which agents are active or stalled?
4. Are channels, gateway, and scheduled jobs healthy?
5. What should be done next?

## v1 Screens

### 1. Overview
Single-page command surface with:
- Gateway health card
- Channel health card
- Agent activity card
- Pending approvals card
- Cron health card
- Recent events feed
- Quick actions panel

### 2. Sessions & Agents
Show:
- active sessions
- agent name
- session kind
- age
- model
- token usage
- blocked/waiting/running/idle state

Actions:
- inspect session
- terminate stuck session
- jump to related logs

### 3. Approvals
Show pending approvals grouped by risk:
- outbound email / communication approval
- runtime/admin changes
- destructive actions
- repo pushes / deploys if later added

Actions:
- approve
- reject
- open context

### 4. Cron & Automation Health
Show:
- enabled jobs
- next run time
- last run status
- consecutive failures
- delivery status

Actions:
- pause
- resume
- retry

### 5. Event Feed
High-signal event stream only:
- agent failures
- channel disconnects
- gateway warnings
- approval requests
- completed jobs
- model fallbacks

## v1 Layout

### Top Bar
- environment badge
- current time
- global health status
- search / filter

### Main Grid
Left:
- Gateway & channels
- Pending approvals
- Quick actions

Center:
- Active agents / sessions
- Event feed

Right:
- Cron health
- Recent failures
- Attention queue

## Priority Metrics
- Gateway reachable / unreachable
- Pending approvals count
- Failed jobs in last 24h
- Active sessions count
- Channels disconnected count
- Critical alerts count

## Quick Actions for v1
- Refresh dashboard
- Open gateway status details
- Restart gateway
- Retry failed cron
- Pause cron job
- Kill stuck session

## Alert Severity
- Critical: gateway down, auth broken, approval backlog for sensitive actions, repeated cron failure
- Warning: model fallback, channel reconnects, delayed jobs
- Info: routine completions, successful deliveries

## Non-Goals for v1
- Fancy network graph
- Full log viewer replacement
- Complex analytics
- Historical BI dashboards
- Mobile-native app

## MVP Success Criteria
- Richard can identify current operational state in less than 10 seconds
- Richard can see all pending approvals in one place
- Richard can identify the top 3 active problems immediately
- Richard can trigger a basic intervention from the UI

## Future v2 Ideas
- drill-down timeline per agent
- memory and project context pane
- incident grouping / deduplication
- notification routing rules
- deployment controls
- richer auth/session repair tools
