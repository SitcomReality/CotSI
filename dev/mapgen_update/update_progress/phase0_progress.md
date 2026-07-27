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
— `dev/analysis/generation/thresholdDerivation.js`. 
**Done.** `calibratePipeline()` runs N seeds × M radii, pools histograms, builds 256-entry quantile LUTs, and maps target percentiles from §4.5 budget table to raw values. Thresholds derived: waterMaxElevation(p12), mountainThreshold(p90), peakThreshold(p97), floatingIslandThreshold(p99.5), hillElevationMin(p55), marshMaxElevation(p35), forestMinMoisture(p72), denseForestMinMoisture(p85), desertMaxMoisture(p20), marshMinMoisture(p58), freezeTempMax(p15). Also computes SLOPE_NORMALIZATION from the 95th percentile of raw per-tile neighbor elevation deltas. 
Runs on the Phase A provisional composite (detail-only, no ridges, no worldShape). Re-derivation after Phase B/F is tracked in Step 13. Access via "Calibration → Derive Thresholds" button in the analysis page. Default: 50 seeds × r=21.
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
— `dev/analysis/generation/thresholdDerivation.js` (exportCalibrationV1) + UI button. 
**Done.** "Download calibration_v1.json" button in Calibration section serializes the full calibration result: 256-entry LUTs (4 fields), percentile-derived thresholds (11 entries with metadata), slope normalization constant, and meta (seed count, radii, noise config fingerprint, date). Uses Blob download — no server needed.
Run defaults: 50 seeds × r=21 on the Phase A provisional composite. Re-run with different parameters by changing the seed count and radius controls before clicking "Derive Thresholds".
## Step 13. Re-run Phase 0 calibration after Phase B/F composite changes 
— **Deferred** (Phase B dependency).
