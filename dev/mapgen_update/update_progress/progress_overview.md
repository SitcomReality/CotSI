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
13. Re-run Phase 0 calibration after Phase B/C composite changes — **Deferred.**

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

**Still pending (Phase B dependency):** Threshold values in `DEFAULT_TERRAIN_RULES` are still placeholders matching old constants. Recalibrate when the full `worldShape × (detail + ridges)` composite is in place.

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
7. Update seam test to validate adjusted moisture consistency rather than base-moisture identity — **seamTest.js**
8. Add adjusted moisture visualization to analysis tool — **analysis tool**

**Still pending:** Seam test (7) and analysis tool visualization (8) — Phase C items that modify files outside `terrainGenerator.js`.

## Phase D

## Phase E

## Phase F

## Phase G
