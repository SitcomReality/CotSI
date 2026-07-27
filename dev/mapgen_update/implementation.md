# Map Generation Redesign — Implementation Tracker

**Overview:** `dev/mapgen_update/overview.md`
**Phase specs:** `dev/mapgen_update/phase0_calibration.md` through `phaseG_tuning_polish.md`

---

## Phase 0: Calibration Infrastructure

**Goal:** Histogram tooling, percentile-calibrated thresholds, snapshot tests.

- [ ] Frequency verification — run all noise fields, document `hexToWorld` rescaling relationship
- [ ] `dev/analysis/generation/histograms.js` — `collectHistograms`, `percentileFromHistogram`
- [ ] Calibrate thresholds across 5+ seeds × 3 radii (7, 21, 50)
- [ ] Calibrate `SLOPE_NORMALIZATION` from measured elevation deltas
- [ ] Derive target distribution budgets (% water, mountain, forest, etc.)
- [ ] `dev/analysis/generation/snapshotTest.js` — distribution invariant checks
- [ ] Wire snapshots into `dev/check_analysis_imports.py`
- [ ] Distributions tab in `dev/analysis.html` (histogram bars + threshold lines)
- [ ] Output `dev/mapgen_update/calibration_v1.json` with derived thresholds
- [ ] Run `python3 dev/check_analysis_imports.py` — must pass (includes snapshots)

---

## Phase A: Climate-Driven Classification + Supernatural Biomes

**Goal:** Replace independent biome noise with climate-driven selection + epicenter pass for supernatural biomes.

- [ ] Add noise config: `NOISE_CONTINENT`, `NOISE_PHASE_A_ELEVATION`, `NOISE_MOISTURE`, `NOISE_TEMP_VARIATION`, `NOISE_REGION`, `NOISE_EPICENTER`
- [ ] Add seed offsets including `SEED_EPICENTER`
- [ ] Implement `sampleBaseFields` (single-field elevation, temperature from latitude+lapse, two region bias fields)
- [ ] Implement `selectBiome()` — iterates `BIOME_PRIORITY_ORDER` (natural biomes only), checks `climateRange` — no supernatural entries to skip
- [ ] Implement `applySupernaturalOverrides()` — epicenter noise places supernatural biomes from `SUPERNATURAL_BIOMES` (Phase A: simple threshold)
- [ ] Rewrite `classifyTerrain` to use elevation + moisture + temperature + tree line + snow line + frozen water + biome `terrainRules`
- [ ] Remove `BIOME_DISTRIBUTION` and `biomeForRoll`
- [ ] Add `origin`, `climateRange`, `terrainRules`, `terrainMap` to biome archetypes; remove `moistureBias`
- [ ] Add supernatural biome placeholders (Brass Grave) with `origin: 'supernatural'`, `epicenterThreshold`, `terrainMap`, and `fieldModifiers`
- [ ] Restructure `generateChunkTiles`: sample → selectBiome → supernatural override → classify → tag → features → debris
- [ ] Update `gameFactory.js` to match new API
- [ ] Store continuous `elevation`, `temperature`, `moisture` on tiles
- [ ] Update analysis tool (`dev/analysis/generation/generate.js`)
- [ ] Run `python3 dev/check_imports.py` — must pass
- [ ] Run `python3 dev/check_analysis_imports.py` — must pass
- [ ] User playtest — verify biome boundaries follow climate, supernatural regions appear

---

## Phase B: Multi-Scale Elevation + Slope

**Goal:** 3-layer elevation composite (continent × detail). Slope discriminates mountain/plateau/hill. Border ring.

- [ ] Replace `NOISE_PHASE_A_ELEVATION` with `NOISE_CONTINENT`, `NOISE_ELEVATION_DETAIL`, `NOISE_RIDGE`
- [ ] Update `sampleBaseFields` with 3-layer composite + per-phase normalization (`/ 0.85`)
- [ ] Implement `computeSlope` using `SLOPE_NORMALIZATION` from Phase 0
- [ ] Implement border ring sampling (width = `MAX_LOOKUP_RADIUS`, currently 2)
- [ ] Fully classify border ring hexes through provisional water
- [ ] Add `hill` and `plateau` to `TERRAIN` in `terrainTypes.js`
- [ ] Update `classifyTerrain` with slope discrimination (mountain vs plateau, hills)
- [ ] Eliminate `fallbackT` — border ring provides real data for all neighbor lookups
- [ ] Add `plateauSlopeMin`, `hillElevationMin`, `hillSlopeMin` to `DEFAULT_TERRAIN_RULES`
- [ ] Run `python3 dev/check_imports.py` — must pass
- [ ] Run `python3 dev/check_analysis_imports.py` — must pass
- [ ] Re-run Phase 0 calibration against 3-layer composite
- [ ] User playtest — verify mountain ranges, plateaus, hills

---

## Phase C: Water-Adjusted Moisture

**Goal:** Elevation-driven water classification. Coastal moisture boost. No "dry ocean" basins.

- [ ] Implement `isProvisionalWater`: elevation < `waterMaxElevation` (primary) + moisture gate (secondary, for inland lakes)
- [ ] Implement `adjustMoisture`: coastal boost for land tiles within radius 2 of water
- [ ] Reorder passes: sample → provisional water → adjust moisture → biome → terrain
- [ ] Border ring hexes classified through `isProvisionalWater` for correct edge moisture
- [ ] Add `computeRainShadow` stub (returns 0, deferred to Phase G)
- [ ] "Dry basin" handling: low elevation + low moisture → falls through to terrain (salt flat / desert basin)
- [ ] Run `python3 dev/check_imports.py` — must pass
- [ ] Run `python3 dev/check_analysis_imports.py` — must pass
- [ ] User playtest — verify coastal wetness, lake greenery, no dry ocean basins

---

## Phase D: Rivers

**Goal:** Downhill river tracing. Fertile river valleys (moisture boost before terrain classification).

- [ ] Add river config: `RIVER_SOURCE_MIN_ELEV`, `RIVER_SOURCE_MIN_MOIST`, `RIVER_SOURCE_FRACTION`, `RIVER_MAX_LENGTH`, `RIVER_MOISTURE_BOOST`, `RIVER_BOOST_RADIUS`
- [ ] Implement `selectRiverSources`: N = `ceil(mapTileCount * RIVER_SOURCE_FRACTION)`, deterministic shuffle
- [ ] Implement `traceRiver`: downhill trace with seeded tie-breaking (avoids axis-locked rivers)
- [ ] Implement `applyRiverMoistureBoost`: boost moisture within `RIVER_BOOST_RADIUS` of river paths
- [ ] Store `isRiver: true` on river-path tiles
- [ ] River tracing in `generateTiles` wrapper (global post-pass, not per-chunk)
- [ ] Re-classify terrain for river-affected tiles after moisture boost
- [ ] Run `python3 dev/check_imports.py` — must pass
- [ ] Run `python3 dev/check_analysis_imports.py` — must pass
- [ ] User playtest — verify rivers flow downhill to water, fertile valleys visible

---

## Phase E: Feature Density from Climate

**Goal:** Continuous feature density from climate fields. Gradual forest edges.

- [ ] Implement `featureDensity(terrain, elevation, moisture, slope, treeLineMax)` → [0, 1]
- [ ] Update `spawnFeature`: density modulates noise thresholds (higher density → lower threshold → more features)
- [ ] Rock probability from slope + moisture
- [ ] Fruit tree climate check: moisture > 0.60 + elevation < tree line
- [ ] Replace hardcoded density enums with continuous `density` on feature objects
- [ ] Run `python3 dev/check_imports.py` — must pass
- [ ] Run `python3 dev/check_analysis_imports.py` — must pass
- [ ] User playtest — verify gradual forest edges, varied density

---

## Phase F: Ridged Noise for Mountains

**Goal:** Sharp mountain ridges via ridged FBM.

- [ ] Implement `ridgedFbm2D()` and `hexRidgedFbm2D()` in `src/engine/rules/noise.js`
- [ ] Swap ridge layer from regular FBM to ridged FBM in `sampleBaseFields`
- [ ] Add `offset` param to `NOISE_RIDGE` config
- [ ] Re-run Phase 0 calibration against ridged-FBM composite; update `ELEV_NORMALIZATION`
- [ ] Update per-phase normalization constant
- [ ] Run `python3 dev/check_imports.py` — must pass
- [ ] User playtest — verify sharper mountain ridges

---

## Phase G: Tuning & Polish

**Goal:** Final tuning. Deferred items addressed. Playtest-ready.

- [ ] Tune frequencies for radius 7, 21, 50 maps
- [ ] Tune composite weights and terrain thresholds against target budgets
- [ ] Tune feature spawn rates after density modulation
- [ ] Epicenter region growth: replace thresholded noise with distance-based growth
- [ ] Apply fieldModifiers within epicenter regions (elevationOffset, moistureMultiplier, temperatureOffset)
- [ ] Apply terrainMap after classifyTerrain to produce biome-specific terrain types
- [ ] Tune epicenter frequency and per-biome region sizes + floating island production via elevationOffset
- [ ] Add beach terrain type
- [ ] Add tundra/cold-steppe biomes (fill cold+dry climate gap)
- [ ] Biome topological smoothing (optional)
- [ ] Domain warping (optional, if blob artifacts persist)
- [ ] Rain shadow: implement or permanently defer with rationale
- [ ] Tighten snapshot test ranges
- [ ] Final playtest pass

---

## Notes

- Each phase checkmark = code written, import checks pass, snapshot tests pass, ready for user testing.
- "User playtest" items are verification steps — the user tests and reports.
- Phases are ordered by dependency. Phase C and F can run in parallel after Phase B.
- Phase 0 calibration must be re-run after any change that affects noise output distributions (composite formula changes, frequency changes, new noise layers).
