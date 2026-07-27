# Phase 0 Progress

## Step 1. Frequency verification 
— `dev/analysis/generation/frequencyVerification.js`. 
**Done.** Calibration across 4 runs (2 seeds × r=50, then 100 seeds × r=100) concluded zero-crossing counting is unreliable. Original frequencies confirmed correct. REGION at f=0.003/3oct is the one confirmed good change. See `phase0_calibration.md` §4.1 for full findings.
## Step 2. Histogram collection 
— `dev/analysis/generation/histograms.js` with provisional `sampleBaseFields`. 
**Done.** Pooled 100 seeds × r=100 data available. Access via "Calibration → Histogram Collection" checkbox in multi-seed analysis.
## Step 3. Quantile LUT builder 
— `dev/analysis/generation/quantileLUT.js`. 
**Done.** 256-entry LUTs for elevation, moisture, temperature, slope built from 100 seeds. Access via "Calibration → Quantile LUTs" checkbox.
## Step 4. Calibration UI 
— `dev/analysis.html`.
**Done.** 3 calibration checkboxes (freq verify, histograms, LUTs) + 3 output toggles (terrain, traders, champions) wired into multi-seed analysis. Compact pooled reports for batch runs.
## Step 5. Calibrate quantile LUTs 
— Pooled data collected from old multiplicative composite (now removed). 
**Invalidated** — the continent mask was the root cause of elevation compression. New additive composite (`detail + ridges`) will produce a healthier distribution. Re-run calibration after Phase B implementation.
## Step 6. Derive threshold percentiles 
— **Not started.** Need to map pooled percentile data to DEFAULT_TERRAIN_RULES values.
## Step 7. Snapshot tests 
— `dev/analysis/generation/snapshotTest.js`. 
**Done.** Distribution invariant checks against 3 fixed seeds at r=21. Wide tolerance ranges (water 6–20%, mountain 3–15%, peak 0–5%, floatingIsland 0–2%) catch amplitude regressions. Access via "Run Tests" button.
## Step 8. Seam test 
— `dev/analysis/generation/seamTest.js`. 
**Done.** Verifies every tile's rawElev and rawMoist match direct FBM recomputation — confirms chunk generation is a pure function of (seed, q, r). Access via "Run Tests" button.
## Step 9. Climate coverage test 
— `dev/analysis/generation/climateCoverage.js`. 
**Done.** Reports per-biome tile counts and (rawElev, rawMoist) coordinates for biome_default tiles. Includes binned climate-grid gap analysis. Access via "Run Tests" button.
## Step 10. Wire tests into analysis page 
— `dev/analysis.html` + `dev/analysis/ui/main.js` + `dev/analysis/domRefs.js`. 
**Done.** "Run Tests" button in Calibration section runs all three tests and displays formatted reports in the stats panel. Browser-based (not Python) — avoids Node.js dependency.
## Step 11. Distributions tab in analysis page 
— `dev/analysis/render/renderDistributions.js` + edits to `analysis.html` and `render/orchestrate.js`. 
**Done.** "Distributions (histograms)" view mode renders 4 panels (elevation, moisture, temperature, slope) with 50-bin bar charts and overlaid threshold lines. Uses Canvas2D.
## Step 12. Output calibration_v1.json 
— **Not started.**
## Step 13. Re-run Phase 0 calibration after Phase B/F composite changes 
— **Deferred** (Phase B dependency).
