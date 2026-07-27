# Mapgen Update Progress Tracking

Keep this file concise, used as an overview that points to more specific progress tracking files if necessary.

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

## Phase C

## Phase D

## Phase E

## Phase F

## Phase G
