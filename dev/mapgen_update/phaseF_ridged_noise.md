# Phase F: Ridged Noise for Mountains

**Depends on:** Phase B (3-layer elevation composite), Phase 0 (calibration values)  
**Can run in parallel with:** Phases C, D, E  
**Note:** This phase is not truly optional. Thresholding a near-Gaussian additive field at the 95th percentile yields small round blobs, not ranges. Mountain aesthetics and the `mountainType: 'range'` tag are load-bearing on ridged noise.  
**Deliverable:** Sharp mountain ridges instead of rounded hills. Natural-looking mountain ranges with jagged crests.

---

## 1. Objective

The current ridge layer in the elevation composite uses regular FBM, producing rounded, hill-like mountains. Ridged noise produces sharp crests by taking the absolute value of each octave, creating ridge lines where the noise crosses zero.

This phase implements `ridgedFbm2D()` in the noise engine and swaps it into the ridge layer. The result is mountain ranges with distinct, jagged ridge lines rather than smooth bumps.

---

## 2. Scope

**In scope:**
- Implement `ridgedFbm2D()` in `src/engine/rules/noise.js`
- Swap the ridge layer from regular FBM to ridged FBM in `sampleBaseFields`
- Recalibrate elevation distribution (Phase 0) — ridged noise has a different amplitude profile than regular FBM
- Update the per-phase normalization constant

**Out of scope:**
- Ridge-aware terrain classification (ridges produce no new terrain types — they affect the elevation field, which classification already reads)
- Erosion simulation or other advanced terrain algorithms

---

## 3. Pre-requisites

- Phase B complete: the 3-layer composite exists with `NOISE_RIDGE` as a regular FBM placeholder.
- Phase 0 calibration infrastructure is available for recalibration.

---

## 4. Detailed Changes

### 4.1 Ridged FBM Algorithm

Ridged noise modifies standard FBM by taking the absolute value of each octave's noise and inverting it, so peaks become sharp ridges where the unmodified noise crosses zero.

```js
/**
 * Ridged Fractional Brownian Motion (2D).
 *
 * Standard FBM sums octaves of simplex noise — produces rounded, rolling terrain.
 * Ridged FBM takes |noise| at each octave and inverts, producing sharp ridges
 * where the unmodified noise crosses zero.
 *
 * @param {number} x   - World-space x
 * @param {number} y   - World-space y
 * @param {number} seed - Integer seed
 * @param {object} [opts]
 * @param {number} [opts.octaves=4]
 * @param {number} [opts.lacunarity=2]
 * @param {number} [opts.gain=0.5]
 * @param {number} [opts.frequency=0.01]
 * @param {number} [opts.offset=1.0]  - Vertical offset to shift ridges above zero
 * @returns {number} - Value in [0, 1]
 */
export function ridgedFbm2D(x, y, seed, opts = {}) {
  const seedInt = typeof seed === 'number' ? seed : stringSeed(seed);
  const octaves    = opts.octaves    ?? 4;
  const lacunarity = opts.lacunarity ?? 2;
  const gain       = opts.gain       ?? 0.5;
  const frequency  = opts.frequency  ?? 0.01;
  const offset     = opts.offset     ?? 1.0;

  const perm = _getPerm(seedInt);

  let value = 0;
  let amp = 1;
  let maxAmp = 0;
  let freq = frequency;
  let weight = 1;

  for (let i = 0; i < octaves; i++) {
    let n = _simplex2D(x * freq, y * freq, perm);

    // Absolute value creates sharp ridge at zero-crossings
    n = Math.abs(n);
    // Invert so ridges point upward: 1 - |n|
    n = offset - n;
    // Square to sharpen ridges further
    n = n * n * weight;

    // Weight successive octaves by the previous octave's value
    weight = n;

    value += n * amp;
    maxAmp += amp;
    amp *= gain;
    freq *= lacunarity;
  }

  // Normalize to [0, 1]
  // maxAmp is sum of amplitudes (1 + gain + gain² + ...) ≈ 2.0 for gain=0.5
  // offset=1.0 gives output roughly in [-1, 1] per octave before squaring
  return clamp01((value / maxAmp + offset - 1) / offset);
}
```

**Key differences from standard `fbm2D`:**
- `|noise|` at each octave creates sharp downward-pointing ridges.
- `offset - |noise|` inverts them upward.
- Squaring (`n * n`) sharpens the ridges further.
- `weight` tracks the previous octave's value, so octaves reinforce each other at ridge locations rather than averaging.

### 4.2 Hex-Convenience Wrapper

```js
export function hexRidgedFbm2D(q, r, seed, opts = {}) {
  const { x, y } = hexToWorld(q, r);
  return ridgedFbm2D(x, y, seed, opts);
}
```

### 4.3 Swap in `sampleBaseFields`

Replace the ridge layer's regular FBM with ridged FBM:

```js
// Before (Phase B):
const ridges = hexFbm2D(q, r, baseSeed + NC.SEED_RIDGE, NC.RIDGE);

// After (Phase F):
const ridges = hexRidgedFbm2D(q, r, baseSeed + NC.SEED_RIDGE, NC.RIDGE);
```

Ridged FBM uses the same `NOISE_RIDGE` configuration (`octaves: 3, frequency: 0.008`) — the difference is the algorithm, not the parameters. The frequency 0.008 at ~25-hex wavelength creates mountain-chain-scale ridges.

### 4.4 Per-Phase Normalization Update

With ridged FBM producing values in [0, 1], the full additive composite is active:

```js
const distance = hexDistance(q, r, 0, 0);
const rawElev = worldShape(distance, radius) * (detail * 0.50 + ridges * 0.50);
// Two FBM fields sum to approximately [0, 2]; divide by 2 for [0, 1].
// worldShape at border = 0 ⇒ elevation forced to 0 ⇒ ocean ring.
const elevation = clamp01(rawElev);
```

Ridged noise's mean is lower than regular FBM (it concentrates near ridges), so the effective distribution may still compress slightly toward the low end. **Recalibrate:** Run Phase 0 calibration against the new composite to regenerate quantile LUTs. Thresholds remain stable percentiles.

### 4.5 Ridged Noise Configuration

```js
// worldParams.js
export const NOISE_RIDGE = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.008, offset: 0.9
};
```

The `offset` parameter (0.9) is lower than the default 1.0 — this shifts the ridge baseline slightly lower, reducing the amount of low-elevation ridge noise on flat terrain. Mountain ranges form where ridge noise is strong — the world shape function handles edge-to-ocean transition via the multiplicative envelope.

---

## 5. Files Touched

| File | Change | Summary |
|------|--------|---------|
| `src/engine/rules/noise.js` | **add** | `ridgedFbm2D`, `hexRidgedFbm2D` functions |
| `src/game/rules/terrainGen/fields/sampleBaseFields.js` | edit | Swap ridge layer from `hexFbm2D` to `hexRidgedFbm2D` |
| `src/params/game/worldParams.js` | edit | Add `offset` to `NOISE_RIDGE` config; update `ELEV_NORMALIZATION` |

---

## 6. Deliverable

- Mountain ranges have sharp ridge crests rather than rounded bumps.
- Ridge lines are visible in the analysis tool's elevation overlay as narrow, high-value bands surrounded by steep drop-offs.
- Elevation distribution recalibrated: quantile LUTs regenerated from Phase 0. Thresholds remain stable percentiles.
- No regression in terrain type distributions (snapshot tests pass after recalibration).

---

## 7. Risks & Edge Cases

- **Ridged noise has a different value distribution than regular FBM.** The mean is lower, and values cluster near the ridges. This shifts the elevation histogram toward lower values, which changes terrain type percentages. Recalibration is essential — without it, mountain coverage drops and plains dominate.
- **Sharp ridges may look unnatural if too frequent.** The `offset` parameter (0.9) and the squaring (`n * n`) both control ridge sharpness. Start conservative (lower offset, less squaring) and tune upward in Phase G if ridges look too soft.
- **`ridgedFbm2D` is novel code in this project.** The simplex noise implementation is well-tested, but ridged FBM introduces new arithmetic paths. Test with known seeds against the analysis tool's elevation histogram to verify the output range is [0, 1] and the distribution shape matches expectations.
