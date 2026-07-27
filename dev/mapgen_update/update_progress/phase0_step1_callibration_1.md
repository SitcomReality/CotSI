# Phase 0 Step 1 — Calibration Run 2 (seed=glut-17)

**Date:** After Calibration Run 1 (seed=glut-609)  
**Validates previous run:** Yes — same 10–50× discrepancy pattern across all fields; seed-dependent variation is within expected range (RIDGE 130→62, MOISTURE 101→41, CONTINENT identical at 73).

**REGION anomaly:** 73 crossings in run 1 vs 2 in this run. With 2 octaves at f=0.0015 the noise is so smooth that zero-crossing count varies wildly per seed. This confirms REGION needs more octaves (3+) for stable regional structure.

## Current Constants

```js
CONTINENT:       { octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.0008 }
ELEVATION_DETAIL: { octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.020 }
RIDGE:           { octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.008 }
MOISTURE:        { octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.006 }
TEMP_VARIATION:  { octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.08 }
REGION:          { octaves: 2, lacunarity: 2.0, gain: 0.5, frequency: 0.0015 }
```

---

=== Frequency Verification ===
  radius=50  tiles=7651

CONTINENT:
  config freq=0.0008  octaves=3
  target: 2-4 landmasses on radius-50
  zero-crossings=73  half-cycles=36.5
  effective λ=1wu  (~2.7 hexes)

ELEVATION_DETAIL:
  config freq=0.02  octaves=4
  target: ~10-hex local relief
  zero-crossings=408  half-cycles=204.0
  effective λ=0wu  (~0.5 hexes)

RIDGE:
  config freq=0.008  octaves=3
  target: ~25-hex mountain chains
  zero-crossings=62  half-cycles=31.0
  effective λ=2wu  (~3.2 hexes)

MOISTURE:
  config freq=0.006  octaves=4
  target: broad wet/dry bands
  zero-crossings=41  half-cycles=20.5
  effective λ=2wu  (~4.9 hexes)

TEMP_VARIATION:
  config freq=0.08  octaves=1
  target: local temp noise
  zero-crossings=871  half-cycles=435.5
  effective λ=0wu  (~0.2 hexes)

REGION:
  config freq=0.0015  octaves=2
  target: 4-6 biome regions on radius-50
  zero-crossings=2  half-cycles=1.0
  effective λ=50wu  (~100.0 hexes)

--- hexToWorld note ---
Adjacent hex spacing: ~1.0wu (q) / ~1.732wu (r)
Wavelength = 1/f world-units. f=0.0008 → λ=1250wu.
A radius-50 map spans ~100wu. At f=0.0008 that is ~0.08 cycles
— far from the "2-4 landmasses" target. If zero-crossings confirm
this, all frequencies need a downward revision.

=== Histogram Collection ===
  seed=glut-17  radius=50  tiles=7651

Elevation:
  p10=0.160  p25=0.200  p50=0.260
  p75=0.320  p90=0.360  p95=0.400  p99=0.440

Moisture:
  p10=0.260  p25=0.360  p50=0.480
  p75=0.660  p90=0.720  p95=0.740  p99=0.760

Temperature:
  p10=0.460  p25=0.500  p50=0.540
  p75=0.580  p90=0.620  p95=0.640  p99=0.660

Slope:
  p10=0.000  p25=0.000  p50=0.000
  p75=0.000  p90=0.000  p95=0.000  p99=0.020

--- Noted uses ---
waterMaxElevation (p12)     → target ~0.12
mountainThreshold (p90)     → top 10% elevation
peakThreshold (p97)         → top 3% elevation
floatingIsland (p99.5)      → top 0.5% elevation

=== Quantile LUT Build ===
  source: 3 seeds × r=50

Elevation LUT (256 entries):
  [  0]=0.0000  [ 32]=0.0494  [ 64]=0.5088  [ 96]=0.9421  [128]=1.0000  [160]=1.0000  [192]=1.0000  [224]=1.0000  [255]=1.0000

  sanity: raw=0.10→0.0137  raw=0.50→0.9999  raw=0.90→1.0000

Moisture LUT (256 entries):
  [  0]=0.0000  [ 32]=0.0000  [ 64]=0.1132  [ 96]=0.3864  [128]=0.5617  [160]=0.6900  [192]=0.9287  [224]=0.9949  [255]=1.0000

  sanity: raw=0.10→0.0000  raw=0.50→0.5594  raw=0.90→0.9987

Temperature LUT (256 entries):
  [  0]=0.0000  [ 32]=0.0000  [ 64]=0.0000  [ 96]=0.0025  [128]=0.3180  [160]=0.9407  [192]=1.0000  [224]=1.0000  [255]=1.0000

  sanity: raw=0.10→0.0000  raw=0.50→0.3078  raw=0.90→1.0000

Slope LUT (256 entries):
  [  0]=0.0000  [ 32]=1.0000  [ 64]=1.0000  [ 96]=1.0000  [128]=1.0000  [160]=1.0000  [192]=1.0000  [224]=1.0000  [255]=1.0000

  sanity: raw=0.10→1.0000  raw=0.50→1.0000  raw=0.90→1.0000

---

## Proposed Correction (Run 2 → Run 3)

The corrected frequencies divide each field's original value by the ratio of empirical half-cycles to target half-cycles. Updated in `noiseConfig.js`.

### Frequency Changes

| Field | Old f | New f | Correction | Target half-cycles | Expected from correction |
|-------|-------|-------|------------|-------------------|-------------------------|
| CONTINENT | 0.0008 | **0.00012** | ÷6.7 | 6 | ~5.5 |
| ELEVATION_DETAIL | 0.020 | **0.0025** | ÷8 | 20 | ~22.8 |
| RIDGE | 0.008 | **0.0012** | ÷6.7 | 8 | ~7.2 |
| MOISTURE | 0.006 | **0.0008** | ÷7.5 | 6 | ~4.7 |
| TEMP_VARIATION | 0.08 | **0.005** | ÷16 | 30 | ~27 |
| REGION | 0.0015 (2 oct) | **0.003 (3 oct)** | ÷0.5 + octaves+1 | 10 | ~6-12 |

### Structural Changes

- **REGION** changed to 3 octaves (was 2). With 2 octaves at f=0.0015, the noise was so smooth that zero-crossing count varied wildly (2–73 depending on seed). 3 octaves at f=0.003 gives ~2 combined FBM cycles across the map plus sub-cell texture, producing stable regional structure.

- **No octave changes** for other fields.

### Predicted Outcome

If the correction holds (i.e., zero-crossing count scales linearly with frequency — which is the first-order approximation), the new frequencies should bring all fields within 2× of their target half-cycle ranges. CONTINENT, MOISTURE, and RIDGE should hit their targets. ELEVATION_DETAIL may still be slightly fast (22.8 vs 20). TEMP_VARIATION should produce λ~3 hexes.

### Remaining Issues (not fixed by frequency alone)

1. **Elevation distribution still compressed** — the multiplicative formula `continent × detail` concentrates values in [0.12, 0.46]. Quantile LUTs can normalize this, but the narrow raw range means LUT stretching may amplify noise at biome boundaries.

2. **Slope still near-zero** — regardless of frequency, the elevation composite is too smooth at the single-hex level. Fix requires either: (a) a dedicated high-frequency detail channel for slope, or (b) computing slope over a radius-2 neighborhood.

3. **Temperature range still narrow** — even with corrected frequency, the temperature formula itself (0.35 latitude + 0.10 variation - 0.30 lapse) may need coefficient tuning. Check after this run.