# Phase 0: Calibration Infrastructure

**Depends on:** None (this is the first phase to implement)  
**Deliverable:** Histogram tooling in the analysis page, percentile-calibrated thresholds, and snapshot tests that catch amplitude regressions. Every absolute threshold in subsequent phases is derived from measured distributions.

---

## 1. Objective

Every absolute threshold in the terrain generation pipeline (`waterMaxElevation: 0.07`, `mountainThreshold: 0.905`, `peakThreshold: 0.96`, `floatingIslandThreshold: 0.985`, `plateauSlopeMin: 0.08`, `hillSlopeMin: 0.10`, `SLOPE_NORMALIZATION: 0.3`) is a magic number with no stated relationship to the actual noise output distributions. The elevation composite in the original design (`continent*0.60 + detail*0.25 + ridges*0.15*continent`) concentrates around ~0.46 and virtually never reaches 0.90 — meaning `mountainThreshold: 0.905` produces almost no mountains, and `peak`/`floatingIsland` terrain types are dead.

This phase establishes the infrastructure to measure what the noise actually outputs, derive thresholds from percentiles of those distributions, and snapshot-test those distributions so regressions are caught immediately.

---

## 2. Scope

**In scope:**
- Add histogram collection to the analysis tool (`dev/analysis/`)
- Measure elevation, moisture, temperature, and slope distributions across multiple seeds and map sizes (radius 7, 21, 50)
- Derive target distribution budgets (% water, % mountain, % forest, etc.)
- Set thresholds as percentiles of measured distributions
- Calibrate the `SLOPE_NORMALIZATION` constant from measured elevation deltas
- Verify frequency-to-wavelength relationships (`continent` at 0.0008 on radius-50)
- Snapshot test the target distributions so regressions are caught by `check_analysis_imports.py`

**Out of scope:**
- Tuning thresholds for aesthetic quality (that's Phase G, once the pipeline is complete)
- Domain warping or other noise transforms
- Changing the composite formula (that happens in Phase A/B; recalibration follows)

---

## 3. Pre-requisites

None. This phase works against the *projected* pipeline — it measures noise field distributions using the same `hexFbm2D` and composite formulas that the redesign will use. The generator code itself doesn't need to be rewritten first; the analysis tool can call `hexFbm2D` and `sampleBaseFields` directly, even if those functions don't yet exist in `terrainGenerator.js`.

---

## 4. Detailed Changes

### 4.1 Frequency Verification

The original `design.md` claims:
- Continent at 0.0008 → "2-4 major landmasses" on radius-50 (~7,651 tiles)
- Detail at 0.015 → "~10-15 hex" local relief
- Region at 0.0015 → "4-6 regions" on radius-50

But `hexFbm2D(q, r, seed, opts)` converts hex coords to world-space via `hexToWorld(q, r)`, which scales `y` by 0.866. The actual world-space distance between adjacent hexes is ~1.0 unit in x and ~1.73 in y (a flattened hex). At frequency 0.0008, the wavelength is 1/0.0008 = 1250 world-space units. A radius-50 map spans ~100 world-space units — that's 0.08 cycles, not "2-4 landmasses."

**First calibration task:** Run `hexFbm2D` across a radius-50 map and count the zero-crossings of `(value - 0.5)`. If the claimed 2-4 landmasses is the actual observed result, then `hexFbm2D` must be rescaling coordinates internally (or the frequency numbers in the config are wrong). Document the actual relationship.

### 4.2 Analysis Tool: Histogram Collection

Add to `dev/analysis/generation/generate.js` (or a new module `dev/analysis/generation/histograms.js`):

```js
/**
 * Collect histograms of all continuous fields for a generated map.
 * Returns bin counts for elevation, moisture, temperature, slope.
 */
export function collectHistograms(seedText, radius, mapSettings, noiseConfig) {
  const seed = stringSeed(seedText);
  const NC = noiseConfig;

  // 50-bin histograms [0, 1]
  const BINS = 50;
  const elevHist   = new Uint32Array(BINS);
  const moistHist  = new Uint32Array(BINS);
  const tempHist   = new Uint32Array(BINS);
  const slopeHist  = new Uint32Array(BINS);

  // Collect all hexes within radius
  const tiles = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.abs(s) > radius) continue;
      tiles.push({ q, r });
    }
  }

  // Sample base fields
  const samples = tiles.map(({ q, r }) =>
    sampleBaseFields(seed, q, r, NC, radius)
  );

  // Compute slope (requires all elevations known)
  const elevationMap = new Map();
  for (let i = 0; i < tiles.length; i++) {
    elevationMap.set(coordKey(tiles[i]), samples[i].elevation);
  }

  for (let i = 0; i < tiles.length; i++) {
    const { q, r } = tiles[i];
    const s = samples[i];

    const elevBin  = Math.min(BINS - 1, Math.floor(s.elevation * BINS));
    const moistBin = Math.min(BINS - 1, Math.floor(s.baseMoisture * BINS));
    const tempBin  = Math.min(BINS - 1, Math.floor(s.temperature * BINS));
    elevHist[elevBin]++;
    moistHist[moistBin]++;
    tempHist[tempBin]++;

    // Compute slope for this tile
    let totalDiff = 0;
    for (const n of neighbors({ q, r })) {
      const nElev = elevationMap.get(coordKey(n));
      if (nElev !== undefined) {
        totalDiff += Math.abs(nElev - s.elevation);
      }
    }
    const slope = clamp01(totalDiff / 6);  // raw, before normalization
    const slopeBin = Math.min(BINS - 1, Math.floor(slope * BINS));
    slopeHist[slopeBin]++;
  }

  return { elevHist, moistHist, tempHist, slopeHist, tileCount: tiles.length };
}
```

### 4.3 Percentile Computation

From the histograms, compute percentile thresholds:

```js
function percentileFromHistogram(hist, p) {
  const total = hist.reduce((a, b) => a + b, 0);
  const target = total * p;
  let cumulative = 0;
  for (let bin = 0; bin < hist.length; bin++) {
    cumulative += hist[bin];
    if (cumulative >= target) return bin / hist.length;
  }
  return 1.0;
}
```

### 4.4 Target Distribution Budgets

Define what percentage of tiles should be each terrain type on a "reference" map (radius 21, default seed, no biome override):

| Terrain | Target % | Calibrates |
|---------|----------|------------|
| Water   | 8-15%   | `waterMaxElevation` |
| Mountain | 5-10%  | `mountainThreshold` |
| Peak     | 1-3%   | `peakThreshold` |
| Floating island | 0-1% | `floatingIslandThreshold` |
| Hill     | 10-18% | `hillElevationMin`, `hillSlopeMin` |
| Plateau  | 3-8%   | `plateauSlopeMin` |
| Forest   | 15-25% | `forestMinMoisture`, `treeLineMax` |
| Dense forest | 5-12% | `denseForestMinMoisture` |
| Desert   | 8-15%  | `desertMaxMoisture` |
| Marsh    | 3-8%   | `marshMinMoisture`, `marshMaxElevation` |
| Plains   | remainder | default fallthrough |

These are starting targets, not final aesthetic values — Phase G tunes them.

### 4.5 Threshold Derivation

Run the full pipeline (elevation composite, moisture, temperature, slope) over N seeds × 3 map sizes, compute histograms, then set thresholds:

```js
function calibrateThresholds(seeds, radii, noiseConfig) {
  const allElev = [];
  const allSlope = [];
  const allMoist = [];

  for (const seed of seeds) {
    for (const radius of radii) {
      const { elevHist, moistHist, slopeHist } =
        collectHistograms(seed, radius, {}, noiseConfig);
      // Pool histograms across seeds/radii
      mergeHistograms(allElev, elevHist);
      mergeHistograms(allMoist, moistHist);
      mergeHistograms(allSlope, slopeHist);
    }
  }

  return {
    waterMaxElevation:    percentileFromHistogram(allElev, 0.12),  // bottom 12%
    mountainThreshold:    percentileFromHistogram(allElev, 0.90),  // top 10%
    peakThreshold:        percentileFromHistogram(allElev, 0.97),  // top 3%
    floatingIslandThreshold: percentileFromHistogram(allElev, 0.995), // top 0.5%
    hillElevationMin:     percentileFromHistogram(allElev, 0.55),
    // ... etc.
  };
}
```

### 4.6 Slope Normalization Calibration

The `SLOPE_NORMALIZATION` constant divides the sum of 6 neighbor deltas. Set it to the 95th-percentile of observed per-tile average delta:

```js
function calibrateSlopeNormalization(seeds, radii, noiseConfig) {
  const deltas = [];
  // ... collect all per-tile average neighbor deltas (totalDiff / 6) ...
  deltas.sort((a, b) => a - b);
  return deltas[Math.floor(deltas.length * 0.95)];
}
```

### 4.7 Snapshot Tests

Add a test module `dev/analysis/generation/snapshotTest.js`:

```js
/**
 * Verify key distribution invariants across a fixed set of seeds.
 * Run via: python3 dev/check_analysis_imports.py (which will import
 * and execute this module's test function).
 */
export function runSnapshotTests(noiseConfig) {
  const seeds = ['test-alpha', 'test-beta', 'test-gamma'];
  const radius = 21;

  for (const seed of seeds) {
    const result = generateSingleSeed(seed, radius, null, {});
    const tiles = Object.values(result.tiles);

    const waterPct  = tiles.filter(t => t.terrain === 'water').length / tiles.length;
    const mtPct     = tiles.filter(t => t.terrain === 'mountain').length / tiles.length;
    const peakPct   = tiles.filter(t => t.terrain === 'peak').length / tiles.length;
    const floatPct  = tiles.filter(t => t.terrain === 'floatingIsland').length / tiles.length;

    // Assert distribution ranges
    console.assert(waterPct >= 0.06 && waterPct <= 0.20,
      `[snapshot] ${seed}: water ${(waterPct*100).toFixed(1)}% out of range [6%, 20%]`);
    console.assert(mtPct >= 0.03 && mtPct <= 0.15,
      `[snapshot] ${seed}: mountain ${(mtPct*100).toFixed(1)}% out of range [3%, 15%]`);
    console.assert(peakPct <= 0.05,
      `[snapshot] ${seed}: peak ${(peakPct*100).toFixed(1)}% out of range [0%, 5%]`);
    console.assert(floatPct <= 0.02,
      `[snapshot] ${seed}: floatingIsland ${(floatPct*100).toFixed(1)}% out of range [0%, 2%]`);
  }

  console.log('[snapshot] All distribution tests passed.');
}
```

`check_analysis_imports.py` already imports and validates the analysis tool's module graph. After this phase, it should also call `runSnapshotTests()` so a broken amplitude change fails CI.

### 4.8 Analysis Page UI

Add a "Distributions" tab/section to `dev/analysis.html` that:
- Calls `collectHistograms` for the current seed/radius
- Renders histogram bars for elevation, moisture, temperature, slope
- Annotates each histogram with the current threshold positions (vertical lines at `waterMaxElevation`, `mountainThreshold`, etc.)
- Shows the derived percentile values and the target budget ranges

This gives a visual debug tool for seeing where thresholds sit relative to actual distributions. No new dependencies — render with Canvas2D or raw DOM.

---

## 5. Files Touched

| File | Change | Summary |
|------|--------|---------|
| `dev/analysis/generation/histograms.js` | **new** | `collectHistograms`, `percentileFromHistogram`, `calibrateThresholds`, `calibrateSlopeNormalization` |
| `dev/analysis/generation/snapshotTest.js` | **new** | `runSnapshotTests` — distribution invariant checks |
| `dev/analysis/generation/generate.js` | edit | Export convenience wrappers that call the histogram module |
| `dev/analysis/analysis.js` | edit | Wire histogram collection into the analysis page |
| `dev/analysis/index.html` | edit | Add distributions tab/section |
| `dev/check_analysis_imports.py` | edit | Call `runSnapshotTests()` after import validation |
| `src/params/game/worldParams.js` | edit | Add calibrated threshold constants with comments documenting their percentile derivation |

---

## 6. Deliverable

- The analysis page shows histograms of elevation, moisture, temperature, and slope for any seed/radius.
- Threshold lines on the histograms show where each terrain cutoff sits.
- Running the analysis tool across 5 seeds at radius 21 produces a calibration report: a JSON file (`dev/mapgen_update/calibration_v1.json`) with the derived thresholds.
- `check_analysis_imports.py` fails if a snapshot distribution invariant is violated.
- Every threshold constant in `worldParams.js` has a comment citing its percentile derivation (e.g., `// 90th percentile of pooled elevation histogram, 5 seeds × 3 radii`).

---

## 7. Risks & Edge Cases

- **The Phase A elevation composite isn't written yet.** The calibration tool calls `sampleBaseFields` with the *target* composite formula, not the current code. This means calibration runs against a function that may not yet exist in `terrainGenerator.js`. Acceptable — the function can be implemented as a standalone in the analysis tool during this phase, then moved into the game code in Phase A.
- **Small maps (radius 7) have low sample counts.** Histograms from 169-tile maps are noisy. Pool across multiple seeds (10+) to get stable statistics.
- **The `continent` frequency claim needs verification.** If `hexToWorld` rescaling makes the effective frequency higher than the raw config value, document the actual relationship rather than correcting the config prematurely.
- **Snapshot tests are coarse.** The threshold ranges [6%, 20%] are intentionally wide — they're regression catchers, not precision checks. Tightening happens in Phase G.
