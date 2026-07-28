# Analysis Tool Improvements
## Problem
The batch analysis tool has three data-quality issues and one missing feature:
1. **Pooled moisture histograms include water/ice tiles** — water tiles require moisture > 0.32, ice tiles are wet frozen ground. Including them inflates the moisture percentiles, so `desertMaxMoisture` derived from p20-p25 lands higher than the land-only reality. This made desert tuning misleading (we kept lowering the threshold but desert didn't shrink proportionally).
2. **Histograms use baseMoisture (raw FBM), not adjusted moisture** — the `collectHistograms` function samples noise directly (Phase 0 provisional code) and bins `baseMoisture`. But `classifyTerrain` uses the post-coastal-boost moisture. The percentile thresholds are computed from the wrong field.
3. **Snapshot test duplicated per radius** — `runSnapshotTests()` always uses radius 21, but the batch runner calls it once per radius, printing identical results in each radius section. This is confusing noise.
4. **No way to download the batch report as a text file** — the user has been copy-pasting from the stats panel into `dev/mapgen_update/analysis_data/`. A download button would save the formatted report as a `.txt` file.
## Changes
### 1. `dev/analysis/generation/histograms.js` — Add tile-based histogram collection
New function:
```js
export function collectTileHistograms(tiles, opts = { landOnly: false })
```
Iterates the generated tile objects (from `generateSingleSeed` result), bins `elevationField`, `moisture`, and `temperature` into 50-bin histograms. When `landOnly=true`, skips tiles with `terrain === 'water'` or `terrain === 'ice'`.
This produces histograms from the actual field values that `classifyTerrain` uses:
- `moisture` is the adjusted (post-coastal-boost) value
- `elevationField` is the same composited elevation
- `temperature` uses the game's formula with the actual `waterMaxElevation`
Returns `{ elevHist, moistHist, tempHist, tileCount }` (same shape as `collectHistograms` minus `slopeHist`, which is computation-heavy and not needed for moisture/histogram reports).
### 2. `dev/analysis/batch/batchRunner.js` — Collect tile-based histograms + fix snapshot
Two changes:
**a) After `generateSingleSeed`** (around line 121), call `collectTileHistograms` on `result.tiles` with `landOnly: false` and `landOnly: true`. Accumulate into `rData.tileHists` and `rData.tileHistsLand`.
This adds ~1ms per seed (just iterating tiles and binning) — negligible cost.
**b) Move snapshot test outside the radius loop.** Call `runSnapshotTests()` once at the end, store it at the top level of the result as `result.snapshot` (not per-radius).
### 3. `dev/analysis/stats/batchReport.js` — Land-only moisture row + snapshot dedup
**In the per-radius pooled histograms section**, after the all-tile moisture row, add:
```
  Moisture (land)     p10=0.200  p25=0.280  p50=0.460  p75=0.620  p90=0.700  p99=0.780
```
Computed from `rData.tileHistsLand.moistHist` using the same `percentileFromHistogram` calls.
**Snapshot test format**: output it once at the top of the report (after the header line), not per-radius. If `result.snapshot` exists, format it with `formatSnapshotReport` immediately after `Seeds/Radii` line.
### 4. `dev/analysis/analysis.html` — Add download button
After the existing threshold/LUT download buttons (line 117), add:
```html
<button id="btn-download-batch-report" disabled>Download batch report</button>
```
### 5. `dev/analysis/domRefs.js` — Cache new button
Add: `els.btnDownloadBatchReport = $('btn-download-batch-report');`
### 6. `dev/analysis/ui/main.js` — Wire download + enable
Add `downloadBatchReport()` function:
```js
function downloadBatchReport() {
  const text = els.statsPanel.textContent;
  if (!text || text === 'Loading...') return;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'batch_report.txt';
  a.click();
  URL.revokeObjectURL(url);
}
```
Enable the button after a batch run completes (alongside the thresholds/LUTs buttons). Wire event listener in `bindControls()`.
## Non-changes
- **Download thresholds/LUTs buttons**: already work correctly — they're disabled unless a calibration was produced. The issue is that the user may have run without thresholds toggled. No change needed.
- **Old `collectHistograms`**: kept for backward compatibility. Only the new `collectTileHistograms` is added.