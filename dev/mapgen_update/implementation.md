# Map Generation Redesign — Implementation Tracker

**Overview:** `dev/mapgen_update/overview.md`
**Phase specs:** `dev/mapgen_update/phase0_calibration.md` through `phaseG_tuning_polish.md`

---

## Phase 0: Calibration Infrastructure + Quantile Normalization

**Goal:** Histogram tooling, quantile CDF LUTs for all continuous fields, percentile-based thresholds, snapshot tests.

- [x] Frequency verification — `dev/analysis/generation/frequencyVerification.js` — `verifyFrequency`, `formatFrequencyReport`, `checkWavelength`
- [x] `dev/analysis/generation/histograms.js` — provisional `sampleBaseFields`, `collectHistograms`, `percentileFromHistogram`
- [x] `dev/analysis/generation/quantileLUT.js` — `poolHistograms`, `buildQuantileLUT`, `normalizeField` (256-entry LUTs with linear interpolation)
- [ ] Calibrate quantile LUTs across 5+ seeds × 3 radii (7, 21, 50)
- [ ] Calibrate `SLOPE_NORMALIZATION` from measured elevation deltas
- [ ] Calibrate `EPICENTER_GRID.cellSize` for target supernatural biome coverage (3–10%)
- [ ] Derive target distribution budgets (% water, mountain, forest, etc.)
- [ ] `dev/analysis/generation/snapshotTest.js` — distribution invariant checks
- [ ] `dev/analysis/generation/seamTest.js` — chunk-seam invariant verification
- [ ] `dev/analysis/generation/climateCoverage.js` — biome climate-cube coverage report
- [ ] Wire snapshots into `dev/check_analysis_imports.py`
- [ ] Distributions tab in `dev/analysis.html` (histogram bars + threshold lines + quantile LUT preview)
- [ ] Output `dev/mapgen_update/calibration_v1.json` with quantile LUTs and derived percentile thresholds
- [ ] Run `python3 dev/check_analysis_imports.py` — must pass (includes snapshots, seam test, climate coverage)

---

## Phase A: Climate-Driven Classification + Jittered-Grid Supernatural Biomes

**Goal:** Replace independent biome noise with climate-driven selection + jittered-grid epicenter for supernatural biomes. Full epicenter system: grid placement, noise-modulated radial falloff, fieldModifiers, terrainMap — no placeholder.

- [ ] Add noise config: `NOISE_CONTINENT`, `NOISE_PHASE_A_ELEVATION`, `NOISE_MOISTURE`, `NOISE_TEMP_VARIATION`, `NOISE_REGION`
- [ ] Add `EPICENTER_GRID` config (`cellSize`, `jitterAmplitude`)
- [ ] Add seed offsets (excluding `SEED_EPICENTER` — not needed for grid-based epicenter)
- [ ] Implement `sampleBaseFields` (single-field elevation, temperature from latitude+lapse, two region bias fields)
- [ ] Implement quantile normalization: apply CDF LUTs from Phase 0 after sampling
- [ ] Implement `selectBiome()` — iterates `BIOME_PRIORITY_ORDER` (natural biomes only), checks `climateRange`
- [ ] Implement `applySupernaturalOverrides()` — jittered-grid seed placement, noise-modulated radial falloff, fieldModifiers, terrainMap
- [ ] Implement helper functions: `seededJitter`, `hashBiomeIndex`, `hashSeedOffset`
- [ ] Rewrite `classifyTerrain` to use elevation + moisture + temperature + tree line + snow line + frozen water/ice + biome `terrainRules`
- [ ] Add `ice` terrain type to `terrainTypes.js`
- [ ] Remove `BIOME_DISTRIBUTION` and `biomeForRoll`
- [ ] Add `origin`, `climateRange`, `terrainRules`, `terrainMap` to biome archetypes; remove `moistureBias`
- [ ] Add supernatural biome placeholders (Brass Grave) with `origin: 'supernatural'`, `epicenter`, `terrainMap`, and `fieldModifiers`
- [ ] Restructure `generateChunkTiles`: sample → quantile normalize → selectBiome → supernatural override → classify → tag → features → debris
- [ ] Update `gameFactory.js` to match new API
- [ ] Store continuous `elevation`, `temperature`, `moisture` on tiles
- [ ] Update analysis tool (`dev/analysis/generation/generate.js`)
- [ ] Run `python3 dev/check_imports.py` — must pass
- [ ] Run `python3 dev/check_analysis_imports.py` — must pass
- [ ] User playtest — verify biome boundaries follow climate, supernatural regions appear as organic contiguous zones

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
- [ ] Tune `EPICENTER_GRID.cellSize` for target seed density (1-3 active regions per supernatural biome)
- [ ] Tune per-biome `epicenter.radius`, `radiusNoise`, `noiseScale` for organic region shapes
- [ ] Tune per-biome `fieldModifiers` — verify floating island production via elevationOffset within epicenter regions
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
- Phase 0 calibration must be re-run after any change that affects noise output distributions (composite formula changes, frequency changes, new noise layers). With quantile normalization, recalibration means regenerating CDF lookup tables — thresholds remain stable percentiles.
