# Tech Debt Audit — Monolith Refactor Readiness

**Date:** 2026-08-10
**Scope:** every JS/HTML/CSS file at/above ~100 lines in `src/` and `dev/`, excluding `src/vendor/` (third-party), generated descriptor data (`src/render/hexmap3d/features/descriptors/data/`), `.md` docs, and `.py` scripts. `tests/` was not part of the agreed scan.
**Method:** parallel read-only sub-agent audit of 12 file batches; every import/export cross-checked with the project's own checkers (`check_imports.py`, `check_analysis_imports.py`, `check_geometry_editor_imports.py`) and the 578-test suite.
**Result:** 119 files audited. **2 clear split candidates**, 2 optional extracts, and 4 cohesive monoliths that are large but correctly left intact. 24 overt errors / defects were fixed (behavior-preserving unless the code contradicted its own documented intent). No refactoring was performed — this report is the deliverable; each split waits for approval.

---

## 1. Split candidates (recommended)

### `src/params/game/worldParams.js` (292) — **SPLIT**
The one clear outlier. Its own header says "World simulation, days, and *shared game-world constants*" — a catch-all mixing ~18 unrelated parameter domains. Every other file in `params/game/` is per-domain (`aiParams.js`, `combatParams.js`, `spawnParams.js`), so this breaks the established pattern. Proposed modules (all descriptive, no banned words):

| New file | Contents (exact export names) |
|---|---|
| `worldParams.js` (slim) | `DAYS_PER_WEEK`, `MOB_HARASS_CHANCE`, `MOB_HARASS_DMG_BASE`, `MOB_HARASS_DMG_RANGE`, `MOB_WANDER_CHANCE`, `MAX_LOG_ENTRIES` |
| `terrainGenParams.js` | `NOISE_MOISTURE`, `NOISE_ELEVATION_DETAIL`, `NOISE_RIDGE`, `NOISE_TEMP_VARIATION`, `NOISE_REGION`, `SEED_MOISTURE/TEMP/REGION_M/REGION_T/FEATURES/DETAIL/RIDGE`, `ELEVATION_DETAIL_MIX`, `HYPSOMETRIC_EXPONENT`, `TEMP_BASE`, `TEMP_LATITUDE_WEIGHT`, `TEMP_VARIATION_WEIGHT`, `TEMP_ELEVATION_LAPSE`, `RAIN_SHADOW_WIND/DISTANCES/ELEV_THRESHOLD/DRYING`, `WATER_MOISTURE_BOOST`, `MOUNTAIN_PEAK_MIN_NEIGHBORS`, `WATER_BFS_MAX_DEPTH`, `OCEAN_EDGE_BUFFER`, `SLOPE_NORMALIZATION`, `MAX_LOOKUP_RADIUS`, `WATER_LAND_GAP`, `SEA_LEVEL_ELEVATION`, `DEFAULT_TERRAIN_RULES`, `EPICENTER_CONFIG`, `RIVER_SOURCE_MIN_ELEV/MIN_MOIST/FRACTION`, `RIVER_MAX_LENGTH`, `RIVER_MOISTURE_BOOST`, `RIVER_BOOST_RADIUS` |
| `featureSpawnParams.js` | `NOISE_CHANNEL_FEATURES`, `NOISE_CHANNEL_FEATURE_TIER`, `FEATURE_DENSITY`, `FEATURE_TIERS`, `KNOT_BASE_AMOUNT`, `KNOT_AMOUNT_VARIATION_SCALE`, `KNOT_AMOUNT_VARIATION_MOD` |
| `chunkParams.js` | `STARTING_REGION_RADIUS`, `CHUNK_EVICTION_GRACE_DAYS`, `BACKGROUND_BUFFER_CHUNKS`, `BACKGROUND_GEN_SPREAD_MS` |

Consumers to re-point during the refactor: `terrainGen/**` (noise/terrain/feature params), `game/state/chunkManager.js` + `runtime/mapRefresh.js` (chunk params). Pure constant moves — no value changes.

### `dev/geometryEditor/ui/main.js` (430) — **SPLIT**
The object browser is a self-contained feature with its own persistent state (`collapsedCategories`, `browserOpen`), already delimited by the `── Object browser ──` / `── Floating object browser ──` section comments (~lines 165–327). Extract it to `dev/geometryEditor/ui/objectBrowser.js` exporting `renderObjectList(filter)`, `setBrowserOpen(open)`, `populateObjects()`. `main.js` keeps preview orchestration, control bindings, and init (~230 lines). Matches the existing `ui/` module granularity (`partList`, `projectControls`, `objectControls` each own one feature).

## 2. Optional extracts (only if the file grows)

| File | Extract | When |
|---|---|---|
| `src/dev/performance/reportBuilder.js` (938) | `_formatReport` (~lines 769–916, ~148 lines) → `reportFormatter.js` — reads only the assembled report + thresholds, zero coupling to analysis internals | if it grows past ~1,000 lines |
| `dev/analysis/styles/controls.css` (280) | the `.collapsible` / `.summary-*` / `.batch-body` block (~60 lines) → `batch.css` or a `collapsible.css` | if it grows |
| `src/game/state/featureRewards.js` (545) | the `FEATURES` table + card builders (pure data, imports only archetypes/params) → `featureRewardTable.js` | if it grows past ~650 lines |
| `src/render/hexmap3d/features/descriptors/recordBuilder.js` (890) | entity path (lines ~722–890) → `entityRecords.js`, sharing frame helpers via `frameMatrices.js` | if it grows past ~1,100 lines |

## 3. Large cohesive monoliths correctly kept

These are big but single-responsibility; splitting would create tangled cross-imports or one-consumer modules:

| File | Lines | Why keep |
|---|---|---|
| `descriptors/schema.js` | 1217 | One responsibility (descriptor data format); validation/normalization/denormalization share a private helper surface and feed each other; docs cite it as the canonical home |
| `descriptors/recordBuilder.js` | 890 | One dense private function graph with thin entry points; the two recursions are pinned in lockstep by the editor gizmo contract and tests |
| `src/dev/performance/reportBuilder.js` | 938 | One linear pipeline; stages are already cleanly separated private functions sharing intermediates |
| `descriptors/gameBuilder.js` | 329 | Small, well-factored: table + uniform peer resolvers + one orchestrator |

## 4. Full verdict list

Verdict key: **keep** = cohesive monolith / already appropriately factored; **split** = clear win. Rationales are one line.

### `src/render/hexmap3d/features/descriptors/`
| File | Lines | Verdict |
|---|---|---|
| `schema.js` | 1217 | keep — single cohesive data-format module (see §3) |
| `recordBuilder.js` | 890 | keep — one function graph, split risks drift (see §2 optional) |
| `gameBuilder.js` | 329 | keep — table + uniform resolvers, already factored |

### `dev/geometryEditor/`
| File | Lines | Verdict |
|---|---|---|
| `preview.js` | 571 | keep — one viewport module; state + render loop shared across concerns |
| `styles/controls.css` | 551 | keep — one control-system family; specificity defects fixed (see §5) |
| `ui/partInspector.js` | 496 | keep — one contextual panel, renderers co-located |
| `ui/partTree.js` | 479 | keep — tree-walk + structural edits share one identity; split buys an import hop |
| `ui/main.js` | 430 | **split** — extract object browser to `ui/objectBrowser.js` (see §1) |
| `ui/projectControls.js` | 191 | keep — one concern (project actions on the chrome bar) |
| `ui/objectControls.js` | 179 | keep — one panel renderer |
| `ui/formControls.js` | 178 | keep — one family of DOM builders, true leaf |
| `ui/partList.js` | 161 | keep — one panel |
| `styles/browser.css` | 113 | keep — single feature |
| `styles/layout.css` | 102 | keep — single concern (page grid + shell); stale comment fixed |

### `dev/analysis/`
| File | Lines | Verdict |
|---|---|---|
| `analysis.html` | 197 | keep — pure HTML shell; zero inline JS/CSS (links `ui/main.js`, `styles/index.css`) |
| `generation/thresholdDerivation.js` | 310 | keep — one theme; private helpers shared by both entry points |
| `generation/seamTest.js` | 270 | keep — one invariant test flow; formatter already split out |
| `generation/frequencyVerification.js` | 169 | keep — single-purpose field registry + transect measurement |
| `generation/climateCoverage.js` | 161 | keep — measurement + small formatter |
| `generation/histograms.js` | 154 | keep — collection + percentile under one theme |
| `generation/multiSeed.js` | 153 | keep — cohesive, but orphaned: superseded by `batch/batchRunner.js` (see §6) |
| `generation/snapshotTest.js` | 144 | keep — tolerance table + single test loop + formatter |
| `generation/calibrationExport.js` | 120 | keep — serialization + formatting of the same result |
| `generation/quantileLUT.js` | 114 | keep — pooling/LUT/normalization one coherent unit (bin-mapping bug fixed) |
| `generation/noiseConfig.js` | 101 | keep — pure config, single source of truth |
| `generation/seamTestReport.js` | 99 | keep — two formatters over one result shape |
| `ui/batchPanel.js` | 204 | keep — one feature's lifecycle (reads/orchestrates/downloads) |
| `ui/main.js` | 194 | keep — entry-point wiring; cohesion is its job |
| `ui/cycle.js` | 142 | keep — seed stepping + autoplay; stepping already factored out |
| `stats/calibrationDisplay.js` | 251 | keep — all exports are calibration formatting; dead exports to prune (see §6) |
| `stats/batchReport.js` | 197 | keep — one formatter delegating to section reporters |
| `stats/statsDisplay.js` | 174 | keep — single-seed report + DOM update; `formatMultiStats` dead |
| `stats/spatialStats.js` | 161 | keep — one algorithm, formatting already split out |
| `stats/tileStats.js` | 160 | keep — six sibling distributions; the one distinct concern is ~25 lines |
| `stats/reportBaseFormat.js` | 117 | keep — small helpers + label table |
| `batch/batchRunner.js` | 222 | keep — single radii×seeds loop, phases clear; seeds/aggregation already factored |
| `batch/aggregators.js` | 115 | keep — four same-shape aggregators; splitting gives one-function files |
| `batch/seedProcessor.js` | 111 | keep — one per-seed collection routine |
| `render/renderDistributions.js` | 169 | keep — one public render + panel constants |
| `render/renderMap.js` | 141 | keep — one render pass; river overlay extract not clearly better |
| `render/theme.js` | 120 | keep — constants-only, sectioned |
| `render/orchestrate.js` | 107 | keep — canvas sizing + dispatch glue |
| `legend/legend.js` | 185 | keep — dispatcher + shared helpers; heavy builders already extracted |
| `legend/riversLegend.js` | 110 | keep — one builder |
| `styles/controls.css` | 280 | keep — coherent control-panel chrome; optional collapsible extract (see §2) |
| `styles/batch.css` | 110 | keep — single concern |
| `domRefs.js` | 95 | keep — central DOM cache is cohesive by design |

### `src/game/state/`
| File | Lines | Verdict |
|---|---|---|
| `featureRewards.js` | 545 | keep — reward resolution: table + builders feed one grant-applicator (optional table extract, §2) |
| `chunkManager.js` | 209 | keep — one lifecycle over one storage model |
| `gameFactory.js` | 176 | keep — documented composition root; a linear pipeline |
| `fogOfWar.js` | 119 | keep — one concern, shared cache contract |
| `entityFactory.js` | 108 | keep — twin creators share sampling; split would duplicate it |
| `combat/combatState.js` | 137 | keep — factory + queries over one combat shape, already decomposed |
| `combat/combatAutoResolve.js` | 114 | keep — composition point over the combat modules |
| `combat/combatScoring.js` | 110 | keep — pure scoring unit (defense-buff bug fixed) |
| `combat/combatPicks.js` | 107 | keep — pick recording + phase machine interlocked on purpose |

### `src/game/rules/`
| File | Lines | Verdict |
|---|---|---|
| `archetypeData/features.js` | 256 | keep — uniform-schema registry; splitting by theme gives same-shape files |
| `terrainGen/chunkGeneration.js` | 229 | keep — orchestration over extracted passes; passes share live state |
| `dispatchReport.js` | 223 | keep — one report builder with an explicit `CONTRIBUTORS` extension point |
| `terrainGen/postProcess/waterRules.js` | 209 | keep — three algorithms sharing one domain + predicate |
| `terrainGen/placement/epicenterPlacement.js` | 179 | keep — dart-throwing + region application are one algorithm |
| `terrainGen/postProcess/connectivityEnforcement.js` | 167 | keep — one BFS+Dijkstra algorithm (no-op bug fixed) |
| `factionData.js` | 117 | keep — display tables + Paley math are one concept |
| `archetypes.js` | 112 | keep — the registry itself, irreducible core |
| `archetypeData/mobs.js` | 112 | keep — table-driven per AGENTS.md; no natural clusters |
| `terrainGen/classification/terrainClassification.js` | 106 | keep — classification + elevation tightly related |

### `src/render/hexmap3d/`
| File | Lines | Verdict |
|---|---|---|
| `hexMapRenderer.js` | 243 | keep — orchestration facade; sub-concerns already extracted |
| `features/meshBuilder.js` | 182 | keep — instance-mesh assembly sharing a scratch-matrix pool (proxy bug fixed) |
| `features/decorEmphasis.js` | 157 | keep — pure rules, unit-tested |
| `features/geometries/featureGeometries.js` | 176 | keep — cached placeholder registry (14/15 getters unused scaffolding) |
| `features/geometries/mountainGeometries.js` | 164 | keep — cached variant pyramid builders |
| `features/baseMeshes.js` | 99 | keep — thin descriptor-pipeline wrapper |
| `features/trees/buildTreeMeshes.js` | 103 | keep — thin wrapper; record math already lives elsewhere |
| `terrain/buildTerrainMesh.js` | 178 | keep — vertex writer; color/height delegated already |
| `terrain/buildWaterMesh.js` | 167 | keep — mirrors buildTerrainMesh; sync contract with waterSparkles |
| `scene/panAnimation.js` | 145 | keep — both motion styles share one cancellation slot |
| `scene/sceneSetup.js` | 134 | keep — delegates to rendererSetup/lightSetup/cameraState |
| `scene/outline.js` | 133 | keep — one technique: material + hull cache inseparable |
| `scene/materials.js` | 118 | keep — material + shader defs sharing a uniform |
| `units/movementAnimator.js` | 250 | keep — state machine + lifecycle; pure math already extracted |
| `units/unitMeshes.js` | 246 | keep — cohesive assembly module |
| `units/pieceIcons.js` | 214 | keep — SVG table + texture cache + build, used only here |

### `src/render/minimap/` + `src/render/overlays/`
| File | Lines | Verdict |
|---|---|---|
| `minimap/minimap.js` | 113 | keep — facade over already-split layer modules |
| `minimap/minimapOverlayLayer.js` | 187 | keep — one canvas renderer; dots + camera indicator share projection |
| `minimap/minimapTerrainLayer.js` | 172 | keep — one cached render entry with two draw paths |
| `overlays/interactionHighlights.js` | 238 | keep — one coherent pass; draw primitives used only here |
| `overlays/movementHighlights.js` | 107 | keep — single render function |
| `overlays/selectionRing.js` | 99 | keep — single render function |

### `src/ui/`
| File | Lines | Verdict |
|---|---|---|
| `viewModels/combatViewModel.js` | 298 | keep — one pure transformer; sectioned helpers share intermediates |
| `combat/combatFx.js` | 266 | keep — cohesive FX primitive set sharing modal lookups |
| `combat/combatRenderer.js` | 184 | keep — one renderer for one modal |
| `combat/combatReveal.js` | 105 | keep — single orchestration flow (wrong element id fixed) |
| `modals/dispatchModal.js` | 199 | keep — cohesive report renderer |
| `modals/rewardModal.js` | 168 | keep — already separated from the artifact flow |
| `modals/artifactChoiceModal.js` | 157 | keep — already split out of rewardModal |
| `modals/heraldModal.js` | 120 | keep — one modal, one flow |
| `modals/confirmModal.js` | 105 | keep — promise-based confirm, one responsibility |
| `panels/mainLog.js` | 152 | keep — one table builder with sub-builders specific to it |
| `panels/leftPanel.js` | 95 | keep — single bind function |
| `setupHeptagram.js` | 149 | keep — one screen concern (dead `getBalancedThird` export, §6) |
| `setupActions.js` | 138 | keep — cohesive actionBus registration group |
| `iconPaths.js` | 102 | keep — cohesive lookup table, canonical constants file |

### `src/dev/`
| File | Lines | Verdict |
|---|---|---|
| `performance/reportBuilder.js` | 938 | keep — one pipeline (optional formatter extract, §2) |
| `performance/frameProfiler.js` | 237 | keep — per-frame ring-buffer capture |
| `performance/captureLogger.js` | 171 | keep — session orchestrator, too small to split |
| `performance/measurements.js` | 164 | keep — one registry |
| `performance/frameTracker.js` | 119 | keep — FPS history + callbacks |
| `panel/init.js` | 109 | keep — orchestration + config block |

### `src/runtime/`, `src/shared/`, `src/engine/`, `src/params/`
| File | Lines | Verdict |
|---|---|---|
| `runtime/mapRefresh.js` | 204 | keep — one pipeline; delegates to render/minimap/camera |
| `runtime/botTurnRunner.js` | 188 | keep — single flow; move loop inline because it awaits animation (turn-lock leaks fixed) |
| `runtime/refreshAll.js` | 141 | keep — central orchestrator, one exported function |
| `runtime/bootstrap.js` | 107 | keep — one DOMContentLoaded wiring flow |
| `runtime/combat/combatRoundEnd.js` | 98 | keep — single round-end flow |
| `shared/clockScheduler.js` | 314 | keep — factory + singleton; heavy lifting already in speedGroup/timerQueue (latent group bug fixed) |
| `engine/rules/noise.js` | 264 | keep — one seeded-simplex toolbox with shared perm-table cache |
| `params/game/worldParams.js` | 292 | **split** — catch-all mixing ~18 domains (see §1) |
| `params/game/economyParams.js` | 112 | keep — cohesive economy/reward domain |
| `params/render/geometryParams.js` | 218 | keep — cohesive 3D-geometry domain, sectioned by object type |
| `params/render/terrainParams.js` | 105 | keep — cohesive render constants, matches sibling pattern |

---

## 5. Overt errors fixed (all verified against import checks + 578 tests)

| # | Location | Problem → Fix |
|---|---|---|
| 1 | `src/game/state/combat/combatScoring.js:39-40` | **Defense buff sign inverted** — a champion's "+3 defense" buff made the *opponent* score higher, contradicting the code's own comment ("defense subtracts from the opponent's"). Both combat paths hit it. → subtract opponent defense. ⚠ changes combat math to match documented intent — worth an in-game test |
| 2 | `src/game/state/entityFactory.js:57` | Mob `hp` could exceed `maxHp` at spawn (up to 1.5×) → `Math.min(base.maxHp, base.hp + hpRoll)` |
| 3 | `src/game/rules/terrainGen/postProcess/connectivityEnforcement.js:71-91` | **Connectivity pass was a no-op** — isolated components were marked into `mainComponent`, so the bridging Dijkstra terminated on its own seed and never demoted any impassable hex. → global visited tracking moved to `bfsVisited`; `mainComponent` stays clean for the Dijkstra; outer loop skips via `bfsVisited`. ⚠ changes generated terrain for maps with isolated pockets (bridges now actually appear) — worth an in-game look |
| 4 | `src/ui/combat/combatReveal.js:61` | Clash-pulse FX looked up `#combatOverlay`, which doesn't exist (root is `#combatModal`) — the winning-token halo / loser dim / score-tick pulse silently never fired → corrected id |
| 5 | `src/shared/clockScheduler.js:108-113,126-130` | Latent: an unknown speed-group name computed the deadline with the default group but tagged the task with the raw name, so `timerQueue.popExpired` would never fire it → resolve the effective group first (defensive; all current callers pass valid groups) |
| 6 | `src/runtime/botTurnRunner.js:61-66,166-177,178-183` | **Turn-lock leaks** — a falsy `aiDecide` result (dead/non-bot champion) or an unknown action exited `runBot` with `G.turnLock` still held, freezing the turn cycle; error path also left the bot indicator + profiler measure open → falsy/unknown now finish the turn defensively; error path hides indicator and closes the measure |
| 7 | `src/render/hexmap3d/features/descriptors/schema.js:283-291` | Latent `shapeBaseOffset` edge case for sphere polar bands that don't cover a pole (wrong lowest-vertex math; all in-repo content computes identically) → covers-south-pole / min-endpoint logic, behavior-preserving |
| 8 | `dev/analysis/generation/quantileLUT.js:53,72` | LUT entries built at `i/binCount` but sampled at `k/(binCount-1)` — off-by-one-bin divergence at the top of the CDF → aligned to `i/(binCount-1)` (also makes the degenerate identity LUT exact) |
| 9 | `dev/analysis/generation/climateCoverage.js:40-51` | Empty-map early return omitted `seed`/`radius`/`totalTiles`, printing `Seed: undefined` in the error header → fields added |
| 10 | `src/dev/performance/reportBuilder.js:90,116-117,739-741` | `slowClusters[].startTs` was an array index while `endTs` was a timestamp (mixed units) → both are now timestamps (`startTs`/`endTs`) |
| 11 | `src/render/hexmap3d/features/meshBuilder.js:24-62` | `collectInstances` would throw on `state.tiles` (a Proxy, not a Map / not iterable) — the documented full-map path was a landmine → added a "q,r"-keyed accessor branch (mirrors `baseMeshes.js`); Map and array paths unchanged |
| 12 | `dev/geometryEditor/ui/main.js:238-239` | Filtered object count never included the pinned "Custom (loaded)" row (could read "0 of N") → counted via `isCustomDescriptor()` |
| 13 | `dev/geometryEditor/styles/controls.css` | Two specificity defeats: `#inspector input[type="number"]` beat `.num-step input…` (steppers doubled their outline; "shed its own border" design never applied) and `#inspector select` capped `.part-actions select` at 150px (placeholder clipped) → scoped the winners as `#inspector .num-step input[type="number"]` / `#inspector .part-actions select`; also deleted the dead `.control-row.hint` block (never emitted) |
| 14 | Stale comments | `layout.css:94` + `geometryEditor.html:34` (browser is right-anchored, not left); `hexMapRenderer.js:88` (ground plane is this-session temp, not legacy cleanup); `descriptors/data/index.js:16-17` (painforest groves are descriptor-driven now); `analysis/stats/batchReport.js:8-10` (header listed unused delegates) |
| 15 | Dead imports removed | `frequencyVerification.js:12` (`hexToWorld`), `multiSeed.js:8` (`DEFAULT_CHAMPIONS`), `batchRunner.js:9` (`getNoiseConfig` → `NOISE_CONFIG`), `calibrationDisplay.js:7` (`NOISE_CONFIG`/`NOISE_FIELDS`), `refreshAll.js:14` (`refreshZoomDisplay`), `frameProfiler.js:12` (`getFrameHistory`), `batchReport.js:19` (`formatFrequencyReport`), `analysis/ui/main.js:20` (`runBatchAnalysis`) |
| 16 | Dead code removed | `multiSeed.js:89,107` (`allChampionPositions` — pushed, never read); `analysis/domRefs.js:89-91` (duplicate `legend`/`loading`/`mapArea` assignments) |

**Verification after fixes:** `python3 dev/check_imports.py` → OK (334 files, all named exports verified); `python3 dev/check_analysis_imports.py` → OK (54 files); `python3 dev/check_geometry_editor_imports.py` → OK (17 files); `tests/run.sh` → **578 pass / 0 fail**. The 18-entry boundary report (informational known-debt imports) is unchanged and pre-existing.

## 6. Follow-ups (not fixed — judgment calls / design decisions)

**Needs a design decision (flagged for the user):**
- `src/params/game/aiParams.js:37,43` — `BOT_FEATURE_SCORES` gives `edenMushroom: 24` / `edenShroomlet: 18`, but **no reward logic exists for either kind** (`featureRewards.js`'s `FEATURES` table has no entries; `arrivalInteractions.js` only handles fruitTree/knot/treasureChest). Bots spend a full turn pathing to an Edenfall mushroom for nothing. Either add the two kinds as rewards (they look like heal rewards) or drop the scores until the reward exists. Not tracked in `dev/futureWork.md`.

**Dead code to prune in the refactor pass (not errors):**
- `analysis/stats/calibrationDisplay.js` — `formatHistogramReport`, `formatQuantileReport`, `formatCalibrationAll`, `formatMultiCalibrationReport`, `buildAndFormatLUTs` have no importers (calibration tool UI no longer exists); `formatFrequencyReport` now also has none after fix #15
- `analysis/stats/statsDisplay.js:127` — `formatMultiStats` (dead since batchRunner)
- `analysis/ui/cycle.js:139` — `restartCycle` export; `analysis/domRefs.js:54` — `els.statsPanel` cache
- `src/ui/setupHeptagram.js:144-148` — `getBalancedThird` export
- `src/dev/performance/frameProfiler.js:62-68` — `'frame:tick'` instrumentation is never enabled; enabling needs a matching exclusion in `reportBuilder._computeJsOverhead`
- `src/dev/performance/` — `stats.js` `bucketFrameTimes`/`computeEma` unused; `reportBuilder.js` duplicated `ftBuckets`/`th*` tally, literal `50` vs `HITCH_THRESHOLD`, hardcoded "Worst 5 Frames" header
- `src/render/hexmap3d/` — full-map dead builders (`buildFeatureMeshes`, full-map `buildTreeMeshes`/`buildBaseMeshes`/`buildTerrainMesh`); 14 of 15 `featureGeometries.js` getters unused; `panAnimation.js` `_panFrameCount` debug leftover
- `dev/analysis/generation/multiSeed.js` — whole module orphaned (superseded by `batchRunner`); `thresholdDerivation.js:177` `calibratePipeline` also unwired. Deleting or rewiring is a judgment call.

**Minor latent / perf notes (not fixed):**
- `minimapTerrainLayer.js:50` — color fallback is gray while the 3D path falls back to plains for `hill`/`plateau` (not currently visible: every biome palette defines them)
- `gameBuilder.js:256-273` — resolver runs twice per tile per pass (identical results; memoize per pass)
- `minimap.js:68-71` — fingerprint includes all traders unfiltered (extra redraws only); `movementHighlights.js:46` re-implements `occupiedByTrader` without the spatial index (equivalent)
- `recordBuilder.js:807` — dead `descriptor` param in `collectEntityPart`; `combatRenderer.js:124` — unused `isActivePicker` param; `heraldModal.js:40,59` — empty `--faction-color` custom property; `setupActions.js:24` — hardcoded `a * 7 + b` vs `FACTION_COUNT`
- `thresholdDerivation.js:246` — wrong JSDoc type

## 7. Out of scope (noted for a future pass)

- Root `styles/` (the game's CSS design system) — not part of the agreed scan; same ~100-line audit could be run on it.
- `tests/` suite files — excluded by the agreed scope.
- `src/vendor/` (third-party Three.js) and generated descriptor data — never hand-edited.
- The 18 known-debt imports in the boundary report are pre-existing architectural debt, separate from monolith concerns.
