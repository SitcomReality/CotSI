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
  params/         Pure parameter/data constants (rate of change). Imports nothing project-local.
  vendor/         Third-party builds (Three.js). Exempt from naming rules. Do not edit.
```

### Dependency rules

| Importer      | May import |
|---------------|------------|
| `shared/`     | nothing project-local |
| `params/`     | nothing project-local |
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
| `binaryHeap.js` | Min-binary-heap priority queue (Dijkstra in connectivityEnforcement) |
| `chunkGrid.js` | Chunk coordinate math (CHUNK_SIZE=24) for spatial partitioning |
| `hexGrid.js` | Hex math: neighbors, distance, coordinates, ring queries, cubeRound |
| `noise.js` | Seeded simplex noise (2D) + FBM for terrain fields |
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
| `archetypeData/biomes/` | Directory: per-biome archetype definitions (11 files + barrel) |
| `archetypeData/features.js` | Feature archetype definitions |
| `archetypeData/mobs.js` | Mob creature definitions |
| `archetypeData/index.js` | Barrel: triggers all archetype registrations |
| `dispatchReport.js` | Pure function to build dispatch-event report strings |
| `factionData.js` | Faction definitions: colors, names, starting stats |
| `logGrammar.js` | Grammar/template helpers for structured game-log messages |
| `logHelpers.js` | Utility functions for log message formatting |
| `paleyScoring.js` | Paley tournament score calculation (7-node tournament) |
| `terrainTypes.js` | Terrain type constants and default features |
| `terrainGen/` | Terrain generation pipeline (20 files — see below) |
| `tileQueries.js` | Spawn-placement helpers (nearestOpenKey, nearestOpenMultiRing) |
| `traderStock.js` | Trader stock generation logic |
| `weatherScript.js` | Weather generation/scripting |

#### `src/game/rules/terrainGen/` — Terrain generation subsystem

| File | Purpose |
|------|---------|
| `index.js` | Barrel: re-exports all terrainGen sub-modules |
| `chunkGeneration.js` | Chunk-level tile generation orchestration |
| `flatGeneration.js` | Flat (non-chunked) tile generation |
| `classification/biomeSelection.js` | Biome selection from climate fields |
| `classification/moistureAdjustment.js` | Moisture adjustment (rain shadows) |
| `classification/provisionalWater.js` | Provisional water detection |
| `classification/terrainClassification.js` | Terrain type classification from fields |
| `features/featureDensity.js` | Feature density/noise calculations |
| `features/featureSpawning.js` | Spawn logic for features |
| `fields/sampleBaseFields.js` | Noise field sampling (elevation, moisture, temp) |
| `fields/slopeComputation.js` | Slope calculation from elevation |
| `fields/worldShape.js` | World shape falloff function |
| `placement/epicenterPlacement.js` | Supernatural biome epicenter placement |
| `postProcess/connectivityEnforcement.js` | Ensures passable-tile connectivity via Dijkstra |
| `postProcess/spawnClearance.js` | Clears spawn-point tiles |
| `rivers/riverMoisture.js` | Applies moisture boost from rivers |
| `rivers/riverSources.js` | Selects river source points |
| `rivers/riverTrace.js` | River tracing algorithm |
| `tagging/mountainTagging.js` | Mountain type tagging |
| `tagging/waterTagging.js` | Water type tagging |

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
| `combat/combatDamage.js` | Combat round damage resolution |
| `combat/combatFlee.js` | Flee-from-combat resolution (survive at 1 HP) |
| `combat/combatFinalize.js` | Final combat resolution and loot distribution |
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
| `mobHarassment.js` | Mob harassment and wandering AI (world turn) |
| `spatialIndex.js` | Spatial hash for fast entity-location queries |
| `spawnPosition.js` | Determines valid spawn positions on the map |
| `tileAccess.js` | Chunk-aware tile CRUD accessors (get/set/delete) |
| `tileIteration.js` | Tile iteration helpers (allTileKeys, forEachTile, tileCount) |
| `chunkDirtyTracking.js` | Dirty-chunk flag management for render culling |
| `tileProxy.js` | Backward-compatible `state.tiles` Proxy over chunk storage |
| `traderMovement.js` | Trader pathfinding and movement (world turn) |
| `turnActions.js` | Per-turn action processing (movement, interaction) |
| `victoryChecks.js` | Win-condition evaluation |
| `worldSimulation.js` | World-day turn advancement and bookkeeping |

### `src/runtime/` — Cross-layer orchestration (composition root)

| File | Purpose |
|------|---------|
| `beginGame.js` | Game-start orchestration: state init, render init, UI init |
| `bootstrap.js` | App bootstrap: loads modules, starts the clock |
| `botTurnRunner.js` | Runs bot turns: AI decision → state mutation → refresh |
| `combat/combatActions.js` | Combat init + actionBus handlers (pick, flee) |
| `combat/combatFlow.js` | Async combat sequencer (round driving) |
| `combat/combatLifecycle.js` | Combat start/close + attacker turn-end hook |
| `combat/combatRoundEnd.js` | Round resolution → FX orchestration |
| `combat/combatState.js` | Active-combat holder + combat clock wait |
| `combat/index.js` | Barrel: combat public API |
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
| `features/baseMeshes.js` | Faction base meshes (tower + faction decoration) |
| `features/debrisMeshes.js` | Environmental debris meshes (tufts, rocks, flowers) |
| `features/featureGeometries.js` | Feature-geometry barrel |
| `features/featureMeshes.js` | Feature mesh barrel: dedicated builders + simpleFeatureMeshes |
| `features/featureVisuals.js` | Visual registry: kind → geometry, material, scale |
| `features/knotMeshes.js` | Knot (resource node) meshes |
| `features/meshBuilder.js` | Shared InstancedMesh iteration + build utilities (per-instance scale/lean/color + tree-frame placement/orientation) |
| `features/mountainMeshes.js` | Mountain cluster meshes |
| `features/simpleFeatureMeshes.js` | Generic builder for features registered in FEATURE_VISUALS |
| `features/trees/buildTreeMeshes.js` | Tree collection + InstancedMesh assembly; public entry points |
| `features/trees/clusterTreeRecords.js` | Cluster (woods/forest) grove record generation |
| `features/trees/fruitTreeRecords.js` | Fruit-tree record generation (segmented trunk, branches, canopy, apple) |
| `features/trees/index.js` | Tree module barrel (re-exports buildTreeMeshes, buildChunkTreeMeshes) |
| `features/trees/solitaryTreeRecords.js` | Solitary landmark tree record generation |
| `features/trees/treeHash.js` | Deterministic per-tile / per-tree hashing |
| `features/trees/treeParts.js` | Shared tree-part record + color helpers |
| `features/trees/treeRecordsForTile.js` | Per-tile tree treatment dispatcher |
| `features/trees/treeVariants.js` | Canopy variant selection + per-variant geometry |
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
| `terrain/buildTerrainMesh.js` | Procedural terrain mesh geometry (vertex colours) |
| `terrain/cornerBlend.js` | Top-face corner color blending (soft biome transitions) |
| `terrain/index.js` | Terrain module barrel (meshes + ground-level API) |
| `terrain/tileColor.js` | Top-face color resolution (biome palette, lake/river) |
| `terrain/tileHeight.js` | Ground-level math (tileSurfaceY, tileTopY, ELEVATION) |
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
| `artifactChoiceModal.js` | Artifact draft choice selection UI |
| `confirmModal.js` | Generic confirmation modal |
| `deathModal.js` | Champion death announcement modal |
| `dispatchModal.js` | Dispatch-event selection modal |
| `heraldModal.js` | Herald narrative event modal |
| `modalShell.js` | Modal base shell (open, close, animate) |
| `rewardModal.js` | Generic reward display modal |

#### `src/ui/combat/` — Combat view (render + FX; sequencer lives in `runtime/combat/`)

| File | Purpose |
|------|---------|
| `combatFx.js` | Combat visual effects (screen shake, flash) |
| `combatRenderer.js` | Combat modal render/update (takes combat as arg) |
| `combatReveal.js` | Combat colour-reveal animation (takes combat as arg) |
| `combatRewardUI.js` | Combat reward display |

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
| `templates/combatModal.inc` | Combat modal HTML template |
| `templates/confirmModal.inc` | Confirm modal HTML template |
| `templates/deathModal.inc` | Death announcement modal template |
| `templates/devTools.inc` | Dev tools panel template |
| `templates/dispatchModal.inc` | Dispatch-event modal template |
| `templates/gameLayout.inc` | Game page layout template |
| `templates/heraldModal.inc` | Herald narrative modal template |
| `templates/loadingScreen.inc` | Loading screen template |
| `templates/rewardModal.inc` | Reward modal template |
| `templates/setupScreen.inc` | New-game setup screen template |
| `templates/templateLoader.js` | HTML template loading/caching |
| `templates/toast.inc` | Toast notification template |
| `templates/victoryModal.inc` | Victory modal template |
| `weatherDisplay.js` | Weather icon and label display |

### `src/shared/` — Layer-neutral infrastructure (imports nothing project-local)

| File | Purpose |
|------|---------|
| `actionBus.js` | `[data-action]` dispatcher with keyboard shortcuts and modal-action helpers |
| `clockScheduler.js` | Centralized Clock with pause/resume, per-group speed control, master rAF loop |
| `speedGroup.js` | Speed-group definitions and speed multipliers |
| `timerQueue.js` | Priority-queue timer management for the clock scheduler |

### `src/params/` — Pure parameter/data constants (imports nothing project-local)

| File | Purpose |
|------|---------|
| `dev/cheatParams.js` | Default amounts for dev cheat actions |
| `dev/performanceParams.js` | Performance profiling thresholds and frame-rate targets |
| `engine/chunkParams.js` | Chunk sizing for hex-grid spatial partitioning |
| `game/aiParams.js` | Bot AI decision thresholds, weights, and probabilities |
| `game/championParams.js` | Champion starting stats and base values |
| `game/combatParams.js` | Combat scoring, damage, loot, and auto-resolve parameters |
| `game/economyParams.js` | Gold costs, heal amounts, dig values, and artifact economy |
| `game/factionParams.js` | Faction counts, potency defaults, and ability parameters |
| `game/spawnParams.js` | Spawn position and entity-count parameters |
| `game/worldParams.js` | World simulation, days, and shared game-world constants |
| `render/animationParams.js` | Movement animation durations, curve parameters, champion Y offsets |
| `render/cameraParams.js` | Camera frustum, zoom, pan, and centering parameters |
| `render/geometryParams.js` | 3D geometry dimensions for features and units |
| `render/minimapParams.js` | Minimap canvas sizing, dot sizes, and layout constants |
| `render/overlayParams.js` | Fog overlay, interaction highlights, and selection-ring parameters |
| `render/terrainParams.js` | Terrain elevation, color values, and shared world-space constants |
| `ui/combatUiParams.js` | Combat modal animation timings, icon sizes, and UI constants |
| `ui/setupParams.js` | Setup-screen default values and slider ranges |
| `ui/uiParams.js` | Panel dimensions, icon sizes, and UI animation timings |

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

Some pre-existing cross-layer imports remain from before the layer migration. They are tracked by `python3 dev/check_imports.py`. Do not add new violations; fix existing ones via view-models/snapshots when touching affected files. Static-data reads from `game/rules/` (faction colors, terrain constants) are tolerated — passing them through `runtime/` would add ceremony without architectural benefit. The checker encodes this tolerance as an explicit allowlist (`READONLY_RULES_DATA` in `check_imports.py`), so only the remaining logic/instrumentation imports are reported as debt.

The current report shows **18 known-debt imports**, all deliberate pre-migration leftovers:

- **`ui → game/state` (7) — view-model/state reads that predate the view-model migration:**
  `ui/mapTooltip.js` (entityQueries, fogOfWar, championMovement), `ui/panels/leftPanel.js`
  (liveGame), `ui/viewModels/championViewModel.js` (championMovement),
  `ui/viewModels/combatViewModel.js` (combat/index), `ui/combat/combatReveal.js`
  (combat/index).
- **`render → dev` (7) — dev-tooling measurement instrumentation:**
  `overlays/fogMaskGenerator.js`, `overlays/overlayRegistry.js`,
  `hexmap3d/hexMapRenderer.js`, `hexmap3d/units/movementAnimator.js`,
  `hexmap3d/interaction/cameraPan.js`, `hexmap3d/interaction/hexHover.js`,
  `hexmap3d/scene/sceneSetup.js` — all importing `dev/performance/index.js`.
- **`game → dev` (4) — dev-tooling measurement instrumentation:**
  `rules/terrainGen/flatGeneration.js`, `state/championFactory.js`,
  `state/gameFactory.js`, `state/worldSimulation.js` — all importing
  `dev/performance/index.js`.

The `render → dev` and `game → dev` entries are the dev-tools-in-production couplings
flagged in the audit backlog §2 (gating them behind `?dev=1` would clear these without
moving code).

---

## 7. Tooling

- `python3 dev/check_imports.py` — verifies every relative import in `src/` resolves, and prints a boundary report of cross-layer imports vs the §2 dependency table.
- `python3 dev/check_analysis_imports.py` — verifies every relative import in `dev/analysis/` resolves, including cross-references into `src/`. Does not check layer boundaries (those rules don't apply to the standalone analysis tool).
- `tests/run.sh` (or `node --test` from the repo root) — unit-test suite for the pure layers (`src/engine/rules/`, `src/game/rules/` incl. terrain-gen). Zero dependencies; uses Node's built-in `node:test` runner. `tests/` lives outside `src/` so it doesn't affect the boundary report.
- `dev/analysis.html` — standalone map-gen analysis page. Not part of the game UI. Opens directly in a browser (served from the same origin).
- There is no build step; `engine/rules/` and `game/rules/` must stay importable in plain Node (`node --check` clean, no DOM/Three imports).

### `dev/analysis/` — Map gen analysis tool (standalone)

| File | Purpose |
|------|---------|
| `state.js` | Shared mutable state (camera, view mode, cycle state) |
| `domRefs.js` | DOM element cache (`els` object) |
| `ui/main.js` | Entry point: wires DOM controls to all subsystems |
| `ui/batchPanel.js` | Batch analysis orchestration and LUT/report download controls |
| `ui/canvas.js` | Canvas setup, resize, and mouse-drag interaction |
| `ui/cycle.js` | Random-seed cycling (play/stop/speed controls) and seed navigation |
| `ui/seedStepper.js` | Seed string parsing and numeric-step computation (pure) |
| `ui/export.js` | PNG and JSON export of the current map view |
| `generation/generate.js` | Pure map generation pipeline (terrain + entities) |
| `generation/multiSeed.js` | Batch multi-seed analysis with aggregated heatmaps |
| `generation/thresholdDerivation.js` | Calibration pipeline: histogram pooling, LUTs, threshold derivation |
| `generation/slopeDeltas.js` | Raw per-tile slope delta collection for SLOPE_NORMALIZATION |
| `generation/calibrationExport.js` | Calibration JSON serialization and text report formatting |
| `generation/seamTest.js` | Chunk-seam invariant test runners |
| `generation/seamTestReport.js` | Seam test text report formatting |
| `generation/frequencyVerification.js` | Noise frequency measurement via zero-crossing counting |
| `generation/frequencyReport.js` | Frequency verification text report formatting |
| `generation/quantileLUT.js` | Quantile LUT construction and field normalization |
| `generation/histograms.js` | Histogram collection and percentile queries |
| `generation/noiseConfig.js` | Noise field configuration and seed offsets |
| `generation/climateCoverage.js` | Climate coverage test and report formatting |
| `generation/snapshotTest.js` | Snapshot test and report formatting |
| `render/camera.js` | Camera model: zoom, pan, screen/world transforms |
| `render/hexMath.js` | Hex geometry: axial-to-pixel, hex path drawing |
| `render/colorMaps.js` | Elevation and moisture color mapping |
| `render/renderMap.js` | Canvas2D hex-map renderer (terrain, entities, overlays) |
| `render/orchestrate.js` | Render orchestration: canvas sizing, options, delegate draw |
| `render/renderDistributions.js` | Canvas2D histogram panel renderer |
| `render/theme.js` | Visual theme constants (biome colours, river colours) |
| `render/entityMarkers.js` | Entity marker drawing (champion, mob, trader, base) |
| `render/featureMarkers.js` | Feature marker drawing (trees, bushes, vines, debris) |
| `render/terrainFill.js` | Terrain colour fill and overlay rendering |
| `stats/stats.js` | Barrel: re-exports tile, entity, aggregation, and concentration stats |
| `stats/tileStats.js` | Per-tile distributions (biome, terrain, features, debris, mountains, water) |
| `stats/entityStats.js` | Entity statistics (champions, mobs, traders) |
| `stats/aggregation.js` | Multi-seed aggregation (terrain distribution mean/stddev) |
| `stats/concentration.js` | Gini coefficient, passable-tile count, heatmap concentration |
| `stats/spatialStats.js` | Flood-fill patch analysis and connected-component metrics |
| `stats/correlations.js` | Cross-field Pearson correlations and 2D joint histograms |
| `stats/spatialFormatting.js` | Display formatting for spatial/correlation/histogram results |
| `stats/statsDisplay.js` | Formats and updates the stats panel DOM |
| `stats/batchReport.js` | Batch report orchestrator and JSON calibration export |
| `stats/reportBaseFormat.js` | Batch report config/terrain-rule section formatting |
| `stats/reportHeatmapFormat.js` | Batch report heatmap section formatting (parameterized) |
| `stats/calibrationDisplay.js` | Calibration section and composite report formatting |
| `legend/legend.js` | Legend dispatcher: bucket-gradient and passability builders |
| `legend/terrainLegend.js` | Terrain palette legend builder (sorted by TERRAIN_ORDER) |
| `legend/biomeLegend.js` | Biome-region legend builder (coloured by BIOME_COLORS) |
| `legend/riversLegend.js` | Rivers legend builder (river path, boost halo, unaffected counts) |
| `batch/batchRunner.js` | Batch analysis orchestrator: per-seed loop, per-radius aggregation |
| `batch/seedProcessor.js` | Per-seed data collection for batch analysis |
| `batch/aggregators.js` | Multi-seed heatmap and correlation aggregation |
| `batch/progressBar.js` | DOM progress bar creation and update |
| `batch/fingerprint.js` | Per-seed noise config fingerprint generation |
| `styles/index.css` | Barrel: imports all analysis page stylesheets |
| `styles/reset.css` | Global reset and base element styles |
| `styles/layout.css` | Page grid and major panel positioning |
| `styles/controls.css` | Control panel headings, inputs, buttons, toggles, loading |
| `styles/sidebar.css` | Right sidebar container and entity toggle controls |
| `styles/legend.css` | Legend: colour gradient bars and discrete swatches |
| `styles/entityKey.css` | Entity key swatches in toggle labels |
| `styles/statsPanel.css` | Stats panel highlights and metric display |
| `styles/scrolling.css` | Custom scrollbar styling for panels |
| `styles/cycle.css` | Random cycle button state styles |
| `styles/batch.css` | Batch analysis panel layout and progress styles |

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
| `dev/futureWork.md` | Deferred work and future-reference roadmap |
| `dev/analysis.html` | Map-gen analysis tool reference (standalone page) |
