# Mapgen Update Progress Tracking

Keep this file concise, used as an overview that points to more specific progress tracking files if necessary.

## Phase 0

Details in `phase0_progress.md`.

1. Frequency verification — **Done.**
2. Histogram collection — **Done.**
3. Quantile LUT builder — **Done.**
4. Calibration UI — **Done.**
5. Calibrate quantile LUTs — Pooled data collected from old multiplicative composite (now removed). **Invalidated**
6. Derive threshold percentiles — **Done.** `dev/analysis/generation/thresholdDerivation.js` — runs N seeds × M radii, maps target percentiles to raw values. See Phase 0 progress for full details.
7. Snapshot tests — **Done.**
8. Seam test — **Done.**
9. Climate coverage test — **Done.**
10. Wire tests into analysis page — **Done.**
11. Distributions tab in analysis page — **Done.**
12. Output calibration_v1.json — **Done.**
13. Re-run Phase 0 calibration after Phase B/F composite changes — **Deferred** (Phase B dependency).

**Key findings for future phases:**
- Continent mask removed from design — root cause of compressed elevation, zero slope, and calibration complexity. Replaced with explicit `worldShape(dist, radius)` function.
- Slope should now work directly from the additive composite without a dedicated micro-relief channel or low-pass filtering.
- Temperature range is narrow (~0.22 spread); latitude formula coefficients may need widening in Phase A.
- Quantile LUTs from the old multiplicative composite are invalidated. Re-run calibration after Phase B with the additive composite.

## Phase A

Details in `phaseA_progress.md`.

1. Noise Config & Seed Offsets (`worldParams.js`) — **Done.**
2. `ice` terrain type added — **Done.**
3. `sampleBaseFields` migration to `terrainGenerator.js` — **Done.**
4. `selectBiome()` + `BIOME_PRIORITY_ORDER` — **Done.**
5. `classifyTerrain` rewrite (climate-aware, temperature/ice gates) — **Done.**
6. Biome archetype updates (`origin`, `climateRange`, `terrainRules`, remove `moistureBias`) — **Done.**
7. `generateChunkTiles` restructure (new pipeline wired in, dead code removed) — **Done.**

## Phase B

## Phase C

## Phase D

## Phase E

## Phase F

## Phase G
