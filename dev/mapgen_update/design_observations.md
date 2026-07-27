# Critique: Terrain Generation Redesign

This is an exceptionally well-crafted design document. The phased approach, clear separation of concerns, and data-driven extensibility are all excellent. The diagnosis of the current system's flaws is precise, and the proposed pipeline is a significant improvement. That said, I have several specific criticisms and suggestions, ranging from critical geometric issues to smaller refinements.

---

## Critical Issues

### 1. Latitude Calculation Uses Axial `r`, Not Radial Distance (Section 4.3)

```js
latitudeTerm = 1.0 - (Math.abs(r) / radius)
```

This is a significant geometric error. On a hex grid with axial coordinates `(q, r)`, using `Math.abs(r)` creates climate bands that are **straight lines parallel to one hex axis**, not concentric circles from the center. The result would be an artificial, directional banding effect (e.g., the entire "top" of the map is arctic, the "bottom" is tropical, with straight-line transitions).

**Fix:** Use true distance from the map center:
```js
const dist = hexDistance(q, r, 0, 0); // or equivalent axial distance
latitudeTerm = 1.0 - (dist / radius);
```
This produces circular climate zones appropriate for a radial map. The same correction applies to the shared sampler in §7.

---

### 2. Water Determination Feedback Loop (Passes 2, 3, 5)

The pipeline determines water in **Pass 2** using `baseMoisture`, then boosts moisture in **Pass 3** based on that water mask, then reclassifies terrain in **Pass 5** using the boosted moisture. This creates a potential inconsistency:

- A low-elevation tile with `baseMoisture = 0.40` is **not water** in Pass 2.
- It's adjacent to water, so Pass 3 boosts its moisture to `0.55`.
- In Pass 5, the classifier sees `elevation < 0.07 && moisture > 0.50` and classifies it as **water**.
- But the Pass 3 moisture boost was calculated using the Pass 2 water mask, which didn't include this tile. It may not have received the full coastal boost it would need, or it may now be water surrounded by tiles that were never boosted for being near it.

**Fix:** Decide on one of these approaches:
- **Option A:** Make water determination depend **only on elevation** (`elevation < waterMaxElevation`), decoupling it from moisture entirely. Moisture then only affects coastal biomes and terrain types (beach, marsh).
- **Option B:** Accept that Pass 2's water mask is approximate and add a note that Pass 5 may reclassify tiles as water that weren't in the mask—this is a known visual artifact at small scales.
- **Option C:** Make it iterative (classify → adjust moisture → reclassify until stable). Overkill for v1, but worth acknowledging.

---

### 3. Border Ring Lookup Can't Determine Water Without Classification (§6.1)

The `adjustMoisture` function needs to check if neighbors are water:
```js
if (nt && (nt.provisionalTerrain === 'water' || nt.provisionalTerrain === 'ocean'))
```

But for tiles in the border ring that haven't been fully generated, you only have `sampleBaseFields`, which returns raw physical fields—**not** `provisionalTerrain`. You can't know if a neighbor is water without running the classifier on it, which requires knowing *its* moisture, which requires knowing if *its* neighbors are water...

**Fix:** Either:
- Fully classify border ring tiles (accept the cost).
- Determine water from elevation alone for the border ring lookup (ties back to the feedback loop fix above).
- Return `provisionalTerrain` from `sampleBaseFields` by running the lightweight Pass 2 classifier inside it.

---

## Significant Issues

### 4. `selectBiome()` Hardcodes Thresholds That Duplicate Archetype Data (§5.1 and §10)

The `selectBiome` function has:
```js
if (m > 0.62 && t > 0.25) return 'biome_lush';
```

And the archetype has:
```js
climateRange: {
  minMoisture: 0.62,
  minTemperature: 0.25,
}
```

These are the same values in two places. When a designer tweaks the lush biome's climate range in `biomes.js`, they must also remember to update `selectBiome()`. This violates the design principle that "biomes are data."

**Fix:** Make `selectBiome()` iterate over registered archetypes and check `climateRange`:
```js
function selectBiome(elevation, moisture, temperature, regionBias) {
  const m = clamp01(moisture + (regionBias - 0.5) * 0.10);
  const t = clamp01(temperature + (regionBias - 0.5) * 0.10);
  
  for (const biomeId of getBiomeOrder()) {
    const range = getArchetype(biomeId).climateRange;
    if (m >= range.minMoisture && t >= range.minTemperature && /* ... */) {
      return biomeId;
    }
  }
  return 'biome_default';
}
```
This makes adding a new biome a purely data-driven operation with zero code changes.

---

### 5. Ridge and Detail Frequencies Are Too Close (Section 8)

```js
NOISE_ELEVATION_DETAIL: frequency 0.015
NOISE_RIDGE:            frequency 0.012
```

These are only 20% apart. When two FBM layers have similar frequencies, they don't produce distinct visual features—they interfere, creating moiré-like artifacts or just "muddier" noise. Ridge noise is supposed to produce sharp mountain chains; detail noise is supposed to produce rolling hills. At these frequencies, they'll compete for the same spatial scale.

**Fix:** Separate them more distinctly. For example:
- Detail: `0.020` (local hills, ~10-hex scale)
- Ridge: `0.008` (mountain chains, ~25-hex scale)

Or use the same frequency but ensure the seed offset provides sufficient phase separation and let ridged noise's absolute-value operation do the differentiation. Still, distinct frequencies are cleaner.

---

### 6. Elevation Composite Weights Don't Normalize in Early Phases (§11, Phase A)

The final formula is:
```js
continent * 0.60 + detail * 0.25 + ridges * 0.15 * continent
```

In Phase A, ridges don't exist yet. The formula becomes:
```js
continent * 0.60 + detail * 0.25
```

This maxes out at `0.85`, not `1.0`. All terrain thresholds (`waterMaxElevation: 0.07`, `mountainThreshold: 0.905`, etc.) are calibrated for a `[0, 1]` range. In Phase A, nothing will ever reach `0.905`, so **no mountains will generate** until Phase B or F.

**Fix:** Either:
- Normalize weights per phase: Phase A uses `continent * 0.70 + detail * 0.30`.
- Or accept that Phase A's mountains are "soft" and document that thresholds will shift.
- Or apply the weights as proportions: `continent * 0.60 + detail * 0.25` becomes `(continent * 0.60 + detail * 0.25) / 0.85`.

---

### 7. Biome Boundaries Are Hard Thresholds (No Ecotones)

```js
if (moisture < R.desertMaxMoisture) return 'desert';
if (moisture > R.forestMinMoisture) return 'forest';
```

At `moisture = 0.19` you get desert. At `moisture = 0.21` you get forest. The transition is a single hex of abrupt change. Real biomes have ecotones—gradual transitions with mixed flora.

**Fix:** This doesn't need to be solved in v1, but the design should acknowledge it. A future enhancement could use `smoothstep` at biome/terrain boundaries to blend feature densities, colors, or even tile types over a 2–3 hex transition zone.

---

## Missing or Under-Specified Elements

### 8. Rain Shadow Is Mentioned But Never Defined

Pass 3 references `rainShadow(elevation)`, and §4.2 mentions it:
```js
moisture = clamp01(baseMoisture + waterProximityBoost - rainShadow)
```

But there is no algorithm, no parameters, and no explanation of how rain shadow works. Which direction does the wind blow? Does it depend on slope orientation? Does it cascade downwind?

**Suggestion:** Add at least a stub algorithm:
```js
// Wind blows along +q axis. A tile is in rain shadow if it has
// a higher-elevation neighbor in the -q direction.
function computeRainShadow(q, r, elevationAt) {
  const windwardNeighbor = neighborInDirection(q, r, 'west');
  if (!windwardNeighbor) return 0;
  const elevationDiff = elevationAt(windwardNeighbor.q, windwardNeighbor.r) - elevationAt(q, r);
  if (elevationDiff > 0.3) return (elevationDiff - 0.3) * 0.5; // decay
  return 0;
}
```
Even a simple stub shows the design is complete.

---

### 9. Slope Normalization Uses a Magic Number (§6.3)

```js
return clamp01(totalDiff / (6 * 0.3));
```

Why `0.3`? This means an average neighbor difference of 0.3 yields slope 1.0. This is a tuning parameter that deserves a named constant and a comment explaining its rationale:

```js
const SLOPE_NORMALIZATION = 0.3; // expected max elevation diff between neighbors
return clamp01(totalDiff / (6 * SLOPE_NORMALIZATION));
```

---

### 10. `rawElevation` Is Misnamed (§7)

```js
return {
  elevation,
  rawElevation: elevation, // <-- this is the composite, not raw
  ...
};
```

The comment says "pre-modulation source," but `elevation` at this point is already `continent * 0.60 + detail * 0.25 + ridges * 0.15 * continent`. It's not raw. If you want the actual raw components for debugging, return them:

```js
return {
  elevation,
  rawLayers: { continent, detail, ridges },
  ...
};
```

Or drop `rawElevation` entirely since it's redundant.

---

### 11. No Mention of Biome Topological Coherence

Climate-driven selection can produce geographically nonsensical biomes: a single hex of tundra surrounded by jungle, or a ring of desert around a mountain peak (which is actually correct, but the design doesn't distinguish correct anomalies from noise artifacts). The `regionBias` helps, but it only shifts thresholds by ±5%.

**Suggestion:** Consider a lightweight post-pass that smooths biome assignments: if a tile's biome differs from all 6 neighbors, and it's not explained by a sharp elevation cliff, reassign it to the majority neighbor biome. Or at least acknowledge this as a known risk in §14.

---

## Minor / Polish Issues

### 12. Cold + Dry Climate Falls Through to `default` (§5.1)

```js
if (t < 0.20 && m > 0.60) return 'biome_tundra';
if (t > 0.65 && m < 0.22) return 'biome_arid';
if (m > 0.62 && t > 0.25) return 'biome_lush';
return 'biome_default';
```

What is `t < 0.20 && m < 0.22`? Cold and dry. This becomes `biome_default`, which is presumably temperate plains. A frozen desert (polar ice cap or cold steppe) is a major real-world biome that has no home here. The design should at least note this gap.

### 13. River Tracing Complexity Is Understated (§6.2)

"30 sources × 200 steps = 6,000 operations — negligible."

Each step does: get 6 neighbors, look up elevation for each, filter, sort. That's:
- 6 elevation samples per step
- A sort of up to 6 elements per step
- Set insertion and lookup per step

Real cost: ~6,000 steps × 6 samples = **36,000 elevation samples** plus sorting overhead. Still negligible, but the document's math is misleading.

### 14. `clamp01` Is Never Defined

Used extensively throughout but never defined. Add a one-liner in a utilities section or inline:
```js
const clamp01 = (v) => Math.max(0, Math.min(1, v));
```

### 15. No Discussion of Player Terraforming or World Modification

The entire design assumes a static, deterministic world where `sampleBaseFields(seed, q, r)` is the source of truth. If the game allows terrain modification (digging, flooding, building), this system has no hook for it. The design document should either state "terrain is immutable" or outline how modifications would layer on top (e.g., a modification map that overrides the deterministic sampler).

---

## Summary

The design is structurally excellent. The pipeline is logical, the phased delivery plan is pragmatic, and the data-driven archetype system is a strong foundation for extensibility. The most critical issues to address before implementation are:

1. **Fix the latitude calculation** to use radial distance, not axial `r`.
2. **Resolve the water determination feedback loop** by decoupling water from moisture or making it explicit.
3. **Fix the border ring lookup** so it can actually determine if a neighbor is water.
4. **Make `selectBiome()` read from archetype data** rather than hardcoding thresholds.
5. **Separate ridge and detail frequencies** to avoid noise interference.
6. **Normalize elevation weights per phase** so early phases don't silently fail to produce mountains.

Once these are addressed, this is a design I would be confident implementing.