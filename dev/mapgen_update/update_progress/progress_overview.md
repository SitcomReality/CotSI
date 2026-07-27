# Mapgen Update Progress Tracking

Keep this file concise, used as an overview that points to more specific progress tracking files if necessary.

## Phase 0

Details in `phase0_progress.md`.

1. Frequency verification — **Done.**
2. Histogram collection — **Done.**
3. Quantile LUT builder — **Done.**
4. Calibration UI — **Done.**
5. Calibrate quantile LUTs — Pooled data collected from old multiplicative composite (now removed). **Invalidated**
6. Derive threshold percentiles — **Not started.** Need to map pooled percentile data to DEFAULT_TERRAIN_RULES values.
7. Snapshot tests — **Done.** `dev/analysis/generation/snapshotTest.js`
8. Seam test — **Done.** `dev/analysis/generation/seamTest.js`
9. Climate coverage test — **Done.** `dev/analysis/generation/climateCoverage.js`
10. Wire tests into analysis page — **Done.** "Run Tests" button runs all three; browser-based
11. Distributions tab in analysis page — **Done.** Canvas2D histogram charts with threshold lines
12. Output calibration_v1.json — **Not started.**
13. Re-run Phase 0 calibration after Phase B/F composite changes — **Deferred** (Phase B dependency).

**Key findings for future phases:**
- Continent mask removed from design — root cause of compressed elevation, zero slope, and calibration complexity. Replaced with explicit `worldShape(dist, radius)` function.
- Slope should now work directly from the additive composite without a dedicated micro-relief channel or low-pass filtering.
- Temperature range is narrow (~0.22 spread); latitude formula coefficients may need widening in Phase A.
- Quantile LUTs from the old multiplicative composite are invalidated. Re-run calibration after Phase B with the additive composite.

## Phase A

## Phase B

## Phase C

## Phase D

## Phase E

## Phase F

## Phase G
