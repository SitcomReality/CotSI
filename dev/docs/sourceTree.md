# Source Tree Inventory (`src/`)

A **volatile, hand-maintained registry** of every file under `src/` with a
one-line purpose. It is a map, not the truth: keep it roughly current, but take
the on-disk tree and the boundary report produced by
`python3 dev/scripts/check_imports.py` as authoritative. If you spot a row that's
stale, fix it here — the doc is only useful while it matches what a reader would
see with `find src`.

For the *principles* behind this tree — what each layer is allowed to import, the
interaction pipeline, and where new code goes — see `dev/docs/systemArchitecture.md`
(§2 Dependency Rules, §4 Interaction Pattern, §5 Decision Guide). The standalone
tools' inventories live in their own READMEs (`dev/tools/analysis/README.md`,
`dev/tools/geometryEditor/README.md`), not here.

---

## `src/engine/rules/` — Pure reusable mechanics (no game knowledge)

| File | Purpose |
|------|---------|
| `binaryHeap.js` | Min-binary-heap priority queue (Dijkstra in connectivityEnforcement) |
| `chunkGrid.js` | Chunk coordinate math (CHUNK_SIZE=24) for spatial partitioning |
| `hexGrid.js` | Hex math: neighbors, distance, coordinates, ring queries, cubeRound |
| `hexProjection.js` | Hex coordinate ↔ world-space projection helpers (minimap) |
| `mat4.js` | Pure 4×4 matrix math (descriptor pipeline + geometry editor) |
| `noise.js` | Seeded simplex noise (2D) + FBM for terrain fields |
| `pathfinding.js` | A\* pathfinding on hex grid |
| `seededRng.js` | Deterministic PRNG with seed |
| `shuffle.js` | Fisher-Yates shuffle |
| `sightCull.js` | Hex visibility culling (camera-distance cap) |

> **⚠️ Hex Axial Coordinate Convention — (q, r) is NOT Cartesian.** The axial q and r axes are 60° apart, not orthogonal. This is a frequent source of bugs:
> - Never use `Math.cos`/`Math.sin`/`Math.atan2` directly on q/r to produce or modify hex coordinates — use `cubeRound()` or world-space roundtrip instead.
> - Never compute movement steps by applying Cartesian deltas (dx, dy) to q/r — use `neighbors()` to get valid axial directions.
> - Always use `distance()` for hex-distance checks — never Euclidean formulas on q/r.
> - To generate hex coordinates from polar (angle, radius): convert to world space first, invert through the `hexCenter()` projection to get fractional axial, then apply `cubeRound()`.
> - `cubeRound()` is in this module; `neighbors()` and `distance()` are also here.

---

## `src/game/rules/` — Pure game-specific logic

| File | Purpose |
|------|---------|
| `archetypes.js` | Archetype registry with inheritance (biomes, features, mobs) |
| `archetypeData/biomes/` | Directory: per-biome archetype definitions (12 files + barrel) |
| `archetypeData/features.js` | Feature archetype definitions |
| `archetypeData/mobs.js` | Mob creature definitions |
| `archetypeData/index.js` | Barrel: triggers all archetype registrations |
| `dispatchReport.js` | Pure function to build dispatch-event report strings |
| `dungeonRules.js` | Pure dungeon rules: placement constraints and generation |
| `equipment.js` | Equipment/item definitions |
| `factionData.js` | Faction definitions: colors, names, starting stats |
| `logGrammar.js` | Grammar/template helpers for structured game-log messages |
| `logHelpers.js` | Utility functions for log message formatting |
| `movementCosts.js` | Terrain movement-cost tables |
| `paleyScoring.js` | Paley tournament score calculation (7-node tournament) |
| `tileQueries.js` | Spawn-placement helpers (nearestOpenKey, nearestOpenMultiRing) |
| `terrainOverrides.js` | Terrain rule overrides (e.g. water on land) |
| `terrainTypes.js` | Terrain type constants and default features |
| `traderStock.js` | Trader stock generation logic |
| `weatherScript.js` | Weather generation/scripting |

### `src/game/rules/terrainGen/` — Terrain generation subsystem

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
| `postProcess/waterRules.js` | Water height rules: uniform stationary bodies, water below land, river-bed carving (+ downstream riverFlow) |
| `rivers/riverMoisture.js` | Applies moisture boost from rivers |
| `rivers/riverSources.js` | Selects river source points |
| `rivers/riverTerrain.js` | Overrides traced river paths to real `river` terrain (clears features) |
| `rivers/riverTrace.js` | River tracing algorithm |
| `startingRegion.js` | Eager starting-region chunk selection (spawn regions up front, rest lazy) |
| `tagging/mountainTagging.js` | Mountain type tagging |
| `tagging/waterTagging.js` | Water type tagging |

---

## `src/game/state/` — Mutable state, queries, and mutations

Organized into `world/` (map & world-day bookkeeping), `entities/` (entity
creation/queries), `features/` (feature interactions), `movement/` (movement &
AI), and `combat/`.

### Top-level

| File | Purpose |
|------|---------|
| `gameFactory.js` | Full game-state factory (initializes a new game) |
| `initialGameState.js` | Default/initial values for game state fields |
| `liveGame.js` | The singleton `G` object — live mutable game state |
| `turnActions.js` | Per-turn action processing (movement, interaction) |

### `src/game/state/persistence/` — save/load serialization

| File | Purpose |
|------|---------|
| `saveDocument.js` | Save-document serializer/loader (JSON-safe snapshot + world rebuild) |
| `settingsDocument.js` | Pure settings-document serializer and validator |

### `src/game/state/world/` — map state & world-day bookkeeping

| File | Purpose |
|------|---------|
| `chunkDirtyTracking.js` | Dirty-chunk flag management for render culling |
| `chunkManager.js` | Lazy chunk lifecycle: create/evict/reproduce chunks from the seed |
| `deathTracker.js` | Tracks entity deaths and triggers death handling |
| `dispatchLedger.js` | Records of all dispatch events |
| `fogOfWar.js` | Fog-of-war state and visibility queries |
| `gameLog.js` | Game event log: append and query |
| `tileAccess.js` | Chunk-aware tile CRUD accessors (get/set/delete) |
| `tileIteration.js` | Tile iteration helpers (allTileKeys, forEachTile, tileCount) |
| `tileProxy.js` | Backward-compatible `state.tiles` Proxy over chunk storage |
| `victoryChecks.js` | Win-condition evaluation |
| `worldSimulation.js` | World-day turn advancement and bookkeeping |

### `src/game/state/entities/` — entity creation & queries

| File | Purpose |
|------|---------|
| `basePlacer.js` | Places champions / entities at game start |
| `championAI.js` | Bot AI decision-making for champions |
| `championFactory.js` | Champion creation factory |
| `entityFactory.js` | Generic entity creation (non-champion) |
| `entityQueries.js` | Entity lookup queries (by hex, by faction, by type) |
| `spatialIndex.js` | Spatial hash for fast entity-location queries |
| `spawnPosition.js` | Determines valid spawn positions on the map |

### `src/game/state/features/` — feature & interaction logic

| File | Purpose |
|------|---------|
| `arrivalInteractions.js` | Logic triggered when a champion arrives at a hex |
| `artifactDraft.js` | Artifact-reward drafting system |
| `baseInteraction.js` | Base interaction handling at hex destinations |
| `digSystem.js` | Digging/dowsing for relics and findings |
| `dungeonPlacement.js` | Dungeon placement logic |
| `dungeonSystem.js` | Dungeon state and mutations |
| `factionAbilities.js` | Faction-ability logic and activation |
| `featureRegrowth.js` | Interactive-feature regrowth handling |
| `featureRewards.js` | Reward grants for interactive features (direct grants, choice modals, regrowth) |
| `featureRewardTable.js` | Feature reward lookup tables |
| `forgeSystem.js` | Forge hexes — equipment upgrades (God's Knots) and durability repairs |
| `trading.js` | Trader interactions and trades |

### `src/game/state/movement/` — movement & wandering

| File | Purpose |
|------|---------|
| `championMovement.js` | Champion movement mutations (move, expenditure) |
| `mobHarassment.js` | Mob harassment and wandering AI (world turn) |
| `traderMovement.js` | Trader pathfinding and movement (world turn) |

### `src/game/state/combat/` — combat state

| File | Purpose |
|------|---------|
| `index.js` | Barrel: re-exports combat subsystems |
| `combatAutoResolve.js` | Auto-resolve combat between two bots |
| `combatBotAI.js` | Bot colour-picking AI during combat |
| `combatDamage.js` | Combat round damage resolution |
| `combatFlee.js` | Flee-from-combat resolution (survive at 1 HP) |
| `combatFinalize.js` | Final combat resolution and loot distribution |
| `combatPicks.js` | Combat colour-pick logic and validation |
| `combatScoring.js` | Combat round scoring from colour picks |
| `combatState.js` | Combat state creation and management |

---

## `src/runtime/` — Cross-layer orchestration (composition root)

| File | Purpose |
|------|---------|
| `beginGame.js` | Game-start orchestration: state init, render init, UI init; shared deferred-start + presentGame flow reused by save-load |
| `bootstrap.js` | App bootstrap: loads modules, starts the clock, restores settings |
| `botTurnRunner.js` | Runs bot turns: AI decision → state mutation → refresh |
| `deathAnnouncement.js` | Death-event coordination: state, render, UI |
| `dispatchPrompt.js` | Dispatch-event prompt orchestration (modal + reward) |
| `endTurn.js` | End-turn orchestration: cleanup, next-champ, refresh |
| `gameSaveSlot.js` | localStorage save slot: save/load/has via the persistence core |
| `heraldPrompt.js` | Herald-prompt orchestration (narrative modal) |
| `hexBridge.js` | Hex-click bridge: picking event -> game mutation -> refresh |
| `initMap3d.js` | 3D-map initialisation orchestration |
| `mapCamera.js` | Camera-control orchestration bridging input and render |
| `mapControlActions.js` | Action-registrations that span layers (teleport, zoom) |
| `mapRefresh.js` | Map-refresh orchestration: state -> render overlays + 3D |
| `portraitResolver.js` | Resolves entity/champion portrait assets |
| `refreshAll.js` | Full refresh: renders, overlays, UI, minimap |
| `rewardPrompt.js` | Reward-prompt orchestration (modal flow) |
| `saveLoadActions.js` | Save/load UI actions: Options-modal save buttons, setup-screen Continue, save-and-exit |
| `settingsStore.js` | Options persistence: capture/apply/save/restore settings doc |
| `storageIo.js` | Node-safe, failure-safe localStorage JSON read/write adapters |
| `turnPacing.js` | Turn pacing / speed orchestration |
| `zoomDisplay.js` | Zoom-level display update bridging state and UI |
| `combat/combatActions.js` | Combat init + actionBus handlers (pick, flee) |
| `combat/combatFlow.js` | Async combat sequencer (round driving) |
| `combat/combatLifecycle.js` | Combat start/close + attacker turn-end hook |
| `combat/combatRender.js` | Combat render orchestration |
| `combat/combatRoundEnd.js` | Round resolution → FX orchestration |
| `combat/combatState.js` | Active-combat holder + combat clock wait |
| `combat/index.js` | Barrel: combat public API |
| `trade/trade.js` | Trade-flow orchestration |

---

## `src/render/` — Pixels: Three.js scene, Canvas2D overlays, minimap

### `src/render/hexmap3d/` — Three.js 3D hex map

| File | Purpose |
|------|---------|
| `chunkManager.js` | Chunked hex-mesh loading/unloading by camera position |
| `hexMapRenderer.js` | Top-level 3D renderer: scene, update, dispose |
| `hexWorldSpace.js` | Hex coordinate -> world-space position conversion |
| `sceneContext.js` | Scene, camera, renderer creation and access |

#### `src/render/hexmap3d/scene/` — scene setup, lighting, camera

| File | Purpose |
|------|---------|
| `cameraCentering.js` | Camera centering/animation on a target hex |
| `cameraPanMath.js` | Camera pan math (delta, champion-relative constraint) |
| `cameraState.js` | Camera state: position, target, zoom level |
| `cameraZoomMath.js` | Camera zoom math (levels, smoothing) |
| `lightSetup.js` | Scene lighting (ambient, directional) |
| `materials.js` | Shared Three.js materials and material factory |
| `outline.js` | Comic-book ink outlines (inverted-hull technique) for the Puppet layer |
| `panAnimation.js` | Camera pan animation (smooth transitions) |
| `rendererSetup.js` | WebGL renderer setup and configuration |
| `sceneSetup.js` | Scene initialisation + registers render callback on clock |

#### `src/render/hexmap3d/interaction/` — camera & hex input

| File | Purpose |
|------|---------|
| `cameraPan.js` | Camera pan input handler (mouse drag) |
| `cameraZoom.js` | Camera zoom input handler (scroll wheel) |
| `hexClick.js` | Hex click detection and dispatch |
| `hexHover.js` | Hex hover detection and highlight |
| `hexPicking.js` | Raycaster-based hex picking |
| `hoverTooltip.js` | Hover tooltip display (coords, info) |
| `mapInteraction.js` | Top-level map interaction coordinator |
| `panMath.js` | Camera pan boundary math |
| `touchInput.js` | Touch input handler (mobile/tablet) |

#### `src/render/hexmap3d/terrain/` — terrain meshes

| File | Purpose |
|------|---------|
| `index.js` | Terrain module barrel (meshes + ground-level API) |
| `buildTerrainMesh.js` | Procedural terrain mesh geometry (vertex colours, damp-bank side tint) |
| `buildWaterMesh.js` | Separate water mesh: own material, ripple + flow attributes, no blending (water + river terrain) |
| `cornerBlend.js` | Top-face corner color blending (soft biome transitions) |
| `tileColor.js` | Top-face color resolution (biome palette, lake/river color) |
| `tileHeight.js` | Ground-level math (tileSurfaceY, tileTopY, ELEVATION) |
| `waterSparkles.js` | InstancedMesh sparkle glints on still water (GPU twinkle, rides the ripple) |

#### `src/render/hexmap3d/units/` — unit rendering

| File | Purpose |
|------|---------|
| `index.js` | Barrel for unit rendering |
| `movementAnimator.js` | Unit movement animation (tween along path) |
| `movementCurves.js` | Movement animation curves (easing) |
| `unitAnimations.js` | Unit animation state machine (idle, move, attack) |
| `unitMeshes.js` | Unit mesh creation and management |

#### `src/render/hexmap3d/portrait/` — portrait rendering

| File | Purpose |
|------|---------|
| `portraitAtlas.js` | Portrait icon-atlas handling |
| `portraitCatalog.js` | Portrait catalog / lookup |
| `portraitFraming.js` | Portrait crop/framing |
| `portraitThumbnail.js` | Portrait thumbnail generation |

#### `src/render/hexmap3d/worldObjects/` — descriptor-driven world objects

| File | Purpose |
|------|---------|
| `baseMeshes.js` | Faction base meshes (tower + faction decoration) |
| `biomeTint.js` | Neighbor-blended biome colors for descriptor parts |
| `decorEmphasis.js` | De-emphasis state computation (dispersed/sunk/hidden) for displaced decorations |
| `hillFloor.js` | Hill floor mesh |
| `meshBuilder.js` | Shared InstancedMesh iteration + build utilities (per-instance scale/lean/color + frame placement/orientation) |
| `tileHash.js` | Deterministic per-tile / per-tree hashing |
| `worldMeshes.js` | Top-level world-object mesh entry: descriptor-driven features + terrain decor + champion bases |

#### `src/render/hexmap3d/worldObjects/descriptors/` — descriptor pipeline

| File | Purpose |
|------|---------|
| `index.js` | Descriptor module barrel (schema constants) |
| `schema.js` | Descriptor schema API barrel (shapes, defaults, validation, normalization) |
| `shapeTypes.js` | Shape type definitions |
| `descriptorDefaults.js` | Descriptor default values |
| `typeChecks.js` | Type-check helpers for descriptors |
| `validateShapes.js` | Shape validation |
| `validateParts.js` | Part validation |
| `descriptorValidation.js` | Full descriptor validation |
| `descriptorNormalize.js` | Descriptor normalization |
| `descriptorDenormalize.js` | Descriptor denormalization |
| `recordBuilder.js` | Record-generation API barrel (clusterCount / variantSelection / itemPlacement / partScale / partColor / partFrames / tileRecords / entityRecords) |
| `clusterCount.js` | Cluster count derivation |
| `variantSelection.js` | Variant selection logic |
| `itemPlacement.js` | Item placement logic |
| `partScale.js` | Part scale variation |
| `partColor.js` | Part color variation |
| `partFrames.js` | Part frame placement |
| `partStates.js` | Part state keyframes (growth states) |
| `tileRecords.js` | Per-tile record generation |
| `transformVariation.js` | Per-node spawn chance gating and range-form transforms |
| `entityRecords.js` | Per-entity record generation |
| `motifDraw.js` | Motif composition drawing for records |
| `shapeFactories.js` | Shape → THREE geometry + material factories |
| `meshAssembly.js` | Descriptor + records → one InstancedMesh per part geometry |
| `gameBuilder.js` | Game-side tile → descriptor resolution (features + per-terrain decor — one decor per terrain; decor geometry references shared motifs (`data/motifs/`, e.g. `gnarledTree.js`)) + assembly |

#### `src/render/hexmap3d/worldObjects/descriptors/data/` — generated descriptor data

**Editor-generated.** One file per object (`<id>.js`); authored in the geometry
editor, not by hand (see `dev/tools/geometryEditor/README.md`). Grouped by kind:

| Directory/file | Contents |
|----------------|----------|
| `base.js` + `bases/` | Table-driven base descriptors: `arc` `cru` `hol` `hrt` `msk` `rev` `ver` |
| `champion.js` + `champions/` | Table-driven champion descriptors: 7 factions + `shared` |
| `mob.js` + `mobs/` | Table-driven mob descriptors: 7 mob archetypes |
| `decor/` | Per-terrain decorators (13) — each a `motifs` table (schemaVersion 7) with `biomeWeight` skews |
| `motifs/` | Shared motif library: one motif per file (id-named, e.g. `gnarledTree.js`); the debris shapes (`stone`/`pile`/`shard`/`tuft`) and `pool` each use an `alternatives` root for material variety, and the supernatural gating block lives once in `decor/supernatural.js`; barrel `index.js` exports `ALL_MOTIFS`/`motifById` |
| `features/` | Feature descriptors (29) |
| `items/` | Item descriptors (7) |
| `trader.js` | Trader descriptor |
| `index.js` | Barrel |

---

### `src/render/overlays/` — Canvas2D overlays

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
| `pathPreview.js` | Movement path preview overlay |
| `screenProjection.js` | World-space -> screen-space projection |
| `selectionRing.js` | Active-unit selection ring overlay |

### `src/render/minimap/` — 2D minimap

| File | Purpose |
|------|---------|
| `minimap.js` | Minimap top-level coordinator |
| `minimapDom.js` | Minimap DOM element creation and layout |
| `minimapOverlayLayer.js` | Minimap overlay layer (fog, highlights) |
| `minimapTerrainLayer.js` | Minimap terrain colour layer |

### `src/render/` — Top-level render helpers

| File | Purpose |
|------|---------|
| `shadowLightConfig.js` | Shadow-map light configuration |

---

## `src/ui/` — DOM: panels, modals, widgets, view-models

### `src/ui/panels/` — Side panels and HUD elements

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

### `src/ui/modals/` — Modal dialogs

| File | Purpose |
|------|---------|
| `artifactChoiceModal.js` | Artifact draft choice selection UI |
| `confirmModal.js` | Generic confirmation modal |
| `deathModal.js` | Champion death announcement modal |
| `dispatchModal.js` | Dispatch-event selection modal |
| `heraldModal.js` | Herald narrative event modal |
| `modalShell.js` | Modal base shell (open, close, animate) |
| `optionsModal.js` | Options dialog — graphics effect toggles + game speed |
| `rewardModal.js` | Generic reward display modal |

### `src/ui/combat/` — Combat view (render + FX; sequencer lives in `runtime/combat/`)

| File | Purpose |
|------|---------|
| `combatFx.js` | Combat visual effects (screen shake, flash) |
| `combatRenderer.js` | Combat modal render/update (takes combat as arg) |
| `combatReveal.js` | Combat colour-reveal animation (takes combat as arg) |
| `combatRewardUI.js` | Combat reward display |

### `src/ui/trade/` — Trade view

| File | Purpose |
|------|---------|
| `tradeRenderer.js` | Trade UI rendering |

### `src/ui/viewModels/` — Derived UI data transforms

| File | Purpose |
|------|---------|
| `championViewModel.js` | Derives champion display data from game state |
| `combatViewModel.js` | Derives combat display data from combat state |
| `tradeViewModel.js` | Derives trade display data from game state |

### `src/ui/templates/` — HTML templates

| File | Purpose |
|------|---------|
| `combatModal.inc` | Combat modal HTML template |
| `confirmModal.inc` | Confirm modal HTML template |
| `deathModal.inc` | Death announcement modal template |
| `devTools.inc` | Dev tools panel template |
| `dispatchModal.inc` | Dispatch-event modal template |
| `gameLayout.inc` | Game page layout template |
| `heraldModal.inc` | Herald narrative modal template |
| `loadingScreen.inc` | Loading screen template |
| `optionsModal.inc` | Options modal template |
| `rewardModal.inc` | Reward modal template |
| `setupScreen.inc` | New-game setup screen template |
| `toast.inc` | Toast notification template |
| `tradeModal.inc` | Trade modal template |
| `victoryModal.inc` | Victory modal template |
| `templateLoader.js` | HTML template loading/caching |

### `src/ui/` — Top-level UI files

| File | Purpose |
|------|---------|
| `domBuilder.js` | `h()` — virtual-DOM-like element builder |
| `heptagramWidget.js` | Heptagram SVG widget component |
| `hud.js` | HUD shell creation and coordination |
| `iconAtlas.js` | UI icon atlas |
| `iconPaths.js` | SVG icon path definitions |
| `mapTooltip.js` | Map hex tooltip popup |
| `paleySVG.js` | Paley tournament SVG rendering |
| `setupActions.js` | Setup-screen action registrations |
| `setupConstants.js` | Setup-screen constants and defaults |
| `setupHeptagram.js` | Setup-screen heptagram display |
| `setupScreen.js` | New-game setup screen |
| `svgIcon.js` | SVG icon component factory |
| `turnTint.js` | Turn-based visual tint |
| `weatherDisplay.js` | Weather icon and label display |

---

## `src/shared/` — Layer-neutral infrastructure (imports nothing project-local except `params/` constants)

| File | Purpose |
|------|---------|
| `actionBus.js` | `[data-action]` dispatcher with keyboard shortcuts and modal-action helpers |
| `clockScheduler.js` | Centralized Clock with pause/resume, per-group speed control, master rAF loop |
| `measurements.js` | Named timing measurements (start/end, lifetime avg, EMA); moved from `src/devtools/performance/` |
| `speedGroup.js` | Speed-group definitions and speed multipliers |
| `timerQueue.js` | Priority-queue timer management for the clock scheduler |

---

## `src/params/` — Pure parameter/data constants (imports nothing project-local)

| File | Purpose |
|------|---------|
| `devtools/cheatParams.js` | Default amounts for dev cheat actions |
| `devtools/performanceParams.js` | Performance profiling thresholds and frame-rate targets |
| `engine/chunkParams.js` | Chunk sizing for hex-grid spatial partitioning |
| `game/aiParams.js` | Bot AI decision thresholds, weights, and probabilities |
| `game/championParams.js` | Champion starting stats and base values |
| `game/chunkParams.js` | Chunk eviction, starting-region radius, and background generation |
| `game/combatParams.js` | Combat scoring, damage, loot, and auto-resolve parameters |
| `game/dungeonParams.js` | Dungeon generation parameters |
| `game/economyParams.js` | Gold costs, heal amounts, dig values, and artifact economy |
| `game/factionParams.js` | Faction counts, potency defaults, and ability parameters |
| `game/featureSpawnParams.js` | Feature density, tiered placement, and knot-amount parameters |
| `game/spawnParams.js` | Spawn position and entity-count parameters |
| `game/terrainGenParams.js` | Terrain-gen noise, seeds, shaping, rivers, and terrain rules |
| `game/worldParams.js` | World simulation days, mob harassment, and log retention |
| `render/animationParams.js` | Movement animation durations, curve parameters, champion Y offsets |
| `render/cameraParams.js` | Camera frustum, zoom, pan, and centering parameters |
| `render/geometryParams.js` | 3D geometry dimensions for features and units |
| `render/minimapParams.js` | Minimap canvas sizing, dot sizes, and layout constants |
| `render/overlayParams.js` | Fog overlay, interaction highlights, and selection-ring parameters |
| `render/terrainParams.js` | Terrain elevation, color values, and shared world-space constants |
| `ui/combatUiParams.js` | Combat modal animation timings, icon sizes, and UI constants |
| `ui/setupParams.js` | Setup-screen default values and slider ranges |
| `ui/uiParams.js` | Panel dimensions, icon sizes, and UI animation timings |

---

## `src/vendor/` — Third-party builds (do not edit)

| File | Purpose |
|------|---------|
| `three.module.js` | Three.js full module build |
| `three.core.js` | Three.js core-only build |
| `three.webgpu.js` | Three.js WebGPU adapter |
| `three.webgpu.nodes.js` | Three.js WebGPU TSL nodes |
| `three.tsl.js` | Three.js TSL shading language |

---

## `src/devtools/` — Developer tools (not part of game UI)

### `src/devtools/panel/` — Dev tools panel shell

| File | Purpose |
|------|---------|
| `init.js` | Dev panel initialisation |
| `keyboard.js` | Dev panel keyboard shortcuts |
| `perfUI.js` | Dev panel performance-tab UI |
| `tabs.js` | Dev panel tab management |
| `template.js` | Dev panel HTML template |
| `teleport.js` | Dev teleport-mode UI and state |

### `src/devtools/cheats/` — Cheat actions

| File | Purpose |
|------|---------|
| `combat.js` | Cheat: trigger combat, resolve instantly |
| `map.js` | Cheat: reveal map, toggle fog |
| `movement.js` | Cheat: fill moves, teleport |
| `resources.js` | Cheat: +gold, +HP, +relics, +knots, +potency |
| `state.js` | Cheat state: what's enabled |

### `src/devtools/botControl/` — Bot control UI

| File | Purpose |
|------|---------|
| `autoPlay.js` | Auto-advance mode: run all bots sequentially |
| `championList.js` | Champion-list UI for bot/human toggles |
| `index.js` | Barrel for bot-control registrations |
| `state.js` | Bot-control state: per-champion mode, step mode |
| `stepMode.js` | Step-through mode: one action at a time |

### `src/devtools/actionWiring/` — Dev action bindings

| File | Purpose |
|------|---------|
| `bot.js` | Dev action wiring for bot-control actions |
| `capture.js` | Dev action wiring for the Capture tab (start/stop recording) |
| `cheats.js` | Dev action wiring for cheat actions |
| `index.js` | Barrel for dev action wiring |
| `performance.js` | Dev action wiring for performance-tab actions |

### `src/devtools/capture/` — Screen recording

| File | Purpose |
|------|---------|
| `screenRecorder.js` | WebM video recording of the map viewport (Three.js canvas + overlay composite via MediaRecorder) |

### `src/devtools/performance/` — Performance profiling

| File | Purpose |
|------|---------|
| `captureLogger.js` | Frame-time data capture and logging |
| `frameProfiler.js` | Per-frame profiler: measure, store, report |
| `frameTracker.js` | Frame timing tracker (FPS, frame times) |
| `gameContext.js` | Game context snapshot for performance reports |
| `index.js` | Barrel for performance exports |
| `overlay.js` | Performance overlay display on the game canvas |
| `reportBuilder.js` | Report orchestration: assembles CaptureReport from frame entries |
| `report/` | Report analysis modules (see sub-table below) |
| `snapshot.js` | Performance snapshot (point-in-time metrics) |
| `stats.js` | Performance statistics (min, max, avg, percentiles) |

#### `src/devtools/performance/report/` — Report analysis modules

| File | Purpose |
|------|---------|
| `frameSummary.js` | Overall summary stats: fps/frame-time/memory/heap-delta, per-context breakdown |
| `frameThresholds.js` | Frame-time thresholds, bucket categorization, rounding/context-label helpers |
| `reportFormatter.js` | Formatted string rendering of a CaptureReport |
| `slowClusters.js` | Adjacent slow-frame clustering |
| `spanAnalysis.js` | Span aggregation, exclusive (self) time, JS invisible-overhead |
| `timeBudget.js` | Per-frame and per-phase time-budget computation |
| `warnings.js` | Condensed warning generation from report sections |
| `worstFrames.js` | Worst-frame drill-down with span breakdowns |

### `src/devtools/` — Top-level dev files

| File | Purpose |
|------|---------|
| `devTools.js` | Dev tools panel shell with three tabs |

---

## `src/` — Root

| File | Purpose |
|------|---------|
| `entrypoint.js` | App entry point — imports bootstrap for side effects only |