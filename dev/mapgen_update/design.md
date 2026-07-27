# Map Generation Redesign — System Design

**Status:** Planning  
**Last updated:** 2026-07-27

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

5. **Archetypes remain the extension point.** New biomes are data — a thresholds table, a feature list, a palette. The pipeline doesn't change when biomes are added.

6. **Phased delivery.** Each implementation phase produces a working, playable game. No phase leaves terrain generation broken.

---

## 3. Target Pipeline Overview

```
For each hex (global q, r):

  ┌─────────────────────────────────────────────────┐
  │  PASS 1: Physical Fields (deterministic FBM)     │
  │                                                 │
  │  continentMask  ←  very-low-freq FBM            │
  │  elevationBase  ←  low-freq FBM                 │
  │  elevationDetail←  med-freq FBM                 │
  │  ridgeNoise     ←  med-freq ridged FBM          │
  │  elevation      =   continentMask × (elevationBase + detail + ridges)  │
  │  baseMoisture   ←  low-freq FBM                 │
  │  temperature    ←  latitudeTerm - elevation×lapseRate + tempNoise     │
  │  regionNoise    ←  very-low-freq FBM (subtle biome bias)              │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 2: Provisional Terrain + Water             │
  │                                                 │
  │  provisionalTerrain ← classify(elevation, baseMoisture, temperature)  │
  │  waterMask          ← provisionalTerrain is water/ocean               │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 3: Water-Adjusted Moisture                 │
  │                                                 │
  │  moisture    =  baseMoisture + nearWaterBoost - rainShadow(elevation) │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 4: Biome Selection                         │
  │                                                 │
  │  biomeId     =  lookup(elevation, moisture, temperature, regionBias)  │
  │  biomeDef    =  getArchetype(biomeId)            │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 5: Final Terrain Classification            │
  │                                                 │
  │  terrain     =  classifyFinal(elevation, moisture, temperature,       │
  │                               slope, biomeDef.rules)                 │
  │  slope       ←  neighbor elevation delta        │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 6: Rivers (post-processing)                │
  │                                                 │
  │  riverSources←  high-elevation, high-moisture    │
  │  riverPaths  ←  downhill trace to waterbody      │
  │  riverTiles  ←  marked; moisture boosted locally │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 7: Structural Tags                         │
  │                                                 │
  │  mountainType←  neighbor-based (isolated/slope/range)                │
  │  waterType   ←  BFS-based (lake/ocean)          │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 8: Features & Debris                       │
  │                                                 │
  │  features    ←  spawn(elevation, moisture, terrain, biomeDef)         │
  │  debris      ←  spawn(elevation, moisture, terrain)                  │
  └─────────────────────────────────────────────────┘
```

**Output per tile:**
```js
{
  q, r,                             // global hex coordinates
  elevation,                        // continuous [0, 1], the primary height value
  rawElevation,                     // pre-modulation source (debug/analysis)
  moisture,                         // continuous [0, 1], water-adjusted
  temperature,                      // continuous [0, 1]
  slope,                            // continuous [0, 1], local elevation delta
  biomeId,                          // archetype key
  terrain,                          // final terrain type string
  mountainType, waterType,          // structural tags
  feature, debris,                  // flora + decoration
}
```

---

## 4. Noise Field Definitions

All fields use FBM simplex noise via `hexFbm2D(q, r, seed, opts)`. The `seed` parameter for each field is `baseSeed + offset` so fields are independent but reproducible.

### 4.1 Elevation (3-layer composite)

The key insight: one FBM call produces popcorn noise. A continent mask multiplied by detail produces landmasses with mountains *on* the land and oceans *between* them.

| Layer | Frequency | Octaves | Role |
|-------|-----------|---------|------|
| `CONTINENT` | ~0.0008 | 3 | Very large landmass/ocean shapes |
| `ELEVATION_DETAIL` | ~0.015 | 4 | Hills, valleys, local relief |
| `RIDGE` | ~0.012 | 3 | Mountain chains (ridged noise, not yet implemented — use regular FBM as starting approximation) |

```js
elevation = clamp01(
  continent * 0.60 +
  detail    * 0.25 +
  ridges    * 0.15 * continent   // ridges only on land
)
```

**Ridged noise:** A variant of FBM where absolute value `|noise|` is taken at each octave, producing sharp ridges instead of rolling hills. Implement as a separate function `ridgedFbm2D()` in `noise.js` during the phase that introduces ridge noise. Until then, use regular FBM at appropriate frequency.

### 4.2 Moisture

| Layer | Frequency | Octaves | Role |
|-------|-----------|---------|------|
| `MOISTURE_BASE` | ~0.006 | 4 | Broad wet/dry climate bands |

Base moisture is later adjusted by water proximity in Pass 3:
```js
moisture = clamp01(baseMoisture + waterProximityBoost - rainShadow)
```

### 4.3 Temperature

Not a standalone noise field — derived from elevation and an optional latitude axis.

```js
// For a finite radial map, use r-axis as pseudo-latitude:
latitudeTerm  = 1.0 - (Math.abs(r) / radius)   // equator at r=0

// Subtle noise for local variation (HIGH_FREQ_TEMP: ~0.08, 1 octave):
tempVariation = fbm(q, r, seed, TEMP_VARIATION) * 0.15

temperature = clamp01(
  latitudeTerm  * 0.5 +         // latitude dominates
  tempVariation * 0.5 -
  elevation     * 0.40          // lapse rate: higher = colder
)
```

For an infinite/chunked world with no absolute origin, the latitude term may be replaced by a very-low-frequency noise field (`TEMPERATURE_ZONE`) or omitted entirely (pure lapse rate + variation). This is a design decision deferred to Phase 5 (infinite world).

### 4.4 Region Bias

Very-low-frequency noise that nudges biome selection without dictating it. This is the "divine domain" concept — regions where one biome is naturally favored.

| Field | Frequency | Octaves | Role |
|-------|-----------|---------|------|
| `REGION` | ~0.0015 | 2 | Subtle regional bias (~10% influence on biome choice) |

```js
regionBias = fbm(q, r, seed, REGION)  // [0, 1]
```

In the biome lookup, this shifts the boundary thresholds by ±0.05–0.10 rather than *selecting* the biome outright.

### 4.5 Feature & Debris Noise

Highest-frequency, single-purpose channels (as currently):

| Channel | Frequency | Octaves | Role |
|---------|-----------|---------|------|
| `FEATURES` | ~0.3 | 1 | Whether a feature spawns |
| `DEBRIS` | ~0.5 | 1 | Whether debris spawns |
| `DEBRIS_KIND` | ~0.5 | 1 | Which debris type |

---

## 5. Classification System

### 5.1 Biome Selection (climate → biome)

A table-driven lookup using all three climate axes. The `regionBias` shifts thresholds by a small amount.

```js
function selectBiome(elevation, moisture, temperature, regionBias) {
  // Adjust moisture and temperature by regional bias (±5%)
  const m = clamp01(moisture + (regionBias - 0.5) * 0.10);
  const t = clamp01(temperature + (regionBias - 0.5) * 0.10);

  // Pure climate-determined rules
  if (t < 0.20 && m > 0.60) return 'biome_tundra';       // future
  if (t > 0.65 && m < 0.22) return 'biome_arid';
  if (m > 0.62 && t > 0.25) return 'biome_lush';
  return 'biome_default';
}
```

**Extensibility:** New biomes are added as rows in this table. The classifier is small enough to stay readable as a function; if it grows beyond ~15 biomes, convert to a data-driven ordered-rule list per biome archetype.

### 5.2 Terrain Classification (climate + slope → terrain type)

Multi-axis rules that consider all available fields. Order matters: earlier rules take priority.

```js
function classifyTerrain(elevation, moisture, temperature, slope, archetypeRules) {
  // Archetype can override or add rules
  const R = archetypeRules || DEFAULT_TERRAIN_RULES;

  // Water edges handled separately in Pass 2
  if (elevation < R.waterMaxElevation && moisture > R.waterMinMoisture)
    return 'water';

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

  // Marsh: wet lowlands
  if (moisture > R.marshMinMoisture && elevation < R.marshMaxElevation)
    return 'marsh';

  return 'plains';
}
```

**Key changes from current:**
- Slope distinguishes mountain (steep) from plateau (flat highland)
- Tree line prevents forests on peaks
- Hills as a distinct intermediate terrain type
- Terrain rules become a data structure, not an opaque priority chain

### 5.3 Default Terrain Rules

```js
const DEFAULT_TERRAIN_RULES = {
  waterMaxElevation:        0.07,
  waterMinMoisture:         0.50,
  floatingIslandThreshold:  0.985,
  peakThreshold:            0.96,
  mountainThreshold:        0.905,
  plateauSlopeMin:          0.08,   // below this = plateau, above = mountain
  hillElevationMin:         0.55,
  hillSlopeMin:             0.10,
  treeLineMax:              0.85,   // no forests above this elevation
  denseForestMinMoisture:   0.85,
  forestMinMoisture:        0.72,
  desertMaxMoisture:        0.20,
  marshMinMoisture:         0.58,
  marshMaxElevation:        0.35,
};
```

Each biome archetype can override any subset of these, giving "Ichor Fens" a different marsh threshold or "Godfall Crater" a different mountain threshold without changing the classification code.

---

## 6. Post-Processing Systems

These run after initial classification and before feature placement. They modify or annotate already-classified tiles.

### 6.1 Water-Adjusted Moisture (Pass 3)

After provisional water tiles are identified, nearby land gets a moisture boost:

```js
function adjustMoisture(tile, neighborLookup) {
  if (tile.terrain === 'water' || tile.terrain === 'ocean') return;

  // Count water neighbors within radius 2
  let waterNeighbors = 0;
  for (const n of hexesWithinRadius(tile.q, tile.r, 2)) {
    const nt = neighborLookup(n.q, n.r);
    if (nt && (nt.provisionalTerrain === 'water' || nt.provisionalTerrain === 'ocean')) {
      waterNeighbors++;
    }
  }

  // Coastal moisture bonus decays with distance
  const coastalBonus = waterNeighbors * 0.03;
  tile.moisture = clamp01(tile.moisture + coastalBonus);
}
```

**Chunk boundary note:** This pass needs neighbor tiles that may be in adjacent chunks. The lookup must use the same deterministic sampling as the primary generation — not a fallback. See §8.3 for the shared-sampler solution.

### 6.2 Rivers (Pass 6)

Rivers are the biggest missing geographical connector. They influence moisture, create natural boundaries, and make exploration feel directed ("follow the river downstream").

**Algorithm (simple downhill trace):**

1. **Source selection:** Choose N tiles with high elevation (>0.75) and high moisture (>0.55). Deterministic: seed-derived shuffle of candidates.

2. **Downhill trace:** From each source, iteratively move to the lowest-elevation neighbor not yet visited by *this* river. Stop at:
   - A water tile (ocean, lake)
   - A local minimum (no lower neighbor)
   - Maximum path length (prevents infinite loops)

3. **River marking:** Each visited tile gets `isRiver: true`. Adjacent tiles get a moisture bonus.

4. **Terrain override:** River tiles that aren't mountain/water become a new terrain type (or stay as-is with a river flag). For v1, keep the existing terrain and add `isRiver: true` — rendering can add river meshes later.

```js
function traceRiver(start, elevationAt, isWater) {
  const path = [];
  const visited = new Set();
  let current = start;
  let steps = 0;
  const MAX_STEPS = 200;

  while (!isWater(current) && steps < MAX_STEPS) {
    const key = coordKey(current);
    if (visited.has(key)) break;  // loop detected
    visited.add(key);
    path.push(current);

    const lower = neighbors(current)
      .map(n => ({ q: n.q, r: n.r, elev: elevationAt(n.q, n.r) }))
      .filter(n => n.elev < elevationAt(current.q, current.r))
      .sort((a, b) => a.elev - b.elev);

    if (lower.length === 0) break;  // local minimum
    current = lower[0];
    steps++;
  }

  return path;
}
```

**River moisture boost:** After all rivers are traced, tiles within radius 1 of any river tile receive `moisture += 0.10` (clamped). This creates fertile river valleys.

**Performance:** River tracing is ~O(sources × maxSteps). For a radius-50 map, 30 sources × 200 steps = 6,000 operations — negligible. Tracing runs after all chunks for the visible area are generated, in a short post-pass.

**Chunk boundary:** Rivers cross chunk boundaries. The trace must be able to query elevation for any global coordinate. Since elevation is deterministic from `(seed, q, r)`, this works — the trace can walk into uncharted territory and the elevation values will be consistent when that chunk is later generated. However, the river path must be *stored* globally, not per-chunk. Options:
- Store river paths in a global `Map<coordKey, riverData>`, separate from chunk tile storage.
- Or recompute river membership on-the-fly during chunk generation (expensive but simple).

For v1, compute rivers once at world-gen time and store in the chunk tiles that exist. Rivers that extend beyond the generated radius are truncated. This is a known limitation — full river tracing across an infinite world is deferred to Phase 5.

### 6.3 Slope Calculation

Slope is the average absolute elevation difference between a hex and its neighbors:

```js
function computeSlope(q, r, elevationAt) {
  const center = elevationAt(q, r);
  let totalDiff = 0;
  const nbrs = neighbors({ q, r });
  for (const n of nbrs) {
    totalDiff += Math.abs(elevationAt(n.q, n.r) - center);
  }
  return clamp01(totalDiff / (6 * 0.3));  // normalize to [0, 1]
}
```

Slope feeds into terrain classification (mountain vs plateau vs hill) and can later influence movement costs, feature density, and rendering (steep hexes get different meshes).

---

## 7. Shared Deterministic Sampler

A recurring problem in the current code: cross-chunk neighbor lookups use a `fallbackT` with a single biome, but multi-biome hexes may use different biomes. The fix: a single shared sampler function that both generation and neighbor lookups call.

```js
/**
 * Deterministic base-sample for a single hex.
 * Pure function of (seed, q, r, params). Called by both:
 *   - Normal chunk generation (Pass 1)
 *   - Cross-chunk neighbor lookups (mountain tagging, water BFS, slope)
 *
 * Returns the raw physical fields before any moisture adjustment or
 * biome-specific modulation.
 */
export function sampleBaseFields(baseSeed, q, r, radius, noiseConfig) {
  const NC = noiseConfig;

  // Elevation
  const continent = hexFbm2D(q, r, baseSeed + NC.CONTINENT_OFFSET, NC.CONTINENT);
  const detail    = hexFbm2D(q, r, baseSeed + NC.DETAIL_OFFSET,    NC.ELEVATION_DETAIL);
  const ridges    = hexFbm2D(q, r, baseSeed + NC.RIDGE_OFFSET,     NC.RIDGE);
  const elevation = clamp01(
    continent * 0.60 +
    detail    * 0.25 +
    ridges    * 0.15 * continent
  );

  // Moisture (base, before water adjustment)
  const baseMoisture = hexFbm2D(q, r, baseSeed + NC.MOISTURE_OFFSET, NC.MOISTURE);

  // Temperature
  const latitudeTerm  = radius > 0 ? 1.0 - (Math.abs(r) / radius) : 0.5;
  const tempVariation = hexFbm2D(q, r, baseSeed + NC.TEMP_OFFSET, NC.TEMP_VARIATION);
  const temperature   = clamp01(
    latitudeTerm  * 0.5 +
    tempVariation * 0.5 -
    elevation     * 0.40
  );

  // Region bias
  const regionBias = hexFbm2D(q, r, baseSeed + NC.REGION_OFFSET, NC.REGION);

  // Slope (requires elevation at neighbors — computed in a separate step
  // after all elevations are known for the chunk + its border ring)

  return {
    elevation,
    rawElevation: elevation,
    baseMoisture,
    temperature,
    regionBias,
  };
}
```

**Border ring:** When generating a chunk, also sample `sampleBaseFields` for a 1-hex border ring around the chunk. This provides real data for slope computation and mountain/water tagging at the chunk edge without needing the neighbor chunk to exist. The border ring hexes are discarded after tagging — they're only used for local analysis.

```text
Chunk (24×24):
┌──────────────────────┐
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  ← 1-hex border ring (discarded after tagging)
│▒                    ▒│
│▒   Actual chunk     ▒│  ← 24×24 stored tiles
│▒                    ▒│
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
└──────────────────────┘
```

---

## 8. Noise Configuration

All noise parameters live in `src/params/game/worldParams.js`. The configuration is structured by role:

```js
// ── Elevation layers ──────────────────────────────────────────
export const NOISE_CONTINENT = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.0008
};
export const NOISE_ELEVATION_DETAIL = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.015
};
export const NOISE_RIDGE = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.012
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
export const SEED_OFFSET_CONTINENT   = 0;
export const SEED_OFFSET_DETAIL      = 100;
export const SEED_OFFSET_RIDGE       = 200;
export const SEED_OFFSET_MOISTURE    = 300;
export const SEED_OFFSET_TEMP        = 400;
export const SEED_OFFSET_REGION      = 500;
export const SEED_OFFSET_FEATURES    = 600;
export const SEED_OFFSET_DEBRIS      = 700;
export const SEED_OFFSET_DEBRIS_KIND = 800;

// ── Overridable defaults ──────────────────────────────────────
export const DEFAULT_TERRAIN_RULES = {
  waterMaxElevation: 0.07,
  waterMinMoisture: 0.50,
  floatingIslandThreshold: 0.985,
  peakThreshold: 0.96,
  mountainThreshold: 0.905,
  plateauSlopeMin: 0.08,
  hillElevationMin: 0.55,
  hillSlopeMin: 0.10,
  treeLineMax: 0.85,
  denseForestMinMoisture: 0.85,
  forestMinMoisture: 0.72,
  desertMaxMoisture: 0.20,
  marshMinMoisture: 0.58,
  marshMaxElevation: 0.35,
};

// ── River config ──────────────────────────────────────────────
export const RIVER_SOURCE_COUNT       = 25;
export const RIVER_SOURCE_MIN_ELEV    = 0.75;
export const RIVER_SOURCE_MIN_MOIST   = 0.55;
export const RIVER_MAX_LENGTH         = 200;
export const RIVER_MOISTURE_BOOST     = 0.10;
export const RIVER_BOOST_RADIUS       = 1;
```

**Frequency calibration notes:**
- Continent frequency (0.0008): on a radius-50 map (~7,651 tiles), this produces ~2-4 major landmasses. On radius-7 (169 tiles), the map is smaller than one continent cycle — everything is one landmass. This is correct: small maps shouldn't have multiple continents.
- Detail frequency (0.015): produces hills/valleys at ~10-15 hex scale regardless of map size — detail is local.
- Region frequency (0.0015): produces ~1-2 biome regions on a radius-7 map, ~4-6 on radius-50.

---

## 9. Terrain Types — Extended

New terrain types introduced by this design:

| Terrain | Passable | Description |
|---------|----------|-------------|
| `hill` | yes | Elevated but passable; distinct from plains and mountain |
| `plateau` | yes | Flat highland; visually distinct from mountain |
| `river` | yes* | A river hex; may have movement implications |
| `beach` | no (deferred) | Transition zone between water and land |

`hill` and `plateau` are classification outputs. `river` is a tag overlaid on existing terrain. `beach` is listed for completeness but deferred — it requires a second classification pass near water edges.

---

## 10. Biome Archetype Changes

Current biome definitions remain largely intact. Changes:

1. **`terrainThresholds` is replaced by `terrainRules`** — an object that overrides specific entries in `DEFAULT_TERRAIN_RULES`. Biome `biome_lush` might set `{ forestMinMoisture: 0.55, treeLineMax: 0.90 }` while inheriting all other defaults.

2. **`moistureBias` is replaced by climate-axis biases** in the biome selection table. The biome is *chosen* based on climate; it no longer *modifies* the moisture field. (The climate already determined that this is a lush region.)

3. **`terrainElevation` (per-type Y offsets) remains** — it's a rendering concern, not a generation concern.

4. **`features` remain** — they're spawn rules per biome.

5. **New field: `climateRange`** — defines the climate envelope where this biome naturally appears. Used by `selectBiome()`.

```js
defineArchetype('biome_lush', {
  type: 'biome',
  id: 'biome_lush',
  name: 'Lush Woodland',

  // Climate range for biome selection
  climateRange: {
    minMoisture: 0.62,
    minTemperature: 0.25,
  },

  // Terrain rule overrides (shallow merge over DEFAULT_TERRAIN_RULES)
  terrainRules: {
    forestMinMoisture: 0.55,
    denseForestMinMoisture: 0.80,
    waterMaxElevation: 0.05,
    desertMaxMoisture: 0.08,
    marshMinMoisture: 0.50,
    marshMaxElevation: 0.40,
    mountainThreshold: 0.920,
  },

  features: [ /* ... unchanged ... */ ],
  palette: { /* ... unchanged ... */ },
  terrainTags: [ /* ... */ ],
  weatherAffinity: ['rainy', 'temperate'],
  terrainElevation: { /* ... unchanged ... */ },
  supportsFloatingIslands: false,
});
```

---

## 11. Implementation Phases

Each phase is self-contained, produces a working game, and can be tested independently.

### Phase A: Foundation — Climate-Driven Classification

**Scope:** Replace the independent biome noise with climate-driven selection. Restructure `classifyTerrain`. Keep everything else as-is.

**Changes:**
1. Add `NOISE_CONTINENT` and `NOISE_ELEVATION_DETAIL` to `worldParams.js`
2. Replace single `NOISE_ELEVATION` usage with continent×detail composite in `terrainGenerator.js`
3. Add temperature derivation (lapse rate) in the shared sampler
4. Add `selectBiome(elevation, moisture, temperature, regionBias)` function
5. Rewrite `classifyTerrain` to use all three axes + tree line
6. Replace `BIOME_DISTRIBUTION` table with `selectBiome`
7. Remove `NOISE_BIOME` as primary biome selector; repurpose as `NOISE_REGION` for subtle bias
8. Update `gameFactory.js` to match new API
9. Store continuous `elevation` as primary (not `resolveElevation` collapse)
10. Update analysis tool (`dev/analysis/generation/generate.js`)

**Files touched:** `worldParams.js`, `terrainGenerator.js`, `gameFactory.js`, `dev/analysis/generation/generate.js`, `biomes.js` (add `climateRange` + `terrainRules`)

**Deliverable:** Maps where biome boundaries follow climate — arid regions are dry and hot, lush regions are wet, mountains have tree lines. No more "forest in the desert" artifacts.

---

### Phase B: Multi-Scale Elevation + Slope

**Scope:** Split elevation into continent mask × detail. Add slope computation and use it for terrain classification. Add hill and plateau terrain types.

**Changes:**
1. Implement 3-layer elevation composite in `sampleBaseFields`
2. Add slope computation using 1-hex border ring
3. Add `hill` and `plateau` to `TERRAIN` in `terrainTypes.js`
4. Classifier uses slope: mountain (steep) vs plateau (flat highland), hill (moderate)
5. Add border-ring sampling to `generateChunkTiles`
6. Provide real neighbor data for mountain/water tagging (eliminates `fallbackT`)

**Files touched:** `worldParams.js`, `terrainGenerator.js`, `terrainTypes.js`, `biomes.js`

**Deliverable:** Mountain ranges instead of popcorn mountains. Highlands that are flat plateaus. Passable hills as intermediate terrain.

---

### Phase C: Water-Adjusted Moisture

**Scope:** Two-pass moisture: base moisture from noise, then boost near water bodies.

**Changes:**
1. Split Pass 1 into: sample fields → provisional classify → adjust moisture → final classify
2. Implement near-water moisture boost (radius-2 neighbor check)
3. Reclassify terrain with adjusted moisture

**Files touched:** `terrainGenerator.js`

**Deliverable:** Coastlines feel wet. Lakes have green surroundings. Deserts don't abut oceans without transition.

---

### Phase D: Rivers

**Scope:** Downhill river tracing with moisture boost along river paths.

**Changes:**
1. Add `traceRiver()` function and river source selection
2. Store `isRiver: true` on river tiles
3. Apply moisture boost along river paths
4. Add river config to `worldParams.js`
5. (Deferred) River rendering — rivers are data for now; meshes come later

**Files touched:** `terrainGenerator.js`, `worldParams.js`, `terrainTypes.js`

**Deliverable:** Rivers flowing from mountains to oceans. Fertile river valleys. Natural exploration corridors.

---

### Phase E: Feature Density from Climate

**Scope:** Features and debris spawn from continuous climate values, not just terrain enum.

**Changes:**
1. Tree density scales with moisture, falls off with elevation
2. Rocks more common on slopes / low moisture
3. Fruit trees require moist + below-tree-line
4. Replace hardcoded density enums (`'dense'/'medium'/'sparse'`) with continuous density value

**Files touched:** `terrainGenerator.js`

**Deliverable:** Gradual forest edges. Sparse vegetation near deserts. Rich resources in wet valleys.

---

### Phase F: Ridged Noise for Mountains

**Scope:** Add `ridgedFbm2D()` to `noise.js` and use it for the ridge layer in elevation composite.

**Changes:**
1. Implement `ridgedFbm2D()` in `src/engine/rules/noise.js`
2. Swap ridge layer from regular FBM to ridged FBM in elevation composite

**Files touched:** `noise.js`, `worldParams.js`, `terrainGenerator.js`

**Deliverable:** Sharp mountain ridges instead of rounded hills. More natural-looking ranges.

---

### Phase G: Tuning & Polish

**Scope:** Iterate on noise parameters based on playtesting. Add domain warping if blob artifacts persist.

**Changes:**
1. Tune frequencies for target map sizes (radius 7, 21, 50)
2. Optional: domain warping on elevation coordinates
3. Optional: new terrain types (beach, scrubland, tundra, taiga)

**Files touched:** `worldParams.js`, possibly `noise.js`

---

## 12. File Summary

| File | Phase A | Phase B | Phase C | Phase D | Phase E | Phase F |
|------|---------|---------|---------|---------|---------|---------|
| `src/engine/rules/noise.js` | — | — | — | — | — | **add** |
| `src/params/game/worldParams.js` | **rewrite** | edit | — | edit | — | edit |
| `src/game/rules/terrainGenerator.js` | **rewrite** | **rewrite** | edit | edit | edit | edit |
| `src/game/rules/terrainTypes.js` | — | edit | — | edit | — | — |
| `src/game/rules/archetypeData/biomes.js` | edit | edit | — | — | — | — |
| `src/game/state/gameFactory.js` | edit | — | — | — | — | — |
| `dev/analysis/generation/generate.js` | edit | edit | — | — | — | — |

**Key:** **rewrite** = major refactor of that file. edit = targeted changes. add = new function added.

---

## 13. Backward Compatibility

- **Single-biome mode** (setup screen selects one archetype) remains supported. When `biomeDef` is passed, all hexes use that biome — no climate-based selection occurs.
- **Multi-biome mode** (default) uses climate-driven selection.
- **`generateTiles()` signature** stays `(seedText, radius, biomeDef, params)`.
- **Tile object shape** adds fields (`temperature`, `slope`, `isRiver`) but existing fields keep their names where possible. `rawElev` and `rawMoist` are preserved.

---

## 14. Risks & Open Questions

1. **Slope computation with border ring adds ~20% more noise samples per chunk.** Acceptable — FBM is cheap and this replaces the current `fallbackT` approximation.

2. **Rivers across chunk boundaries.** For finite maps (Phase 4 and earlier), compute rivers once after all chunks are generated. For infinite maps (Phase 5), rivers are truncated at generation boundaries. This is an acceptable limitation for v1.

3. **Temperature latitude model for infinite maps.** The `Math.abs(r) / radius` formula requires a known radius. For infinite maps, replace with a very-low-frequency noise field or omit latitude entirely (pure lapse rate). Deferred to Phase 5.

4. **Frequency calibration for small maps (radius 7).** Continent frequency 0.0008 means the entire small map is within one "continent" — everything is land (or water, depending on phase). This is actually desirable (small maps shouldn't have oceans), but needs validation.

5. **Ridged noise is novel code.** The simplex noise implementation needs a ridged variant. This is well-understood (absolute value per octave), but a new function in `noise.js`.

6. **Performance of water-adjusted moisture pass.** For each land tile, scanning radius-2 neighbors is ~19 lookups per tile. At radius 50 (7,651 tiles), that's ~145k lookups — fine for a generation pass that runs once at startup.

---

## 15. References

- `dev/terrainGen_suggestions.md` — Dev 1 analysis (region-first approach, pipeline critique)
- `dev/terrainGen_ideas.md` — Dev 2 analysis (climate-first approach, rivers, slope)
- `src/engine/rules/noise.js` — Simplex 2D + FBM implementation
- `src/game/rules/archetypes.js` — Archetype registry
- `src/game/rules/archetypeData/biomes.js` — Current biome definitions
- `src/game/rules/terrainGenerator.js` — Current generation pipeline
- `src/params/game/worldParams.js` — Current noise config
- `dev/largeMapRoadmap.md` — Scaling plan and chunk infrastructure context
