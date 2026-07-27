# Phase 0: Calibration Infrastructure + Quantile Normalization

**Depends on:** None (this is the first phase to implement)  
**Deliverable:** Histogram tooling, quantile CDF lookup tables for all continuous fields, percentile-based thresholds, and snapshot tests that catch amplitude regressions. Every threshold in subsequent phases is a true percentile — stable across distribution changes when noise layers are added or modified.

---

## 1. Objective

Every absolute threshold in the terrain generation pipeline is a magic number with no stated relationship to the actual noise output distributions. Worse, the elevation composite changes in Phases B and F — every threshold derived in Phase 0 would be invalidated. The solution is two-part: (1) measure distributions with histogram tooling, and (2) normalize all continuous fields through quantile CDF lookup tables so thresholds become stable percentiles.

After this phase, all continuous fields (elevation, moisture, temperature, slope) are uniform on [0, 1] after quantile normalization. Thresholds like `mountainThreshold: 0.90` literally mean "top 10% of tiles." When Phases B or F change the elevation distribution, only the LUTs need regeneration — thresholds and archetype `climateRange` values remain correct.

---

## 2. Scope

**In scope:**
- Add histogram collection to the analysis tool (`dev/analysis/`)
- Measure elevation, moisture, temperature, and slope distributions across multiple seeds and map sizes (radius 7, 21, 50)
- **Build quantile CDF lookup tables** (256-entry LUTs) for each continuous field from an ensemble of seeds
- Derive target distribution budgets (% water, % mountain, % forest, etc.)
- Set thresholds as percentiles — stable across distribution changes; only LUTs need regeneration after Phases B/F
- Calibrate the `SLOPE_NORMALIZATION` constant from measured elevation deltas
- Calibrate epicenter grid cell size for target supernatural biome coverage (3–10%)
- Snapshot test the target distributions so regressions are caught by `check_analysis_imports.py`

**Out of scope:**
- Tuning thresholds for aesthetic quality (that's Phase G, once the pipeline is complete)
- Domain warping or other noise transforms
- Changing the composite formula (that happens in Phase A/B; recalibration follows)

**Calibration is re-runnable.** Phases B (multi-scale elevation) and F (ridged noise) change the elevation distribution. Phase 0 produces the calibration tooling; the tooling is re-invoked at the end of each phase that alters the distribution shape. The dependency graph in the overview shows this as a single Phase 0 block, but in practice the calibration script is run after B and F to re-derive thresholds against the current composite.

---

## 3. Pre-requisites

None. This phase works against the *projected* pipeline — it measures noise field distributions using the same `hexFbm2D` and composite formulas that the redesign will use. The generator code itself doesn't need to be rewritten first; the analysis tool can call `hexFbm2D` and `sampleBaseFields` directly, even if those functions don't yet exist in `terrainGenerator.js`.

---

## 4. Detailed Changes

### 4.1 Frequency Verification — COMPLETE

All frequency values in the design docs are **target values pending verification.** `hexFbm2D(q, r, seed, opts)` converts hex coords to world-space via `hexToWorld(q, r)`, which scales `y` by 0.866. The actual world-space distance between adjacent hexes is ~1.0 unit in x and ~1.73 in y (a flattened hex). At frequency 0.0008, the wavelength is 1/0.0008 = 1250 world-space units. A radius-50 map spans ~100 world-space units — that's 0.08 cycles, not "2-4 landmasses."

**Initial approach:** Run `hexFbm2D` across a radius-50 map for each noise field and count zero-crossings of `(value - 0.5)`. Verify the actual effective frequencies against target descriptions.

**Calibration runs performed:**
1. Single seed `glut-609`, r=50, original frequencies
2. Single seed `glut-17`, r=50, original frequencies (replication)
3. Single seed `glut-17`, r=50, frequencies divided by 6–14× to match zero-crossing targets
4. 100 seeds × r=100, "corrected" frequencies (pooled histograms + quantile LUTs)

**Finding: Zero-crossing counting is unreliable as a calibration method.**

The zero-crossing counts are dominated by **simplex kernel gradient jitter** — the noise within a single simplex cell oscillates around its local mean — not by FBM structural cycles. Evidence:

- **MOISTURE at f=0.0008** (divided 7.5× from 0.006) produced only **1.5 half-cycles** — the field collapsed to quasi-constant. The 4 octaves don't add diversity when the base frequency is too low to complete even one cycle across the map.
- **TEMP_VARIATION at f=0.005** (divided 16× from 0.08, single octave) also collapsed to **1.5 half-cycles** — same problem.
- **Slope dropped to zero** (p99=0.000 across 100 seeds × r=100). The ultra-low frequencies produce fields so smooth that adjacent hexes have identical elevation values.

**Correct action:** The original frequencies from the plan docs produce visible macro-structure despite misleading crossing counts. The continent mask was removed — elevation is now additive (`detail + ridges`), eliminating the distribution compression caused by the multiplicative `continent × detail` formula. Quantile normalization (CDF LUTs) handles any remaining distribution compression.

**The one confirmed good change:** REGION at f=0.003 with 3 octaves (was 0.0015/2oct) produces ~9 half-cycles across 100 seeds × r=100, matching the 8-12 target for 4-6 biome regions.

**Final frequency table:**

| Field | Frequency | Octaves | Status |
|-------|-----------|---------|--------|
| `ELEVATION_DETAIL` | 0.020 | 4 | Original — separated 2.5× from RIDGE, target ~10-hex scale |
| `RIDGE` | 0.008 | 3 | Original — separated 2.5× from DETAIL, target ~25-hex scale |
| `MOISTURE` | 0.006 | 4 | Original — produces broad wet/dry bands |
| `TEMP_VARIATION` | 0.08 | 1 | Original — local variation; Phase G may reduce if salt-and-pepper visible |
| `REGION` | 0.003 | 3 | **Confirmed** — ~9 half-cycles, matches 8-12 target |

**Lesson for Phase G tuning:** Tune thresholds against the full quantile-normalized pipeline at the target map sizes. Frequency tuning should be visual ("do the landmasses look right?") rather than algorithmic — zero-crossing counting does not measure what we care about.

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

### 4.4 Quantile Normalization (Core Infrastructure)

Raw FBM values are not uniform — they cluster around 0.5, and the distribution changes when noise layers are added. Thresholding raw values against constants like `mountainThreshold: 0.905` is fragile: it breaks every time the composite formula changes.

**Quantile normalization** solves this: build a CDF lookup table per continuous field from an ensemble of seeds, then map every raw FBM value through the LUT to its percentile. After normalization, the field is uniform on [0, 1] and every threshold **is** a true percentile.

```js
/**
 * Build a quantile lookup table from raw-field histograms across an ensemble.
 * Returns a 256-entry LUT mapping rawValue → percentile.
 * Linear interpolation between bins for values between entries.
 */
function buildQuantileLUT(histograms, binCount = 256) {
  // Pool histograms across all seeds/radii to get the ensemble CDF
  const pooled = poolHistograms(histograms);
  const total = pooled.reduce((a, b) => a + b, 0);

  const lut = new Float32Array(binCount);
  let cumulative = 0;
  let binIdx = 0;
  for (let i = 0; i < binCount; i++) {
    // Map bin i (representing value i/binCount) to its cumulative percentile
    while (binIdx < pooled.length && binIdx / pooled.length <= i / binCount) {
      cumulative += pooled[binIdx];
      binIdx++;
    }
    lut[i] = cumulative / total;
  }
  // Ensure last entry is exactly 1.0
  lut[binCount - 1] = 1.0;
  return lut;
}

function normalizeField(rawValue, lut) {
  const bin = Math.min(lut.length - 1, Math.floor(rawValue * lut.length));
  // Linear interpolation
  const t = rawValue * lut.length - bin;
  const lo = lut[bin];
  const hi = bin < lut.length - 1 ? lut[bin + 1] : 1.0;
  return lo + (hi - lo) * t;
}
```

**Why this is non-optional:**
- Phase B adds the detail layer → elevation distribution shifts. Without quantile normalization, every threshold must be manually re-derived.
- Phase F swaps to ridged FBM → distribution shifts again. Same re-derivation burden.
- Archetype `climateRange` values would silently drift — a biome that matches 15% of tiles in Phase A might match 5% after Phase B.
- With quantile LUTs, Phases B and F only require LUT regeneration. Thresholds and climate ranges remain correct.

**Per-seed variety** is applied to raw FBM values *before* the LUT — e.g., `rawElev + seaLevelOffset` with `seaLevelOffset` drawn from the world seed. This shifts the raw distribution so the LUT maps it to a different percentile range, producing variety across seeds.

### 4.5 Target Distribution Budgets

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
| **Supernatural biome** | 3-10% | `EPICENTER_GRID.cellSize` + per-biome `epicenter.radius` |
| Ice      | 0-5%   | `freezeTempMax` × water coverage near cold latitudes |

These are starting targets, not final aesthetic values — Phase G tunes them.

The supernatural biome row is for epicenter-placed biomes like Brass Grave. With the jittered-grid approach, coverage is controlled by grid cell size and per-biome epicenter radius — Phase 0 calibrates the grid cell size for the target coverage range; per-biome radii are tuned in Phase G.

### 4.6 Threshold Derivation

Run the full pipeline (elevation composite, moisture, temperature, slope) over N seeds × 3 map sizes, compute quantile LUTs, then set threshold percentiles:

```js
function calibratePipeline(seeds, radii, noiseConfig) {
  const allElev  = [];
  const allMoist = [];
  const allTemp  = [];
  const allSlope = [];

  for (const seed of seeds) {
    for (const radius of radii) {
      const { elevHist, moistHist, tempHist, slopeHist, slopeDeltas } =
        collectHistograms(seed, radius, {}, noiseConfig);
      allElev.push(elevHist);
      allMoist.push(moistHist);
      allTemp.push(tempHist);
      allSlope.push(slopeHist);
    }
  }

  // Build quantile LUTs (256-entry per field)
  const elevLUT  = buildQuantileLUT(allElev);
  const moistLUT = buildQuantileLUT(allMoist);
  const tempLUT  = buildQuantileLUT(allTemp);
  const slopeLUT = buildQuantileLUT(allSlope);

  // Thresholds are percentiles — directly meaningful, stable across distribution changes
  return {
    quantileLUTs: {
      elevation:  { lut: Array.from(elevLUT),  version: 1 },
      moisture:   { lut: Array.from(moistLUT), version: 1 },
      temperature:{ lut: Array.from(tempLUT),  version: 1 },
      slope:      { lut: Array.from(slopeLUT), version: 1 },
    },
    thresholds: {
      waterMaxElevation:         0.12,  // 12th percentile → ~12% water
      mountainThreshold:         0.90,  // top 10%
      peakThreshold:             0.97,  // top 3%
      floatingIslandThreshold:   0.995, // top 0.5%
      hillElevationMin:          0.55,
      // ... etc.
    },
  };
}
```

### 4.7 Slope Normalization Calibration

The `SLOPE_NORMALIZATION` constant divides the sum of 6 neighbor deltas. Set it to the 95th-percentile of observed per-tile average delta:

```js
function calibrateSlopeNormalization(seeds, radii, noiseConfig) {
  const deltas = [];
  // ... collect all per-tile average neighbor deltas (totalDiff / 6) ...
  deltas.sort((a, b) => a - b);
  return deltas[Math.floor(deltas.length * 0.95)];
}
```

### 4.8 Snapshot Tests

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

### 4.9 Chunk-Seam Test

Verify the invariant from Design Principle 4: a hex generated as a core tile of chunk A produces identical values when the same hex is generated as a ring tile of chunk B.

```js
export function runSeamTest(seedText, radius, noiseConfig) {
  // Generate two adjacent chunks (e.g., chunk (0,0) and chunk (1,0))
  // Compare all hexes in the overlap region (core of A ∩ ring of B, and vice versa)
  // Assert identical elevation, moisture, temperature, biomeId, terrain for every shared hex
}
```

This test catches regressions where a global pass (rivers, water BFS, epicenter) or per-chunk state leaks into what should be a pure function of `(seed, q, r)`. On finite maps, global passes run after all chunks are assembled, so the chunk-level invariant holds for the base fields and terrain classification (before global post-processing).

### 4.10 Climate-Coverage Test

Verify that the natural `BIOME_PRIORITY_ORDER` fully covers the climate cube. Any gap in coverage falls through to `biome_default` — this test makes those gaps visible:

```js
export function runClimateCoverageTest(seeds, radius, noiseConfig) {
  // For each seed, generate the full map
  // For each tile, compute the (elevation, moisture, temperature) climate coordinate
  // Report: for each biome, what fraction of tiles it covers
  // Report: tiles that fell through to biome_default, and their climate coordinates
  // This exposes "cold+dry falls to default" gaps before playtesting
}
```

The test doesn't enforce a specific distribution — it reports coverage so the designer can see gaps. The coverage report feeds into biome definition work in Phase A and Phase G.

### 4.11 Analysis Page UI

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
| `dev/analysis/generation/histograms.js` | **new** | `collectHistograms`, `percentileFromHistogram`, `buildQuantileLUT`, `calibratePipeline`, `calibrateSlopeNormalization` |
| `dev/analysis/generation/quantileLUT.js` | **new** | `normalizeField` — applies a quantile LUT to a raw value with linear interpolation |
| `dev/analysis/generation/snapshotTest.js` | **new** | `runSnapshotTests` — distribution invariant checks |
| `dev/analysis/generation/snapshotTest.js` | **new** | `runSnapshotTests` — distribution invariant checks |
| `dev/analysis/generation/seamTest.js` | **new** | `runSeamTest` — chunk-seam invariant verification |
| `dev/analysis/generation/climateCoverage.js` | **new** | `runClimateCoverageTest` — biome climate-cube coverage report |
| `dev/analysis/generation/generate.js` | edit | Export convenience wrappers that call the histogram module |
| `dev/analysis/analysis.js` | edit | Wire histogram collection into the analysis page |
| `dev/analysis/index.html` | edit | Add distributions tab/section |
| `dev/check_analysis_imports.py` | edit | Call `runSnapshotTests()`, `runSeamTest()`, `runClimateCoverageTest()` after import validation |
| `src/params/game/worldParams.js` | edit | Add calibrated threshold constants with comments documenting their percentile derivation |

---

## 6. Deliverable

- The analysis page shows histograms of elevation, moisture, temperature, and slope for any seed/radius.
- Threshold lines on the histograms show where each terrain cutoff sits.
- Running the analysis tool across 5+ seeds at radius 21 produces a calibration file (`dev/mapgen_update/calibration_v1.json`) containing:
  - Quantile LUTs (256-entry arrays) for elevation, moisture, temperature, and slope
  - Derived percentile thresholds for `DEFAULT_TERRAIN_RULES`
  - `SLOPE_NORMALIZATION` constant
  - Epicenter grid cell size calibration (for 3–10% supernatural coverage target)
- `check_analysis_imports.py` fails if a snapshot distribution invariant, chunk-seam invariant, or climate-cube coverage anomaly is detected.
- Every threshold constant in `worldParams.js` is a percentile with a comment citing its derivation (e.g., `// 90th percentile of pooled elevation histogram, 5 seeds × 3 radii`).
- Chunk-seam test verifies that adjacent chunks produce identical values at shared hexes.
- Climate-coverage test reports which climate zones fall through to `biome_default`, making coverage gaps visible before playtesting.

---

## 7. Risks & Edge Cases

- **The Phase A elevation composite isn't written yet.** The calibration tool calls `sampleBaseFields` with the *target* composite formula, not the current code. This means calibration runs against a function that may not yet exist in `terrainGenerator.js`. Acceptable — the function can be implemented as a standalone in the analysis tool during this phase, then moved into the game code in Phase A.
- **Small maps (radius 7) have low sample counts.** Histograms from 169-tile maps are noisy. Pool across multiple seeds (10+) to get stable statistics.
- **Snapshot tests are coarse.** The threshold ranges [6%, 20%] are intentionally wide — they're regression catchers, not precision checks. Tightening happens in Phase G.
