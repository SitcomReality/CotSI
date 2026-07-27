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
- Add noise config fields to `worldParams.js` (single-field elevation for now — multi-layer composite comes in Phase B)
- Replace single `NOISE_ELEVATION` usage with a simple elevation field (continents only, or a single blended field calibrated to span [0, 1])
- Add temperature derivation (latitude + lapse rate) to the shared sampler
- Add data-driven `selectBiome(elevation, moisture, temperature, regionBiasM, regionBiasT)` that reads from archetype `climateRange`
- **Add jittered-grid epicenter system** for supernatural biome placement: grid seed placement, noise-modulated radial falloff, `fieldModifiers` application, `terrainMap` application — fully functional from Phase A, no placeholder
- Add `origin: 'natural' | 'supernatural'` and `epicenter` config block to biome archetypes
- Rewrite `classifyTerrain` to use all three climate axes + tree line + temperature gates (snow line, frozen water/ice)
- Remove `BIOME_DISTRIBUTION` table and `biomeForRoll`
- Repurpose `NOISE_BIOME` as `NOISE_REGION` (two independent bias fields)
- Add `climateRange` to existing biome archetypes
- Replace `moistureBias` in biome defs (removed — climate already determined the biome)
- Update `generateChunkTiles` to use the new pipeline
- Update analysis tool to match
- Per-phase elevation weight normalization (see §4.2)
- Add `ice` terrain type to `terrainTypes.js` (returned by `classifyTerrain` when water tiles are below `freezeTempMax`)

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
  octaves: 5, lacunarity: 2.0, gain: 0.5, frequency: 0.006   // TBD from Phase 0
};

export const NOISE_MOISTURE = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.006   // TBD from Phase 0
};
export const NOISE_TEMP_VARIATION = {
  octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.08    // TBD from Phase 0
};
export const NOISE_REGION = {
  octaves: 2, lacunarity: 2.0, gain: 0.5, frequency: 0.0015  // TBD from Phase 0
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
  snowLineMax:              0.15,  // below this temp + above mountain → snow-capped peak
  freezeTempMax:            0.10,  // below this temp + water → ice
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

Phase A uses a single elevation FBM field before the continent×detail composite arrives in Phase B. With the multiplicative model `continent × (detail × wD + ridges × wR)`, Phase A sets wD = 1.0 and wR = 0:

```js
// Phase A elevation: multiplicative model with single field
const continent = hexFbm2D(q, r, baseSeed + SEED_CONTINENT, NOISE_PHASE_A_ELEVATION);
// detail placeholder = 0.5 (constant), so elevation = continent × 0.5 × 2 = continent
// Normalize to [0, 1] — single field already spans the full range after FBM
const elevation = clamp01(continent * 0.50 * 2);  // = continent
```

This avoids the "maxes at 0.85" problem — `NOISE_PHASE_A_ELEVATION` is one FBM call. All thresholds derived in Phase 0 were calibrated against this same formula.

### 4.3 Shared Sampler (`sampleBaseFields`)

Updated to match the current overview formulas — world-space Y latitude, convex temperature, multiplicative elevation:

```js
export function sampleBaseFields(baseSeed, q, r, noiseConfig, radius) {
  const NC = noiseConfig;

  // Phase A elevation: single-field multiplicative (continent * 1.0, detail placeholder = 0.5)
  const continent    = hexFbm2D(q, r, baseSeed + NC.SEED_CONTINENT, NC.PHASE_A_ELEVATION);
  const elevation    = clamp01(continent * 0.50 * 2);  // normalize to [0, 1]

  const baseMoisture = hexFbm2D(q, r, baseSeed + NC.SEED_MOISTURE,  NC.MOISTURE);

  // Temperature: world-space Y latitude (proper bands, not hexagonal iso-contours)
  const { y }            = hexToWorld(q, r);
  const worldRadiusY     = radius * 1.73;  // hex row spacing ≈ √3; calibrate in Phase 0
  const latitudeTerm     = 1.0 - (Math.abs(y) / worldRadiusY);
  const tempVariation    = hexFbm2D(q, r, baseSeed + NC.SEED_TEMP, NC.TEMP_VARIATION);
  const RULES            = DEFAULT_TERRAIN_RULES;
  const temperature      = clamp01(
    0.5 + 0.35 * (latitudeTerm - 0.5)
        + 0.10 * (tempVariation - 0.5)
        - 0.30 * (elevation - RULES.waterMaxElevation)
  );

  const regionBiasM = hexFbm2D(q, r, baseSeed + NC.SEED_REGION_M, NC.REGION);
  const regionBiasT = hexFbm2D(q, r, baseSeed + NC.SEED_REGION_T, NC.REGION);

  return {
    elevation,
    rawLayers: { continent, detail: 0, ridges: 0 },
    baseMoisture,
    temperature,
    regionBiasM,
    regionBiasT,
  };
}
```

**Key corrections from the original design:**
- **Latitude uses world-space Y** via `hexToWorld(q, r).y`, not `hexDistance(q, r, 0, 0)`. hexDistance produces hexagonal iso-contours — visually, a hexagonal bullseye with sharp corners. World-space Y gives proper latitude bands that align with the hex grid's row geometry.
- **Temperature is a convex combination centered on 0.5.** The original formula `0.50·lat + 0.15·noise − 0.40·elev` produced a range of roughly [0, 0.4] with a large point mass at 0 — `maxTemperature > 0.65` was dead code. The new formula centers around 0.5 and uses `waterMaxElevation` as the sea-level lapse-rate reference so sea level = neutral temperature, higher = colder.
- **Radius is always known** (finite maps). No `radius > 0 ? ... : 0.5` fallback.
- **Elevation is multiplicative** from Phase A onward: `continent × (detail × wD + ridges × wR)`. This ensures continent=0 forces ocean — no dry ocean basins from additive detail leakage.

### 4.4 Data-Driven `selectBiome` + Supernatural Override

Natural and supernatural biomes live in **separate lists.** `BIOME_PRIORITY_ORDER` contains only natural biomes (including `biome_default` as catch-all). `SUPERNATURAL_BIOMES` is a separate registry consumed by `applySupernaturalOverrides()`.

```js
// Natural biomes only — climate-driven, in specificity order, with biome_default last
const BIOME_PRIORITY_ORDER = [
  'biome_arid',    // hot + dry (more specific)
  'biome_lush',    // wet + warm
  'biome_default', // catch-all — last, always matches
];

// Supernatural biomes — placed by epicenter pass, never by climate
const SUPERNATURAL_BIOMES = [
  'biome_unfinished_lands',
  'biome_brass_grave',
];

function selectBiome(elevation, moisture, temperature, regionBiasM, regionBiasT) {
  const m = clamp01(moisture   + (regionBiasM - 0.5) * 0.10);
  const t = clamp01(temperature + (regionBiasT - 0.5) * 0.10);

  // Iterate natural biomes only. First biome whose climateRange matches wins.
  for (const biomeId of BIOME_PRIORITY_ORDER) {
    const def = getArchetype(biomeId);
    if (!def) continue;
    const R = def.climateRange;

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

/**
 * Place supernatural biomes via jittered-grid epicenter seeds.
 * Pure function of (seed, q, r) — chunk-local, no global BFS.
 * Applies fieldModifiers and terrainMap from Phase A onward.
 */
function applySupernaturalOverrides(tiles, fieldMap, baseSeed, gridConfig, mapRadius) {
  // 1. Place epicenter seeds on jittered grid
  const seeds = [];
  const gridRange = Math.ceil(mapRadius / gridConfig.cellSize) + 1;

  for (let gridR = -gridRange; gridR <= gridRange; gridR++) {
    for (let gridQ = -gridRange; gridQ <= gridRange; gridQ++) {
      const jitter = seededJitter(baseSeed, gridQ, gridR, gridConfig.cellSize,
                                   gridConfig.jitterAmplitude);
      const seedQ = Math.round(gridQ * gridConfig.cellSize + jitter.q);
      const seedR = Math.round(gridR * gridConfig.cellSize + jitter.r);

      if (hexDistance(seedQ, seedR, 0, 0) > mapRadius) continue;

      const biomeIndex = hashBiomeIndex(baseSeed, gridQ, gridR, SUPERNATURAL_BIOMES.length);
      const biomeId = SUPERNATURAL_BIOMES[biomeIndex];

      seeds.push({ q: seedQ, r: seedR, biomeId, biomeDef: getArchetype(biomeId) });
    }
  }

  // 2. For each tile, check if within any epicenter region
  for (const [, tile] of tiles) {
    for (const seed of seeds) {
      const ep = seed.biomeDef?.epicenter;
      if (!ep) continue;

      const dist = hexDistance(tile.q, tile.r, seed.q, seed.r);
      const radiusNoise = hexFbm2D(tile.q, tile.r,
        baseSeed + hashSeedOffset(seed.biomeId, 'epicenterRadius'),
        { frequency: ep.noiseScale, octaves: 2, gain: 0.5, lacunarity: 2.0 }
      );
      const effectiveRadius = ep.radius * (1.0 + (radiusNoise - 0.5) * 2 * ep.radiusNoise);

      if (dist < effectiveRadius) {
        // Apply fieldModifiers
        const mods = seed.biomeDef.fieldModifiers || {};
        const modElev = clamp01((tile.elevation + (mods.elevationOffset || 0))
                                * (mods.elevationMultiplier ?? 1));
        const modMoist = clamp01(tile.moisture * (mods.moistureMultiplier ?? 1));
        const modTemp  = clamp01(tile.temperature + (mods.temperatureOffset || 0));

        tile.biomeId = seed.biomeId;
        tile.terrain = classifyTerrain(modElev, modMoist, modTemp, 0, seed.biomeDef);

        // Apply terrainMap
        const mapped = seed.biomeDef.terrainMap?.[tile.terrain];
        if (mapped) tile.terrain = mapped;

        break;
      }
    }
  }
}

// Helper: jittered position within grid cell
function seededJitter(baseSeed, cellQ, cellR, cellSize, amplitude) {
  const hashQ = hash32(baseSeed ^ 0x4A1E_BEAD ^ (cellQ * 0x9E37_79B9) ^ (cellR * 0x7F4A_7C2D));
  const hashR = hash32(baseSeed ^ 0x3C8D_6E2F ^ (cellQ * 0x2B1F_5A8D) ^ (cellR * 0x6E3D_1F9C));
  const range = cellSize * amplitude;
  return {
    q: ((hashQ / 0xFFFFFFFF) - 0.5) * range,
    r: ((hashR / 0xFFFFFFFF) - 0.5) * range,
  };
}

function hashBiomeIndex(baseSeed, cellQ, cellR, count) {
  const hash = hash32(baseSeed ^ 0x9D6E_1F3A ^ (cellQ * 0x4B8D_7C2E) ^ (cellR * 0x3F2A_5E1C));
  return Math.abs(hash) % count;
}
```

**Key properties:**
- No hardcoded climate thresholds — all climate constraints live in each archetype's `climateRange`.
- `BIOME_PRIORITY_ORDER` contains only natural biomes. Adding a natural biome requires: define `climateRange`, add to `BIOME_PRIORITY_ORDER` before `biome_default`. No pipeline code changes.
- `SUPERNATURAL_BIOMES` is a separate list for epicenter-placed biomes. Adding a supernatural biome requires: define archetype with `origin: 'supernatural'` and `epicenter` config block, add to `SUPERNATURAL_BIOMES`. No pipeline code changes.
- A startup assertion (`validateBiomeLists()`) verifies that every natural biome appears in `BIOME_PRIORITY_ORDER` exactly once and every entry is a natural biome, and that `SUPERNATURAL_BIOMES` contains only supernatural biomes.
- `biome_default` is the catch-all natural biome — last in `BIOME_PRIORITY_ORDER`, always matches.
- Supernatural biomes are in `SUPERNATURAL_BIOMES` only — never in `BIOME_PRIORITY_ORDER`.
- Regional bias uses two **independent** fields (`regionBiasM`, `regionBiasT`), so a region can independently bias toward wetter *or* drier, hotter *or* colder.
- **Chunk-local:** To determine if tile `(q, r)` is in an epicenter, only grid cells within `maxEpicenterRadius / cellSize + 1` need to be checked — a small, bounded neighbor lookup.
- **fieldModifiers and terrainMap applied from Phase A onward** — supernatural biomes alter the local environment immediately, not as a Phase G enhancement.

### 4.5 Updated `classifyTerrain`

```js
function classifyTerrain(elevation, moisture, temperature, biomeDef) {
  const R = { ...DEFAULT_TERRAIN_RULES, ...biomeDef?.terrainRules };

  // Water: elevation-driven (primary), moisture as secondary inland-lake gate
  if (elevation < R.waterMaxElevation) {
    // Frozen water: cold enough to ice over
    if (temperature < R.freezeTempMax) return 'ice';
    if (moisture > R.waterMinMoisture) return 'water';
    // Low elevation + low moisture → salt flat / dry basin (falls through)
  }

  // Snow-capped peaks: high elevation + cold temperature
  if (elevation > R.peakThreshold && temperature < R.snowLineMax) return 'peak';

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
- **Temperature gates:** cold water becomes `'ice'`; cold peaks become snow-capped `'peak'` (snow line). This eliminates the review's critique that temperature was accepted as input but never used.
- Takes `temperature` as input — used by snow line, frozen water, and future biomes (tundra, taiga in Phase G).
- Tree line prevents forests on high-elevation tiles.
- Uses `DEFAULT_TERRAIN_RULES` + biome `terrainRules` shallow merge (the `terrainRules` object replaces `terrainThresholds`).
- `supportsFloatingIslands` check remains on the biome def — only biomes that opt in can produce floating islands.

### 4.6 Biome Archetype Updates (`biomes.js`)

Each biome gains `origin`, `climateRange` (natural biomes only), and `terrainRules`. The `moistureBias` field is **removed** — the biome is chosen because the climate already matches, not because the biome modifies the climate.

```js
defineArchetype('biome_default', {
  type: 'biome',
  id: 'biome_default',
  name: 'Default Manuscript',
  origin: 'natural',

  // No climateRange — catch-all (last in priority, returned as fallback)

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
  origin: 'natural',

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
  origin: 'natural',

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

// Supernatural biome placeholder (defined here for Phase A pipeline;
// actual content — features, palette, terrain rules — filled in during
// Phase G tuning when the biome's gameplay design is complete.)
defineArchetype('biome_brass_grave', {
  type: 'biome',
  id: 'biome_brass_grave',
  name: 'Brass Grave',
  origin: 'supernatural',

  // No climateRange — placed by jittered-grid epicenter, never by climate.

  // Epicenter placement on jittered grid (deterministic, chunk-local)
  epicenter: {
    radius:       12,    // base region radius in hexes (tuned in Phase G)
    radiusNoise:  0.30,  // how much FBM noise modulates the radius (0-1)
    noiseScale:   0.04,  // frequency of the radius-modulation noise
  },

  terrainRules: {
    mountainThreshold: 0.85,
    forestMinMoisture: 0.90,
    desertMaxMoisture: 0.50,
    waterMaxElevation: 0.05,
  },

  // Maps standard terrain types to biome-specific aliases.
  // Applied after classifyTerrain returns a standard type.
  terrainMap: {
    plains: 'brass',
    mountain: 'brassPeak',
    hill: 'brassKnoll',
    // ... other terrain aliases
  },

  // Field modifiers applied before terrain classification within the epicenter region.
  // Supernatural biomes alter the local environment — they're not just palette swaps.
  fieldModifiers: {
    elevationOffset: -0.05,    // crater depression
    moistureMultiplier: 0.7,   // drier
    temperatureOffset: +0.05,  // warmer (brass heats up)
  },

  features: [ /* TBD — divine wires, brass shards, etc. */ ],
  palette: { brass: { fill: '#b5a06a', ink: '#d4c898' } },
  terrainTags: ['brass'],
  weatherAffinity: ['arid', 'static'],
  terrainElevation: { brass: 0.10 },
  supportsFloatingIslands: true,  // divine war machines might have floating fragments
});
```

**New fields:** `terrainMap` maps standard terrain types to biome-specific aliases (e.g., `plains: 'brass'`). Applied after `classifyTerrain` returns a standard type, before the tile is stored. `fieldModifiers` applies local environment changes (elevation offset, moisture multiplier, temperature offset) within the epicenter region before terrain classification — so the supernatural biome's terrain reflects its local environment, not just the global climate.
```

**Climate space coverage:** The `BIOME_PRIORITY_ORDER` list, combined with the catch-all `biome_default`, ensures full natural-biome coverage. Cold+dry tiles (t < 0.20, m < 0.22) currently fall through to `biome_default` — a known gap explicitly visible because no biome claims that range. A tundra biome can be added later in Phase G.

Supernatural biomes (Brass Grave, Unfinished Lands, etc.) are placed by the jittered-grid epicenter pass and override the climate-derived biome on affected hexes. They cover a percentage of the map determined by `EPICENTER_GRID.cellSize` and per-biome `epicenter.radius`.

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

  // Pass 1b: Supernatural biome override (jittered-grid epicenter pass)
  // Runs after natural biome selection — overwrites biomeId and reclassifies
  // terrain with fieldModifiers and terrainMap for hexes within epicenter regions.
  if (!biomeDef) {
    // applySupernaturalOverrides handles fieldModifiers and terrainMap internally
    applySupernaturalOverrides(tileMap, fieldMap, seed, EPICENTER_GRID, radius);
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

- Multi-biome maps where natural biome boundaries are continuous and follow climate: lush near wet+warm regions, arid near hot+dry regions, default elsewhere.
- Supernatural biomes (Brass Grave, Unfinished Lands) appear as distinct event regions placed by epicenter noise, overriding the climate-derived biome.
- No more "forest in the desert" artifacts — terrain types respect their biome's `terrainRules` and the global `DEFAULT_TERRAIN_RULES`.
- Mountains stop at the tree line — no forests on peaks (unless biome overrides `treeLineMax`).
- Temperature varies with latitude (circular climate zones) and elevation (lapse rate).
- Mountain placement uses single-field FBM: popcorn/blobby mountains expected. Range structure (continent mask) comes in Phase B.
- Single-biome mode unchanged — all hexes use the selected biome, no climate-based selection, no epicenter override.
- Analysis tool shows the new fields (`temperature`, continuous `elevation`, `moisture`) and epicenter regions.
- Calibration values from Phase 0 produce the target terrain distributions.

---

## 7. Risks & Edge Cases

- **Single elevation field produces popcorn mountains.** Without the continent mask and slope discrimination (Phase B), mountain placement is noise-blob rather than range-based. This is expected and acceptable — Phase B fixes it.
- **Water still uses moisture gate.** In this phase, water requires both elevation < threshold AND moisture > threshold. The elevation-only water determination (oceans always water, lakes are moisture-gated) comes in Phase C. For now, "dry ocean basins" can still occur at low elevation + low moisture.
- **Cold+dry climate yields `biome_default`.** The explicit gap in `climateRange` coverage is a known limitation — tundra/snow biomes added in Phase G.
- **`fallbackT` removed.** The new border-ring approach eliminates the need for cross-chunk neighbor approximations. But in Phase A, the border ring infrastructure from Phase B isn't built yet. For this phase, cross-chunk lookups for mountain/water tagging can use `sampleBaseFields` directly — it's deterministic and works at any global coordinate.
- **Chunk boundary consistency.** Since `sampleBaseFields` is a pure function of `(seed, q, r)`, two chunks that sample the same global coordinate produce identical base fields. The jittered-grid epicenter pass is also a pure function — chunk-seam consistent from Phase A.
