# Mapgen Update Progress Tracking

This file is a checklist for tracking progress in the update plan described in `dev/mapgen_update/overview.md`.

Detailed information about specific steps can be stored in `phase*_progress.md` if it might be pertinent to subsequent updates.

## Phase 0

Details in `phase0_progress.md`.

1. Frequency verification — **Done.**
2. Histogram collection — **Done.**
3. Quantile LUT builder — **Done.**
4. Calibration UI — **Done.**
5. Calibrate quantile LUTs — **Invalidated**
6. Derive threshold percentiles — **Done.**
7. Snapshot tests — **Done.**
8. Seam test — **Done.**
9. Climate coverage test — **Done.**
10. Wire tests into analysis page — **Done.**
11. Distributions tab in analysis page — **Done.**
12. Output calibration_v1.json — **Done.**
13. Re-run Phase 0 calibration after Phase B/C composite changes — **Done. (2026-07-28 batch analysis — thresholds applied.)**

**Notes:** Continent mask replaced by explicit `worldShape(dist, radius)`. Quantile LUTs from old multiplicative composite invalidated — re-run after Phase B.

## Phase A

Details in `phaseA_progress.md`.

1. Noise Config & Seed Offsets (`worldParams.js`) — **Done.**
2. `ice` terrain type added — **Done.**
3. `sampleBaseFields` migration to `terrainGenerator.js` — **Done.**
4. `selectBiome()` + `BIOME_PRIORITY_ORDER` — **Done.**
5. `classifyTerrain` rewrite (climate-aware, temperature/ice gates) — **Done.**
6. Biome archetype updates (`origin`, `climateRange`, `terrainRules`, remove `moistureBias`) — **Done.**
7. `generateChunkTiles` restructure (new pipeline wired in, dead code removed) — **Done.**
8. Epicenter system (jittered-grid supernatural biome placement, `biome_brass_grave`) — **Done.**
9. Analysis tool update (new tile fields, rewritten seam test, removed `enrichWithNoise`) — **Done.**
10. Remove old exports from `worldParams.js` — **Done.**

**Complete.** Phase A delivers the climate-driven pipeline with jittered-grid epicenters. Elevation is still a single FBM field — Phase B builds the multi-scale additive composite.

**Threshold calibration:** Percentile-derived thresholds from 500-seed × 3-radius batch analysis applied to `DEFAULT_TERRAIN_RULES`. Slope discrimination thresholds (plateauSlopeMin, hillSlopeMin) and waterMinMoisture also tuned from the same batch data. See `dev/mapgen_update/analysis_data/batchanalysis_2026-07-28_23-28.md`.

## Phase B

Details in `phaseB_progress.md`.

1. Noise config: Replace `NOISE_PHASE_A_ELEVATION` with `NOISE_ELEVATION_DETAIL` + `NOISE_RIDGE`; replace `SEED_ELEVATION` with `SEED_DETAIL` + `SEED_RIDGE`; add `SLOPE_NORMALIZATION`; add `plateauSlopeMin`/`hillSlopeMin` to `DEFAULT_TERRAIN_RULES` — **worldParams.js** — **Done.**
2. Add `hill` and `plateau` terrain types — **terrainTypes.js** — **Done.**
3. Add `hill`/`plateau` palette colors and `terrainTags` entries for existing biomes — **biomes.js** — **Done.**
4. Add `worldShape`, `computeSlope`, `hexesInExpandedChunk`, `_provisionalTerrainForRing` functions — **terrainGenerator.js** — **Done.**
5. Update `sampleBaseFields` with 2-layer additive composite + worldShape — **terrainGenerator.js** — **Done.**
6. Update `classifyTerrain` to use slope for mountain/plateau/hill discrimination — **terrainGenerator.js** — **Done.**
7. Rewrite `generateChunkTiles` with border ring sampling, slope computation, and `fallbackT` removal — **terrainGenerator.js** — **Done.**
8. Update analysis tool for the new elevation composite and tile fields — **seamTest.js**, **histograms.js** — **Done.**
9. Remove old `NOISE_PHASE_A_ELEVATION` / `SEED_ELEVATION` references; update `NOISE_CONFIG` bundle — **terrainGenerator.js**, **worldParams.js** — **Done.**

**Complete.** Phase B delivers the 2-layer additive elevation composite (detail + ridges × worldShape), slope-based mountain/plateau/hill discrimination, border ring sampling (no `fallbackT`), and updated analysis tool fields.

## Phase C

1. Add `isProvisionalWater(elevation, moisture, terrainRules)` — elevation-based water classifier (oceans: elevation gate only; lakes: elevation + moisture gate) — **terrainGenerator.js** — **Done.**
2. Add `adjustMoisture(tile, q, r, fieldMap, provisionalWaterSet)` — coastal moisture boost for land tiles within radius 2 of water — **terrainGenerator.js** — **Done.**
3. Add `computeRainShadow` stub — placeholder returning 0 (deferred to Phase G) — **terrainGenerator.js** — **Done.**
4. Build `provisionalWaterSet` from border ring `fieldMap` using `DEFAULT_TERRAIN_RULES` — **generateChunkTiles** — **Done.**
5. Insert provisional water classification pass (Pass 2) and moisture adjustment pass (Pass 3) before terrain classification — **generateChunkTiles** — **Done.**
6. Wire adjusted moisture into `classifyTerrain` calls and tile metadata (`moisture` field) — **generateChunkTiles** — **Done.**
7. Update seam test to validate adjusted moisture consistency rather than base-moisture identity — **seamTest.js** — **Done.**
8. Add adjusted moisture visualization to analysis tool — **analysis tool** — **Done.**

**Complete.** Phase C delivers elevation-based water classification, coastal moisture boost, `baseMoisture` stored alongside adjusted `moisture`, and analysis tool visualisation for both raw and adjusted moisture fields.

## Phase D

Details in `phaseD_rivers.md`.

1. Add river config constants to `worldParams.js` (`RIVER_SOURCE_MIN_ELEV`, `RIVER_SOURCE_MIN_MOIST`, `RIVER_SOURCE_FRACTION`, `RIVER_MAX_LENGTH`, `RIVER_MOISTURE_BOOST`, `RIVER_BOOST_RADIUS`) — **Done.**
2. Add `seededHash(q, r, step, seed)` tie-breaking function — **terrainGen/rivers/riverTrace.js** — **Done.**
3. Add `selectRiverSources(tiles, fieldMap, params)` function — **terrainGen/rivers/riverSources.js** — **Done.**
4. Add `traceRiver(start, fieldMap, provisionalWaterSet, params)` function with seeded tie-breaking — **terrainGen/rivers/riverTrace.js** — **Done.**
5. Add `applyRiverMoistureBoost(tiles, riverPaths)` function — **terrainGen/rivers/riverMoisture.js** — **Done.**
6. Update `generateTiles()` wrapper: assemble flat fieldMap, run river post-passes (source selection → trace → boost), re-classify terrain for river-affected tiles, set `isRiver` flags — **terrainGen/flatGeneration.js** — **Done.**
7. Update analysis tool to show river paths and moisture boost halo — **analysis tool** — **Done.**
8. Verify: river valleys are greener (visibly more forest/marsh along paths), source count scales with map size, paths are natural (not axis-locked), dead-end rivers at local minima are acceptable

## Phase E

Details in `phaseE_feature_density.md`.

1. Add `featureDensity(terrain, elevation, moisture, slope, treeLineMax)` — continuous [0,1] density from climate fields — **featureDensity.js** — **Done.**
2. Add `canSpawnFruitTree(elevation, moisture, treeLineMax)` — climate gate preventing fruit trees in deserts/above tree line — **featureDensity.js** — **Done.**
3. Add `shouldSpawnRock(slope, moisture)` — terrain-aware rock probability replacing binary `DEBRIS_SPAWN_THRESHOLD` — **featureDensity.js** — **Done.**
4. Update `spawnFeature()` signature to accept `density` param; modulate rule thresholds with `densityMod` — **featureSpawning.js** — **Done.**
5. Update feature pass (Pass 8) in `generateChunkTiles`: compute `featureDensity()` per tile, pass to updated `spawnFeature()`, apply fruit tree climate check with fallthrough-to-null — **chunkGeneration.js** — **Done.**
6. Update debris pass (Pass 9) in `generateChunkTiles`: use `shouldSpawnRock()` for rock probability on sloped/dry passable tiles without features — **chunkGeneration.js** — **Done.**
7. Remove or bypass old `DEBRIS_SPAWN_THRESHOLD` binary gate for rock debris; keep `DEBRIS_TUFT_THRESHOLD`/`DEBRIS_ROCK_THRESHOLD` for kind discrimination within terrain-aware rock probability — **chunkGeneration.js**, **worldParams.js** — **Done.**
8. Ensure continuous `density` value is stored on feature objects (`feature.density`) for renderer use — **featureSpawning.js** — **Done.**
9. Update analysis tool to show feature density distribution per terrain/biome — **analysis tool** — **Done.**
10. Update imports in `chunkGeneration.js` to include new exports from `featureDensity.js` — **chunkGeneration.js** — **Done.**
11. Verify: forest edges are gradual (trees thin near desert boundaries), rocks cluster on mountain slopes and dry regions, fruit trees only appear below tree line with moisture > 0.60, no hard density transitions at terrain-type boundaries

## Phase F

## Phase G
