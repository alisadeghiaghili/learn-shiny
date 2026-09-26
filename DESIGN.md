# LearnShiny — Design Spec

Interactive Shiny tutorial and sandbox, modeled on learnGitBranching.
Learner picks **R** or **Python** and works two parallel curricula:
concept track (reactive mental model) then code track (write real Shiny).

## Coaching note on stack scope

Three complete LGB-scale frontends (SPA + R Shiny + Python Shiny) is multi-week
work with triple maintenance. Architecture decision:

1. **Shared curriculum** is the product source of truth (JSON levels).
2. **SPA** is the primary learning surface (LGB DNA: sandbox, levels, golf, viz).
3. **Thin Shiny hosts** render the same levels for people who want to learn
   Shiny *inside* Shiny. No duplicated lesson prose.

## Style anchor

Signal-flow lab instrument, not a SaaS dashboard. Cross of learnGitBranching's
command + graph game loop with an oscilloscope / reactive-circuit schematic.
The memorable object is the **reactive graph** (the commit-tree analog).

## Palette

| Token         | Hex       | Role                                      |
|---------------|-----------|-------------------------------------------|
| `--bg`        | `#0E1418` | Cool ink slate (not pure black)           |
| `--surface`   | `#152028` | Panels, editor chrome                     |
| `--surface-2` | `#1C2A34` | Nested wells, level cards                 |
| `--ink`       | `#E8EEF2` | Primary text                              |
| `--muted`     | `#8A9BA8` | Secondary text, idle nodes                |
| `--pulse`     | `#F0A030` | Reactive energy / focus / CTA             |
| `--ok`        | `#3DDB84` | Solved, valid output, live edges          |
| `--r`         | `#276DC3` | R track identity                          |
| `--py`        | `#FFD43B` | Python track identity                     |

Three families max in a frame: cool slate, amber pulse, one language accent.

## Typography

- UI / display: **IBM Plex Sans** (technical, humanist — not Inter)
- Code / ids / commands: **IBM Plex Mono**
- Scale (px): 40 display · 28 mission title · 18 section · 15 body · 12 caption · 13.5 code
- Weights: 400 body, 500 UI labels, 600 display
- Line length: mission text ≤ 68ch

## Layout system

12-col mental grid, 8px rhythm. Dense tool UI, not marketing air.

```
┌──────────────────────────────────────────────────────────┐
│ LearnShiny   [R|Python]   concepts · code · sandbox       │
├────────────────────┬─────────────────────────────────────┤
│ Mission            │  Stage: reactive graph OR UI preview │
│ title · goal       │  (hero — always visible)             │
│ body               │                                      │
│ hint accordion     │                                      │
├────────────────────┴─────────────────────────────────────┤
│ Editor / command line          check · undo · reset       │
│                                golf  n / par               │
└──────────────────────────────────────────────────────────┘
```

Mobile: stage stacks under mission; editor docks bottom.

## Signature moments

1. **Pulse propagation** — change an input or run code and energy travels along
   reactive edges (amber stroke-dash animation). Idle graph is quiet slate/ink.
2. **Circuit lock-in** — level check passes: target subgraph snaps to `--ok`,
   short ring flash, golf score ticks.

## Motion

- Only action-driven motion (run, check, solve). No load-in cascades.
- Edge pulse 420ms, lock-in 280ms. `prefers-reduced-motion`: instant state.

## Information architecture

- **Picker** — choose R or Python (persisted in `localStorage`)
- **Concept levels** — ordered challenges on the reactive model; learner
  manipulates a graph sandbox or answers via short commands; check by graph shape
- **Code levels** — write UI/server snippets; validated by structured rules
  (required ids, calls, structure); live mock UI preview
- **Sandbox** — free build of apps in the chosen language; undo / reset / golf
- **Export** — download `app.R` or `app.py` matching current sandbox state

## Curriculum model

```json
{
  "id": "c-01-ui-server",
  "track": "concept" | "code",
  "lang": "r" | "python" | "shared",
  "title": "...",
  "goal": "...",
  "body": "...",
  "par": 3,
  "hint": "...",
  "startGraph": { "nodes": [], "edges": [] },
  "targetGraph": { "nodes": [], "edges": [] },
  "starterCode": "...",
  "checks": [{ "type": "regex" | "contains" | "graphMatch", "value": "..." }],
  "solution": "..."
}
```

## Principles

- Graph first: if a concept can be shown as nodes/edges, do not only write it.
- One lesson, one idea. Golf encourages economy, not clever golf tricks.
- Parallel R/Python levels share pedagogy and diverge only in syntax and idioms.
- No fake live R/Python runtime in v1 SPA — mock preview + honest export.
- English in files and UI chrome; copy is plain, active, specific.
