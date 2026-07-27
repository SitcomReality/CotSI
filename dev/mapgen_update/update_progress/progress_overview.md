# Mapgen Update Progress Tracking

Keep this file concise, used as an overview that points to more specific progress tracking files if necessary.

## Phase 0

- Details can be tracked in `phase0_progress.md`.

1. Frequency verification — `dev/analysis/generation/frequencyVerification.js`. **Done.** Calibration across 4 runs (2 seeds × r=50, then 100 seeds × r=100) concluded zero-crossing counting is unreliable. Original frequencies confirmed correct. REGION at f=0.003/3oct is the one confirmed good change. See `phase0_calibration.md` §4.1 for full findings.
2. Histogram collection — `dev/analysis/generation/histograms.js` with provisional `sampleBaseFields`. **Done.** Pooled 100 seeds × r=100 data available. Access via "Calibration → Histogram Collection" checkbox in multi-seed analysis.
3. Quantile LUT builder — `dev/analysis/generation/quantileLUT.js`. **Done.** 256-entry LUTs for elevation, moisture, temperature, slope built from 100 seeds. Access via "Calibration → Quantile LUTs" checkbox.
4. Calibration UI — `dev/analysis.html`. **Done.** 3 calibration checkboxes (freq verify, histograms, LUTs) + 3 output toggles (terrain, traders, champions) wired into multi-seed analysis. Compact pooled reports for batch runs.
5. Calibrate quantile LUTs — Pooled data collected from old multiplicative composite (now removed). **Invalidated** — the continent mask was the root cause of elevation compression. New additive composite (`detail + ridges`) will produce a healthier distribution. Re-run calibration after Phase B implementation.
6. Derive threshold percentiles — **Not started.** Need to map pooled percentile data to DEFAULT_TERRAIN_RULES values.
7. Snapshot tests — **Not started.**
8. Seam test — **Not started.**
9. Climate coverage test — **Not started.**
10. Wire snapshots into import checks — **Not started.**
11. Distributions tab in analysis page — **Not started.**
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
