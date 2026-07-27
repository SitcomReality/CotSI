# Phase B: Multi-Scale Elevation + Slope

**Depends on:** Phase A (climate-driven classification), Phase 0 (calibration values)  
**Deliverable:** Mountain ranges (not popcorn mountains), flat highland plateaus, passable hills. Slope discriminates mountain vs plateau vs hill.

---

## 1. Objective

Phase A uses a single FBM field for elevation, producing "popcorn noise" — isolated mountain blobs with no range structure. This phase introduces the 3-layer elevation composite (continent mask × detail) and slope computation. The result is continents with mountain ranges on them, flat plateaus, rolling hills, and natural terrain gradients.

---

## 2. Scope

**In scope:**
- 3-layer elevation composite: `continentMask * (detail + ridges_placeholder)`
- Slope computation using neighbor elevation deltas
- Border ring sampling for chunk-edge slope and tagging
- `hill` and `plateau` terrain types added to `TERRAIN`
- Classifier discriminates mountain (steep) vs plateau (flat highland) via slope
- Per-phase elevation weight normalization (see §4.1)
- Eliminate `fallbackT` — border ring provides real data for all neighbor lookups

**Out of scope:**
- Ridged noise for the ridge layer (Phase F — uses regular FBM placeholder)
- Water-adjusted moisture (Phase C — base moisture only for now)
- Rivers (Phase D)

---

## 3. Pre-requisites

- Phase A complete: `sampleBaseFields` exists, `classifyTerrain` uses `DEFAULT_TERRAIN_RULES`.
- Phase 0 calibration values for the 3-layer composite (run calibration against the new formula before setting thresholds).

---

## 4. Detailed Changes

### 4.1 Elevation Composite with Per-Phase Normalization

The multiplicative composite formula from the overview:

```js
rawElev = continent × (detail × wD + ridges × wR)
elevation = clamp01(rawElev)
```

In Phase B, ridges = 0 (regular FBM placeholder until Phase F) and wD = 0.50. The product `continent × (detail × 0.50)` ranges [0, 0.50], so normalize:

```js
// Phase B normalization (ridges not yet implemented, wD = 0.50):
const rawElev = continent * (detail * 0.50 + ridges * 0.50);
const elevation = clamp01(rawElev * 2.0);  // normalize [0, 0.5] → [0, 1]
```

This means the calibration from Phase 0 produced thresholds against the *normalized* output. When Phase F adds the ridge layer, weights shift to wD = 0.30, wR = 0.70 (ridged FBM has a different amplitude profile) and the normalization constant is recalibrated. Each phase doc states its normalization formula explicitly.

### 4.2 Noise Configuration (`worldParams.js`)

Replace `NOISE_PHASE_A_ELEVATION` with the layered config:

```js
export const NOISE_CONTINENT = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.0008  // TBD from Phase 0
};
export const NOISE_ELEVATION_DETAIL = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.020   // TBD from Phase 0; target ~10-hex scale
};
export const NOISE_RIDGE = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.008   // TBD from Phase 0; target ~25-hex scale (regular FBM placeholder)
};
```

**Frequency separation:** Target detail at ~10-hex and ridge at ~25-hex scale are separated by ~2.5× — distinct spatial scales rather than the original 20% separation that caused interference. Exact values determined by Phase 0 frequency verification.

### 4.3 Updated `sampleBaseFields`

```js
export function sampleBaseFields(baseSeed, q, r, noiseConfig, radius) {
  const NC = noiseConfig;

  // Multiplicative elevation composite: continent × (detail × wD + ridges × wR)
  const continent = hexFbm2D(q, r, baseSeed + NC.SEED_CONTINENT, NC.CONTINENT);
  const detail    = hexFbm2D(q, r, baseSeed + NC.SEED_DETAIL,    NC.ELEVATION_DETAIL);
  const ridges    = hexFbm2D(q, r, baseSeed + NC.SEED_RIDGE,     NC.RIDGE);
  const rawElev   = continent * (detail * 0.50 + ridges * 0.50);
  // Phase B normalization (ridges placeholder, wD = 0.50):
  const elevation = clamp01(rawElev * 2.0);

  // Moisture, temperature, region bias — updated per overview formulas
  const baseMoisture  = hexFbm2D(q, r, baseSeed + NC.SEED_MOISTURE, NC.MOISTURE);
  const { y }         = hexToWorld(q, r);
  const worldRadiusY  = radius * 1.73;  // calibrate in Phase 0
  const latitudeTerm  = 1.0 - (Math.abs(y) / worldRadiusY);
  const tempVariation = hexFbm2D(q, r, baseSeed + NC.SEED_TEMP, NC.TEMP_VARIATION);
  const RULES         = DEFAULT_TERRAIN_RULES;
  const temperature   = clamp01(
    0.5 + 0.35 * (latitudeTerm - 0.5)
        + 0.10 * (tempVariation - 0.5)
        - 0.30 * (elevation - RULES.waterMaxElevation)
  );
  const regionBiasM = hexFbm2D(q, r, baseSeed + NC.SEED_REGION_M, NC.REGION);
  const regionBiasT = hexFbm2D(q, r, baseSeed + NC.SEED_REGION_T, NC.REGION);

  return {
    elevation,
    rawLayers: { continent, detail, ridges },
    baseMoisture,
    temperature,
    regionBiasM,
    regionBiasT,
  };
}
```

### 4.4 Slope Computation

Slope measures topographic steepness, not high-frequency noise roughness. Computing neighbor deltas from the full FBM elevation (which includes detail octaves down to ~5-hex wavelength) makes slope dominated by the finest octave — `plateauSlopeMin` and `hillSlopeMin` become knobs on `NOISE_ELEVATION_DETAIL`'s top octave rather than actual steepness.

**Fix: compute slope from low-passed elevation** (continent + ridge layers only, excluding detail):

```js
function computeSlope(q, r, elevationAt, lowPassElevationAt) {
  const center = lowPassElevationAt(q, r);
  let totalDiff = 0;
  const nbrs = neighbors({ q, r });
  for (const n of nbrs) {
    totalDiff += Math.abs(lowPassElevationAt(n.q, n.r) - center);
  }
  return clamp01(totalDiff / (6 * SLOPE_NORMALIZATION));
}
```

`SLOPE_NORMALIZATION` is the 95th-percentile of `totalDiff / 6` across multiple seeds — using the **aggregate statistic** (mean of 6 deltas), not the 95th-percentile of individual neighbor deltas (which sits much higher). Phase 0 documents the derivation. Using the right statistic ensures slope values span [0, 1] instead of clustering near 0.

### 4.5 Border Ring Implementation

When generating a chunk, sample `sampleBaseFields` for the chunk's hexes PLUS a ring of width `MAX_LOOKUP_RADIUS` (currently 3 — the chained sum: slope ±1 + water proximity ±2) around the chunk boundary.

```js
function hexesInExpandedChunk(cq, cr, ringWidth) {
  const half = CHUNK_SIZE / 2;
  const baseQ = cq * CHUNK_SIZE;
  const baseR = cr * CHUNK_SIZE;
  const results = [];
  for (let lq = -half - ringWidth; lq < half + ringWidth; lq++) {
    for (let lr = -half - ringWidth; lr < half + ringWidth; lr++) {
      results.push({ q: baseQ + lq, r: baseR + lr });
    }
  }
  return results;
}
```

Border ring hexes:
- Are sampled via `sampleBaseFields` (deterministic, consistent with any chunk that later generates them)
- Are classified through provisional water (elevation-only check)
- Provide real data for slope computation at chunk edges
- Provide real data for mountain/water tagging neighbor lookups
- Are **discarded** after tagging — only the core 24×24 hexes are stored in `tileMap`

This eliminates `fallbackT` entirely. The `tileLookup` closure in `generateChunkTiles` now only needs to check the local tileMap (all neighbors are either in the core or in the border ring, both available in memory).

### 4.6 New Terrain Types

Add to `src/game/rules/terrainTypes.js`:

```js
hill: {
  fill:'#8ba863', ink:'#c8d8b0', label:'Hill',
  passable:true, movementCost:1, mark:'∧'
},
plateau: {
  fill:'#9a9078', ink:'#d0c8b8', label:'Plateau',
  passable:true, movementCost:1, mark:'⊓'
},
```

### 4.7 Updated `classifyTerrain`

```js
function classifyTerrain(elevation, moisture, temperature, slope, biomeDef) {
  const R = { ...DEFAULT_TERRAIN_RULES, ...biomeDef?.terrainRules };

  // Water (unchanged from Phase A; elevation-only in Phase C)
  if (elevation < R.waterMaxElevation && moisture > R.waterMinMoisture)
    return 'water';

  // Elevation gates
  if (elevation > R.floatingIslandThreshold) return 'floatingIsland';
  if (elevation > R.peakThreshold)          return 'peak';

  // Mountain vs plateau: slope discriminates
  if (elevation > R.mountainThreshold) {
    return slope > R.plateauSlopeMin ? 'mountain' : 'plateau';
  }

  // Hills: moderate elevation, moderate slope
  if (elevation > R.hillElevationMin && slope > R.hillSlopeMin)
    return 'hill';

  const belowTreeLine = elevation < R.treeLineMax;

  if (belowTreeLine && moisture > R.denseForestMinMoisture)
    return 'denseForest';
  if (belowTreeLine && moisture > R.forestMinMoisture)
    return 'forest';
  if (moisture < R.desertMaxMoisture)
    return 'desert';
  if (moisture > R.marshMinMoisture && elevation < R.marshMaxElevation)
    return 'marsh';

  return 'plains';
}
```

### 4.8 `DEFAULT_TERRAIN_RULES` Additions

```js
export const DEFAULT_TERRAIN_RULES = {
  // ... existing (Phase A) ...
  plateauSlopeMin:  0.08,  // below this = plateau, above = mountain
  hillElevationMin: 0.55,
  hillSlopeMin:     0.10,
};
```

These values are calibrated in Phase 0 against the slope histogram and elevation distribution of the 3-layer composite.

### 4.9 Updated `generateChunkTiles`

The generation function now:
1. Samples `sampleBaseFields` for core + border ring hexes
2. Computes slope for core hexes (using border ring neighbor data)
3. Classifies terrain with slope
4. Tags mountain/water types using border ring neighbor data (no `fallbackT`)
5. Discards border ring hexes from the returned `tileMap`

```js
export function generateChunkTiles(seedText, chunkQ, chunkR, radius, biomeDef, params) {
  const seed = stringSeed(seedText);
  const tileMap = new Map();

  // All hexes in expanded chunk (core + border ring)
  const allHexes = hexesInExpandedChunk(chunkQ, chunkR, MAX_LOOKUP_RADIUS);

  // Sample base fields for ALL hexes
  const fieldMap = new Map();
  for (const { q, r } of allHexes) {
    fieldMap.set(coordKey({ q, r }), sampleBaseFields(seed, q, r, NOISE_CONFIG, radius));
  }

  // Determine which hexes are in the core chunk
  const coreSet = new Set();
  const coreHexes = hexesInChunk(chunkQ, chunkR);
  for (const { q, r } of coreHexes) {
    const s = -q - r;
    if (Math.abs(s) <= radius && Math.abs(q) <= radius && Math.abs(r) <= radius) {
      coreSet.add(coordKey({ q, r }));
    }
  }

  // Compute slope for core hexes
  const slopeMap = new Map();
  for (const key of coreSet) {
    const [q, r] = key.split(',').map(Number);
    const elevationAt = (nq, nr) => fieldMap.get(coordKey({ q: nq, r: nr }))?.elevation ?? 0;
    slopeMap.set(key, computeSlope(q, r, elevationAt));
  }

  // Classify terrain for core hexes
  for (const key of coreSet) {
    const [q, r] = key.split(',').map(Number);
    const fields = fieldMap.get(key);
    const slope = slopeMap.get(key);

    let hexBiomeId, hexBiomeDef;
    if (biomeDef) {
      hexBiomeDef = biomeDef;
      hexBiomeId = biomeDef.id;
    } else {
      hexBiomeId = selectBiome(
        fields.elevation, fields.baseMoisture, fields.temperature,
        fields.regionBiasM, fields.regionBiasT
      );
      hexBiomeDef = getArchetype(hexBiomeId) || getArchetype('biome_default');
    }

    const terrain = classifyTerrain(
      fields.elevation, fields.baseMoisture, fields.temperature, slope, hexBiomeDef
    );

    const { lq, lr } = localCoord(chunkQ, chunkR, q, r);
    tileMap.set(localKey(lq, lr), {
      q, r, terrain, feature: null, debris: null,
      mountainType: null, waterType: null, isRiver: false,
      elevation: fields.elevation,
      moisture: fields.baseMoisture,
      temperature: fields.temperature,
      slope,
      rawLayers: fields.rawLayers,
      biomeId: hexBiomeId,
    });
  }

  // Mountain type tagging (uses fieldMap for neighbor lookups — no fallbackT)
  const tileLookup = (nq, nr) => {
    const nk = coordKey({ q: nq, r: nr });
    return tileMap.get(nk)?.terrain === 'mountain' || tileMap.get(nk)?.terrain === 'peak'
      ? { terrain: tileMap.get(nk)?.terrain, q: nq, r: nr }
      : _provisionalTerrainForRing(nq, nr, fieldMap)
        ? { terrain: 'mountain', q: nq, r: nr }
        : undefined;
  };

  for (const [, tile] of tileMap) {
    if (tile.terrain === 'mountain' || tile.terrain === 'peak') {
      tagMountainType(tile, tileLookup);
    }
  }

  // Water type tagging (similar — uses fieldMap)
  // Feature sprinkling (unchanged)
  // Debris (unchanged)

  return { tileMap, biomeId: biomeDef?.id || null };
}

/** Check if a border-ring tile at (q,r) would be mountain/peak/water from its base fields. */
function _provisionalTerrainForRing(q, r, fieldMap) {
  const f = fieldMap.get(coordKey({ q, r }));
  if (!f) return null;
  // Use elevation-only mountain check (water check handled similarly for water tagging)
  if (f.elevation > DEFAULT_TERRAIN_RULES.mountainThreshold) return true;
  return false;
}
```

---

## 5. Files Touched

| File | Change | Summary |
|------|--------|---------|
| `src/params/game/worldParams.js` | edit | Replace `NOISE_PHASE_A_ELEVATION` with `NOISE_CONTINENT`, `NOISE_ELEVATION_DETAIL`, `NOISE_RIDGE`; add `SLOPE_NORMALIZATION` and new terrain rule thresholds |
| `src/game/rules/terrainGenerator.js` | **rewrite** | 3-layer elevation composite, slope computation, border ring, updated `classifyTerrain`, new `generateChunkTiles` flow |
| `src/game/rules/terrainTypes.js` | edit | Add `hill` and `plateau` entries |
| `src/game/rules/archetypeData/biomes.js` | edit | Add `hill`/`plateau` palette colors and `terrainTags` entries for existing biomes |

---

## 6. Deliverable

- Mountain ranges form along continent edges (continent mask modulation). Mountains are not isolated blobs.
- Flat highlands above `mountainThreshold` with low slope classify as `plateau`, not `mountain`.
- Hills appear as intermediate terrain between plains and mountains.
- Chunk edges have correct slope, mountain tags, and water tags — no `fallbackT` approximations.
- Analysis tool histograms reflect the 3-layer composite distribution.

---

## 7. Risks & Edge Cases

- **Border ring adds ~40% more `sampleBaseFields` calls per chunk.** For a 24×24 chunk (576 tiles), border ring width 2 adds `(24+4)² - 24² = 784 - 576 = 208` extra samples (36% overhead). FBM is cheap — this is acceptable for a generation pass that runs once at startup.
- **Per-phase normalization changes thresholds.** Re-run Phase 0 calibration after implementing the composite. The previous Phase A calibration was against a single field; the 3-layer composite has a different distribution shape.
- **Slope at chunk corners.** Corner hexes have neighbors in up to 3 different chunks. With the border ring, all 6 neighbors are available locally. Without the border ring, corners would need cross-chunk lookups. The ring eliminates this entirely for radius-1 slope computation.
- **`plateauSlopeMin` and `hillSlopeMin` both live near the top of the slope distribution.** The raw neighbor delta from FBM fields is on the order of hundredths. Without the `SLOPE_NORMALIZATION` calibration, both thresholds would sit near the ceiling of observed slope values, making "all high ground is plateau" or "all high ground is mountain." Phase 0 calibration addresses this.
