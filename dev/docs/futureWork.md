# Future Work & Deferred Items

Forward-looking tracker. Contains only work that is deferred or still to be
implemented. Completed work lives in git history, not here; design notes and
reference material live in their own docs (`dev/docs/terrainGenNotes.md`,
`dev/docs/gameMechanics.md`, `dev/docs/descriptorAuthoring.md`).

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

### 1.7 Feature reward design & balance

Rewards are functional but un-tuned — amounts, tier scaling, and the shared
`FEATURE_REGROW_DAYS` cadence need a design/balance pass. Edenfall mushrooms
heal on starting values (`FEATURE_EDEN_MUSHROOM_HEAL` /
`FEATURE_EDEN_SHROOMLET_HEAL` in `src/params/game/economyParams.js`).
Per-feature reward intent tracked in `dev/docs/featureDesign.md` §5.

---

## 2. Bot AI

Bot decision-making is deliberately small today: map movement is a scored,
radius-limited target search with an exploration fallback
(`src/game/state/championAI.js` + `src/params/game/aiParams.js`), and combat
picks are a weighted heuristic over revealed intel
(`src/game/state/combat/combatBotAI.js`). A real AI pass is a big update when
it happens; the open design work:

- **Global strategy / directionality** — bots radius-limit their targeting
  but have no global strategy. A simple bias toward unexplored tiles /
  nearest God's Knot / enemy prevents circle-wandering. Design task as much
  as performance.
- **Large-map-appropriate exploration** — on the big maps (§3), local
  exploration should bias toward resource gradients and away from recently
  visited areas; victory conditions may need rethinking.

---

## 3. Large-map: reference & future scale

Chunked storage, lazy per-chunk generation, the background generation buffer
around the champion, eviction with delta extraction, and the fixed-pixel
champion-centered minimap are implemented; map sizes in the original roadmap
document are out of date. Remaining scale work:

### 3.1 Persistence

Save seed + list of dirty tiles with their deltas; everything else regenerates
(only the diff from procedural generation).

### 3.2 What NOT to do (yet)

- No worker threads for generation — single-threaded JS with
  clock-scheduled chunk generation is sufficient up to R=200.
- No LOD unless profiling shows it's needed — InstancedMesh + frustum
  culling handles R=100 comfortably.
- **NO ACTUAL INFINITY** — build systems with the perspective of "how would
  this need to work if the map were infinite?", not to actually have infinite
  maps. Players eventually finding each other and fighting is core to design.

### 3.3 Still-open scale concerns

- **Camera caps + fog are tuned to current map scale** — zoom is capped
  (`ZOOM_MAX_FRUSTUM=20`, `DEFAULT_REFERENCE_FRUSTUM=40` in
  `src/params/render/cameraParams.js`), as are `CAMERA_FAR=200` and the
  scene fog (`sceneSetup.js`, 60–160); shadows are radius dependent. A
  conceptually infinite map still needs terrain-gen's radius semantics
  removed (`worldShape` falloff, noise scaled by 1/radius, latitude term,
  distance clamp) plus camera-driven chunk streaming (see §3.1).

---

## 4. Geometry editor — remaining deferred content

All content is migrated to descriptor data except the fruit tree, which stays
on its legacy builder by decision. The descriptor model, the editor's
variant-scoped write-back, and the mob/trader geometry conventions are
documented in `dev/docs/descriptorAuthoring.md` and
`dev/docs/mobGeometryAndAnimation.md`.

- **fruitTree** — deferred by decision: stays on the procedural builder
  (`worldObjects/fruitTree/`); a simple trunk + grove-family canopy + 1–2
  hanging fruit, ripe state reflecting the heal/regrow cycle. Migrating it
  to descriptors would need procedural/part-instancing support in the
  descriptor model; not worth the churn while it reads well at game scale.
- **Champion accents** — minimal per-faction placeholders; richer looks are
  authorable in the editor. Tier-2 mob accents were removed with the
  scorpelican/infernalpaca rework (no tier-2 mob variants remain).
- **Mob animation runtime** — deferred; see `dev/docs/mobGeometryAndAnimation.md`
  §4–5 for the worked approach (declarative clip spec, per-render-pass hook).

---

## 5. Maintenance follow-ups (from techDebtAudit.md)

Consolidated here when the audit doc was retired (2026-08-11); the rest of that
document described completed work and now lives in git history. Only the open
items below remain.

### 5.1 Split candidate — `src/params/game/worldParams.js` (techDebtAudit §1)

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

### 5.2 Dead code to prune (techDebtAudit §6 — still present)

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

### 5.3 Minor latent / perf notes (techDebtAudit §6 — still present)

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

### 5.4 Out of scope (techDebtAudit §7)

- Root `styles/` (the game's CSS design system) — never audited at the same
  ~100-line level; a future pass could reuse the audit method.

### 5.5 Conditional extracts (techDebtAudit §2 — only if these files grow)

- `src/devtools/performance/reportBuilder.js` (938) — extract `_formatReport`
  (~148 lines) → `reportFormatter.js` if it grows past ~1,000 lines
- `src/game/state/featureRewards.js` (557) — extract the `FEATURES` table +
  card builders → `featureRewardTable.js` if it grows past ~650 lines
- `src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js` (890) —
  extract the entity path → `entityRecords.js` if it grows past ~1,100 lines
