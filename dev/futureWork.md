# Future Work & Deferred Items

Forward-looking tracker consolidated from three earlier documents
(`dev/auditBacklog.md`, `dev/mapgen_update/remaining_work.md`,
`dev/largeMapRoadmap.md`) in Aug 2026. Contains only work that is deferred,
still to be implemented, or worth keeping as future reference. Completed work
lives in git history, not here.

---

## 1. Near-term features

### 1.1 Trading & traders

Traders already exist as entities — they wander between faction bases
(`src/game/state/traderMovement.js`) and carry generated stock
(`src/game/rules/traderStock.js`: heal, potency, weapon) with costs in
`src/params/game/economyParams.js` (`TRADER_*`). What's missing is the
purchase flow: interacting with an adjacent trader is highlighted on the map
but does nothing yet.

- Build the buy interface + transaction (gold → item) for trader stock.
- Faction bases already support buying potencies
  (`src/game/state/baseInteraction.js`, `POTENCY_COST_STANDARD` /
  `POTENCY_COST_DISCOUNTED`) — reuse that pattern for traders.
- Decide stock refresh cadence (per day? per visit?) and whether any
  champion can trade at any adjacent trader.

### 1.2 Items / equipment

No equipment system exists yet — the only trace is the `equip` weapon entry
in trader stock (a `secondary` bonus, `TRADER_WEAPON_BONUS`).

- Design the champion inventory/slot model, and how a weapon's `secondary`
  bonus applies in combat scoring.
- Sources beyond traders: dungeon rewards, digs, bases.
- Settle stacking / durability / trading items back.

### 1.3 Dungeons

Consecutive-turn dungeon: enter a dungeon hex → the champion disappears from
the map and stays inside for 3 turns. Each turn while inside, combat starts
immediately at the beginning of the champion's turn instead of world-map
movement. After the final battle, a large reward.

- Turn flow (example):
  - Turn 1: move around the world map until you enter the dungeon, fight
    battle 1, then your turn ends.
  - Turn 2: fight battle 2.
  - Turn 3: fight battle 3 (final), receive rewards.
- Fleeing uses the normal rules (`dev/gameMechanics.md` §7) — but fleeing
  ejects the champion from the dungeon and loses all progress.
- Needs: dungeon feature + placement rules, an "in-dungeon" champion state
  (hidden from the map, no movement), escalating battle generation, reward
  hook (`src/game/state/featureRewards.js` pattern).

### 1.4 Movement — multi-step & terrain costs

- **Multi-step moves** — clicking a tile beyond the champion's range should
  auto-path to the farthest reachable tile toward it. Currently human
  movement is one tile per click (`adjacentPassable` in
  `src/game/state/championMovement.js`); range is a uniform-cost BFS
  (`movementRange`).
- **Terrain-based movement costs** — stepping onto a hex should cost by
  terrain. Add per-terrain cost to `src/game/rules/terrainTypes.js`; the BFS
  and `moveChampion(state, champ, targetKey, cost)` already take a cost.

### 1.5 UI improvements

Open-ended polish bucket — panels, modals, combat UI, clearer affordances.
Add concrete items here as they get scoped.

### 1.6 Responsiveness / mobile play

The game must keep working when the window resizes or the screen rotates
(mid-play included). Layout and input currently assume a desktop viewport —
audit fixed-size layout in `styles/`, panels/overlays, and pointer handling
for narrow/tall aspect ratios.

---

## 2. Terrain-gen: design notes for future reference

- **Calibration is re-runnable** — `dev/analysis.html` has a "Derive
  Thresholds" button and "Run Tests" button. Any change to noise output
  distributions (composite changes, new layers) requires regenerating
  calibration data. Thresholds remain stable percentiles if/when LUT
  normalization is added.
- **Per-phase normalization** — the additive composite spans [0, 2] (two
  fields summed), divided by 2 for [0, 1]. Any future noise layer follows
  the same pattern; only LUTs need regeneration.
- **Frequencies scale with map radius** — noise frequencies are scaled by
  1/radius, so terrain at a coordinate differs across radii; cross-radius
  tile equality is not an invariant (the seam invariant is per-chunk
  determinism at a fixed radius). Calibration/LUTs are radius-specific.
- **Frequency separation** — detail (0.020) and ridge (0.008) layers are
  separated by ~2.5×; new layers should maintain comparable separation.
- **Slope normalization gotcha** — `SLOPE_NORMALIZATION` uses the 95th
  percentile of aggregate per-tile mean delta (sum of 6 neighbor deltas /
  6), not individual deltas. Using the wrong statistic clusters slope near 0.
- **Rain shadow** — if the upwind average elevation (along
  `RAIN_SHADOW_WIND`, sampled at `RAIN_SHADOW_DISTANCES`) rises at least
  `RAIN_SHADOW_ELEV_THRESHOLD` above local elevation, the tile dries by
  (surplus − threshold) × `RAIN_SHADOW_DRYING`. Constants in
  `src/params/game/worldParams.js`; applied in
  `src/game/rules/terrainGen/classification/moistureAdjustment.js`.
- **Supernatural biome pattern** — to add a supernatural biome: (1) define
  archetype with `origin: 'supernatural'` + `epicenter` config; (2) add to
  `SUPERNATURAL_BIOMES`; (3) no `climateRange` (never climate-selected);
  (4) `fieldModifiers` alter local environment before terrain
  classification; (5) no pipeline code changes.
- **Testing** — the analysis tool runs snapshot, seam, and climate coverage
  tests in-browser via "Run Batch Analysis" (distribution histogram +
  threshold overlay). No Node.js dependency.

## 3. Large-map: reference & future scale

The large-map roadmap's phases 1–4 (algorithmic decoupling, chunk
infrastructure, chunked rendering, scale-up) are complete — map sizes in the
original document are out of date. What remains below is reference and
future-scale material.

### 3.1 "Infinite" world (not actually infinite — "unknowably large")

The design (six other players to interact with) isn't mechanically compatible
with truly infinite maps, but the goal is to support extremely large maps of
any arbitrary size. Implemented (2026-08): chunked storage
(`src/game/state/chunkManager.js`) with lazy per-chunk generation, a
background generation buffer around the champion (clock-scheduled), eviction
of empty chunks with delta extraction, an eager starting region around
spawns, render bounded by the sight-5 cap, and a fixed-pixel
champion-centered minimap. Remaining:

- **Persistence** — save seed + list of dirty tiles with their deltas;
  everything else regenerates (only the diff from procedural generation).
- **Infinite-appropriate AI** — local exploration biased toward resource
  gradients and away from recently visited areas; victory conditions may
  need rethinking.

### 3.2 What NOT to do (yet)

- No worker threads for generation — single-threaded JS with
  clock-scheduled chunk generation is sufficient up to R=200.
- No LOD unless profiling shows it's needed — InstancedMesh + frustum
  culling handles R=100 comfortably.
- **NO ACTUAL INFINITY** — build systems with the perspective of "how would
  this need to work if the map were infinite?", not to actually have infinite
  maps. Players eventually finding each other and fighting is core to design.

### 3.3 Still-open scale concerns

- **Bot directionality** — bots radius-limit their targeting but have no
  global strategy. A simple bias toward unexplored tiles / nearest God's
  Knot / enemy prevents circle-wandering. Design task as much as performance.
- **Camera caps + fog are tuned to current map scale** — zoom is capped
  (`ZOOM_MAX_FRUSTUM=20`, `DEFAULT_REFERENCE_FRUSTUM=40` in
  `src/params/render/cameraParams.js`), as are `CAMERA_FAR=200` and the
  scene fog (`sceneSetup.js`, 60–160); shadows are radius dependent. A
  conceptually infinite map still needs terrain-gen's radius semantics
  removed (`worldShape` falloff, noise scaled by 1/radius, latitude term,
  distance clamp) plus camera-driven chunk streaming (see §3.1).

## 4. Geometry editor — deferred content (descriptor migration gaps)

The descriptor pipeline is live: game feature/decor meshes resolve through
`features/descriptors/` (data + recordBuilder + gameBuilder) and the editor
(`dev/geometryEditor.html`) edits the same data. All simple feature
archetypes, tree groves, solitary + elder trees, hill mounds, mountains,
knots, and the entity kinds (bases, champions, mobs, traders) are migrated.
Remaining gaps — content still on hard-coded builders (`features/trees/`):

- **fruitTree** — the procedural fruit tree (`fruitTreeRecords.js`) grows
  per-tree hash-driven trunk segments, branches, and fruit — beyond the
  static-parts descriptor model. To migrate: add procedural/part-instancing
  to the descriptor model.
- **Mountain variant roll** — descriptors use the generic hash variant roll
  (50/50 classic/offpeak); per-tile assignments may differ from the legacy
  `MOUNTAIN_HASH_SEEDS` roll. Range reads identically.
- **Tree canopy anchor** — descriptor canopies use a fixed lift; legacy
  builders tie the canopy bottom to the trunk top per-tree. Canopy sits
  ~0.1 world units off relative to stretch — visually identical at game
  scale.

Entity-kind notes (by design, not regressions):

- **2D icon caps** (`units/pieceIcons.js`) render on top of mob/trader
  bodies; destined to be replaced by full 3D geometry. Cap height rides the
  top of each archetype's body part — an approximation (tall shapes like the
  goose float the icon high; entity part `stretch` is ignored).
- **Champion accents** are minimal per-faction placeholders; richer looks
  are authorable in the editor. Same for tier-2 mob accents (elder crown,
  queen gem).

**Editor write-back is live** — the editor saves objects straight into
`descriptors/data/` via `dev/geometryEditor/saveServer.sh` (one file per
object, generated; convention documented in `data/index.js`). Remaining
editor gaps:

- **Table-driven entity save** — `bases.js` / `mobs.js` derive their
  descriptor from variant maps the game imports; the save endpoint rejects
  them until the maps are decoupled from the descriptor.
- **3D gizmo** — direct transform manipulation in the preview (deferred).
- **Diff-on-save** — the confirm dialog shows the target file only; a
  before/after descriptor diff would catch accidental drift.
