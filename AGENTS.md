# AGENTS.md — Champions of the Supernal Interregnum

This file is a guide for AI coding agents working on **Champions of the Supernal Interregnum** (CotSI). It describes the project's purpose, technology stack, code organization, conventions, build/test workflow, and current architectural state. Read this before making changes.

Always remember that you should ask questions if you are making changes and the user's intentions or desires are unclear. The user likes to talk to you and is delighted to be able to clarify or opine.

---

## Project Overview

CotSI is a browser-based, single-player hex-crawl strategy game inspired by tabletop wargames and turn-based strategy games like Heroes of Might and Magic. The player (and AI bots) control one of the seven faction champions on a procedurally generated hex map, moving, fighting, trading, and digging for relics. The win conditions are a relic race and/or last-champion-standing.

Combat is based on a 7 node, two paradoxical Paley tournament, meaning that each power wins against 3 powers and loses against 3 others.

The game is intentionally built with **vanilla JavaScript and CSS** — no framework, no bundler, no build step. It runs directly in the browser from `index.html`.

The game is still early in development so the design and mechanics may still change, and some features aren't yet working or completely implemented, such as trading.

Key documents:

- `dev/aestheticConventions.md` — The visual design bible. Defines the "two-layer rule" (chrome vs. miniature), faction colors, typography, gold budget, and hard rules for UI.
- `index.html` — The only HTML file; contains the static page skeleton and modal markup.
- `dev/srcConventions.md` — **The canonical architecture and file-tree conventions.** Layer taxonomy, dependency rules, naming rules, and the boundary-debt list. Read it before adding or moving any file.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Browser (Chrome/Firefox/Edge) |
| JavaScript | ES2022 modules, no transpiler |
| 3D rendering | Three.js (vendor copies live in `src/vendor/`) |
| 2D overlay | HTML `<canvas>` layered over the Three.js canvas |
| Styling | Plain CSS with a custom token system (`styles/abstracts/tokens/`) |
| Fonts | Cinzel, EB Garamond, UnifrakturCook (in `/assets`) |
| Icons | SVG sprite sheet plus individual SVGs in `assets/icons/` |
| Package manager | None |
| Build tool | None |
| Test runner | None currently (`python3 dev/check_imports.py` is the import gate) |

The project does **not** have a `package.json`, `pyproject.toml`, `Cargo.toml`, or similar manifest. It is served as static files.

---

## How to Run the Game

Because the code uses ES modules, you must serve the project from an HTTP origin; opening `index.html` directly from the filesystem will fail due to CORS.

During development we're running a local preview server for testing.

---

## Code Organization

```
CotSI/
├── index.html                 # Static page skeleton
├── dev/aestheticConventions.md # Visual design system
├── assets/                    # Fonts and SVG icons
├── dev/                       # Conventions, architecture notes, dev tooling
├── src/
│   ├── entrypoint.js          # Application entry point
│   ├── engine/                # Reusable-across-games code (zero game knowledge)
│   │   └── rules/             # Pure, stateless, reusable mechanics
│   │       ├── seededRng.js         # Seeded RNG and noise
│   │       └── hexGrid.js           # Axial hex-grid math ({q,r}, "q,r" keys)
│   ├── game/                  # This game's rules and state (no DOM, no Three.js)
│   │   ├── rules/             # Pure, game-specific logic
│   │   │   ├── factionData.js       # Faction data, Paley beats matrix, artifacts
│   │   │   ├── paleyScoring.js      # scorePower Paley math
│   │   │   ├── weatherScript.js     # 7-day weather script
│   │   │   ├── dispatchReport.js    # buildDispatchReport — pure Augur's Dispatch data
│   │   │   └── terrainGeneration.js # TERRAIN + seeded tile generation
│   │   └── state/             # Single source of truth: state, queries, mutations
│   │       ├── liveGame.js          # Live G instance + currentChamp()
│   │       ├── gameFactory.js       # createGame(...) — world + champion setup
│   │       ├── entityQueries.js     # Lookups: champion/mob/trader at a hex
│   │       ├── fogOfWar.js          # Sight / fog-of-war
│   │       ├── victoryChecks.js     # Win-condition checks
│   │       ├── gameLog.js           # addLog helper
│   │       ├── dispatchLedger.js    # Per-champion ledger of changes for the dispatch
│   │       ├── championMovement.js  # Movement range, daily moves, arrival effects
│   │       ├── championAI.js        # Bot decision logic
│   │       ├── turnActions.js       # beginTurn, artifact choices, digging
│   │       ├── worldSimulation.js   # Advance turn, daily world simulation
│   │       └── combat/              # Combat engine (state + resolution)
│   │           ├── index.js         # Pure re-export barrel (zero logic)
│   │           ├── combatState.js
│   │           ├── combatPicks.js
│   │           ├── combatScoring.js
│   │           └── combatDamage.js
│   ├── runtime/               # Composition root: cross-layer orchestration
│   │   ├── bootstrap.js       # DOMContentLoaded startup wiring
│   │   ├── beginGame.js       # __beginGame(config), window.__beginGame
│   │   ├── refreshAll.js      # Central render orchestrator
│   │   ├── mapRefresh.js      # 3D map init-once + per-refresh render
│   │   ├── rewardPrompt.js    # Pending reward modal dispatch
│   │   ├── dispatchPrompt.js  # Augur's Dispatch: first prompt of every human turn
│   │   ├── turnPipeline.js    # Human end turn + bot turn runner
│   │   ├── hexBridge.js       # Hex click → state → UI bridge
│   │   └── mapControlActions.js # Zoom/camera [data-action] registrations
│   ├── render/                # Pixels: Three.js + Canvas2D (reads state, never mutates)
│   │   ├── hexmap3d/          # Three.js hex-map renderer
│   │   │   ├── hexMapRenderer.js
│   │   │   ├── hexWorldSpace.js
│   │   │   ├── scene/         # sceneSetup.js, cameraControls.js, materials.js
│   │   │   ├── terrain/       # terrainMesh.js
│   │   │   ├── features/      # featureMeshes.js + tree/mountain/knot/base meshes
│   │   │   ├── units/         # index.js (barrel) + unitMeshes/Geometries/Animations
│   │   │   └── interaction/   # mapInteraction.js, hexClick/hexHover/hexPicking,
│   │   │                      # cameraPan/cameraZoom/panMath, touchInput, hoverTooltip
│   │   └── overlays/          # Canvas2D layers: overlayStack, fogOverlay,
│   │                          # fogMaskGenerator, movementHighlights, selectionRing,
│   │                          # screenProjection, graphicsSettings
│   ├── ui/                    # DOM layer: panels, modals, widgets, view-models
│   │   ├── setupScreen.js     # Setup screen faction roster
│   │   ├── hud.js             # Toasts, victory modal
│   │   ├── mapTooltip.js      # Hex tooltip content, zoom display
│   │   ├── domBuilder.js      # `h()` DOM builder
│   │   ├── heptagramWidget.js # Interactive Paley widget
│   │   ├── paleySVG.js        # SVG generator for the Paley wheel
│   │   ├── panels/            # headerPanel.js, leftPanel.js, rightPanel.js, logPanel.js
│   │   ├── modals/            # modalShell.js (generic), rewardModal.js, dispatchModal.js (Augur's Dispatch)
│   │   ├── viewModels/        # championViewModel.js, combatViewModel.js
│   │   └── combat/            # Combat modal UI: combatModal.js, combatUiState.js,
│   │                          # combatLifecycle/Flow/Reveal/Renderer/Interactions/RewardUI/Fx
│   ├── shared/
│   │   └── actionBus.js       # Delegated [data-action] dispatcher (leaf, no imports)
│   └── vendor/                # Three.js builds (do not edit)
└── styles/                    # CSS token system and component styles
    ├── codex.css              # Master import sheet
    ├── abstracts/             # Tokens and reset
    ├── components/            # Component styles
    ├── layout/                # Page layout
    └── ui/                    # Utilities, overlays, responsive
```

### Module Boundaries

The full rules live in `dev/srcConventions.md` §2. Summary:

- **`engine/`** — Pure, reusable mechanics. Imports only `shared/` and itself. Safe to import anywhere.
- **`game/rules/`** — Pure, game-specific logic (takes state as a parameter). Imports `engine/`, `shared/`, siblings.
- **`game/state/`** — All mutable game state plus its queries and mutations. Never imports `runtime/`, `render/`, or `ui/`.
- **`runtime/`** — The only layer that may import multiple layers; the only place circular dependencies are tolerated (together with the `liveGame.js` singleton it anchors).
- **`render/`** — WebGL/canvas rendering. Receives state via arguments or reads `window.__gameState`; must not mutate game state.
- **`ui/`** — DOM rendering and event handling. Dispatches actions through `shared/actionBus.js`; never mutates game state.
- **`shared/`** — Leaf infrastructure (`actionBus.js`); imports nothing project-local.
- **`vendor/`** — Third-party Three.js builds. Exempt from naming rules; do not edit.

`python3 dev/check_imports.py` verifies import resolution, named exports, and reports cross-layer imports that violate these rules (the current known-debt list is in `dec/srcConventions` §6).

---

## Application Flow

1. `index.html` loads `styles/codex.css` and `src/entrypoint.js` as a module.
2. `entrypoint.js` imports `src/runtime/bootstrap.js` and `src/runtime/beginGame.js` for side effects.
3. On `DOMContentLoaded`, `bootstrap.js` initializes the combat modal and then loads `setupScreen.js` to render the setup screen.
4. The player clicks **Begin Interregnum**; `setupScreen.js` calls `window.__beginGame(config)`.
5. `beginGame.__beginGame(config)` creates a game via `createGame()`, sets the live game instance, initialises the 3D camera, wires the heptagram widget, and then calls `refreshAll()`.
6. `refreshAll()` re-renders the header, left/right panels, 3D map, and heptagram widget, and triggers bot turns if needed.

The live game instance is available as:

```js
import { G, currentChamp } from './src/game/state/liveGame.js';
import { refreshAll } from './src/runtime/refreshAll.js';
window.__gameState; // same object as G
```

---

## Key Conventions

### JavaScript

- Use ES modules (`import`/`export`). Avoid global script tags.
- Prefer `const`/`let`; avoid `var`.
- Hex coordinates are stored as `{ q, r }` objects; keys are `"q,r"` strings.
- The Paley tournament rule is hard-coded in `game/rules/factionData.js`: faction `i` beats `i+1, i+2, i+4` modulo 7.
- File and directory naming follows `dev/srcConventions.md` §3: qualified `camelCase.js` names, no bare domains (`combat.js`, `map.js`), no banned words (`utils`, `helpers`, `controller`, `manager`, `logic`, …). `index.js` only as a zero-logic barrel.
- The intentional circular imports (live `G` binding from `game/state/liveGame.js`) are tolerated only within `runtime/` + `liveGame.js`. Everywhere else, keep imports acyclic.
- Code uses two-space indentations (not tabs).

### Styling

- Read `dev/aestheticConventions.md` before adding any visual element.
  - We may pivot dramatically from this style.
- All design tokens live in `styles/abstracts/tokens/` and are imported through `styles/abstracts/variables.css`.
- Follow the **two-layer rule**:
  - **Chrome** (UI panels, text, buttons) — restrained neutrals (vellum, parchment, ink).
  - **Miniature** (map, units, faction glyphs) — vivid jewel/faction colors.
- Inline styles are acceptable only for genuinely dynamic values (HP bar width, faction accent color via `--faction-color`). Everything else belongs in CSS.
- Gold is intentionally rare; do not add it without reading the gold-budget rule in `dev/aestheticConventions.md`.

### UI Architecture

1. **CSS owns presentation.**
2. **Render functions should be pure and thin**, producing view models and small HTML fragments.
3. **One delegated action bus** in `src/shared/actionBus.js` handles all `[data-action]` clicks. Registrations that wire layers together live in `runtime/`.
4. **Highly modular code**: single-purpose files with descriptive, qualified filenames.

New interactions should:

- Add `data-action="myAction"` (and optional `data-*` attributes) to clickable elements.
- Register the handler with `registerAction('myAction', (el, event) => { ... })`.
- Use the `h()` helper in `src/ui/domBuilder.js` instead of `innerHTML` when building dynamic DOM fragments.
- Add derived UI data to `src/ui/viewModels/` rather than computing it inside renderers.

---

## Game Rules and Mechanics

### Global Rule: World-Map Turn Order Persistence

- `G.globalOrder` is the **persistent** turn order.
- At the start of each world day, `G.currentOrder` is snapshotted from
  `G.globalOrder` (filtered to alive champions). Map movement cycles
  through `G.currentOrder` for that day.
- Mutations to `G.globalOrder` during combat **do not** affect
  `G.currentOrder` until the **next world day**, when a fresh snapshot
  is taken.

### Combat Round Flow

#### 1. Initiative
At combat start, the two combatants are ordered by their position in
`G.globalOrder`: the earlier champion acts **first**, the later champion
**second**. These roles are stored as `combat.first` / `combat.second`.
The champion who initiated the fight is `combat.attacker`; this dictates
reward eligibility, not pick order.

#### 2. First Exchange (hidden, simultaneous reveal)
- `combat.first` secretly picks a colour.
- `combat.second` secretly picks a colour.
- After a short delay both picks are revealed simultaneously.

#### 3. Second Exchange (hidden, reverse order)
- **`combat.second`** picks first.
- **`combat.first`** picks second.
- Both are revealed simultaneously.

> Reversing the order prevents a permanent information advantage across the two exchanges in hot-seat games where choices can't be concealed.

#### 4. Score Calculation & Animation
All four revealed colours are accumulated into the round score.
Animations highlight every contributing element.

#### 5. Round End & Turn Order Shift
- If a champion **took damage** during the round, their position in
  `G.globalOrder` moves immediately **in front of** the champion who
  damaged them.
- The damaged champion will therefore act first in the next combat round.

#### 6. Next Round
A new round begins using the same `combat.first`/`second` assignments
(which reflect the now-updated `G.globalOrder`). Steps 2–5 repeat.

---

## Build, Test, and Deployment

### Build

There is **no build step**. The project runs as static files. Any modern static server works.

### Test

There is **no test framework** currently installed. The project is verified manually by using a local server.

`python3 dev/check_imports.py` is the automated gate: it verifies that every relative import in `src/` resolves, that every named import matches a real export (following re-export chains), and prints a report of cross-layer imports that violate the dependency rules in `dec/srcConventions`. Run it after moving or renaming any file.

AI devs can't run the game, but the user is always excited to perform any testing requested, to provide needed data; feedback, logs, etc.

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

### Add a new UI interaction

1. Put `data-action="foo"` on the element (in HTML or via `h(..., { dataAction: 'foo' })`).
2. In the relevant module, import `registerAction` from `src/shared/actionBus.js`. (Handlers that wire multiple layers belong in `runtime/`.)
3. Call `registerAction('foo', (el, event) => { ... })`.

### Add a new 3D feature or tile type

- Map generation: `src/game/rules/terrainGeneration.js` (hex math: `src/engine/rules/hexGrid.js`).
- Geometry/materials: `src/render/hexmap3d/terrain/` or `src/render/hexmap3d/features/`.
- Visibility/fog rules: `src/game/state/fogOfWar.js`.

### Change win conditions

Edit `src/game/state/victoryChecks.js` and the `objectives` object passed from `setupScreen.js`/`gameFactory.js`.

### Not sure where a new file goes?

Walk the decision guide in `dec/srcConventions` §5.

---

## Known Rough Edges

- **Boundary debt**: some pre-existing cross-layer imports remain (e.g. `render/` reading `game/state/`, `ui/` reading `game/state/` and `render/`). They are inventoried in `dec/srcConventions` §6 and reported by `dev/check_imports.py`. Do not add new ones; fix them via view-models/snapshots when touching those files.
- `styles/` is mid-migration to the conventions in `dec/cssConventions.md` (camelCase file names matching JS modules). File renames are done; remaining debt is class/file name mismatches (e.g. `.log-bar` classes in `logPanel.css`) — see `dec/cssConventions.md` §11.3.

When in doubt, prefer consistency with the files in `src/shared/actionBus.js`, `src/ui/setupScreen.js`, `src/ui/viewModels/championViewModel.js`, and `src/ui/domBuilder.js` — these represent the current direction.

---

## Ask Questions if anything's unclear

- The user is here to provide any extra information requested!
