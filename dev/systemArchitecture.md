# System Architecture Reference

This is the **single authoritative reference** for the CotSI source tree — every file, every layer, and how they connect. New devs and agents should start here.

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
  dev/            Dev tools panel (cheats, perf, bot control). Not part of game UI.
  engine/         Reusable-across-games code. Zero knowledge of factions, lore, UI.
  game/           This game's rules and state. No DOM, no Three.js, no wiring.
  runtime/        Composition root. The ONLY layer that may import multiple layers.
  render/         Pixels: Three.js scene, Canvas2D overlays, minimap. Reads state, never mutates.
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

Forbidden: `engine -> game/runtime/render/ui`; `game -> runtime/render/ui`;
`render -> game/runtime/ui`; `ui -> game/runtime/render`; `shared -> anything local`.

---

## 3. Complete File Tree

Every file listed below has a one-line purpose statement. Organized by layer/directory.

### `src/engine/rules/` — Pure reusable mechanics (no game knowledge)

| File | Purpose |
|------|---------|
| `chunkGrid.js` | Chunk coordinate math (CHUNK_SIZE=24) for spatial partitioning |
| `hexGrid.js` | Hex math: neighbors, distance, coordinates, ring queries, cubeRound |
| `pathfinding.js` | A\* pathfinding on hex grid |
| `seededRng.js` | Deterministic PRNG with seed |
| `shuffle.js` | Fisher-Yates shuffle |

> **⚠️ Hex Axial Coordinate Convention — (q, r) is NOT Cartesian.** The axial q and r axes are 60° apart, not orthogonal. This is a frequent source of bugs:
> - Never use `Math.cos`/`Math.sin`/`Math.atan2` directly on q/r to produce or modify hex coordinates — use `cubeRound()` or world-space roundtrip instead.
> - Never compute movement steps by applying Cartesian deltas (dx, dy) to q/r — use `neighbors()` to get valid axial directions.
> - Always use `distance()` for hex-distance checks — never Euclidean formulas on q/r.
> - To generate hex coordinates from polar (angle, radius): convert to world space first, invert through the `hexCenter()` projection to get fractional axial, then apply `cubeRound()`.
> - `cubeRound()` is in this module; `neighbors()` and `distance()` are also here.

### `src/game/rules/` — Pure game-specific logic

| File | Purpose |
|------|---------|
| `archetypes.js` | Archetype registry with inheritance (biomes, features, mobs) |
| `archetypeData/biomes.js` | Biome archetype definitions |
| `archetypeData/features.js` | Feature archetype definitions |
| `archetypeData/mobs.js` | Mob creature definitions |
| `archetypeData/index.js` | Barrel: triggers all archetype registrations |
| `dispatchReport.js` | Pure function to build dispatch-event report strings |
| `factionData.js` | Faction definitions: colors, names, starting stats |
| `logGrammar.js` | Grammar/template helpers for structured game-log messages |
| `logHelpers.js` | Utility functions for log message formatting |
| `paleyScoring.js` | Paley tournament score calculation (7-node tournament) |
| `terrainGeneration.js` | Terrain generation pipeline (noise → tile types) |
| `terrainGenerator.js` | Terrain generation orchestration (calls rules) |
| `terrainTypes.js` | Terrain type constants and terrain-tag helpers |
| `tileQueries.js` | Tile-lookup helpers (elevation, moisture, terrain type) |
| `traderStock.js` | Trader stock generation logic |
| `weatherScript.js` | Weather generation/scripting |

### `src/game/state/` — Mutable state, queries, and mutations

| File | Purpose |
|------|---------|
| `arrivalInteractions.js` | Logic triggered when a champion arrives at a hex |
| `artifactDraft.js` | Artifact-reward drafting system |
| `baseInteraction.js` | Base interaction handling at hex destinations |
| `basePlacer.js` | Places champions / entities at game start |
| `championAI.js` | Bot AI decision-making for champions |
| `championFactory.js` | Champion creation factory |
| `championMovement.js` | Champion movement mutations (move, expenditure) |
| `combat/combatAutoResolve.js` | Auto-resolve combat between two bots |
| `combat/combatBotAI.js` | Bot colour-picking AI during combat |
| `combat/combatDamage.js` | Combat damage calculation and application |
| `combat/combatPicks.js` | Combat colour-pick logic and validation |
| `combat/combatScoring.js` | Combat round scoring from colour picks |
| `combat/combatState.js` | Combat state creation and management |
| `combat/index.js` | Barrel: re-exports combat subsystems |
| `deathTracker.js` | Tracks entity deaths and triggers death handling |
| `digSystem.js` | Digging/dowsing for relics and findings |
| `dispatchLedger.js` | Records of all dispatch events |
| `entityFactory.js` | Generic entity creation (non-champion) |
| `entityQueries.js` | Entity lookup queries (by hex, by faction, by type) |
| `factionAbilities.js` | Faction-ability logic and activation |
| `fogOfWar.js` | Fog-of-war state and visibility queries |
| `gameFactory.js` | Full game-state factory (initializes a new game) |
| `gameLog.js` | Game event log: append and query |
| `initialGameState.js` | Default/initial values for game state fields |
| `liveGame.js` | The singleton `G` object — live mutable game state |
| `spatialIndex.js` | Spatial hash for fast entity-location queries |
| `spawnPosition.js` | Determines valid spawn positions on the map |
| `tileAccess.js` | Tile read/write access helpers |
| `turnActions.js` | Per-turn action processing (movement, interaction) |
| `victoryChecks.js` | Win-condition evaluation |
| `worldSimulation.js` | World-day simulation (weather, economy, spawns) |

### `src/runtime/` — Cross-layer orchestration (composition root)

| File | Purpose |
|------|---------|
| `beginGame.js` | Game-start orchestration: state init, render init, UI init |
| `bootstrap.js` | App bootstrap: loads modules, starts the clock |
| `botTurnRunner.js` | Runs bot turns: AI decision → state mutation → refresh |
| `deathAnnouncement.js` | Death-event coordination: state, render, UI |
| `dispatchPrompt.js` | Dispatch-event prompt orchestration (modal + reward) |
| `endTurn.js` | End-turn orchestration: cleanup, next-champ, refresh |
| `heraldPrompt.js` | Herald-prompt orchestration (narrative modal) |
| `hexBridge.js` | Hex-click bridge: picking event -> game mutation -> refresh |
| `initMap3d.js` | 3D-map initialisation orchestration |
| `mapCamera.js` | Camera-control orchestration bridging input and render |
| `mapControlActions.js` | Action-registrations that span layers (teleport, zoom) |
| `mapRefresh.js` | Map-refresh orchestration: state -> render overlays + 3D |
| `refreshAll.js` | Full refresh: renders, overlays, UI, minimap |
| `rewardPrompt.js` | Reward-prompt orchestration (modal flow) |
| `turnPipeline.js` | Turn sequencing and state machine |
| `zoomDisplay.js` | Zoom-level display update bridging state and UI |

### `src/render/` — Pixels: Three.js scene, Canvas2D overlays, minimap

#### `src/render/hexmap3d/` — Three.js 3D hex map

| File | Purpose |
|------|---------|
| `chunkManager.js` | Chunked hex-mesh loading/unloading by camera position |
| `hexMapRenderer.js` | Top-level 3D renderer: scene, update, dispose |
| `hexWorldSpace.js` | Hex coordinate -> world-space position conversion |
| `sceneContext.js` | Scene, camera, renderer creation and access |
| `scene/cameraCentering.js` | Camera centering/animation on a target hex |
| `scene/cameraPanMath.js` | Camera pan math (delta, bounds) |
| `scene/cameraState.js` | Camera state: position, target, zoom level |
| `scene/cameraZoomMath.js` | Camera zoom math (levels, smoothing) |
| `scene/lightSetup.js` | Scene lighting (ambient, directional) |
| `scene/materials.js` | Shared Three.js materials and material factory |
| `scene/panAnimation.js` | Camera pan animation (smooth transitions) |
| `scene/rendererSetup.js` | WebGL renderer setup and configuration |
| `scene/sceneSetup.js` | Scene initialisation + registers render callback on clock |
| `features/baseMeshes.js` | Base-terrain hex meshes (plains, forest, etc.) |
| `features/debrisMeshes.js` | Debris/decorative meshes (shrubs, rocks) |
| `features/featureGeometries.js` | Feature-geometry registry |
| `features/featureMeshes.js` | Feature mesh creation and placement |
| `features/knotMeshes.js` | Knot (resource node) meshes |
| `features/mountainMeshes.js` | Mountain cluster meshes |
| `features/treeMeshes.js` | Tree meshes (variants, LOD) |
| `features/geometries/baseGeometries.js` | Base-terrain geometry constants and factories |
| `features/geometries/debrisGeometries.js` | Debris geometry shapes |
| `features/geometries/index.js` | Barrel for feature geometries |
| `features/geometries/knotGeometries.js` | Knot geometry shapes |
| `features/geometries/mountainGeometries.js` | Mountain geometry shapes |
| `features/geometries/treeGeometries.js` | Tree geometry shapes |
| `interaction/cameraPan.js` | Camera pan input handler (mouse drag) |
| `interaction/cameraZoom.js` | Camera zoom input handler (scroll wheel) |
| `interaction/hexClick.js` | Hex click detection and dispatch |
| `interaction/hexHover.js` | Hex hover detection and highlight |
| `interaction/hexPicking.js` | Raycaster-based hex picking |
| `interaction/hoverTooltip.js` | Hover tooltip display (coords, info) |
| `interaction/mapInteraction.js` | Top-level map interaction coordinator |
| `interaction/panMath.js` | Camera pan boundary math |
| `interaction/touchInput.js` | Touch input handler (mobile/tablet) |
| `terrain/terrainMesh.js` | Procedural terrain mesh (vertex colours) |
| `units/index.js` | Barrel for unit rendering |
| `units/movementAnimator.js` | Unit movement animation (tween along path) |
| `units/movementCurves.js` | Movement animation curves (easing) |
| `units/pieceIcons.js` | Champion/mob icon rendering (sprites) |
| `units/unitAnimations.js` | Unit animation state machine (idle, move, attack) |
| `units/unitGeometries.js` | Unit geometry shapes |
| `units/unitMeshes.js` | Unit mesh creation and management |

#### `src/render/overlays/` — Canvas2D overlays

| File | Purpose |
|------|---------|
| `derivedState.js` | Derives overlay state from game state (snapshots) |
| `fogBlur.js` | Fog-of-war blur effect on overlay canvas |
| `fogCameraTracker.js` | Tracks camera position for fog culling |
| `fogDrawing.js` | Fog canvas drawing routines |
| `fogHexGeometry.js` | Hex geometry for fog mask (Canvas2D path) |
| `fogMaskCache.js` | Fog mask fragment cache for reuse |
| `fogMaskGenerator.js` | Generates fog mask textures from visibility state |
| `fogOverlay.js` | Fog overlay coordinator (generation + drawing) |
| `fogProjection.js` | Projects hex coordinates onto fog canvas |
| `graphicsSettings.js` | Graphics quality settings registry |
| `interactionHighlights.js` | Hover/selection highlight overlays |
| `movementHighlights.js` | Movement-range highlight overlays |
| `overlayCanvas.js` | Overlay canvas creation and lifecycle |
| `overlayRegistry.js` | Overlay-layer registry (z-order, visibility) |
| `overlayStack.js` | Overlay stack: layering, composition, redraw |
| `screenProjection.js` | World-space -> screen-space projection |
| `selectionRing.js` | Active-unit selection ring overlay |

#### `src/render/minimap/` — 2D minimap

| File | Purpose |
|------|---------|
| `minimap.js` | Minimap top-level coordinator |
| `minimapClickHandler.js` | Minimap click -> camera target navigation |
| `minimapDom.js` | Minimap DOM element creation and layout |
| `minimapOverlayLayer.js` | Minimap overlay layer (fog, highlights) |
| `minimapTerrainLayer.js` | Minimap terrain colour layer |

#### `src/render/` — Top-level render helpers

| File | Purpose |
|------|---------|
| `shadowLightConfig.js` | Shadow-map light configuration |

### `src/ui/` — DOM: panels, modals, widgets, view-models

#### `src/ui/panels/` — Side panels and HUD elements

| File | Purpose |
|------|---------|
| `botIndicator.js` | Bot-control indicator in HUD |
| `headerDetailCard.js` | Header champion detail card |
| `headerEvents.js` | Header event display (notifications) |
| `headerPanel.js` | Top header panel (champion info, turn, gold) |
| `headerStates.js` | Header state management |
| `leftPanel.js` | Left sidebar panel |
| `logPanel.js` | Game-log scrollable panel |
| `mainLog.js` | Main game-log entry display |
| `rightPanel.js` | Right sidebar panel |

#### `src/ui/modals/` — Modal dialogs

| File | Purpose |
|------|---------|
| `confirmModal.js` | Generic confirmation modal |
| `deathModal.js` | Champion death announcement modal |
| `dispatchModal.js` | Dispatch-event selection modal |
| `heraldModal.js` | Herald narrative event modal |
| `modalShell.js` | Modal base shell (open, close, animate) |
| `rewardModal.js` | Reward/artifact selection modal |

#### `src/ui/combat/` — Combat UI

| File | Purpose |
|------|---------|
| `combatFlow.js` | Combat UI flow coordinator |
| `combatFx.js` | Combat visual effects (screen shake, flash) |
| `combatInteractions.js` | Combat colour-pick user interactions |
| `combatLifecycle.js` | Combat modal lifecycle (enter, exit) |
| `combatModal.js` | Combat modal DOM structure |
| `combatRenderer.js` | Combat modal render/update |
| `combatReveal.js` | Combat colour-reveal animation |
| `combatRewardUI.js` | Combat reward display |
| `combatRoundEnd.js` | Combat round-end summary display |
| `combatUiState.js` | Combat UI state (selections, phase) |

#### `src/ui/viewModels/` — Derived UI data transforms

| File | Purpose |
|------|---------|
| `championViewModel.js` | Derives champion display data from game state |
| `combatViewModel.js` | Derives combat display data from combat state |

#### `src/ui/` — Top-level UI files

| File | Purpose |
|------|---------|
| `domBuilder.js` | `h()` — virtual-DOM-like element builder |
| `heptagramWidget.js` | Heptagram SVG widget component |
| `hud.js` | HUD shell creation and coordination |
| `iconPaths.js` | SVG icon path definitions |
| `mapTooltip.js` | Map hex tooltip popup |
| `paleySVG.js` | Paley tournament SVG rendering |
| `setupActions.js` | Setup-screen action registrations |
| `setupConstants.js` | Setup-screen constants and defaults |
| `setupHeptagram.js` | Setup-screen heptagram display |
| `setupScreen.js` | New-game setup screen |
| `svgIcon.js` | SVG icon component factory |
| `templates/templateLoader.js` | HTML template loading/caching |
| `weatherDisplay.js` | Weather icon and label display |

### `src/shared/` — Layer-neutral infrastructure (imports nothing project-local)

| File | Purpose |
|------|---------|
| `actionBus.js` | `[data-action]` dispatcher with keyboard shortcuts and modal-action helpers |
| `clockScheduler.js` | Centralized Clock with pause/resume, per-group speed control, master rAF loop |
| `speedGroup.js` | Speed-group definitions and speed multipliers |
| `timerQueue.js` | Priority-queue timer management for the clock scheduler |

### `src/vendor/` — Third-party builds (do not edit)

| File | Purpose |
|------|---------|
| `three.module.js` | Three.js full module build |
| `three.core.js` | Three.js core-only build |
| `three.webgpu.js` | Three.js WebGPU adapter |
| `three.webgpu.nodes.js` | Three.js WebGPU TSL nodes |
| `three.tsl.js` | Three.js TSL shading language |

### `src/dev/` — Developer tools (not part of game UI)

#### `src/dev/panel/` — Dev tools panel shell

| File | Purpose |
|------|---------|
| `init.js` | Dev panel initialisation |
| `keyboard.js` | Dev panel keyboard shortcuts |
| `perfUI.js` | Dev panel performance-tab UI |
| `tabs.js` | Dev panel tab management |
| `template.js` | Dev panel HTML template |
| `teleport.js` | Dev teleport-mode UI and state |

#### `src/dev/cheats/` — Cheat actions

| File | Purpose |
|------|---------|
| `combat.js` | Cheat: trigger combat, resolve instantly |
| `index.js` | Barrel for cheat registrations |
| `map.js` | Cheat: reveal map, toggle fog |
| `movement.js` | Cheat: fill moves, teleport |
| `resources.js` | Cheat: +gold, +HP, +relics, +knots, +potency |
| `state.js` | Cheat state: what's enabled |

#### `src/dev/botControl/` — Bot control UI

| File | Purpose |
|------|---------|
| `autoPlay.js` | Auto-advance mode: run all bots sequentially |
| `championList.js` | Champion-list UI for bot/human toggles |
| `index.js` | Barrel for bot-control registrations |
| `state.js` | Bot-control state: per-champion mode, step mode |
| `stepMode.js` | Step-through mode: one action at a time |

#### `src/dev/actionWiring/` — Dev action bindings

| File | Purpose |
|------|---------|
| `bot.js` | Dev action wiring for bot-control actions |
| `cheats.js` | Dev action wiring for cheat actions |
| `index.js` | Barrel for dev action wiring |
| `performance.js` | Dev action wiring for performance-tab actions |

#### `src/dev/performance/` — Performance profiling

| File | Purpose |
|------|---------|
| `captureLogger.js` | Frame-time data capture and logging |
| `frameProfiler.js` | Per-frame profiler: measure, store, report |
| `frameTracker.js` | Frame timing tracker (FPS, frame times) |
| `gameContext.js` | Game context snapshot for performance reports |
| `index.js` | Barrel for performance exports |
| `measurements.js` | Named measurement definitions and enable/disable |
| `overlay.js` | Performance overlay display on the game canvas |
| `reportBuilder.js` | Performance report text builder |
| `snapshot.js` | Performance snapshot (point-in-time metrics) |
| `stats.js` | Performance statistics (min, max, avg, percentiles) |

#### `src/dev/` — Top-level dev files

| File | Purpose |
|------|---------|
| `devActionWiring.js` | Top-level dev action wiring coordinator |
| `devBotControl.js` | Dev bot-control panel top-level |
| `devCheats.js` | Dev cheats panel top-level |
| `devPerformance.js` | Dev performance panel top-level |
| `devTools.js` | Dev tools panel shell with three tabs |

### `src/` — Root

| File | Purpose |
|------|---------|
| `entrypoint.js` | App entry point — imports bootstrap for side effects only |

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

Some pre-existing cross-layer imports remain from before the layer migration. They are tracked by `python3 dev/check_imports.py`. Do not add new violations; fix existing ones via view-models/snapshots when touching affected files. Static-data reads from `game/rules/` (faction colors, terrain constants) are tolerated — passing them through `runtime/` would add ceremony without architectural benefit.

---

## 7. Tooling

- `python3 dev/check_imports.py` — verifies every relative import in `src/` resolves, and prints a boundary report of cross-layer imports vs the §2 dependency table.
- There is no build step and no test runner; `engine/rules/` and `game/rules/` must stay importable in plain Node (`node --check` clean, no DOM/Three imports).

---

## 8. Cross-References (suburb docs)

| Document | Covers |
|----------|--------|
| `dev/namingConventions.md` | File naming, banned words, code identifier conventions |
| `dev/cssConventions.md` | CSS structure, naming, spacing scale, barrel pattern |
| `dev/aestheticConventions.md` | Visual design system (aspirational, evolving) |
| `dev/clockScheduler.md` | Clock API reference — all timer/scheduling patterns |
| `dev/gameMechanics.md` | Combat round flow, turn order, biome system |
| `dev/commonTasks.md` | How-to recipes for common changes |
| `dev/largeMapRoadmap.md` | Future map-size and performance roadmap |
