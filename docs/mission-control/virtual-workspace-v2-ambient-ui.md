# Virtual Workspace v2 – Ambient UI & Emotion Layer

Owner: Mission Control UI
Status: Spec only (no implementation yet)

## Goals

1. Make per-agent activity text feel subtle and consistent.
2. Add an opt-in emotion/"thought" layer via emoji bubbles, without inventing fake work.
3. Lean harder into a neon / sci-fi office vibe using color and props.

---

## 1. Agent activity subtitle

### Requirements

- **Scope:** Jarvis, Elon, Jensen, Trinity.
- **Placement:** Single-line subtitle directly **below the agent name** in the agent card / label.
- **Size & style:**
  - Font size ~ 0.6–0.7× the agent name.
  - Single line; truncate with ellipsis when text is long.
  - Subtle opacity (e.g. text-slate-200/70 or equivalent) so it doesn't dominate.
- **Content source:**
  - Driven by the existing `explicitActivityLabel` (from `server.mjs` → workspace truth layer).
  - Fallback mapping when no explicit label:
    - `activityState === 'working'` → `"Working"`
    - `activityState === 'collaborating'` → `"Collaborating"`
    - `activityState === 'waiting_input'` → `"Waiting for input"`
    - `activityState === 'cooldown'` → `"Cooling down"`
    - `sceneState === 'idle'` → no subtitle (hide).
- **Visibility rules:**
  - Show subtitle only when the agent is non-idle or has an explicit label.
  - Hide completely when idle and there is no explicit label.

### Notes

- This replaces the oversized, free-floating activity label currently visible under Jarvis in the overview snapshot (e.g. "working command desk").
- All agents share the same layout and styling; Jarvis is no longer special-cased.

---

## 2. Thought bubbles with Playful/Calm toggle

### High-level behavior

- Each agent can show a **small emoji bubble** near their head to represent:
  - **Activity glyphs** (tied to real state).
  - **Ambient/mood glyphs** (pseudo-random, low-frequency moods).
- A UI (or config) toggle switches between:
  - **Calm mode:** Only deterministic activity bubbles.
  - **Playful mode:** Activity bubbles + occasional mood bubbles.

### Visual spec

- **Shape & position:**
  - Rounded "thought bubble" with 1–2 small trailing circles.
  - Positioned above or slightly offset from the agent's head.
- **Emoji size:** ~1.2–1.4× body text size.
- **Background:**
  - Subtle glow, e.g. `bg-slate-900/80` with `backdrop-blur-sm`.
  - Thin border or outer glow matching zone accent color (see section 3).
- **Animation:**
  - Fade in over ~200–300ms.
  - Fade out over ~200–300ms.
  - No constant motion (avoid distraction).

### Activity-driven emoji

Map from activity state / task hints to deterministic glyphs. These should be used in both Calm and Playful modes.

Examples (non-exhaustive):

- `activityState === 'working'`
  - Coding / implementation (`primaryTaskHint.id === 'coding'`) → `💻` or `⚙️`
  - Research (`primaryTaskHint.id === 'research'`) → `🔍`
  - Drafting / comms (`primaryTaskHint.id === 'drafting'` or `communications`) → `✏️` or `✉️`
- `activityState === 'collaborating'` → `🤝` or `🧠`
- `activityState === 'waiting_input'` → `⏳` or `❓`
- `activityState === 'cooldown'` or agent in `break-area` → `☕️` or `💤`
- `sceneState === 'alert'` or task hint `incident-response` → `🚨`

Implementation detail: add a small utility in `src/components/workspace/intelligence.ts` to compute `activityEmoji` based on `WorkspaceAgent` state, reusing the same truth layer used for movement.

### Mood-driven emoji (Playful mode only)

In Playful mode, each agent occasionally shows mood bubbles not strictly tied to work, but still loosely grounded in state.

- **Candidate moods & glyphs:**
  - Thirsty / break-y → `💧` or `🥤`
  - Wants connection / affection → `💖`
  - Sleepy / long idle → `😴`
  - Proud / just finished a task → `🏆` or `⭐️`
  - Deep focus → `🎧` or `🧠`
- **Scheduling:**
  - Per-agent cooldown (e.g. ≥ 3–5 minutes between mood bubbles).
  - Short display duration (3–5 seconds).
  - Only emit when agent is not in a hard-alert state.
- **Grounding hooks:**
  - "Just finished task" = transition from `working` → `cooldown` or `working` → `idle`.
  - "Sleepy" = has been `idle` or in `break-area` for > N seconds.

### Toggle & configuration

- Add a simple mode toggle:
  - Internal state in `VirtualWorkspace.tsx` for now: `ambientMode: 'calm' | 'playful'`.
  - Surface via a small control near the workspace view header (e.g. `Calm / Playful`).
  - Default: **Calm**.
- Behavior:
  - Calm: render only `activityEmoji` bubbles.
  - Playful: render `activityEmoji` bubbles + scheduled `moodEmoji` bubbles.

---

## 3. Neon / sci-fi color pass & furniture emphasis

The existing scene already defines props and zone accent gradients in `src/components/workspace/scene.ts`. This pass is about leaning further into a neon/sci-fi feel while respecting readability.

### Color palette adjustments

- Keep the **dark base room** but push stronger accent contrast:
  - Slightly increase saturation / brightness of `accentClass` gradients per zone.
  - Prefer cyan/blue, magenta, amber neon tones consistent with current `accentClass` usage.
- Add a soft global vignette / glow around the workspace canvas (if not already present) to reinforce the "room" framing.

### Prop highlighting (storytelling via light)

- For each zone, designate a few **key props** that respond to agent presence and ambient mode:
  - Command deck: monitor, desk, whiteboard, lamp.
  - Engineering bay: displays, servers, whiteboard.
  - Research garden: monitor, shelf, plants.
  - Comms lounge: monitor, desk, whiteboard.
  - Meeting area: central table, display.
  - Alert wall: main display, console.
  - Break nook: sofa, coffee, lamp.
- Behavior when an agent is **present and active** in a zone:
  - Slight glow/pulse on key props (e.g. border or shadow in the zone's accent color).
  - Optional: subtle animated gradient on screens (`bg-gradient-to-br` + `animate-pulse` at low amplitude).
- Behavior when agents are **idle or in cooldown/break**:
  - Reduce glow intensity.
  - Emphasize cozy props (sofa, coffee, lamps) with warmer tones.

### Additional props (if/when implemented)

The current `scene.ts` already includes desks, chairs, lamps, shelves, servers, rugs, coffee, sofas, plants, etc. When adding more, follow these guidelines:

- Keep the prop type set stable (`desk`, `monitor`, `table`, `plant`, `coffee`, `display`, `sofa`, `shelf`, `lamp`, `rug`, `window`, `chair`, `cabinet`, `whiteboard`, `server`).
- Use them to:
  - Make zones feel more like lived-in offices.
  - Provide additional anchors for neon highlights when agents are present.

---

## GitHub issues / tasks

Suggested issues to open in this repo (or to track as tasks):

1. **"Agent activity subtitle refactor"**
   - [ ] Add a shared subtitle component under each agent name with small, single-line text.
   - [ ] Wire subtitle text to `explicitActivityLabel` with fallbacks based on `activityState` / `sceneState`.
   - [ ] Hide subtitle when agent is idle and has no explicit label.
   - [ ] Remove or shrink any existing oversized free-floating activity text (e.g. under Jarvis).

2. **"Thought bubbles & ambient emoji (Calm/Playful toggle)"**
   - [ ] Add `ambientMode: 'calm' | 'playful'` to `VirtualWorkspace` state and a small UI toggle in the workspace header.
   - [ ] Implement `activityEmoji` selection utility in `workspace/intelligence.ts` based on `WorkspaceAgent`.
   - [ ] Render small emoji thought bubbles near agents when they are active (both Calm and Playful).
   - [ ] Implement mood bubble scheduling in Playful mode with per-agent cooldowns and short display durations.
   - [ ] Ensure bubbles are visually subtle but readable, with zone-aware glow/borders.

3. **"Neon / sci-fi ambient color pass"**
   - [ ] Tune zone `accentClass` gradients to slightly stronger neon cyan/magenta/amber tones while preserving readability.
   - [ ] Add subtle global vignette/glow around the workspace view.
   - [ ] Implement prop highlighting states based on agent presence and activity (active vs idle/break).
   - [ ] Emphasize key props per zone (screens, tables, servers, sofa/coffee) via light/halo effects.
   - [ ] Verify overall scene remains legible and not over-saturated in both light and dark display conditions.

This file is intended as the canonical spec for the ambient emotion & neon workspace pass and can be refined alongside implementation.
