# CotSI — Architecture & File-Tree Conventions

This is the **canonical** conventions document for Champions of the Supernal Interregnum.
It supersedes `dev/conventions_1.md`, `dev/conventions_a.md`, and
`dev/file_conventions_discussion.md` (kept for history).

When a specific rule is unclear or missing, fall back to the principles in §1.

---

## 1. Principles

1. **Organize by rate of change.** Pure math changes rarely; game state changes when
   systems are added; rendering changes with art direction; the DOM changes most often.
   The directory tree reflects that reality.
2. **Unidirectional data flow.** Imports flow downward through the layers; events and
   callbacks flow upward. `runtime/` is the only exception — it is the bridge.
3. **Pure core, impure shell.** Inner layers are pure functions with zero side effects.
   Every side effect (DOM, canvas, state mutation) lives at the outer edges, so the
   core stays testable without a browser.
4. **One responsibility per file.** A file has exactly one reason to change. If it
   exports both a DOM builder and a game-logic function, split it.
5. **Clarity over brevity.** `combatMath.js` beats `combat.js`. A name that feels too
   long usually means the module's scope is too broad.
6. **Replaceability.** Swap the renderer → only `render/` changes. Redesign the UI →
   only `ui/` changes. Reuse the engine for a new game → copy `engine/` (plus whatever
   slices of `game/` you want). If a change in one layer forces changes in an unrelated
   layer, the boundary is wrong.
7. **No circular dependencies** anywhere except inside `runtime/` (and the
   `game/state/liveGame.js` singleton it anchors). A cycle anywhere else signals a
   boundary violation.

---

## 2. Layer taxonomy

```
src/
  entrypoint.js   Composition-root entry. Imports bootstrap for side effects only.
  engine/         Reusable-across-games code. Zero knowledge of factions, lore, UI.
  game/           This game's rules and state. No DOM, no Three.js, no wiring.
  runtime/        Composition root. The ONLY layer that may import multiple layers.
  render/         Pixels: Three.js scene + Canvas2D overlays. Reads state, never mutates.
  ui/             DOM: panels, modals, widgets, view-models. Never mutates game state.
  shared/         Leaf infrastructure imported by any layer; imports nothing project-local.
  vendor/         Third-party builds (Three.js). Exempt from naming rules. Do not edit.
```

### Dependency rules

| Importer      | May import |
|---------------|------------|
| `shared/`     | nothing project-local |
| `engine/`     | `shared/`, `engine/` |
| `game/rules/` | `shared/`, `engine/`, `game/rules/` |
| `game/state/` | `shared/`, `engine/`, `game/rules/`, `game/state/` |
| `render/`     | `shared/`, `engine/`; game state only via function arguments |
| `ui/`         | `shared/`, `ui/`; game data only via view-models or arguments |
| `runtime/`    | everything — cross-layer wiring is its purpose |

Forbidden: `engine → game/runtime/render/ui`; `game → runtime/render/ui`;
`render → game/runtime/ui`; `ui → game/runtime/render`; `shared → anything local`.

### What lives where

- **`engine/rules/`** — Pure, reusable mechanics: seeded RNG, hex-grid math,
  pathfinding, noise. Testable in Node without a browser. (`engine/state/` — a generic
  store — is reserved for the future; do not create empty directories.)
- **`game/rules/`** — Pure, game-specific logic: faction data, Paley scoring, weather
  script, terrain generation. Functions take state as a parameter; they never reach
  for mutable state.
- **`game/state/`** — The single source of truth. Mutable game state (`liveGame.js`
  holds the live `G`), queries (`entityQueries.js`), and mutations
  (`championMovement.js`, `worldSimulation.js`, `combat/`).
- **`runtime/`** — Orchestration: startup (`bootstrap.js`, `beginGame.js`), the render
  loop (`refreshAll.js`, `mapRefresh.js`), input bridges (`hexBridge.js`), turn
  sequencing (`turnPipeline.js`), action registrations that span layers
  (`mapControlActions.js`). Keep it thin: if a file here does game logic, move it to
  `game/state/`; if it does DOM work, move it to `ui/`.
- **`render/`** — Everything that touches pixels: `hexmap3d/` (Three.js scene, terrain,
  features, units, interaction) and `overlays/` (Canvas2D fog, highlights, selection).
  Receives state via arguments; given the same state it produces the same visuals.
- **`ui/`** — HTML bindings, panels (`panels/`), modals (`modals/`), combat modal
  (`combat/`), view-models (`viewModels/`), decorative SVG, the `h()` DOM builder.
  Dispatches intent through `shared/actionBus.js`; never mutates game state.
- **`shared/`** — Layer-neutral infrastructure. Today: `actionBus.js` (the
  `[data-action]` dispatcher). Must stay dependency-free.
- **`vendor/`** — Three.js builds. Exempt from every rule above.

---

## 3. Naming conventions

### Files

- `camelCase.js`, lowercase first letter. No hyphens, no underscores, no `sim` prefixes.
- **Every file name is self-explanatory without its directory path.** Assume the reader
  sees the name in an editor tab with no context.
- **No bare domains.** Never a file named `combat.js`, `map.js`, `turn.js`,
  `player.js`, `world.js`, `state.js`, `camera.js`. Always qualify:
  `combatState.js`, `hexGrid.js`, `turnPipeline.js`, `cameraControls.js`.
- **Verbs for actions/mutations** (`advanceTurn.js`, `resolveRoundDamage`); **nouns for
  data, queries, and components** (`factionData.js`, `entityQueries.js`,
  `headerPanel.js`).
- **`index.js` only as a zero-logic barrel.** If it contains a single function body,
  it needs a real name (e.g. `combatModal.js`, not `combatui-index.js`).
- View-models: `nounViewModel.js` (`championViewModel.js`).

### Banned words in file and directory names

`utils`, `helpers`, `common`, `misc`, `lib`, `controller`, `handler`, `manager`,
`logic`, `service`.

Name the thing by what it does: `hexGrid.js` not `hexUtils.js`, `turnPipeline.js`
not `turnController.js`, `combatUiState.js` not `combatStateManager.js`,
`turnActions.js` not `turnLogic.js`.

### Directories

- Plural for collections (`rules/`, `panels/`, `modals/`, `overlays/`); singular for
  concepts (`state/`, `runtime/`, `render/`, `engine/`).
- **Domain subdirectories are allowed** under a layer directory: `game/state/combat/`,
  `ui/combat/`, `render/hexmap3d/features/`. The layer path is the qualifier, and every
  file inside is still fully qualified (`combatScoring.js`, never `scoring.js`).
  This is the resolution of the "combat virus" problem: the virus was unqualified
  *files* and directories at the *top* level, not domain folders inside a layer.

### Code identifiers

| Category  | Convention | Examples |
|-----------|-----------|----------|
| Variables | camelCase | `hexGrid`, `activeChampion` |
| Functions | camelCase, verb-first | `resolveCombat()`, `getEntitiesAtHex()` |
| Booleans  | `is`/`has`/`can`/`should` prefix | `isActive`, `hasMoved`, `canAttack` |
| Classes   | PascalCase | `HexGrid`, `CombatState` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_HEALTH`, `GRID_SIZE` |
| Module-private | `_` prefix | `_pendingChoice`, `_getGameState` |

---

## 4. Interaction pattern (target state)

Every user-initiated action flows through this pipeline:

```
1. CAPTURE   ui/ or render/ detects the action (click, keypress, drag)
2. DISPATCH  intent via shared/actionBus.js ([data-action]) or a callback
3. ROUTE     runtime/ receives it, routes to game/state/ mutation
4. MUTATE    game/state/ applies the change (using game/rules/ for pure math)
5. NOTIFY    runtime/ re-renders: refreshAll()
6. RENDER    render/ redraws from the new state
7. BIND      ui/ rebinds from view-models
```

No step is skippable in new code. The UI never calls `game/state/` directly; render
never imports `game/state/`. All coordination goes through `runtime/`.

**Honest status:** the current codebase does not fully comply — see §6 Boundary Debt.
New code must follow the pipeline; existing violations are paid down over time.

---

## 5. Decision guide — where does new code go?

```
1. Pure function, no side effects?
   ├─ Yes → reusable in any game? ─┬─ Yes → engine/rules/
   │                               └─ No  → game/rules/
   └─ No →
2. Mutable game state, or reads/writes it?        → game/state/
3. Wires two or more layers together?             → runtime/
4. Draws to canvas or WebGL?                      → render/
5. Touches the DOM or handles user input?         → ui/
6. Generic infrastructure, imports nothing local? → shared/
7. None of the above? The code is probably doing two jobs — split it.
```

---

## 6. Boundary debt (known violations, fix later)

The 2026-07 migration was structural: files were placed in the correct layer, but some
pre-existing cross-layer imports remain. These are tracked here and reported by
`dev/checkImports.mjs`. Do not add new ones.

- `render → game/state`: `hexMapRenderer.js`, `fogOverlay.js` (import `fogOfWar.js`),
  `movementHighlights.js` (imports `championMovement.js`).
  *Fix path: pass fog/movement data in via render arguments from `runtime/`.*
- `render → game/rules` and `ui → game/rules` static-data reads (`factionData.js`,
  `terrainGeneration.js` — faction colors/glyphs, terrain constants).
  Tolerated-read category; document, don't extend.
- `render → ui`: `mapInteraction.js` imports `refreshZoomDisplay` from `mapTooltip.js`.
  *Fix path: wire via callback at setup time.*
- `ui → game/state`: `mapTooltip.js`, `leftPanel.js`, `combatUiState.js`,
  `viewModels/*`, `ui/combat/*` (import `game/state/combat`).
  *Fix path: view-models fed by `runtime/` snapshots.*
- `ui → render`: `mapTooltip.js` reads `getSceneContext`.
  *Fix path: zoom display driven by `runtime/`.*

---

## 7. Tooling

- `python3 dev/check_imports.py` — verifies every relative import in `src/` resolves, and
  prints a boundary report of cross-layer imports vs the §2 table.
- There is no build step and no test runner; `engine/rules/` and `game/rules/` must
  stay importable in plain Node (`node --check` clean, no DOM/Three imports).

---

## 8. Out of scope / future passes

- `styles/` naming (the `pages/combat.css` vs `components/combat.css` clash).
- Event/snapshot architecture to eliminate §6 debt.
- Dead code noted during migration (e.g. `#hudZoom` has no element in `index.html`).
