# AGENTS.md — Champions of the Supernal Interregnum

This file is a guide for AI coding agents working on **Champions of the Supernal Interregnum** (CotSI). It describes the project's purpose, technology stack, code organization, conventions, build/test workflow, and current architectural state. Read this before making changes.

---

## Project Overview

CotSI is a browser-based, single-player hex-crawl strategy game inspired by tabletop wargames and turn-based strategy games like Heroes of Might and Magic. The player (and AI bots) control one of the seven faction champions on a procedurally generated hex map, moving, fighting, trading, and digging for relics. The win conditions are a relic race and/or last-champion-standing.

Combat is based on a 7 node, two paradoxical Paley tournament, meaning that each power wins against 3 powers and loses against 3 others. Faction i beats i+1, i+2, and i+4 mod 7.

The game is intentionally built with **vanilla JavaScript and CSS** — no framework, no bundler, no build step. It runs directly in the browser from `index.html`.

The game is still early in development.

Key documents:

- `styleguide.md` — The visual design bible. Defines the "two-layer rule" (chrome vs. miniature), faction colors, typography, gold budget, and hard rules for UI.
- `index.html` — The only HTML file; contains the static page skeleton and modal markup.
- `dev/refactorgoal.md` — High-level architectural goals for the ongoing UI refactor.
- `dev/domrefactorplan.md` — Step-by-step plan for migrating the UI from inline HTML strings to a delegated action-bus architecture.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Browser (Chrome/Firefox/Edge) |
| JavaScript | ES2022 modules, no transpiler |
| 3D rendering | Three.js (vendor copies live in `src/lib/`) |
| 2D overlay | HTML `<canvas>` layered over the Three.js canvas |
| Styling | Plain CSS with a custom token system (`styles/abstracts/tokens/`) |
| Fonts | Cinzel, EB Garamond, UnifrakturCook (in `/assets`) |
| Icons | SVG sprite sheet plus individual SVGs in `assets/icons/` |
| Package manager | None |
| Build tool | None |
| Test runner | None currently |

The project does **not** have a `package.json`, `pyproject.toml`, `Cargo.toml`, or similar manifest. It is served as static files.

---

## How to Run the Game

Because the code uses ES modules, you must serve the project from an HTTP origin; opening `index.html` directly from the filesystem will fail due to CORS.

Recommended commands (run from the project root):

```bash
# Python 3
python3 -m http.server 8080

# Node.js (if installed)
npx serve . -p 8080

# Or any other static file server on port 8080
```

Then open `http://localhost:8080` in a browser. The VS Code launch configuration (`.vscode/launch.json`) also expects `http://localhost:8080`.

---

## Code Organization

```
CotSI/
├── index.html                 # Static page skeleton
├── styleguide.md              # Visual design system
├── assets/                    # Fonts and SVG icons
├── dev/                       # Architecture notes and refactor plans
├── src/
│   ├── entrypoint.js          # Application entry point
│   ├── core/                  # Pure, stateless game rules
│   │   ├── factions.js        # Faction data, Paley beats matrix, artifacts
│   │   ├── rng.js             # Seeded RNG and noise
│   │   ├── scorePowerPaleyMath.js
│   │   └── weather.js         # 7-day weather script
│   ├── game/                  # Game logic and state mutation
│   │   ├── gameFactory.js     # createGame(...) — world + champion setup
│   │   ├── state.js           # Barrel re-exports (legacy, partially stale)
│   │   ├── session/
│   │   │   ├── liveGame.js          # Live G instance + currentChamp()
│   │   │   ├── beginGame.js         # __beginGame(config), window.__beginGame
│   │   │   ├── refreshAll.js        # Central render orchestrator
│   │   │   ├── mapRefresh.js        # 3D map init-once + per-refresh render
│   │   │   └── rewardPrompt.js      # Pending reward modal dispatch
│   │   ├── turnController.js  # Human end turn + bot turn runner
│   │   ├── turnLogic.js       # beginTurn, artifact choices, digging
│   │   ├── worldTurn.js       # Advance turn, world simulation
│   │   ├── championMovement.js# Movement range, daily moves, arrival effects
│   │   ├── championAI.js      # Bot decision logic
│   │   ├── hexInteraction.js  # Click handler for the map
│   │   ├── entityQueries.js   # Lookups: champion/mob/trader at a hex
│   │   ├── vision.js          # Fog-of-war / sight
│   │   ├── victory.js         # Win-condition checks
│   │   ├── log.js             # addLog helper
│   │   └── combat/            # Combat rule engine (stateless)
│   │       ├── combatState.js
│   │       ├── combatPicks.js
│   │       ├── combatScoring.js
│   │       └── combatDamage.js
│   ├── render/                # 3D map rendering and effects
│   │   ├── hexmap3d/          # Three.js hex-map renderer
│   │   │   ├── hexmap3d-index.js
│   │   │   ├── scene/         # Renderer, camera, lights
│   │   │   ├── terrain/       # Hex tile geometry
│   │   │   ├── features/      # Trees, mountains, bases, knots
│   │   │   ├── units/         # Champion/mob figurine meshes
│   │   │   └── interaction/   # Pan, zoom, hover, click, tooltip
│   │   ├── effects/           # 2D canvas overlay layers (fog, highlights, selection)
│   │   └── heptagramSVG.js    # SVG generator for the Paley wheel
│   ├── ui/                    # DOM UI layer
│   │   ├── actionBus.js       # Delegated [data-action] event dispatcher
│   │   ├── bootstrapUI.js     # DOMContentLoaded startup wiring
│   │   ├── gameUIBindings.js  # Direct event bindings for map controls
│   │   ├── setupUI.js         # Setup screen faction roster
│   │   ├── bindHeader.js      # Top-bar champion pills
│   │   ├── hud.js             # Toasts, victory modal
│   │   ├── mapView.js         # Tooltip content, zoom display
│   │   ├── modal.js           # Generic modal + artifact choice
│   │   ├── heptagramWidget.js # Interactive Paley widget
│   │   ├── utils/dom.js       # `h()` DOM builder
│   │   ├── viewModels/        # Pure view-model transformers
│   │   │   └── championVM.js
│   │   ├── panels/            # Panel data binders (static HTML skeletons)
│   │   │   ├── bindLeftPanel.js
│   │   │   ├── bindRightPanel.js
│   │   │   └── logView.js
│   │   └── combat/            # Combat UI
│   │       ├── combatui-index.js
│   │       ├── combatLifecycle.js
│   │       ├── combatRenderer.js
│   │       ├── combatInteractions.js
│   │       ├── combatRewardUI.js
│   │       └── combatStateManager.js
│   ├── world/
│   │   └── map.js             # Hex grid, terrain generation, coordinate helpers
│   └── lib/                   # Vendor Three.js builds (do not edit)
└── styles/                    # CSS token system and component styles
    ├── codex.css              # Master import sheet
    ├── abstracts/             # Tokens and reset
    ├── components/            # Component styles
    ├── layout/                # Page layout
    ├── pages/                 # Screen-specific styles
    └── ui/                    # Utilities, overlays, responsive
```

### Module Boundaries

- **`core/`** — Pure functions, no DOM, no game state. Safe to import anywhere.
- **`world/`** — Map geometry and procedural generation. Depends only on `core/rng.js`.
- **`game/`** — State mutation and rules. May import `core/`, `world/`, and `ui/` only at runtime via live bindings (there is an intentional circular dependency between `gameOrchestrator.js` and some UI/game modules).
- **`render/`** — WebGL/canvas rendering. Reads `window.__gameState` or receives state via arguments; must not mutate game state.
- **`ui/`** — DOM rendering and event handling. Reads and writes the DOM, dispatches actions, calls into `game/` via the live `G` export or `window.__gameState`.

---

## Application Flow

1. `index.html` loads `styles/codex.css` and `src/entrypoint.js` as a module.
2. `entrypoint.js` imports `src/ui/bootstrapUI.js` and `src/game/gameOrchestrator.js` for side effects.
3. On `DOMContentLoaded`, `bootstrapUI.js` initializes the combat modal and then loads `setupUI.js` to render the setup screen.
4. The player clicks **Begin Interregnum**; `setupUI.js` calls `window.__beginGame(config)`.
5. `gameOrchestrator.__beginGame(config)` creates a game via `createGame()` and then calls `refreshAll()`.
6. `refreshAll()` re-renders the header, left/right panels, 3D map, and heptagram widget, and triggers bot turns if needed.

The live game instance is available as:

```js
import { G, currentChamp, refreshAll } from './src/game/gameOrchestrator.js';
window.__gameState; // same object as G
```

---

## Key Conventions

### JavaScript

- Use ES modules (`import`/`export`). Avoid global script tags.
- Prefer `const`/`let`; avoid `var`.
- Hex coordinates are stored as `{ q, r }` objects; keys are `"q,r"` strings.
- The Paley tournament rule is hard-coded in `core/factions.js`: faction `i` beats `i+1, i+2, i+4` modulo 7.
- Circular imports between `game/` and `ui/` exist by design: `gameOrchestrator.js` exports a live `G` binding that other modules import and use at runtime.

### Styling

- Read `styleguide.md` before adding any visual element.
- All design tokens live in `styles/abstracts/tokens/` and are imported through `styles/abstracts/variables.css`.
- Follow the **two-layer rule**:
  - **Chrome** (UI panels, text, buttons) — restrained neutrals (vellum, parchment, ink).
  - **Miniature** (map, units, faction glyphs) — vivid jewel/faction colors.
- Inline styles are acceptable only for genuinely dynamic values (HP bar width, faction accent color via `--faction-color`). Everything else belongs in CSS.
- Gold is intentionally rare; do not add it without reading the gold-budget rule in `styleguide.md`.

### UI Architecture (In Progress Refactor)

The project is mid-refactor from inline-HTML renderers to a cleaner architecture:

1. **CSS owns presentation.**
2. **Render functions should be pure and thin**, producing view models and small HTML fragments.
3. **One delegated action bus** in `src/ui/actionBus.js` handles all `[data-action]` clicks.

New interactions should:

- Add `data-action="myAction"` (and optional `data-*` attributes) to clickable elements.
- Register the handler with `registerAction('myAction', (el, event) => { ... })`.
- Use the `h()` helper in `src/ui/utils/dom.js` instead of `innerHTML` when building dynamic DOM fragments.
- Add derived UI data to `src/ui/viewModels/` rather than computing it inside renderers.

Some areas (combat renderer, left/right panels, tooltips) still use HTML strings and direct `addEventListener` calls. Do not expand those patterns; migrate toward the action-bus style when touching them.

---

## Build, Test, and Deployment

### Build

There is **no build step**. The project runs as static files. Any modern static server works.

### Test

There is **no test framework** currently installed. The project is verified manually by:

1. Starting a static server on `localhost:8080`.
2. Opening the game in a browser.
3. Running through setup, movement, combat, and victory paths.

If you add tests, prefer a lightweight, browser-compatible runner (for example, a Node-based ESM test runner) and document the command here.

### Deployment

Deploy the project root as a static site. Only these files/directories are required at runtime:

- `index.html`
- `src/`
- `styles/`
- `assets/`

No server-side runtime is required.

---

## Security Considerations

- The game uses `innerHTML` in several legacy renderers (panels, combat, tooltips, log). Inputs that reach these renderers come from trusted game data, but when refactoring, prefer `textContent`/DOM-building (`h()`) over `innerHTML`.
- Do not introduce dependencies that require `eval`, `new Function`, or unsafe inline scripts.
- The game state is stored in a mutable global (`window.__gameState`). This is intentional for debugging, but do not expose it to untrusted user input.

---

## Common Tasks

### Add a new faction

Edit `src/core/factions.js`:

- Add a new entry to `FACTIONS`.
- Add the corresponding CSS variables in `styles/abstracts/tokens/factions.css`.
- Update the Paley `beats` logic if the tournament topology changes (currently fixed at 7 factions).

### Add a new UI interaction

1. Put `data-action="foo"` on the element (in HTML or via `h(..., { dataAction: 'foo' })`).
2. In the relevant module, import `registerAction` from `src/ui/actionBus.js`.
3. Call `registerAction('foo', (el, event) => { ... })`.

### Add a new 3D feature or tile type

- Map generation: `src/world/map.js`.
- Geometry/materials: `src/render/hexmap3d/terrain/` or `src/render/hexmap3d/features/`.
- Visibility/fog rules: `src/game/vision.js`.

### Change win conditions

Edit `src/game/victory.js` and the `objectives` object passed from `setupUI.js`/`gameFactory.js`.

---

## Known Rough Edges

- `src/game/state.js` is a barrel file with some stale re-exports (e.g., it references `movement.js` but the actual file is `championMovement.js`).
- Some combat UI code still relies on global functions (`window.commitCombat`, `window.closeReward`) and inline styles.
- The `combatRenderer.js` currently mixes DOM rendering with game logic imports; it is a target for the ongoing refactor.
- Several renderers still reset large chunks of `innerHTML`. The refactor plan in `dev/domrefactorplan.md` describes the desired end state.

When in doubt, prefer consistency with the files in `src/ui/actionBus.js`, `src/ui/setupUI.js`, `src/ui/viewModels/championVM.js`, and `src/ui/utils/dom.js` — these represent the current direction.
