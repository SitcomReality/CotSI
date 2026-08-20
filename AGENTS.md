# AGENTS.md — Champions of the Supernal Interregnum

---

## Project

CotSI is a browser-based hex-crawl strategy game, early in development. Seven faction champions move, fight, trade, and dig for relics on a procedurally generated hex map. Combat uses a 7-node Paley tournament (each power beats 3, loses to 3).

**Stack:** Vanilla JS (ES modules) + plain CSS. No framework, no bundler, no build step. Three.js for 3D rendering (`src/vendor/`). Served as static files from any HTTP server (ES modules require an origin — opening `index.html` from disk fails).

**Test:** `python3 dev/scripts/check_imports.py` verifies all imports resolve and checks layer boundaries in `src/`. `python3 dev/scripts/check_analysis_imports.py` does the same for the standalone map analysis tool (`dev/tools/analysis/`). `python3 dev/scripts/check_geometry_editor_imports.py` does the same for the standalone geometry editor (`dev/tools/geometryEditor/`). Unit tests: `dev/tests/run.sh` (or `node --test` from the repo root) runs the zero-dependency `node:test` suite covering the pure layers — `src/engine/`, `src/game/` (rules, state, combat), and `src/render/` (incl. descriptor round-trip) — plus the geometry-editor part-tree tests (`dev/tests/geometryEditor/`). No other formal test runner. AI devs can't run the game; the user tests on request. `node`, `npm`, and `npx` are on PATH in the VSCodium extension shell (symlinks to the host's Node in `~/.var/app/com.vscodium.codium/data/node/bin/`, which the Flatpak wrapper puts on PATH). `dev/tests/run.sh` keeps its `/run/host/usr/bin/node` fallback as a safety net.

**The User Can Help:** If there's ambiguity or unclarified intent (especially regarding game design) ask questions. If there are complicated bugs, add console logs or debug features and the user will report results to help narrow it down.

**Performance:** Always try to be mindful of performance impacts and consider what performance optimizations can be incorporated. `src/devtools/performance/captureLogger.js` is used during in-game testing to gather detailed frame time data per system.

**Early Development:** Many features aren't fully implemented and lots of systems are still using limited placeholder values -- there is no meaningful balance, yet.

**Reference:** Start with `dev/docs/systemArchitecture.md` for the layer architecture and decision guide; `dev/docs/sourceTree.md` holds the complete file-by-file inventory; the standalone tools are covered by `dev/tools/analysis/README.md` and `dev/tools/geometryEditor/README.md`.

---

## Source Layout

| Directory | Purpose | May import |
|-----------|---------|------------|
| `src/engine/` | Reusable pure mechanics (hex math, RNG, noise) | `shared/`, itself |
| `src/game/rules/` | Pure game-specific logic (factions, combat, terrain) | `engine/`, `shared/`, itself |
| `src/game/state/` | Mutable state, queries, mutations | `engine/`, `game/rules/`, itself |
| `src/runtime/` | Cross-layer orchestration (startup, turns, refresh) | everything |
| `src/render/` | Three.js + Canvas2D (reads state, never mutates) | `shared/`, `engine/`; state via args or the read-only queries in `TOLERATED_STATE_READS` |
| `src/ui/` | DOM: panels, modals, widgets, view-models | `shared/`, `ui/`; dispatches via actionBus |
| `src/shared/` | Leaf infrastructure (`actionBus.js`, `clockScheduler.js`, `speedGroup.js`, `timerQueue.js`, `measurements.js`) | nothing project-local (except `params/` — pure constants) |
| `src/params/` | Pure parameter/data constants (rate of change) | nothing local |
| `src/vendor/` | Third-party Three.js builds | do not edit |

**Hard rules:**
- `game/` never imports `runtime/`, `render/`, or `ui/`
- `render/` and `ui/` never mutate game state
- `shared/` imports nothing project-local
- Circular deps only in `runtime/` + `game/state/liveGame.js`

```js
import { G, currentChamp } from './src/game/state/liveGame.js';
window.__gameState; // same object as G
```

---

## Key Conventions

**JavaScript:**
- ES modules, `const`/`let`, two-space indent
- File names: `camelCase.js`, self-explanatory without directory context
- Banned names: `utils`, `helpers`, `common`, `misc`, `lib`, `controller`, `handler`, `manager`, `logic`, `service`
- `index.js` only as a zero-logic barrel re-export
- Hex coords: `{ q, r }` objects, `"q,r"` string keys

**Vocabulary:** One canonical name per thing, used in UI and code alike; names are unique codebase-wide (`token` is reserved for CSS design tokens). Canonical display names live in the archetype registry. Full rules: `dev/docs/namingConventions.md` §6.

**UI interactions:**
- `data-action="foo"` on elements, register via `registerAction('foo', handler)` from `src/shared/actionBus.js`
- Dynamic DOM with `h()` from `src/ui/domBuilder.js`, not `innerHTML`
- Derived UI data in `src/ui/viewModels/` and render-layer reads use only the read-only query symbols tolerated in `check_imports.py`'s `TOLERATED_STATE_READS` (`ui/` and `render/`; never mutators)

**Timers:** Always use `getClock()` from `src/shared/clockScheduler.js` — never raw `setTimeout`/`setInterval`/`rAF`. Specify a speed group: `'bot'`, `'combat'`, `'animation'`, `'ui'`, or `'default'`. Full API: `dev/docs/clockScheduler.md`.

**Descriptor data (object geometry):** One file per object in `src/render/hexmap3d/worldObjects/descriptors/data/` — id `knot` → `knot.js` exporting `KNOT_DESCRIPTOR` (see `descriptorExportName` in `dev/tools/geometryEditor/emitDescriptor.js`). Files are generated by the geometry editor: edit the object in `dev/tools/geometryEditor.html`, press **Save** (needs `dev/tools/geometryEditor/saveServer.sh`, which also serves the game). Don't hand-edit them — the next save overwrites. Parts may nest into **groups** (`children`, no `shape` — `dev/docs/descriptorAuthoring.md` §4.5); author the tree in the editor. The table-driven entity files (`base.js`/`champion.js`/`mob.js`) are saved variant-scoped: the editor writes only the active variant to `data/bases/<faction>.js` / `data/champions/<faction>.js` / `data/mobs/<archetype>.js` (each a `<NAME>_VARIANT` block), never the barrels. Shared motif geometry lives in `data/motifs/` (`trees.js`, `debris.js`, `titanSpire.js`, `bloodPool.js`, …) as hand-authored blocks; a decor's motif table references one by id (`{ motif: 'log', weight, biomeWeight, … }`) and per-terrain presentation stays on the decor. Motifs are authorable in the geometry editor via the library motif mode (the `S.motifEditing` synthetic-decor wrapper) and save back to `data/motifs/<id>.js` through the `/save/motif` route. The supernatural biome decors (land + water/ice/river pools) are folded into the base decorators' motif tables via present-0 `biomeWeight`, not whole-decor swaps. All object geometry is descriptor-driven — no hand-written builders remain. Round-trip safety is pinned in `dev/tests/render/descriptorRoundtrip.test.js`.

**Styling:** Tokens in `styles/abstracts/tokens/`, imported via `styles/abstracts/variables.css`. All `@import`s in `styles/codex.css`. Inline styles only for dynamic custom properties. See `dev/docs/cssConventions.md` and `dev/docs/aestheticConventions.md`.

---

## Detailed Docs

| Document | Covers |
|----------|--------|
| `dev/docs/systemArchitecture.md` | Layer architecture: principles, dependency rules, interaction pattern, decision guide, boundary debt |
| `dev/docs/sourceTree.md` | Complete `src/` file inventory (one-line purpose per file, grouped by layer) |
| `dev/docs/namingConventions.md` | File naming, banned words, code identifier conventions, interaction pattern |
| `dev/docs/cssConventions.md` | CSS structure, naming, spacing scale, barrel pattern |
| `dev/docs/aestheticConventions.md` | Visual design system (aspirational, evolving) |
| `dev/docs/clockScheduler.md` | Clock API reference — all timer/scheduling patterns |
| `dev/docs/descriptorAuthoring.md` | How to author descriptor data (object geometry): schema, randomization, rendering, worked examples |
| `dev/docs/context/biomesAndTerrain.md` | World context for external contributors: every biome & terrain, their colors, classification rules, geometry tint colors |
| `dev/docs/context/factions.md` | World context: the 7 factions, their colors/themes, the Paley tournament |
| `dev/docs/context/sceneConventions.md` | World context: scale units, color pipelines, terrain decor registry, feature registry |
| `dev/docs/mobGeometryAndAnimation.md` | Mob geometry & animation design notes (joint groups, FK chains, animation runtime proposal) |
| `dev/docs/gameMechanics.md` | Combat round flow, turn order, biome system |
| `dev/docs/terrainGenNotes.md` | Terrain-gen design notes: noise, calibration, classification, supernatural biomes |
| `dev/docs/commonTasks.md` | How-to recipes for common changes |
| `dev/tools/analysis/README.md` | Standalone map-gen analysis tool (not part of the game) — reference & inventory |
| `dev/tools/geometryEditor/README.md` | Standalone object-geometry editor (not part of the game) — reference & inventory |

---

## The User Wants To Help

If there are questions or ambiguities about design intent, always ask the user for clarification. If the user can provide feedback by testing in-game (including performance profiling or pasting any console logs added for debugging), they're happy to help.
Always talk to the user in English.

---

## Use Sub-Agents Liberally

Delegate to sub-agents as much as possible. Spawning agents to perform specific tasks or detail the workings of individual systems is extremely useful to keep context limited to only what's needed.

---

## Current Process Underway

Deferred and future work is tracked in `dev/docs/futureWork.md` (features to
implement); deferred-by-decision content and maintenance follow-ups live in
`dev/docs/deferredNotes.md`.