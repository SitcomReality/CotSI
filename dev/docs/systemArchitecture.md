# System Architecture Reference

This is the **single authoritative reference** for how the CotSI source tree is
organized — the layers, their boundaries, and how they connect. New devs and
agents should start here. For the file-by-file inventory, see `dev/docs/sourceTree.md`.

---

## 1. Principles

1. **Organize by rate of change.** Pure math changes rarely; game state changes when systems are added; rendering changes with art direction; the DOM changes most often. The directory tree reflects that reality.
2. **Unidirectional data flow.** Imports flow downward through the layers; events and callbacks flow upward. `runtime/` is the only exception — it is the bridge.
3. **Pure core, impure shell.** Inner layers are pure functions with zero side effects. Every side effect (DOM, canvas, state mutation) lives at the outer edges, so the core stays testable without a browser.
4. **One responsibility per file.** A file has exactly one reason to change. If it exports both a DOM builder and a game-logic function, split it.
5. **Clarity over brevity.** `combatMath.js` beats `combat.js`. A name that feels too long usually means the module's scope is too broad.
6. **Replaceability.** Swap the renderer — only `render/` changes. Redesign the UI — only `ui/` changes. Reuse the engine for a new game — copy `engine/` (plus whatever slices of `game/` you want). If a change in one layer forces changes in an unrelated layer, the boundary is wrong.
7. **No circular dependencies** anywhere except inside `runtime/` (and the `game/state/liveGame.js` singleton it anchors). A cycle anywhere else signals a boundary violation.

---

## 2. Layer Overview

```
src/
  entrypoint.js   Composition-root entry. Imports bootstrap for side effects only.
  devtools/       Dev tools panel (cheats, perf, bot control). Not part of game UI.
  engine/         Reusable-across-games code. Zero knowledge of factions, lore, UI.
  game/           This game's rules and state. No DOM, no Three.js, no wiring.
  runtime/        Composition root. The ONLY layer that may import multiple layers.
  render/         Pixels: Three.js scene, Canvas2D overlays, minimap. Reads state, never mutates.
  ui/             DOM: panels, modals, widgets, view-models. Never mutates game state.
  shared/         Leaf infrastructure imported by any layer; imports nothing project-local (except params/ pure constants).
  params/         Pure parameter/data constants (rate of change). Imports nothing project-local.
  vendor/         Third-party builds (Three.js). Exempt from naming rules. Do not edit.
```

### Dependency rules

| Importer      | May import |
|---------------|------------|
| `shared/`     | nothing project-local except `params/` (pure constants) |
| `params/`     | nothing project-local |
| `engine/`     | `shared/`, `engine/` |
| `game/rules/` | `shared/`, `engine/`, `game/rules/` |
| `game/state/` | `shared/`, `engine/`, `game/rules/`, `game/state/` |
| `render/`     | `shared/`, `engine/`; game state via function arguments or the read-only queries in `TOLERATED_STATE_READS` |
| `ui/`         | `shared/`, `ui/`; game data only via view-models or arguments |
| `runtime/`    | everything — cross-layer wiring is its purpose |

Forbidden: `engine -> game/runtime/render/ui`; `game -> runtime/render/ui`;
`render -> game/runtime/ui`; `ui -> game/runtime/render`; `shared -> anything local`.

---

## 3. Source Tree

The authoritative **file-by-file inventory** of `src/` — every file with a
one-line purpose, grouped by layer — lives in `dev/docs/sourceTree.md`. Treat it
as a living registry: it can drift, so keep it roughly current, and consider the
on-disk tree and `check_imports.py` the source of truth.

The standalone dev tools each carry their own reference and file inventory next
to their code (they are not part of the game's layer architecture):

- `dev/tools/analysis/README.md` — map generation analysis tool
- `dev/tools/geometryEditor/README.md` — object geometry editor

---

## 4. Interaction Pattern (target state)

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

No step is skippable in new code. The UI never calls `game/state/` directly; render never imports `game/state/`. All coordination goes through `runtime/`.

Save/load follows this shape exactly: the pure serialization lives in
`game/state/persistence/saveDocument.js` (`serializeGame`/`deserializeGame`),
while `runtime/gameSaveSlot.js` owns the localStorage adapter and
`runtime/saveLoadActions.js` registers the action-bus handlers the Options
modal and setup screen dispatch.

**Honest status:** the current codebase does not fully comply — see §6 Boundary Debt. New code must follow the pipeline; existing violations are paid down over time.

---

## 5. Decision Guide — Where Does New Code Go?

```
1. Pure function, no side effects?
   ├─ Yes -> reusable in any game? ─┬─ Yes -> engine/rules/
   │                                └─ No  -> game/rules/
   └─ No ->
2. Mutable game state, or reads/writes it?        -> game/state/
3. Wires two or more layers together?             -> runtime/
4. Draws to canvas or WebGL?                      -> render/
5. Touches the DOM or handles user input?         -> ui/
6. Generic infrastructure, imports nothing local? -> shared/
   (e.g. actionBus.js, clockScheduler.js)
7. None of the above? The code is probably doing two jobs — split it.
```

---

## 6. Boundary Debt

Pre-existing cross-layer imports from before the layer migration are tracked by
`python3 dev/scripts/check_imports.py`. Do not add new violations. Two tolerances are
documented (encoded in the checker):

- **`READONLY_RULES_DATA`** — static data reads from `game/rules/` (faction
  colors, terrain constants, archetypes). Passing them through `runtime/` would
  add ceremony without architectural benefit.
- **`TOLERATED_STATE_READS`** — pure read-only state queries consumed by `ui/`
  view-models/tooltips and `render/` overlays (`occupiedByMob`/
  `occupiedByChampion`/`occupiedByTrader`, `getHumanView`, `dailyActionPoints`,
  `currentChamp`, `sideOf`, `entityFor`).
  Symbol-scoped: ui/render may
  import only those exact names; importing mutators from the same modules still
  fails the boundary check. Long-term direction remains view-model/snapshot
  threading, paid down opportunistically when touching affected files.

The dev-tools-in-production couplings (formerly 11 entries — `render → dev` and
`game → dev` importing `src/devtools/performance/index.js` for `startMeasure`/
`endMeasure`) were resolved by relocating the timing core to
`src/shared/measurements.js` (a layer-neutral API). The dev-specific capture,
overlay, and reporting machinery stays in `src/devtools/performance/`.

The current report shows **1 known-debt import** — `src/ui/mapTooltip.js → src/game/rules/terrainOverrides.js` (a static rules-data read for tooltips, currently not covered by `READONLY_RULES_DATA`). Running `python3 dev/scripts/check_imports.py` is authoritative for the live count.

---

## 7. Tooling

- `python3 dev/scripts/check_imports.py` — verifies every relative import in `src/` resolves, and prints a boundary report of cross-layer imports vs the §2 dependency table.
- `dev/tests/run.sh` (or `node --test` from the repo root) — unit-test suite covering the pure layers (`src/engine/`, `src/game/` rules/state/combat, `src/render/` incl. descriptor round-trip) plus the geometry-editor part-tree tests (`dev/tests/geometryEditor/`). Zero dependencies; uses Node's built-in `node:test` runner. `dev/tests/` lives outside `src/` so it doesn't affect the boundary report.
- There is no build step; `engine/rules/` and `game/rules/` must stay importable in plain Node (`node --check` clean, no DOM/Three imports).
- The standalone tools — `dev/tools/analysis/` and `dev/tools/geometryEditor/` — document their own run/usage and import-check scripts (`check_analysis_imports.py`, `check_geometry_editor_imports.py`) in their respective READMEs (§3). Those tools are exempt from the `src/` layer-boundary rules.

---

## 8. Cross-References (suburb docs)

| Document | Covers |
|----------|--------|
| `dev/docs/sourceTree.md` | Full `src/` file inventory (per-file purpose, grouped by layer) |
| `dev/docs/namingConventions.md` | File naming, banned words, code identifier conventions |
| `dev/docs/cssConventions.md` | CSS structure, naming, spacing scale, barrel pattern |
| `dev/docs/aestheticConventions.md` | Visual design system (aspirational, evolving) |
| `dev/docs/descriptorAuthoring.md` | Descriptor data authoring: schema, randomization, rendering, worked examples |
| `dev/docs/mobGeometryAndAnimation.md` | Mob geometry & animation design notes (joint groups, FK chains, runtime proposal) |
| `dev/docs/clockScheduler.md` | Clock API reference — all timer/scheduling patterns |
| `dev/docs/gameMechanics.md` | Combat round flow, turn order, biome system |
| `dev/docs/movementAndOccupation.md` | Movement & AP conventions: terrain costs, occupancy rules, movement identities, pathing |
| `dev/docs/featureDesign.md` | Feature design: placement, rewards, tiering |
| `dev/docs/commonTasks.md` | How-to recipes for common changes |
| `dev/docs/futureWork.md` | Future-work tracker (features to be implemented only) |
| `dev/docs/terrainGenNotes.md` | Terrain-gen design notes (noise, calibration, classification) |
| `dev/tools/analysis/README.md` | Map-gen analysis tool reference (standalone page) |
| `dev/tools/geometryEditor/README.md` | Object geometry editor reference (standalone tool) |