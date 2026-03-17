# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Channel/control-surface notes
- Anything environment-specific

## Cron Routing Notes

- Follow `CRON_AGENT_ASSIGNMENT.md` when creating or editing cron jobs.
- See `ORG_CHART.md` for the current channel and agent ownership map.
- `jensen` = research / analysis cron owner
- `trinity` = communications / inbox / reports cron owner
- `elon` = engineering / build / implementation cron owner
- `main` = Jarvis orchestration / routing / approval workers

## Continuity Notes

- Canonical short-term state lives in `C:\Users\Richard Yoon\.openclaw\workspace\NOW.md`
- Canonical active project checkpoints live in `C:\Users\Richard Yoon\.openclaw\workspace\status\*.md`
- Prefer these over transcript archaeology when reconstructing active work status

## Local Authorization Notes

- Follow `CHANNEL_AUTHORIZATION.md` for trust-tier decisions.
- webchat direct with Richard = Tier 1
- Richard's Discord DM with Jarvis = Tier 1
- Discord channel `1482611310771572921` = Tier 1 private admin/control channel
- Discord channel `1482916925175763107` (`📡｜ops-comms`) = Tier 1 operations/communications control channel
- `📡｜ops-comms` is the preferred Trinity surface for emails, inbox work, reminders, calendar coordination, reports, docs, posts, and other human-facing communication
- Discord channel `1482956598199586928` (`🧠｜research-lab`) = Tier 1 research/analysis control channel
- `🧠｜research-lab` is the preferred Jensen surface for research, analysis, comparison, summarization, investigation, trend review, forecasting, strategic review, synthesis, and evidence-based recommendations
- mirrored Discord `communication` channel = Tier 2
- other shared/public Discord channels = Tier 3
- Runtime/admin/config changes are Tier 1 only.
- Trinity-style communication work can happen in Tier 1 or Tier 2.

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
