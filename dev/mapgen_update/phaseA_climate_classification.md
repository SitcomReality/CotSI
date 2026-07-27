# Phase A: Climate-Driven Classification

**Depends on:** Phase 0 (calibration values available)  
**Deliverable:** Maps where biome boundaries follow climate — arid regions are dry and hot, lush regions are wet, mountains have tree lines. No more "forest in the desert" artifacts.

---

## 1. Objective

Replace the independent biome noise roll with climate-driven selection. In the current system, each hex independently samples FBM noise and maps the result through `BIOME_DISTRIBUTION` — a weighted table with no relationship to elevation, moisture, or temperature. This produces the "arid biome hex with high moisture → forest inside a desert" artifact.

After this phase, biome selection is a data-driven lookup using three climate axes (elevation, moisture, temperature) plus regional bias. The biome *concludes* from the physical fields; it doesn't compete with them.

---

## 2. Scope

**In scope:**
- Add `NOISE_CONTINENT` field to `worldParams.js` (single-field elevation for now — multi-layer composite comes in Phase B)
- Replace single `NOISE_ELEVATION` usage with a simple elevation field (continents only, or a single blended field calibrated to span [0, 1])
- Add temperature derivation (latitude + lapse rate) to the shared sampler
- Add data-driven `selectBiome(elevation, moisture, temperature, regionBiasM, regionBiasT)` that reads from archetype `climateRange`
- Rewrite `classifyTerrain` to use all three climate axes + tree line
- Remove `BIOME_DISTRIBUTION` table and `biomeForRoll`
- Repurpose `NOISE_BIOME` as `NOISE_REGION` (two independent bias fields)
- Add `climateRange` to existing biome archetypes
- Replace `moistureBias` in biome defs (removed — climate already determined the biome)
- Update `generateChunkTiles` to use the new pipeline
- Update analysis tool to match
- Per-phase elevation weight normalization (see §4.2)

**Out of scope:**
- Slope computation (Phase B)
- Hill and plateau terrain types (Phase B)
- Continent × detail composite (Phase B)
- Water-adjusted moisture (Phase C)
- Rivers (Phase D)

---

## 3. Pre-requisites

- Phase 0 calibration run complete: `calibration_v1.json` with derived thresholds for water, mountain, peak, forest, desert cutoffs.
- Frequency-to-wavelength relationship verified (Phase 0 §4.1).

---

## 4. Detailed Changes

### 4.1 Noise Configuration (`worldParams.js`)

Replace the current flat noise config with the new layered structure:

```js
// Remove:
//   NOISE_ELEVATION, NOISE_MOISTURE, NOISE_BIOME (as biome selector)
//   FLOATING_ISLAND_THRESHOLD, PEAK_THRESHOLD, DENSE_FOREST_MIN_MOISTURE
//   (move threshold constants to DEFAULT_TERRAIN_RULES)

// Add:
export const NOISE_CONTINENT = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.0008  // TBD from Phase 0
};
// Elevation in Phase A is a single field (PHASE_A_ELEVATION).
// It produces a blended [0, 1] signal using a frequency that gives
// visible landmass shapes at the target map sizes. The 3-layer composite
// (continent × detail + ridges) replaces this in Phase B.
export const NOISE_PHASE_A_ELEVATION = {
  octaves: 5, lacunarity: 2.0, gain: 0.5, frequency: 0.006
};

export const NOISE_MOISTURE = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.006
};
export const NOISE_TEMP_VARIATION = {
  octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.08
};
export const NOISE_REGION = {
  octaves: 2, lacunarity: 2.0, gain: 0.5, frequency: 0.0015
};

// Seed offsets
export const SEED_CONTINENT   = 0;
export const SEED_MOISTURE    = 300;
export const SEED_TEMP        = 400;
export const SEED_REGION_M    = 500;
export const SEED_REGION_T    = 600;
export const SEED_FEATURES    = 700;
export const SEED_DEBRIS      = 800;
export const SEED_DEBRIS_KIND = 900;

// Calibrated thresholds (from Phase 0)
export const DEFAULT_TERRAIN_RULES = {
  waterMaxElevation:        /* from calibration_v1.json */,
  waterMinMoisture:         0.50,
  floatingIslandThreshold:  /* from calibration_v1.json */,
  peakThreshold:            /* from calibration_v1.json */,
  mountainThreshold:        /* from calibration_v1.json */,
  treeLineMax:              0.85,
  denseForestMinMoisture:   0.85,
  forestMinMoisture:        0.72,
  desertMaxMoisture:        0.20,
  marshMinMoisture:         0.58,
  marshMaxElevation:        0.35,
  // plateauSlopeMin, hillElevationMin, hillSlopeMin added in Phase B
};

// Remove: NOISE_CHANNEL_ELEVATION, NOISE_CHANNEL_MOISTURE, NOISE_CHANNEL_BIOME
//         (channel indices replaced by seed offsets)
```

### 4.2 elevation in Phase A (Before the Multi-Layer Composite)

Phase A uses a single elevation FBM field before the continent×detail composite arrives in Phase B. **Normalize the output to [0, 1]:**

```js
// Phase A sampleBaseFields (simplified — expands in Phase B):
const elevation = hexFbm2D(q, r, baseSeed + SEED_CONTINENT, NOISE_PHASE_A_ELEVATION);
// Single field already returns [0, 1] from fbm2D, no normalization needed.
```

This avoids the "maxes at 0.85" problem — `NOISE_PHASE_A_ELEVATION` is one FBM call returning [0, 1], and all thresholds derived in Phase 0 were calibrated against this same formula. The thresholds will produce the target terrain distributions.

### 4.3 Shared Sampler (`sampleBaseFields`)

New function in `terrainGenerator.js`:

```js
export function sampleBaseFields(baseSeed, q, r, noiseConfig, radius) {
  const NC = noiseConfig;

  const elevation     = hexFbm2D(q, r, baseSeed + NC.SEED_CONTINENT, NC.PHASE_A_ELEVATION);
  const baseMoisture  = hexFbm2D(q, r, baseSeed + NC.SEED_MOISTURE,  NC.MOISTURE);
  const distFromCenter = distance({ q, r }, { q: 0, r: 0 });
  const latitudeTerm  = radius > 0 ? 1.0 - (distFromCenter / radius) : 0.5;
  const tempVariation = hexFbm2D(q, r, baseSeed + NC.SEED_TEMP, NC.TEMP_VARIATION);
  const temperature   = clamp01(
    latitudeTerm  * 0.50 +
    tempVariation * 0.15 -
    elevation     * 0.40
  );
  const regionBiasM = hexFbm2D(q, r, baseSeed + NC.SEED_REGION_M, NC.REGION);
  const regionBiasT = hexFbm2D(q, r, baseSeed + NC.SEED_REGION_T, NC.REGION);

  return {
    elevation,
    rawLayers: { continent: elevation, detail: 0, ridges: 0 },  // single field for now
    baseMoisture,
    temperature,
    regionBiasM,
    regionBiasT,
  };
}
```

**Key correction:** Latitude uses `distance({q, r}, {q:0, r:0})` — the hex distance from the map center — not `Math.abs(r)`. This produces circular climate zones instead of straight bands parallel to one hex axis.

### 4.4 Data-Driven `selectBiome`

```js
const BIOME_PRIORITY_ORDER = [
  'biome_arid',    // hot + dry (more specific)
  'biome_lush',    // wet + warm
  'biome_default', // catch-all (no climateRange → always matches)
];

function selectBiome(elevation, moisture, temperature, regionBiasM, regionBiasT) {
  const m = clamp01(moisture   + (regionBiasM - 0.5) * 0.10);
  const t = clamp01(temperature + (regionBiasT - 0.5) * 0.10);

  for (const biomeId of BIOME_PRIORITY_ORDER) {
    const def = getArchetype(biomeId);
    if (!def) continue;
    const R = def.climateRange;
    if (!R) return biomeId;  // no constraints = catch-all

    // All specified constraints must be satisfied
    if (R.minElevation   !== undefined && elevation   < R.minElevation)   continue;
    if (R.maxElevation   !== undefined && elevation   > R.maxElevation)   continue;
    if (R.minMoisture    !== undefined && m            < R.minMoisture)    continue;
    if (R.maxMoisture    !== undefined && m            > R.maxMoisture)    continue;
    if (R.minTemperature !== undefined && t            < R.minTemperature) continue;
    if (R.maxTemperature !== undefined && t            > R.maxTemperature) continue;

    return biomeId;
  }

  return 'biome_default';
}
```

**Key properties:**
- No hardcoded thresholds — all climate constraints live in the archetype's `climateRange`.
- Adding a biome requires adding it to `BIOME_PRIORITY_ORDER` and defining its `climateRange`. No code changes.
- `biome_default` has no `climateRange` — it's the catch-all. Every tile maps to some biome.
- Regional bias uses two **independent** fields (`regionBiasM`, `regionBiasT`), so a region can independently bias toward wetter *or* drier, hotter *or* colder.

### 4.5 Updated `classifyTerrain`

```js
function classifyTerrain(elevation, moisture, temperature, biomeDef) {
  const R = { ...DEFAULT_TERRAIN_RULES, ...biomeDef?.terrainRules };

  if (elevation < R.waterMaxElevation && moisture > R.waterMinMoisture)
    return 'water';

  if (elevation > R.floatingIslandThreshold) return 'floatingIsland';
  if (elevation > R.peakThreshold)          return 'peak';
  if (elevation > R.mountainThreshold)      return 'mountain';

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

**Key changes from current `classifyTerrain`:**
- Takes `temperature` as input (used by tree line and future biomes — tundra, taiga in Phase G).
- Tree line prevents forests on high-elevation tiles.
- Uses `DEFAULT_TERRAIN_RULES` + biome `terrainRules` shallow merge (the `terrainRules` object replaces `terrainThresholds`).
- `supportsFloatingIslands` check remains on the biome def — only biomes that opt in can produce floating islands.

### 4.6 Biome Archetype Updates (`biomes.js`)

Each biome gains a `climateRange` and `terrainRules`. The `moistureBias` field is **removed** — the biome is chosen because the climate already matches, not because the biome modifies the climate.

```js
defineArchetype('biome_default', {
  type: 'biome',
  id: 'biome_default',
  name: 'Default Manuscript',

  // No climateRange — catch-all (always matches)

  terrainRules: {
    // Inherits all DEFAULT_TERRAIN_RULES; override only if needed
  },

  features: [ /* unchanged */ ],
  palette: { /* unchanged */ },
  terrainTags: [ /* unchanged */ ],
  weatherAffinity: ['temperate', 'rainy'],
  terrainElevation: null,
  supportsFloatingIslands: false,
});

defineArchetype('biome_lush', {
  type: 'biome',
  id: 'biome_lush',
  name: 'Lush Woodland',

  climateRange: {
    minMoisture: 0.62,
    minTemperature: 0.25,
  },

  terrainRules: {
    forestMinMoisture: 0.55,
    denseForestMinMoisture: 0.80,
    desertMaxMoisture: 0.08,
    marshMinMoisture: 0.50,
    marshMaxElevation: 0.40,
    mountainThreshold: 0.920,
  },

  features: [ /* unchanged */ ],
  palette: { /* unchanged */ },
  terrainTags: [ /* unchanged */ ],
  weatherAffinity: ['rainy', 'temperate'],
  terrainElevation: { forest: 0.18, denseForest: 0.25, marsh: -0.08 },
  supportsFloatingIslands: false,
});

defineArchetype('biome_arid', {
  type: 'biome',
  id: 'biome_arid',
  name: 'Sere Wastes',

  climateRange: {
    maxMoisture: 0.22,
    minTemperature: 0.65,
  },

  terrainRules: {
    mountainThreshold: 0.890,
    waterMaxElevation: 0.04,
    waterMinMoisture: 0.70,
    forestMinMoisture: 0.85,
    desertMaxMoisture: 0.35,
    marshMinMoisture: 0.75,
    marshMaxElevation: 0.20,
  },

  features: [ /* unchanged */ ],
  palette: { /* unchanged */ },
  terrainTags: [ /* unchanged */ ],
  weatherAffinity: ['arid', 'temperate'],
  terrainElevation: { mountain: 0.75, plains: 0.05 },
  supportsFloatingIslands: false,
});
```

**Climate space coverage:** The `BIOME_PRIORITY_ORDER` list, combined with the catch-all `biome_default`, ensures full coverage. Cold+dry tiles (t < 0.20, m < 0.22) currently fall through to `biome_default` — a known gap explicitly visible because no biome claims that range. A tundra biome can be added later in Phase G by inserting it into the priority order with a `climateRange` covering cold+dry.

### 4.7 `generateChunkTiles` Restructure

The generation function is rewritten to use the new pipeline:

```js
export function generateChunkTiles(seedText, chunkQ, chunkR, radius, biomeDef, params) {
  const seed = stringSeed(seedText);
  const tileMap = new Map();

  const candidates = hexesInChunk(chunkQ, chunkR).filter(({ q, r }) => {
    const s = -q - r;
    return Math.abs(s) <= radius && Math.abs(q) <= radius && Math.abs(r) <= radius;
  });

  // Pass 1: Sample base fields for every tile
  for (const { q, r } of candidates) {
    const fields = sampleBaseFields(seed, q, r, NOISE_CONFIG, radius);

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
      fields.elevation, fields.baseMoisture, fields.temperature, hexBiomeDef
    );

    const { lq, lr } = localCoord(chunkQ, chunkR, q, r);
    tileMap.set(localKey(lq, lr), {
      q, r, terrain, feature: null, debris: null,
      mountainType: null, waterType: null, isRiver: false,
      elevation: fields.elevation,
      moisture: fields.baseMoisture,    // base moisture for now (adjusted in Phase C)
      temperature: fields.temperature,
      slope: 0,                          // computed in Phase B
      rawLayers: fields.rawLayers,
      biomeId: hexBiomeId,
    });
  }

  // Pass 2: Mountain type tagging (unchanged from current, but uses real data)
  // Pass 3: Water type tagging (unchanged)
  // Pass 4: Features (unchanged)
  // Pass 5: Debris (unchanged)

  return { tileMap, biomeId: biomeDef?.id || null };
}
```

### 4.8 Analysis Tool Update

`dev/analysis/generation/generate.js` must match the new generation pipeline. The `enrichWithNoise` function becomes unnecessary — tiles already carry continuous fields from `sampleBaseFields`. The function is either removed or repurposed as a no-op that returns early.

---

## 5. Files Touched

| File | Change | Summary |
|------|--------|---------|
| `src/params/game/worldParams.js` | **rewrite** | New noise config, seed offsets, `DEFAULT_TERRAIN_RULES` with calibrated thresholds |
| `src/game/rules/terrainGenerator.js` | **rewrite** | `sampleBaseFields`, `selectBiome`, rewritten `classifyTerrain`, restructured `generateChunkTiles` |
| `src/game/rules/archetypeData/biomes.js` | edit | Add `climateRange` + `terrainRules` to each biome; remove `moistureBias` |
| `src/game/state/gameFactory.js` | edit | Update imports to match new exports from `terrainGenerator.js` |
| `dev/analysis/generation/generate.js` | edit | Match new pipeline; remove or repurpose `enrichWithNoise` |

---

## 6. Deliverable

- Multi-biome maps where biome boundaries are continuous and follow climate: lush near wet+warm regions, arid near hot+dry regions, default elsewhere.
- No more "forest in the desert" artifacts — terrain types respect their biome's `terrainRules` and the global `DEFAULT_TERRAIN_RULES`.
- Mountains stop at the tree line — no forests on peaks (unless biome overrides `treeLineMax`).
- Temperature varies with latitude (circular climate zones) and elevation (lapse rate).
- Single-biome mode unchanged — all hexes use the selected biome, no climate-based selection.
- Analysis tool shows the new fields (`temperature`, continuous `elevation`, `moisture`).
- Calibration values from Phase 0 produce the target terrain distributions.

---

## 7. Risks & Edge Cases

- **Single elevation field produces popcorn mountains.** Without the continent mask and slope discrimination (Phase B), mountain placement is noise-blob rather than range-based. This is expected and acceptable — Phase B fixes it.
- **Water still uses moisture gate.** In this phase, water requires both elevation < threshold AND moisture > threshold. The elevation-only water determination (oceans always water, lakes are moisture-gated) comes in Phase C. For now, "dry ocean basins" can still occur at low elevation + low moisture.
- **Cold+dry climate yields `biome_default`.** The explicit gap in `climateRange` coverage is a known limitation — tundra/snow biomes added in Phase G.
- **`fallbackT` removed.** The new border-ring approach eliminates the need for cross-chunk neighbor approximations. But in Phase A, the border ring infrastructure from Phase B isn't built yet. For this phase, cross-chunk lookups for mountain/water tagging can use `sampleBaseFields` directly — it's deterministic and works at any global coordinate.
- **Chunk boundary consistency.** Since `sampleBaseFields` is a pure function of `(seed, q, r)`, two chunks that sample the same global coordinate produce identical base fields. The biome selection and terrain classification are also pure functions of those fields, so chunk seams are guaranteed consistent. This was already true in the current code — nothing about this property changes.
