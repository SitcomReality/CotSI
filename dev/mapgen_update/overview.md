# Terrain Generation Redesign — Overview

**Status:** Planning  
**Last updated:** 2026-07-27  
**Supersedes:** `design.md` (the original monolithic spec — retained for historical reference)

This document is the canonical entry point for the terrain generation redesign. It defines the target pipeline, shared architecture, and output contract. Individual implementation phases have their own documents (`phase0_calibration.md` through `phaseG_tuning_polish.md`).

---

## 1. Motivation

The current terrain generation produces worlds that feel disconnected and unnatural. Three root causes:

1. **Biome is an independent noise roll**, not a conclusion drawn from physical fields. A hex can be "arid biome" with high moisture → forest inside a desert.
2. **Noise scales are undifferentiated.** Elevation, moisture, and biome all use similar-frequency FBM. Everything looks like camouflage blotches rather than continents, regions, and local detail.
3. **The classifier uses variables in isolation.** Mountains ignore moisture. Forests ignore elevation. Height and moisture rarely co-author the result.

The bones are solid — seeded FBM, chunk-seamless global coordinates, multi-pass tagging, archetype-driven thresholds. This redesign keeps those foundations and builds a coherent climate → terrain → feature pipeline on top.

---

## 2. Design Principles

1. **Noise creates physical fields. Biomes are conclusions.** Biome selection derives from elevation, moisture, and temperature. Archetypes remain as *alternate rulebooks* for how conclusions are drawn — not as competing noise channels.

2. **Fields influence each other in a deliberate order.** Temperature falls with elevation. Moisture pools near water. Rivers follow gravity. Each pass builds on the last.

3. **Separate macro and micro scale.** Continent masks are very low frequency. Regional variation is low frequency. Terrain detail is medium-to-high frequency. Features/debris are highest frequency. Each frequency band has a clear role.

4. **Deterministic and chunk-seamless.** Every sample is a pure function of `(seed, q, r)`. Two adjacent chunks produce identical values at their shared hexes without communication.

5. **Archetypes remain the extension point.** New biomes are data — a `climateRange` entry, a `terrainRules` override, a feature list, a palette. The pipeline doesn't change when biomes are added. `selectBiome()` iterates registered archetypes; there are no hardcoded thresholds.

6. **Phased delivery.** Each implementation phase produces a working, playable game. No phase leaves terrain generation broken.

7. **Thresholds are derived from measured distributions.** Absolute constants are calibrated against actual noise output histograms. Adding or changing a noise layer triggers re-calibration. Phase 0 establishes this infrastructure before any threshold-dependent work begins.

---

## 3. Target Pipeline

```
For each hex (global q, r):

  ┌─────────────────────────────────────────────────┐
  │  PASS 1: Physical Fields (deterministic FBM)     │
  │                                                 │
  │  continentMask  ←  very-low-freq FBM            │
  │  elevationBase  ←  low-freq FBM                 │
  │  elevationDetail←  med-freq FBM                 │
  │  ridgeNoise     ←  med-freq ridged FBM (Phase F)│
  │  elevation      =   continentMask × (elevationBase + detail + ridges)  │
  │  baseMoisture   ←  low-freq FBM                 │
  │  temperature    ←  latitudeTerm - elevation×lapseRate + tempNoise     │
  │  regionBiasM    ←  very-low-freq FBM (moisture bias)                  │
  │  regionBiasT    ←  very-low-freq FBM (temperature bias, independent)  │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 2: Provisional Water (elevation-driven)    │
  │                                                 │
  │  provisionalWater ← elevation < waterMaxElevation│
  │  (Moisture serves as secondary gate for lakes,  │
  │   not as primary ocean determinant.)            │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 3: Water-Adjusted Moisture                 │
  │                                                 │
  │  moisture  =  baseMoisture + nearWaterBoost     │
  │  (rainShadow deferred to Phase G)               │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 4: Biome Selection (data-driven)           │
  │                                                 │
  │  biomeId  =  selectBiome(elevation, moisture, temperature,           │
  │                          regionBiasM, regionBiasT)                   │
  │  biomeDef =  getArchetype(biomeId)              │
  │                                                 │
  │  selectBiome iterates registered biomes and     │
  │  checks climateRange; no hardcoded thresholds.  │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 5: River Tracing (moved before terrain)    │
  │                                                 │
  │  riverSources←  high-elevation, high-moisture    │
  │  riverPaths  ←  downhill trace to waterbody      │
  │  riverMoistureBoost ← applied to moisture field  │
  │  (Rivers affect terrain classification so        │
  │   fertile valleys are real, not cosmetic.)       │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 6: Final Terrain Classification            │
  │                                                 │
  │  terrain  =  classifyTerrain(elevation, moisture (post-river),        │
  │                              temperature, slope, biomeDef.terrainRules)│
  │  slope    ←  neighbor elevation delta            │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 7: Structural Tags                         │
  │                                                 │
  │  mountainType←  neighbor-based (isolated/slope/range)                │
  │  waterType   ←  BFS-based (lake/ocean)          │
  │  isRiver     ←  set on river-path tiles          │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 8: Features & Debris (from continuous      │
  │          climate, not just terrain enum)         │
  │                                                 │
  │  features    ←  spawn(elevation, moisture, terrain, biomeDef)         │
  │  debris      ←  spawn(elevation, moisture, terrain, slope)           │
  └─────────────────────────────────────────────────┘
```

**Key changes from the original `design.md` pipeline:**

- **Pass 2:** Water is determined by elevation alone (`elevation < waterMaxElevation`). This eliminates the feedback loop where moisture-dependent water classification and water-dependent moisture adjustment cycled. Lakes may use a secondary moisture gate, but oceans are pure elevation.
- **Pass 3:** `rainShadow` is deferred to Phase G. The original spec mentioned it but provided no algorithm, no wind direction, and no cross-wind sampling.
- **Pass 5 (rivers) moved before Pass 6 (terrain classification).** Rivers now boost moisture *before* final terrain classification, so fertile river valleys produce real terrain changes (more forest, less desert along river paths).
- **regionBias is two independent fields** (`regionBiasM` and `regionBiasT`). The original shifted moisture and temperature by the same delta, making "hot+dry" or "cold+wet" regional biases impossible.

---

## 4. Output Schema

Every generated tile carries these fields:

```js
{
  q, r,                             // global hex coordinates
  elevation,                        // continuous [0, 1], the composite height value
  rawLayers: {                      // unblended noise components (debug/analysis)
    continent, detail, ridges,
  },
  moisture,                         // continuous [0, 1], water-adjusted + river-boosted
  temperature,                      // continuous [0, 1]
  slope,                            // continuous [0, 1], average neighbor elevation delta
  biomeId,                          // archetype key (e.g. 'biome_default')
  terrain,                          // final terrain type string (e.g. 'mountain', 'plains')
  mountainType,                     // 'isolated' | 'slope' | 'range'
  waterType,                        // 'lake' | 'ocean' (null for non-water)
  isRiver,                          // boolean — true if this tile is on a river path
  feature,                          // { kind, density? } | null
  debris,                           // { kind } | null
}
```

**Notes:**
- `rawLayers` replaces the original `rawElevation` (which was identical to `elevation` — redundant). The unblended components are useful for debugging the composite formula.
- `waterType` is a structural tag, not a terrain type. The terrain type for water tiles is `'water'`. `waterType: 'ocean'` means the water body connects to the map boundary; `waterType: 'lake'` means it's enclosed.
- `isRiver` is a boolean tag overlaid on existing terrain. River tiles keep their base terrain type; rendering layers the river mesh on top.

---

## 5. Shared Deterministic Sampler

A single function `sampleBaseFields(seed, q, r, noiseConfig, radius)` computes Pass 1 fields for any global coordinate. Both normal chunk generation and cross-chunk neighbor lookups call this same function — no `fallbackT` approximation with a single biome.

```js
export function sampleBaseFields(baseSeed, q, r, noiseConfig, radius) {
  const NC = noiseConfig;

  // Elevation (3-layer composite)
  const continent = hexFbm2D(q, r, baseSeed + NC.SEED_CONTINENT, NC.CONTINENT);
  const detail    = hexFbm2D(q, r, baseSeed + NC.SEED_DETAIL,    NC.ELEVATION_DETAIL);
  const ridges    = hexFbm2D(q, r, baseSeed + NC.SEED_RIDGE,     NC.RIDGE);
  const elevation = clamp01(
    continent * 0.60 +
    detail    * 0.25 +
    ridges    * 0.15 * continent
  );
  // Note: weights are per-phase normalized. During Phase A, ridges = 0 and
  // the result is normalized to still span [0, 1]. See phase docs for specifics.

  // Moisture (base, before water adjustment)
  const baseMoisture = hexFbm2D(q, r, baseSeed + NC.SEED_MOISTURE, NC.MOISTURE);

  // Temperature from latitude + lapse rate + local variation
  const distFromCenter = hexDistance(q, r, 0, 0);  // NOT Math.abs(r)
  const latitudeTerm   = radius > 0 ? 1.0 - (distFromCenter / radius) : 0.5;
  const tempVariation  = hexFbm2D(q, r, baseSeed + NC.SEED_TEMP, NC.TEMP_VARIATION);
  const temperature    = clamp01(
    latitudeTerm  * 0.50 +
    tempVariation * 0.15 -
    elevation     * 0.40   // lapse rate
  );

  // Region bias — two independent fields
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

**Latitude correction:** The original `design.md` used `Math.abs(r) / radius`, which creates straight climate bands parallel to one hex axis. This is geometrically wrong — it treats axial `r` as radial distance. The corrected formula uses `hexDistance(q, r, 0, 0) / radius`, producing circular climate zones centered on the map origin. For infinite/chunked worlds (Phase 5 of the chunk infrastructure roadmap, unrelated to terrain gen phases), latitude may be replaced by a very-low-frequency noise field or omitted entirely.

**Per-phase weight normalization:** In phases where ridge noise hasn't been implemented yet, the elevation composite is normalized so the [0, 1] range remains reachable. Without normalization, `continent*0.60 + detail*0.25` maxes at 0.85, making `mountainThreshold` and above unreachable. Each phase doc specifies its normalization formula.

### Border Ring

When generating a chunk, `sampleBaseFields` is also sampled for a border ring around the chunk. The ring width is `maxLookupRadius` — the maximum neighbor-lookup distance across all post-processing passes (currently 2: radius-2 water proximity check + slope computation).

```text
Chunk (24×24, plus border ring):
┌────────────────────────────┐
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  ← border ring (width = maxLookupRadius)
│▒▒                        ▒▒│     discarded after tagging
│▒▒   Actual chunk tiles   ▒▒│  ← 24×24 stored tiles
│▒▒                        ▒▒│
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
└────────────────────────────┘
```

The border ring provides real elevation/moisture data for slope computation, mountain tagging, water BFS, and water proximity at chunk edges — no fallback approximations needed. Ring hexes are fully classified (through provisional water) so `adjustMoisture` can check if a neighbor is water.

**Ring width calculation:**
```js
const MAX_LOOKUP_RADIUS = Math.max(
  2,    // water proximity check in adjustMoisture
  1,    // slope computation (immediate neighbors)
  3,    // water-type BFS depth
  // Add other lookup radii here as passes are added
);
```

---

## 6. Noise Configuration

All noise parameters live in `src/params/game/worldParams.js`. Frequencies are calibrated during Phase 0 and expressed as percentiles in the phase docs.

```js
// ── Elevation layers ──────────────────────────────────────────
// Frequencies calibrated for radius-7 to radius-50 maps.
// Exact values set during Phase 0 calibration.
export const NOISE_CONTINENT = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.0008  // TBD: recalibrate
};
export const NOISE_ELEVATION_DETAIL = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.020   // ~10-hex scale
};
export const NOISE_RIDGE = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.008   // ~25-hex scale (separated from detail)
};

// ── Climate fields ────────────────────────────────────────────
export const NOISE_MOISTURE = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.006
};
export const NOISE_TEMP_VARIATION = {
  octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.08
};
export const NOISE_REGION = {
  octaves: 2, lacunarity: 2.0, gain: 0.5, frequency: 0.0015
};

// ── Feature channels ──────────────────────────────────────────
export const NOISE_FEATURES = {
  octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.3
};
export const NOISE_DEBRIS = {
  octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.5
};

// ── Seed offsets (ensure independent fields from same base seed)
export const SEED_CONTINENT   = 0;
export const SEED_DETAIL      = 100;
export const SEED_RIDGE       = 200;
export const SEED_MOISTURE    = 300;
export const SEED_TEMP        = 400;
export const SEED_REGION_M    = 500;
export const SEED_REGION_T    = 600;
export const SEED_FEATURES    = 700;
export const SEED_DEBRIS      = 800;
export const SEED_DEBRIS_KIND = 900;

// ── Terrain rules (percentile-calibrated in Phase 0) ──────────
export const DEFAULT_TERRAIN_RULES = {
  waterMaxElevation:        0.07,  // sea-level elevation cutoff
  waterMinMoisture:         0.50,  // secondary gate for inland lakes
  floatingIslandThreshold:  0.985,
  peakThreshold:            0.96,
  mountainThreshold:        0.905,
  plateauSlopeMin:          0.08,  // below this = plateau, above = mountain
  hillElevationMin:         0.55,
  hillSlopeMin:             0.10,
  treeLineMax:              0.85,  // no forests above this elevation
  denseForestMinMoisture:   0.85,
  forestMinMoisture:        0.72,
  desertMaxMoisture:        0.20,
  marshMinMoisture:         0.58,
  marshMaxElevation:        0.35,
};

// ── River config ──────────────────────────────────────────────
export const RIVER_SOURCE_MIN_ELEV    = 0.75;  // percentile-calibrated
export const RIVER_SOURCE_MIN_MOIST   = 0.55;
export const RIVER_MAX_LENGTH         = 200;
export const RIVER_MOISTURE_BOOST     = 0.10;
export const RIVER_BOOST_RADIUS       = 1;
export const RIVER_SOURCE_FRACTION    = 0.003; // sources per tile (scales with map area)
```

**Frequency note:** Ridge and detail frequencies (0.008 vs 0.020) are now well-separated (~2.5×) to avoid moiré interference. The original had them at 0.012 and 0.015 — only 20% apart, producing "muddier" noise rather than distinct mountain chains and rolling hills.

---

## 7. Classification System

### 7.1 Biome Selection (data-driven)

`selectBiome()` iterates over registered biome archetypes and checks `climateRange`. No hardcoded thresholds. Adding a biome is pure data — define it with a `climateRange` and register it.

```js
function selectBiome(elevation, moisture, temperature, regionBiasM, regionBiasT) {
  // Apply regional bias to climate inputs
  const m = clamp01(moisture   + (regionBiasM - 0.5) * 0.10);
  const t = clamp01(temperature + (regionBiasT - 0.5) * 0.10);

  // Iterate biomes in priority order. First biome whose climateRange
  // contains (elevation, m, t) wins.
  for (const biomeId of getBiomePriorityOrder()) {
    const def = getArchetype(biomeId);
    if (!def || !def.climateRange) continue;
    const R = def.climateRange;

    if (checkRange(elevation, R.minElevation, R.maxElevation) &&
        checkRange(m,         R.minMoisture,  R.maxMoisture)  &&
        checkRange(t,         R.minTemperature, R.maxTemperature)) {
      return biomeId;
    }
  }

  return 'biome_default';
}

function checkRange(value, min, max) {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}
```

**Climate space coverage:** The biome priority list must cover the full climate cube `[elevation: 0..1, moisture: 0..1, temperature: 0..1]`. `biome_default` is the catch-all (no `climateRange` constraints — always matches). All other biomes sit above it in priority. Gaps in explicit coverage are visible because the designer can see what falls through to default.

**Biome priority order** is determined by specificity: more restrictive biomes (tundra, arid) are checked before broad ones, so a tile that matches both gets the more specific biome.

### 7.2 Terrain Classification

Multi-axis rules considering elevation, moisture, temperature, slope, and biome-specific `terrainRules` overrides.

```js
function classifyTerrain(elevation, moisture, temperature, slope, biomeDef) {
  const R = { ...DEFAULT_TERRAIN_RULES, ...biomeDef?.terrainRules };

  // Water: elevation-driven (primary), moisture as secondary inland-lake gate
  if (elevation < R.waterMaxElevation) {
    if (moisture > R.waterMinMoisture) return 'water';
    // Low elevation + low moisture = salt flat / dry basin
    // Falls through to terrain classification below.
  }

  // Elevation gates
  if (elevation > R.floatingIslandThreshold) return 'floatingIsland';
  if (elevation > R.peakThreshold)           return 'peak';

  // Mountain vs plateau: slope distinguishes
  if (elevation > R.mountainThreshold) {
    return slope > R.plateauSlopeMin ? 'mountain' : 'plateau';
  }

  // Hills: moderately high, moderately steep
  if (elevation > R.hillElevationMin && slope > R.hillSlopeMin)
    return 'hill';

  // Tree line: forests don't grow at high elevation
  const belowTreeLine = elevation < R.treeLineMax;

  // Moisture gates (below tree line)
  if (belowTreeLine && moisture > R.denseForestMinMoisture)
    return 'denseForest';
  if (belowTreeLine && moisture > R.forestMinMoisture)
    return 'forest';
  if (moisture < R.desertMaxMoisture)
    return 'desert';

  // Marsh: wet lowlands (effective band: [waterMaxElevation, marshMaxElevation])
  if (moisture > R.marshMinMoisture && elevation < R.marshMaxElevation)
    return 'marsh';

  return 'plains';
}
```

**Key behaviors:**
- Water is primarily determined by elevation. Low elevation + low moisture falls through to terrain classification (producing salt flats, desert basins, or plains — not the "dry ocean" artifact from the original).
- Slope distinguishes mountain (steep) from plateau (flat highland) and identifies hill terrain.
- Tree line prevents forests on mountain peaks.
- Marsh's effective band is `[waterMaxElevation, marshMaxElevation]` — tiles below `waterMaxElevation` with sufficient moisture are water, not marsh.

### 7.3 Biome Climate Range Format

```js
defineArchetype('biome_lush', {
  type: 'biome',
  id: 'biome_lush',
  name: 'Lush Woodland',

  // Climate range for biome selection (data-driven selectBiome reads this)
  climateRange: {
    minMoisture: 0.62,
    minTemperature: 0.25,
    // maxElevation, maxMoisture, etc. are optional — undefined means no bound
  },

  // Terrain rule overrides (shallow merge over DEFAULT_TERRAIN_RULES)
  terrainRules: {
    forestMinMoisture: 0.55,
    denseForestMinMoisture: 0.80,
    desertMaxMoisture: 0.08,
    marshMinMoisture: 0.50,
    marshMaxElevation: 0.40,
    mountainThreshold: 0.920,
  },

  features: [ /* spawn rules */ ],
  palette: { /* terrain color overrides */ },
  terrainTags: [ /* supported terrain types */ ],
  weatherAffinity: ['rainy', 'temperate'],
  terrainElevation: { /* per-terrain Y offsets */ },
  supportsFloatingIslands: false,
});
```

**Changes from current archetype format:**
- `terrainThresholds` → `terrainRules`: an object that overrides specific entries in `DEFAULT_TERRAIN_RULES`. Shallow merge — unspecified rules inherit defaults.
- `moistureBias` is **removed**. The biome is chosen based on climate; it no longer modifies the moisture field. Climate already determined this is a lush region.
- New: `climateRange` — the climate envelope where this biome naturally appears. Used by data-driven `selectBiome()`.

---

## 8. Slope Computation

Slope is the average absolute elevation difference between a hex and its six neighbors, normalized by a calibration constant derived from measured elevation deltas during Phase 0.

```js
const SLOPE_NORMALIZATION = 0.3; // calibrated against elevation-delta histogram in Phase 0

function computeSlope(q, r, elevationAt) {
  const center = elevationAt(q, r);
  let totalDiff = 0;
  const nbrs = neighbors({ q, r });
  for (const n of nbrs) {
    totalDiff += Math.abs(elevationAt(n.q, n.r) - center);
  }
  return clamp01(totalDiff / (6 * SLOPE_NORMALIZATION));
}
```

The normalization constant is derived from the 95th-percentile neighbor elevation delta across multiple seeds and map sizes. Phase 0 documents the derivation.

---

## 9. Rivers

Rivers are downhill traces from high-elevation, high-moisture source points to water bodies. They run **before** final terrain classification (Pass 5 before Pass 6), so the moisture boost along river paths affects terrain output.

**Algorithm:**
1. Source selection: N tiles with elevation > `RIVER_SOURCE_MIN_ELEV` and moisture > `RIVER_SOURCE_MIN_MOIST`. `N = Math.ceil(mapTileCount * RIVER_SOURCE_FRACTION)`. Sources are shuffled deterministically.
2. Downhill trace: from each source, iteratively move to the lowest-elevation neighbor not yet visited by *this* river. Stop at a water tile, a local minimum, or `RIVER_MAX_LENGTH` steps.
3. River moisture boost: tiles within `RIVER_BOOST_RADIUS` of any river tile receive `moisture += RIVER_MOISTURE_BOOST` (clamped). This runs before Pass 6 classification.
4. `isRiver: true` is set on all river-path tiles.

**Seeded tie-breaking:** When multiple neighbors share the minimum elevation, the tie is broken deterministically by seeded noise rather than always picking the lowest-index neighbor. This avoids rivers locked to hex axes.

---

## 10. Feature Density from Climate

Feature and debris placement transitions from hardcoded density enums (`'dense'/'medium'/'sparse'`) to continuous density values derived from climate fields:

- Tree density scales with moisture, falls off with elevation (above tree line → zero).
- Rocks more common on steep slopes and low moisture.
- Fruit trees require moisture > threshold and elevation < tree line.
- Feature noise thresholds are modulated by continuous density rather than terrain enums.

This produces gradual forest edges, sparse vegetation near deserts, and rich resources in wet valleys — the artifacts that hard terrain-enum-based density cannot express.

---

## 11. Terrain Types

| Terrain | Passable | New? | Description |
|---------|----------|------|-------------|
| `plains` | yes | — | Default open terrain |
| `forest` | yes | — | Moderate tree cover |
| `denseForest` | yes | — | Heavy tree cover, higher movement cost |
| `desert` | yes | — | Arid, sparse vegetation |
| `marsh` | yes | — | Wet lowlands |
| `hill` | yes | **new** | Elevated but passable; intermediate between plains and mountain |
| `plateau` | yes | **new** | Flat highland; visually distinct from mountain |
| `mountain` | no | — | Steep impassable terrain |
| `peak` | no | — | Snow-capped mountain variant |
| `floatingIsland` | no | — | Highest elevation, biome-specific |
| `water` | no | — | Any water body (lake or ocean) |

`hill` and `plateau` are classification outputs (Phase B). `isRiver` is a boolean tag overlaid on existing terrain (Phase D). `beach` and additional terrain types (`scrubland`, `tundra`, `taiga`) are deferred to Phase G.

---

## 12. Phase Dependency Graph

```
Phase 0: Calibration Infrastructure
    │
    ▼
Phase A: Climate-Driven Classification
    │
    ▼
Phase B: Multi-Scale Elevation + Slope
    │
    ├──────────────────────────┐
    ▼                          ▼
Phase C: Water-Adjusted      Phase F: Ridged Noise
    Moisture                    (can run in parallel with C/D)
    │
    ▼
Phase D: Rivers
    │
    ▼
Phase E: Feature Density from Climate
    │
    ▼
Phase G: Tuning & Polish
```

Phases C and F are independent — ridged noise can be implemented before or after water-adjusted moisture. Phase D depends on C (rivers need water bodies to terminate at). All phases after A depend on the calibration values from Phase 0.

---

## 13. Known Limitations & Deferred Items

| Item | Status | Tracking |
|------|--------|----------|
| Hard biome boundaries (no ecotones) | Deferred to Phase G | smoothstep blending over 2-3 hex transition zone |
| Rain shadow | Deferred to Phase G | Requires wind direction + cross-wind elevation sampling |
| Beach terrain type | Deferred to Phase G | Second classification pass near water edges |
| Tundra/taiga/scrubland biomes | Deferred to Phase G | Additional climate range entries |
| Domain warping | Deferred to Phase G | Mitigates blob artifacts if present after tuning |
| Temperature latitude for infinite maps | Deferred to chunk-infra roadmap | Current formula requires known radius |
| Rivers truncate at generation boundary | Known limitation | Full river tracing across infinite world deferred |
| Biome topological smoothing | Deferred to Phase G | Lightweight post-pass to reassign isolated single-hex biome outliers |
| Player terraforming / world modification | Out of scope | System assumes static deterministic world |

---

## 14. File Summary

| File | Phase 0 | A | B | C | D | E | F | G |
|------|---------|---|---|---|---|---|---|---|
| `src/engine/rules/noise.js` | — | — | — | — | — | — | **add** | — |
| `src/params/game/worldParams.js` | **rewrite** | **rewrite** | edit | edit | edit | — | edit | edit |
| `src/game/rules/terrainGenerator.js` | — | **rewrite** | **rewrite** | edit | edit | edit | edit | — |
| `src/game/rules/terrainTypes.js` | — | — | edit | — | edit | — | — | edit |
| `src/game/rules/archetypeData/biomes.js` | — | edit | edit | — | — | — | — | edit |
| `src/game/state/gameFactory.js` | — | edit | — | — | — | — | — | — |
| `dev/analysis/generation/generate.js` | edit | edit | edit | — | — | — | — | — |

**Key:** **rewrite** = major refactor. edit = targeted changes. add = new function. — = untouched.

---

## 15. Backward Compatibility

**There is no backward compatibility target.** All current terrain generation conventions are deprecated. The redesign produces a new output schema, new noise configuration, and a new classification pipeline. The `generateTiles()` signature is preserved (`seedText, radius, biomeDef, params`) but `biomeDef` in multi-biome mode behaves differently (climate-driven selection instead of noise-roll).

Single-biome mode (setup screen selects one archetype) remains supported. When `biomeDef` is passed, all hexes use that biome — no climate-based selection occurs. This matches the current behavior.

---

## 16. References

- `dev/mapgen_update/design.md` — Original monolithic spec (superseded by this document)
- `dev/mapgen_update/design_observations.md` — Review 1: structural critique
- `dev/mapgen_update/design_thoughts.md` — Review 2: calibration and design-logic critique
- `phase0_calibration.md` through `phaseG_tuning_polish.md` — Individual phase specs
- `src/engine/rules/noise.js` — Simplex 2D + FBM implementation
- `src/game/rules/archetypes.js` — Archetype registry
- `src/game/rules/archetypeData/biomes.js` — Current biome definitions
- `src/game/rules/terrainGenerator.js` — Current generation pipeline
- `src/params/game/worldParams.js` — Current noise config
- `src/engine/rules/chunkGrid.js` — Chunk coordinate math (24×24 chunks)
- `dev/largeMapRoadmap.md` — Scaling plan and chunk infrastructure context
