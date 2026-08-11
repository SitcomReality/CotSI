# Future Work & Deferred Items

Forward-looking tracker. Contains only work that is deferred, still to be
implemented, or worth keeping as future reference. Completed work lives in git
history, not here.

Some things in this document may be based on out-of-date design ideas -- confirm
with the user before implementing specific features or making changes based on
this document.

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
- Stronger equipment is tied to God's Knots - either by purchase or upgrading.
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
- Fleeing uses the normal rules (`dev/docs/gameMechanics.md` §7) — but fleeing
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

- **Calibration is re-runnable** — `dev/tools/analysis.html` has a "Derive
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
`worldObjects/descriptors/` (data + recordBuilder + gameBuilder) and the editor
(`dev/tools/geometryEditor.html`) edits the same data. All simple feature
archetypes, tree groves, solitary + elder trees, hill mounds, mountains,
knots, and the entity kinds (bases, champions, mobs, traders) are migrated.
Remaining gaps — content still on hard-coded builders (`worldObjects/fruitTree/`):

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
  goose float the icon high; entity part `stretch` is ignored). The two
  reworked mob icons were renamed only (`p-infernalpaca`, `p-scorpelican`) —
  redraws to match the new creatures are still pending.
- **Champion accents** are minimal per-faction placeholders; richer looks
  are authorable in the editor. Tier-2 mob accents were removed with the
  scorpelican/infernalpaca rework (no tier-2 mob variants remain).

**Editor write-back is live** — the editor saves objects straight into
`descriptors/data/` via `dev/tools/geometryEditor/saveServer.sh` (one file per
object, generated; convention documented in `data/index.js`). Remaining
editor gaps:

- **Table-driven entity save** — `base.js` / `mob.js` derive their
  descriptor from variant maps the game imports (mobs now compose the per-mob
  files in `data/mobs/`); the save endpoint rejects them until the maps are
  decoupled from the descriptor.
- **Diff-on-save** — the confirm dialog shows the target file only; a
  before/after descriptor diff would catch accidental drift.

### 4.1 Mob geometry & animation

Mob geometry is the current content front (the roster was reworked to
mushroom / infernalpaca / leopard / goose / scorpelican / snail / tapir, one
file per archetype in `worldObjects/descriptors/data/mobs/`, with simple
animation planned later). Two hand-authored mob experiments
(`infernalpaca.js`, `scorpelican.js`) plus an unused water-decor file were
mined and then deleted; their findings are captured in
`dev/docs/mobGeometryAndAnimation.md` — joint-group pivots (already schema v5),
FK chains, faction-token colors (mobs use `factionBody`, not `factionBase`),
the object-level emissive hook (now also per-variant), and an animation
runtime proposal (declarative clip spec; hook into the per-render-pass mob
mesh rebuild in `unitMeshes.js`).

Next steps when mob content resumes:

- **New archetype** = one `<NAME>_VARIANT` file in
  `worldObjects/descriptors/data/mobs/` (variant id == `archetypeName`) + a
  line in the `data/mob.js` barrel.
- **Decouple the variant tables from the descriptor** (the table-driven-save
  gap above) so mobs become editor-editable — prerequisite for authoring the
  richer mobs in the editor rather than by hand.
- **Animation runtime** — see the design doc §4–5 for the worked approach.

---

## 5. Maintenance follow-ups (from techDebtAudit.md + goalTerrainDecorConsolidation.md)

Consolidated here when the audit and goal docs were retired (2026-08-11).
The rest of those documents described completed work and now lives in git
history; only the open items below remain.

### 5.1 Design decision — Edenfall mushroom rewards (techDebtAudit §6)

`src/params/game/aiParams.js:37,43` — `BOT_FEATURE_SCORES` gives
`edenMushroom: 24` / `edenShroomlet: 18`, but no reward logic exists for either
kind (`featureRewards.js`'s `FEATURES` table has no entries;
`arrivalInteractions.js` only handles fruitTree/knot/treasureChest). Bots spend
a full turn pathing to an Edenfall mushroom for nothing. Either add the two
kinds as rewards (they look like heal rewards) or drop the scores until the
reward exists.

### 5.2 Split candidate — `src/params/game/worldParams.js` (techDebtAudit §1)

Still a 292-line catch-all mixing ~18 parameter domains, unlike every other
`params/game/` file. Proposed split — pure constant moves, no value changes:

| New file | Contents (exact export names) |
|---|---|
| `worldParams.js` (slim) | `DAYS_PER_WEEK`, `MOB_HARASS_CHANCE`, `MOB_HARASS_DMG_BASE`, `MOB_HARASS_DMG_RANGE`, `MOB_WANDER_CHANCE`, `MAX_LOG_ENTRIES` |
| `terrainGenParams.js` | `NOISE_MOISTURE`, `NOISE_ELEVATION_DETAIL`, `NOISE_RIDGE`, `NOISE_TEMP_VARIATION`, `NOISE_REGION`, `SEED_MOISTURE/TEMP/REGION_M/REGION_T/FEATURES/DETAIL/RIDGE`, `ELEVATION_DETAIL_MIX`, `HYPSOMETRIC_EXPONENT`, `TEMP_BASE`, `TEMP_LATITUDE_WEIGHT`, `TEMP_VARIATION_WEIGHT`, `TEMP_ELEVATION_LAPSE`, `RAIN_SHADOW_WIND/DISTANCES/ELEV_THRESHOLD/DRYING`, `WATER_MOISTURE_BOOST`, `MOUNTAIN_PEAK_MIN_NEIGHBORS`, `WATER_BFS_MAX_DEPTH`, `OCEAN_EDGE_BUFFER`, `SLOPE_NORMALIZATION`, `MAX_LOOKUP_RADIUS`, `WATER_LAND_GAP`, `SEA_LEVEL_ELEVATION`, `DEFAULT_TERRAIN_RULES`, `EPICENTER_CONFIG`, `RIVER_SOURCE_MIN_ELEV/MIN_MOIST/FRACTION`, `RIVER_MAX_LENGTH`, `RIVER_MOISTURE_BOOST`, `RIVER_BOOST_RADIUS` |
| `featureSpawnParams.js` | `NOISE_CHANNEL_FEATURES`, `NOISE_CHANNEL_FEATURE_TIER`, `FEATURE_DENSITY`, `FEATURE_TIERS`, `KNOT_BASE_AMOUNT`, `KNOT_AMOUNT_VARIATION_SCALE`, `KNOT_AMOUNT_VARIATION_MOD` |
| `chunkParams.js` | `STARTING_REGION_RADIUS`, `CHUNK_EVICTION_GRACE_DAYS`, `BACKGROUND_BUFFER_CHUNKS`, `BACKGROUND_GEN_SPREAD_MS` |

Consumers to re-point during the refactor: `terrainGen/**`,
`game/state/chunkManager.js` + `runtime/mapRefresh.js`.

### 5.3 Dead code to prune (techDebtAudit §6 — still present)

- `dev/tools/analysis/ui/cycle.js:139` — `restartCycle` export unused;
  `dev/tools/analysis/domRefs.js:54` — `els.statsPanel` cache unused
- `src/ui/setupHeptagram.js:144` — `getBalancedThird` export unused
- `src/devtools/performance/frameProfiler.js:62-68` — `'frame:tick'` instrumentation
  never enabled (enabling needs a matching exclusion in
  `reportBuilder._computeJsOverhead`)
- `src/devtools/performance/stats.js` — `bucketFrameTimes`/`computeEma` unused;
  `reportBuilder.js` duplicated `ftBuckets`/`th*` tallies, literal `50` vs
  `HITCH_THRESHOLD`, hardcoded "Worst 5 Frames" header
- `src/render/hexmap3d/` — full-map dead builders (`buildFeatureMeshes`,
  full-map `buildTreeMeshes`/`buildBaseMeshes`/`buildTerrainMesh`); 14 of 15
  `featureGeometries.js` getters unused; `scene/panAnimation.js`
  `_panFrameCount` debug leftover

### 5.4 Minor latent / perf notes (techDebtAudit §6 — still present)

- `minimapTerrainLayer.js:50` — color fallback is gray while the 3D path falls
  back to plains for `hill`/`plateau` (not currently visible: every biome
  palette defines them)
- `gameBuilder.js:256-273` — resolver runs twice per tile per pass (identical
  results; memoize per pass)
- `minimap.js:68-71` — fingerprint includes all traders unfiltered (extra
  redraws only); `movementHighlights.js:46` re-implements `occupiedByTrader`
  without the spatial index (equivalent)
- `combatRenderer.js:124` — unused `isActivePicker` param; `heraldModal.js:40,59`
  — empty `--faction-color` custom property; `setupActions.js:24` — hardcoded
  `a * 7 + b` vs `FACTION_COUNT`
- `dev/tools/analysis/generation/thresholdDerivation.js:246` — wrong JSDoc type

### 5.5 Out of scope (techDebtAudit §7)

- Root `styles/` (the game's CSS design system) — never audited at the same
  ~100-line level; a future pass could reuse the audit method.

### 5.6 Grove display-name nit (goalTerrainDecorConsolidation)

The goal specified per-terrain grove display names ("Forest Grove" / "Deep Wood
Grove"); groves still use one `displayName: 'Tree Grove'`
(`src/render/hexmap3d/worldObjects/descriptors/data/grove.js`). Either add
per-variant display names or close the goal.

### 5.7 Conditional extracts (techDebtAudit §2 — only if these files grow)

- `src/devtools/performance/reportBuilder.js` (938) — extract `_formatReport`
  (~148 lines) → `reportFormatter.js` if it grows past ~1,000 lines
- `src/game/state/featureRewards.js` (545) — extract the `FEATURES` table +
  card builders → `featureRewardTable.js` if it grows past ~650 lines
- `src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js` (890) —
  extract the entity path → `entityRecords.js` if it grows past ~1,100 lines
