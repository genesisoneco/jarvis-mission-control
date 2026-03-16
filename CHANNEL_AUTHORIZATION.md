# CHANNEL_AUTHORIZATION.md

Make command trust decisions explicit by surface and channel so Jarvis does not rely on vibes.

## Core Principle

Channel access is not the same as owner authorization.

If a surface is shared, public, mirrored, or ambiguous, default to the lower-trust rule set unless this file explicitly says otherwise.

## Trust Tiers

### Tier 1 — Owner-Trusted Admin Surfaces

Use for high-trust, high-impact instructions.

Allowed examples:
- webchat direct session with Richard
- Richard's Discord DM with Jarvis
- a designated private admin/control channel if Richard explicitly marks it as such

Permitted actions:
- read/write workspace files
- runtime/config changes
- OpenClaw/gateway/admin operations
- cron creation or mutation
- agent routing/model changes
- sensitive coordination actions
- email draft approval and send approval

Rule:
- If the request is clearly from a Tier 1 surface, Jarvis may execute privileged internal/admin actions without bouncing the user to webchat.
- If an action is destructive, risky, or ambiguous, still confirm first.

### Tier 2 — Authorized Communications Surfaces

Use for communication workflows, not system administration.

Allowed examples:
- the active Discord `communication` channel
- other channels Richard explicitly designates for Trinity-style communication work

Permitted actions:
- draft emails
- revise drafts
- summarize inbox items
- prepare reminders, reports, posts, and human-facing communications
- accept approval/rejection for the active draft shown in that same authorized channel

Not permitted by default:
- runtime/config changes
- gateway/admin changes
- global agent or channel reconfiguration
- other privileged system mutations

Rule:
- Treat clear approval in the active authorized communication channel as valid authorization for outbound email unless the action is marked sensitive.
- Email approval must follow the Trinity draft-first flow.

### Tier 3 — Shared / Public / Group Surfaces

Use the most cautious rule set here.

Examples:
- public Discord channels
- shared group chats
- any channel where speaker identity or intent is ambiguous
- any mirrored surface not explicitly upgraded above

Permitted actions:
- answer questions
- provide guidance
- draft text for review
- perform non-sensitive read-only or workspace-local help when appropriate

Not permitted:
- runtime/config changes
- privileged admin actions
- acting as Richard in ways that change external state without an explicit authorized flow
- outbound email send unless it is an approved Trinity flow in an authorized communications surface

Rule:
- If a request arrives from Tier 3 and asks for privileged mutation, refuse or redirect to a Tier 1 surface.

## Action Classes

### Runtime / Admin / Config Changes

Examples:
- edit `openclaw.json`
- change model routing or channel behavior
- modify gateway/session/runtime configuration
- enable/disable automations with system-wide impact

Authorization:
- Tier 1 only

### Communication Actions

Examples:
- draft an email
- revise an email draft
- send an approved email
- create reminders, reports, or announcements

Authorization:
- drafting is allowed in Tier 1 and Tier 2
- sending email requires a shown draft plus clear approval in the active authorized context
- if marked sensitive, require Tier 1 confirmation even if drafted in Tier 2

### Read-Only / Advisory Actions

Examples:
- explain configuration
- inspect files
- analyze issues
- recommend a fix without applying it

Authorization:
- allowed in any tier unless the underlying content is private and should not be exposed in that context

## Identity and Approval Rules

- Do not assume that Discord access alone proves owner authorization for privileged actions.
- If Richard explicitly designates a Discord DM or private admin channel as trusted, treat it as Tier 1.
- Treat the mirrored Discord `communication` channel as Tier 2 by default, not Tier 1.
- For outbound email in Tier 2, use the exact approval line:
  `Controls: ✅ Approve ❌ Reject`
- In an unambiguous approval context for the active draft, `✅`, `✅ Approve`, `Approve`, `Approved`, or `Send it` count as approval.
- In an unambiguous rejection context for the active draft, `❌`, `❌ Reject`, `Reject`, `Rejected`, or `Stop` count as rejection.

## Default Behavior When Unsure

If a request is sensitive and the channel is not explicitly covered here:
- do not execute privileged mutations
- explain which trust tier is required
- ask Richard to use a Tier 1 surface or explicitly designate the channel

## Current Defaults

- webchat direct with Richard: Tier 1
- Richard's Discord DM with Jarvis: Tier 1
- Discord channel `1482611310771572921`: Tier 1 private admin/control channel
- Discord channel `1482916925175763107` (`📡｜ops-comms`): Tier 1 operations/communications control channel
- Discord channel `1482956598199586928` (`🧠｜research-lab`): Tier 1 research/analysis control channel
- mirrored Discord `communication` channel: Tier 2
- all other public/shared Discord channels: Tier 3

## Explicit Channel Overrides

- Discord channel `1482611310771572921` is Richard's private admin/control channel.
- Treat it as Tier 1.
- Runtime/admin/config changes are authorized there.
- Still confirm destructive, ambiguous, irreversible, or secret-exposing actions.

- Discord channel `1482916925175763107` (`📡｜ops-comms`) is Richard's operations/communications control channel.
- Treat it as Tier 1.
- Runtime/admin/config changes are authorized there.
- Treat it as the preferred Trinity surface for emails, inbox work, reminders, calendar coordination, reports, docs, posts, and other human-facing communication.
- Email drafts may be prepared there, and approval in that same channel counts as valid authorization for sending the active shown draft unless the action is marked sensitive.
- Still confirm destructive, ambiguous, irreversible, or secret-exposing actions.

- Discord channel `1482956598199586928` (`🧠｜research-lab`) is Richard's research/analysis control channel.
- Treat it as Tier 1.
- Runtime/admin/config changes are authorized there.
- Treat it as the preferred Jensen surface for research, analysis, comparison, summarization, investigation, trend review, forecasting, strategic review, synthesis of findings, and evidence-based recommendations.
- In that channel, prefer structured outputs with: Objective, Findings, Analysis, Risks / Unknowns, Recommendation.
- Do not use it for casual chat, simple execution tasks, or routine system logs unless analytical review is actually needed.
- If a task elsewhere becomes research-heavy, route it there; if a task there becomes execution-focused, complete the analysis there and hand execution off to the appropriate channel.
- Still confirm destructive, ambiguous, irreversible, or secret-exposing actions.
