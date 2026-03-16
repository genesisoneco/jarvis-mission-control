# CRON_AGENT_ASSIGNMENT.md

Default rule: every new cron job should be bound to the most appropriate real agent, not left on `main` unless Jarvis orchestration is the actual role.

## Agent assignment policy

- `main` / Jarvis
  - orchestration
  - approvals
  - routing
  - policy enforcement
  - cross-channel handoff
  - cron workers that supervise or coordinate other agents

- `jensen`
  - research
  - analysis
  - trend review
  - market scanning
  - summarization of external findings
  - forecasting
  - evidence-backed recommendation generation
  - channel default: `🧠｜research-lab`

- `trinity`
  - emails
  - inbox summaries
  - reminders
  - calendar coordination
  - reports
  - docs
  - posts
  - other human-facing communication
  - channel default: `📡｜ops-comms`

- `elon`
  - engineering
  - implementation planning
  - coding
  - debugging
  - technical automation
  - build execution support
  - channel default: `🛠️｜dev-lab`

## Rule for future cron creation

Before creating or editing a cron job:
1. identify the primary task type
2. bind the cron to the specialist agent that actually owns that role
3. only use `main` when the cron is primarily orchestration or cross-agent coordination
4. if a cron mixes research + routing, split it into:
   - specialist producer cron
   - Jarvis worker/orchestration cron

## Current intended bindings

- `Jarvis Daily Briefing` -> `main`
- `Research Lab Passive Income Scout` -> `jensen`
- `Research Lab Vote Worker` -> `main`
