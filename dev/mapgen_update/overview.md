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

4. **Deterministic and chunk-seamless on finite maps.** Every sample is a pure function of `(seed, q, r)`. Chunks are generated first with deterministic local fields, then global passes (rivers, water-type BFS, epicenter placement) run across the assembled full map. The key invariant: a hex generated as a core tile of chunk A produces identical values when the same hex is generated as a ring tile of chunk B.

5. **Archetypes remain the extension point.** New natural biomes are data: add a `climateRange`, `terrainRules` override, feature list, and palette, then insert into `BIOME_PRIORITY_ORDER`. New supernatural biomes are also data: define the archetype with `origin: 'supernatural'` and no `climateRange`, then register it with the epicenter pass. No pipeline code changes for either — `selectBiome()` iterates registered archetypes and checks `climateRange`; the epicenter pass reads `origin`. Climate thresholds live in archetype data, not in classifier code.

6. **Phased delivery.** Each implementation phase produces a working, playable game. No phase leaves terrain generation broken.

7. **Thresholds are derived from measured distributions.** Absolute constants are calibrated against actual noise output histograms. Adding or changing a noise layer triggers re-calibration. Phase 0 establishes this infrastructure before any threshold-dependent work begins.

8. **Supernatural biomes are placed by event, not climate.** Biomes like Brass Grave and Unfinished Lands represent divine-war events — crash sites, reality tears, god-death zones — not climate zones. They are placed by a separate epicenter-noise pass that ignores elevation, moisture, and temperature. Natural biomes use climate-driven `selectBiome()`; supernatural biomes use epicenter placement and override whatever the climate would have produced. Each biome archetype declares `origin: 'natural'` or `origin: 'supernatural'`.

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
  │  elevation      =   continentMask × (elevationBase + detail + ridgeNoise)  │
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
  │  Natural biomes only — supernatural biomes are  │
  │  not placed by climate.                         │
  └─────────────────────────────────────────────────┘
                         │
  ┌─────────────────────────────────────────────────┐
  │  PASS 4b: Supernatural Placement (jittered grid) │
  │                                                 │
  │  Grid cells → deterministic epicenter seed pts  │
  │  Noise-modulated radial falloff → region shape  │
  │  fieldModifiers applied, terrainMap applied     │
  │  Overwrites biomeId + reclassifies terrain      │
  │  Pure function of (seed, q, r) — chunk-local    │
  │  (Supernatural biomes have no climateRange —    │
  │   they are placed by event, not climate.)       │
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
- **Supernatural biome overlay (Pass 4b):** After `selectBiome` assigns natural biomes from climate, a jittered-grid epicenter pass places supernatural biomes (Brass Grave, Unfinished Lands, etc.) that override the climate-derived assignment. Epicenter seeds are placed deterministically in a coarse grid with per-cell jitter; regions grow via noise-modulated radial falloff. This is a pure function of `(seed, q, r)` — chunk-local, no global BFS required. Field modifiers and terrain maps are applied within epicenter regions so supernatural biomes alter the local environment, not just the palette. Each biome archetype declares `origin: 'natural'` or `origin: 'supernatural'`. Supernatural biomes have no `climateRange` — they are placed by event locations, not by climate matching.
- **Multiplicative continent formula:** Elevation is `continent × (detail + ridges)` rather than an additive blend. When continent=0, elevation=0 (ocean). The additive form in the original §5 code would allow mountains in the middle of oceans.

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
  feature,                          // { kind, density } | null  (density in [0,1], required when feature exists)
  debris,                           // { kind } | null
}
```

**Notes:**
- `elevation`, `moisture`, and `temperature` are quantile-normalized via CDF lookup tables (built in Phase 0). All continuous fields are uniform on [0, 1] — thresholds are true percentiles that survive distribution changes when noise layers are added or modified.
- `rawLayers` stores the unblended noise components *before* quantile normalization, for debugging and recalibration.
- `waterType` is a structural tag, not a terrain type. The terrain type for water tiles is `'water'`. `waterType: 'ocean'` means the water body connects to the map boundary; `waterType: 'lake'` means it's enclosed.
- `isRiver` is a boolean tag overlaid on existing terrain. River tiles keep their base terrain type; rendering layers the river mesh on top.

---

## 5. Shared Deterministic Sampler

A single function `sampleBaseFields(seed, q, r, noiseConfig, radius)` computes raw Pass 1 fields for any global coordinate. Both normal chunk generation and cross-chunk neighbor lookups call this same function — no `fallbackT` approximation with a single biome. Values are **raw FBM output** — quantile normalization to [0, 1] percentile space is applied as a separate step after all tiles are sampled (using CDF lookup tables calibrated in Phase 0).

```js
export function sampleBaseFields(baseSeed, q, r, noiseConfig, radius) {
  const NC = noiseConfig;

  // Elevation (multiplicative composite — continent=0 forces ocean)
  const continent = hexFbm2D(q, r, baseSeed + NC.SEED_CONTINENT, NC.CONTINENT);
  const detail    = hexFbm2D(q, r, baseSeed + NC.SEED_DETAIL,    NC.ELEVATION_DETAIL);
  const ridges    = hexFbm2D(q, r, baseSeed + NC.SEED_RIDGE,     NC.RIDGE);
  const rawElev   = continent * (detail * 0.50 + ridges * 0.50);

  // Moisture (base, before water adjustment)
  const baseMoisture = hexFbm2D(q, r, baseSeed + NC.SEED_MOISTURE, NC.MOISTURE);

  // Temperature from latitude + lapse rate + local variation
  // Uses world-space Y for proper latitude bands (not hexDistance, which produces hexagonal iso-contours)
  const { y } = hexToWorld(q, r);
  const worldRadiusY = radius * 1.73;  // hex row spacing ≈ √3; calibrate exact value in Phase 0
  const latitudeTerm  = 1.0 - (Math.abs(y) / worldRadiusY);
  const tempVariation = hexFbm2D(q, r, baseSeed + NC.SEED_TEMP, NC.TEMP_VARIATION);
  const temperature   = clamp01(
    0.5 + 0.35 * (latitudeTerm - 0.5) + 0.10 * (tempVariation - 0.5) - 0.30 * (elevation - RULES.waterMaxElevation)
  );

  // Region bias — two independent fields
  const regionBiasM = hexFbm2D(q, r, baseSeed + NC.SEED_REGION_M, NC.REGION);
  const regionBiasT = hexFbm2D(q, r, baseSeed + NC.SEED_REGION_T, NC.REGION);

  return {
    elevation:     clamp01(rawElev),
    rawLayers:     { continent, detail, ridges },
    baseMoisture,
    temperature,
    regionBiasM,
    regionBiasT,
  };
}
```

**Quantile normalization** is applied after sampling: each continuous field (`elevation`, `moisture`, `temperature`) is mapped through a CDF lookup table built from an ensemble of seeds during Phase 0 calibration. The LUT maps raw FBM values → uniform [0, 1] percentiles. All thresholds in `DEFAULT_TERRAIN_RULES` and `climateRange` are expressed as percentiles and survive distribution changes when noise layers are added (Phases B, F). Per-seed variety comes from explicit offset rolls (e.g. `seaLevelOffset`) applied to raw values *before* the LUT.

**Per-phase weight normalization:** In phases where ridge noise hasn't been implemented yet, the elevation composite is normalized so the [0, 1] range remains reachable. With the multiplicative model `continent × (detail × wD + ridges × wR)`, weights are adjusted per phase: Phase A has only detail (wD = 1.0, wR = 0), Phase B keeps detail at 0.50 (ridge placeholder returns 0), and Phase F sets detail + ridge weights to sum to 1.0 for the full ridged-FBM composite. Each phase doc specifies its exact normalization. These per-phase adjustments apply to raw FBM values — the quantile LUT handles the rest.

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
// All frequencies are TARGET VALUES pending Phase 0 verification of the
// hexToWorld rescaling relationship. Exact values set during calibration.
export const NOISE_CONTINENT = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.0008  // TBD: recalibrate
};
export const NOISE_ELEVATION_DETAIL = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.020   // TBD: recalibrate, target ~10-hex scale
};
export const NOISE_RIDGE = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.008   // TBD: recalibrate, target ~25-hex scale
};

// ── Climate fields ────────────────────────────────────────────
export const NOISE_MOISTURE = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.006    // TBD: recalibrate
};
export const NOISE_TEMP_VARIATION = {
  octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.08     // TBD: recalibrate
};
export const NOISE_REGION = {
  octaves: 2, lacunarity: 2.0, gain: 0.5, frequency: 0.0015   // TBD: recalibrate
};

// ── Epicenter grid (supernatural biome placement) ──────────────────
// Epicenter seeds are placed on a jittered grid — NOT FBM thresholded.
// Grid cell size determines seed density. Each cell gets one seed at a
// deterministically jittered position. Regions grow via noise-modulated
// radial falloff from seeds — a pure function of (seed, q, r).
export const EPICENTER_GRID = {
  cellSize:          45,     // hex units between grid cell centres (tuned in Phase G)
  jitterAmplitude:   0.40,   // fraction of cell size for position jitter
};

// ── Feature channels ──────────────────────────────────────────
export const NOISE_FEATURES = {
  octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.3
};
export const NOISE_DEBRIS = {
  octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.5
};

// ── Seed offsets (hash-derived, ensure independent fields from same base seed) ──
// Derived via hash32(baseSeed ^ TAG) for each channel. Phase 0 verifies independence.
export const SEED_CONTINENT   = 0x4E9D3A7F;
export const SEED_DETAIL      = 0x7B2C1E8D;
export const SEED_RIDGE       = 0x3F5A9B2C;
export const SEED_MOISTURE    = 0x8C6E4F1A;
export const SEED_TEMP        = 0x2D7B8E3F;
export const SEED_REGION_M    = 0x5A1C9D6E;
export const SEED_REGION_T    = 0x9F3E7B4A;
export const SEED_FEATURES    = 0x1E4A7C9D;
export const SEED_DEBRIS      = 0xD8F3A5B1;
export const SEED_DEBRIS_KIND = 0x4C7E2F9A;

// ── Terrain rules (all thresholds are percentiles; calibrated via quantile LUT in Phase 0) ──
export const DEFAULT_TERRAIN_RULES = {
  waterMaxElevation:        0.12,  // 12th percentile → ~12% water coverage
  waterMinMoisture:         0.50,  // 50th percentile moisture — secondary gate for inland lakes
  floatingIslandThreshold:  0.995, // 99.5th percentile → ~0.5% floating islands
  peakThreshold:            0.97,  // 97th percentile elevation
  mountainThreshold:        0.90,  // 90th percentile elevation
  plateauSlopeMin:          0.08,  // below this slope → plateau, above → mountain
  hillElevationMin:         0.55,  // 55th percentile elevation
  hillSlopeMin:             0.10,
  treeLineMax:              0.85,  // no forests above 85th percentile elevation
  denseForestMinMoisture:   0.85,
  forestMinMoisture:        0.72,
  desertMaxMoisture:        0.20,
  marshMinMoisture:         0.58,
  marshMaxElevation:        0.35,
  snowLineMax:              0.15,  // below this temp percentile at peak → snow-capped
  freezeTempMax:            0.10,  // below this temp percentile at water → ice
};

// ── River config ──────────────────────────────────────────────
export const RIVER_SOURCE_MIN_ELEV    = 0.75;  // percentile-calibrated
export const RIVER_SOURCE_MIN_MOIST   = 0.55;
export const RIVER_MAX_LENGTH         = 200;
export const RIVER_MOISTURE_BOOST     = 0.10;
export const RIVER_BOOST_RADIUS       = 1;
export const RIVER_SOURCE_FRACTION    = 0.0001; // sources per tile; total river coverage ≈ fraction × average river length

// ── Additional tunable constants (documented for calibration) ─────
// These are currently hardcoded in the pipeline and should be promoted to
// worldParams when their calibration stabilizes:
//
// Near-water moisture boost (Phase C):
//   waterNeighbors × NEAR_WATER_BOOST_PER_NEIGHBOR (currently 0.03, radius 2)
// Region-bias strength (Phase A):
//   (regionBias - 0.5) × REGION_BIAS_STRENGTH (currently hardcoded 0.10 in selectBiome)
// Elevation composite weights (Phase A / B / F):
//   detail × wD + ridges × wR, currently wD = 0.50, wR = 0.50 (multiplicative with continent)
// Temperature formula weights (Phase A):
//   latitude 0.35, variation 0.10, elevation 0.30 (convex combination around 0.5)
```

**Frequency note:** Ridge and detail frequencies (0.008 vs 0.020) are now well-separated (~2.5×) to avoid moiré interference. The original had them at 0.012 and 0.015 — only 20% apart, producing "muddier" noise rather than distinct mountain chains and rolling hills.

---

## 7. Classification System

### 7.1 Biome Selection (dual-origin: climate + epicenter)

Biomes are assigned in two passes, with natural and supernatural entries kept in separate lists.

**Pass 4 — Natural (climate-driven):** `selectBiome()` iterates `BIOME_PRIORITY_ORDER` and checks each archetype's `climateRange`. `BIOME_PRIORITY_ORDER` contains only natural biomes (including `biome_default` as the catch-all). Supernatural biomes live in a separate list (`SUPERNATURAL_BIOMES`) consumed by `applySupernaturalOverrides()`. Adding a natural biome requires: define `climateRange`, add to `BIOME_PRIORITY_ORDER`. No pipeline code changes.

**Pass 4b — Supernatural (jittered-grid epicenter placement):** Epicenter seeds are placed deterministically on a coarse grid with per-cell jitter. Each seed is assigned to a supernatural biome by a hash. Regions grow from seeds via noise-modulated radial falloff — a pure function of `(seed, q, r)`, fully chunk-local. Field modifiers and terrain maps are applied within the region.

```js
/**
 * Place supernatural biomes via jittered-grid epicenter seeds.
 * Each grid cell gets one seed at a deterministically jittered position.
 * Region growth is noise-modulated radial falloff from seeds.
 * Pure function of (seed, q, r) — no global BFS, no thresholded FBM.
 */
function applySupernaturalOverrides(tiles, fieldMap, baseSeed, gridConfig, mapRadius) {
  // 1. Place epicenter seeds on a jittered grid
  const seeds = [];
  const gridRange = Math.ceil(mapRadius / gridConfig.cellSize) + 1;

  for (let gridR = -gridRange; gridR <= gridRange; gridR++) {
    for (let gridQ = -gridRange; gridQ <= gridRange; gridQ++) {
      // Deterministic jitter within cell
      const jitter = seededJitter(baseSeed, gridQ, gridR, gridConfig.cellSize,
                                   gridConfig.jitterAmplitude);
      const seedQ = Math.round(gridQ * gridConfig.cellSize + jitter.q);
      const seedR = Math.round(gridR * gridConfig.cellSize + jitter.r);

      // Seed within map bounds?
      if (hexDistance(seedQ, seedR, 0, 0) > mapRadius) continue;

      // Deterministic biome assignment from cell position
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

      // Noise-modulated radius for organic, irregular region boundaries
      const radiusNoise = hexFbm2D(tile.q, tile.r,
        baseSeed + hashSeedOffset(seed.biomeId, 'epicenterRadius'),
        { frequency: ep.noiseScale, octaves: 2, gain: 0.5, lacunarity: 2.0 }
      );
      const effectiveRadius = ep.radius * (1.0 + (radiusNoise - 0.5) * 2 * ep.radiusNoise);

      if (dist < effectiveRadius) {
        // Apply fieldModifiers before terrain reclassification
        const mods = seed.biomeDef.fieldModifiers || {};
        const modElev = clamp01((tile.elevation + (mods.elevationOffset || 0))
                                * (mods.elevationMultiplier ?? 1));
        const modMoist = clamp01(tile.moisture
                                 * (mods.moistureMultiplier ?? 1));
        const modTemp  = clamp01(tile.temperature + (mods.temperatureOffset || 0));

        tile.biomeId = seed.biomeId;

        // Reclassify terrain with modified fields + supernatural terrainRules
        tile.terrain = classifyTerrain(modElev, modMoist, modTemp, 0, seed.biomeDef);

        // Apply terrainMap to translate standard types → biome-specific names
        const mapped = seed.biomeDef.terrainMap?.[tile.terrain];
        if (mapped) tile.terrain = mapped;

        break;  // first matching supernatural biome wins
      }
    }
  }
}

/**
 * Deterministic 2D jitter within a grid cell.
 * Returns { q, r } offset in [-amplitude*cellSize/2, +amplitude*cellSize/2].
 */
function seededJitter(baseSeed, cellQ, cellR, cellSize, amplitude) {
  const hashQ = hash32(baseSeed ^ 0x4A1E_BEAD ^ (cellQ * 0x9E37_79B9) ^ (cellR * 0x7F4A_7C2D));
  const hashR = hash32(baseSeed ^ 0x3C8D_6E2F ^ (cellQ * 0x2B1F_5A8D) ^ (cellR * 0x6E3D_1F9C));
  const range = cellSize * amplitude;
  return {
    q: ((hashQ / 0xFFFFFFFF) - 0.5) * range,
    r: ((hashR / 0xFFFFFFFF) - 0.5) * range,
  };
}

/**
 * Deterministic biome index from cell grid coordinates.
 * Each cell gets one supernatural biome, evenly distributed across the map.
 */
function hashBiomeIndex(baseSeed, cellQ, cellR, count) {
  const hash = hash32(baseSeed ^ 0x9D6E_1F3A ^ (cellQ * 0x4B8D_7C2E) ^ (cellR * 0x3F2A_5E1C));
  return Math.abs(hash) % count;
}
```

**Epicenter config (per-biome, on the archetype):**

```js
epicenter: {
  radius:       12,    // base region radius in hexes
  radiusNoise:  0.30,  // how much FBM noise modulates the radius (0-1)
  noiseScale:   0.04,  // frequency of the radius-modulation noise
},
```

**Key properties:**
- Exact event-count control: count ≈ `(mapArea in hexes) / (cellSize²)` × `(biomeWeight / totalWeight)`. A 45-hex cell size on a radius-21 map (~1400 hexes, ~7 grid rows) produces ~50 potential seed positions; per-biome weights and radii determine actual coverage.
- **Each supernatural biome gets independent radius-modulation noise** via a per-biome seed offset — no concentric rings (each type has its own seed points with independent falloff).
- Chunk-local: to determine if tile `(q, r)` is in an epicenter, only cells within `maxEpicenterRadius / cellSize + 1` grid cells need to be checked.
- Field modifiers and terrain maps are applied within the region — supernatural biomes alter the local environment, producing unique terrain and not just a palette swap.
- Adding a supernatural biome requires: define archetype with `origin: 'supernatural'`, add to `SUPERNATURAL_BIOMES`, set `epicenter` params. No pipeline code changes.

```js
// Startup assertion (runs once after archetype registration)
function validateBiomeLists() {
  const allBiomes = getAllArchetypes().filter(d => d.type === 'biome');
  const natural = allBiomes.filter(d => d.origin === 'natural');
  const supernatural = allBiomes.filter(d => d.origin === 'supernatural');

  // Every natural biome must appear in BIOME_PRIORITY_ORDER exactly once
  for (const def of natural) {
    const count = BIOME_PRIORITY_ORDER.filter(id => id === def.id).length;
    if (count !== 1) {
      throw new Error(
        `Natural biome '${def.id}' appears ${count} times in BIOME_PRIORITY_ORDER (expected 1)`
      );
    }
  }
  for (const id of BIOME_PRIORITY_ORDER) {
    const def = getArchetype(id);
    if (!def || def.origin !== 'natural') {
      throw new Error(`BIOME_PRIORITY_ORDER entry '${id}' is not a natural biome`);
    }
  }
  for (const id of SUPERNATURAL_BIOMES) {
    const def = getArchetype(id);
    if (!def || def.origin !== 'supernatural') {
      throw new Error(`SUPERNATURAL_BIOMES entry '${id}' is not a supernatural biome`);
    }
  }
}

function selectBiome(elevation, moisture, temperature, regionBiasM, regionBiasT) {
  const m = clamp01(moisture   + (regionBiasM - 0.5) * 0.10);
  const t = clamp01(temperature + (regionBiasT - 0.5) * 0.10);

  // Natural biomes only — iterated in specificity order
  for (const biomeId of BIOME_PRIORITY_ORDER) {
    const def = getArchetype(biomeId);
    const R = def.climateRange;

    if (checkRange(elevation, R.minElevation, R.maxElevation) &&
        checkRange(m,         R.minMoisture,  R.maxMoisture)  &&
        checkRange(t,         R.minTemperature, R.maxTemperature)) {
      return biomeId;
    }
  }

  return 'biome_default';  // catch-all, always last in BIOME_PRIORITY_ORDER
}
```

**Climate space coverage:** The natural biome priority list must cover the full climate cube `[elevation: 0..1, moisture: 0..1, temperature: 0..1]`. `biome_default` is the catch-all (checks last, always matches). Gaps in explicit coverage fall through to default — visible to the designer.

**Biome priority order** is determined by specificity: more restrictive biomes (tundra, arid) are checked before broad ones. `BIOME_PRIORITY_ORDER` contains only natural biomes; `SUPERNATURAL_BIOMES` is a separate list for the epicenter pass.

```js
function checkRange(value, min, max) {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}
```

### 7.2 Terrain Classification

Multi-axis rules considering elevation, moisture, temperature, slope, and biome-specific `terrainRules` overrides.

```js
function classifyTerrain(elevation, moisture, temperature, slope, biomeDef) {
  const R = { ...DEFAULT_TERRAIN_RULES, ...biomeDef?.terrainRules };

  // Water: elevation-driven (primary), moisture as secondary inland-lake gate
  if (elevation < R.waterMaxElevation) {
    // Frozen water: cold enough to ice over
    if (temperature < R.freezeTempMax) return 'ice';
    if (moisture > R.waterMinMoisture) return 'water';
    // Low elevation + low moisture = salt flat / dry basin
    // Falls through to terrain classification below.
  }

  // Snow-capped peaks: high elevation + cold temperature
  if (elevation > R.peakThreshold && temperature < R.snowLineMax) return 'peak';

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
- Temperature gates: cold water tiles become `'ice'`; cold peaks become snow-capped `'peak'`.
- Slope distinguishes mountain (steep) from plateau (flat highland) and identifies hill terrain.
- Tree line prevents forests on mountain peaks.
- Marsh's effective band is `[waterMaxElevation, marshMaxElevation]` — tiles below `waterMaxElevation` with sufficient moisture are water, not marsh.

### 7.3 Biome Archetype Format

**Natural biome example:**

```js
defineArchetype('biome_lush', {
  type: 'biome',
  id: 'biome_lush',
  name: 'Lush Woodland',
  origin: 'natural',  // placed by selectBiome() from climate

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

  // Maps standard terrain types to biome-specific aliases.
  // Applied after classifyTerrain returns a standard type.
  terrainMap: {
    // e.g. plains: 'lushMeadow', mountain: 'verdantPeak'
  },

  features: [ /* spawn rules */ ],
  palette: { /* terrain color overrides */ },
  terrainTags: [ /* supported terrain types */ ],
  weatherAffinity: ['rainy', 'temperate'],
  terrainElevation: { /* per-terrain Y offsets */ },
  supportsFloatingIslands: false,
});
```

**Supernatural biome example:**

```js
defineArchetype('biome_brass_grave', {
  type: 'biome',
  id: 'biome_brass_grave',
  name: 'Brass Grave',
  origin: 'supernatural',  // placed by jittered-grid epicenter, never by climate

  // No climateRange — supernatural biomes are placed by event, not climate.
  // selectBiome() never sees this biome (it's in SUPERNATURAL_BIOMES, not BIOME_PRIORITY_ORDER).

  // Epicenter placement on jittered grid (deterministic, chunk-local)
  epicenter: {
    radius:       12,    // base region radius in hexes
    radiusNoise:  0.30,  // how much FBM noise modulates the radius (0-1) — organic boundaries
    noiseScale:   0.04,  // frequency of the radius-modulation noise
  },

  terrainRules: {
    // Override to produce brass terrain instead of plains at moderate elevation
    mountainThreshold: 0.85,
    forestMinMoisture: 0.90,   // nearly no natural forest
    desertMaxMoisture: 0.50,   // much of the biome is dry/barren
    waterMaxElevation: 0.05,
  },

  // Maps standard terrain types to biome-specific aliases (applied after classifyTerrain)
  terrainMap: {
    plains: 'brass',
    mountain: 'brassPeak',
    hill: 'brassKnoll',
    // ... other terrain aliases
  },

  // Field modifiers applied before terrain classification within the epicenter region.
  // Supernatural biomes aren't just palette swaps — they alter the local environment.
  fieldModifiers: {
    elevationOffset: -0.05,    // crater depression
    moistureMultiplier: 0.7,   // drier
    temperatureOffset: +0.05,  // warmer (brass heats up)
  },

  features: [
    { kind: 'divineWire', threshold: 0.95, compare: 'gt' },
    { kind: 'brassShard', threshold: 0.80, compare: 'gt' },
    // ... other unique features
  ],
  palette: { brass: { fill: '#b5a06a', ink: '#d4c898' } },   // brass tones
  terrainTags: ['brass'],
  weatherAffinity: ['arid', 'static'],
  terrainElevation: { brass: 0.10 },
  supportsFloatingIslands: true,  // divine war machines might have floating fragments
});
```

**Changes from current archetype format:**
- `terrainThresholds` → `terrainRules`: an object that overrides specific entries in `DEFAULT_TERRAIN_RULES`. Shallow merge — unspecified rules inherit defaults.
- `moistureBias` is **removed**. The biome is chosen based on climate; it no longer modifies the moisture field. Climate already determined this is a lush region.
- New: `climateRange` — the climate envelope where this biome naturally appears. Used by data-driven `selectBiome()`. Omitted for supernatural biomes (placed by epicenter, not climate).
- New: `origin` — `'natural'` (climate-placed via `selectBiome`) or `'supernatural'` (event-placed via jittered-grid epicenter pass). Determines which placement system handles the biome.
- New (supernatural only): `epicenter` — `{ radius, radiusNoise, noiseScale }` for jittered-grid region growth. Each supernatural biome gets independent noise seeds for its radius modulation (no concentric rings).
- New: `terrainMap` — maps standard terrain types to biome-specific aliases (e.g. `plains: 'brass'`). Applied after `classifyTerrain` returns a standard type.
- New: `fieldModifiers` — optional hook for supernatural biomes to alter local physical fields (elevation, moisture, temperature) before terrain classification within the epicenter region. Supernatural floating islands come from `fieldModifiers.elevationOffset` bumping elevation locally within epicenter regions, rather than relying on global noise peaks.

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
| `ice` | no | **new** | Frozen water — water tiles where temperature < freezeTempMax |

`hill` and `plateau` are classification outputs (Phase B). `isRiver` is a boolean tag overlaid on existing terrain (Phase D). `beach` and additional terrain types (`scrubland`, `tundra`, `taiga`) are deferred to Phase G.

---

## 12. Phase Dependency Graph

```
Phase 0: Calibration Infrastructure + Quantile Normalization
    │
    ▼
Phase A: Climate-Driven Classification + Jittered-Grid Epicenter
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

Phase A includes both climate-driven biome classification and the full jittered-grid epicenter system for supernatural biomes (grid placement, noise-modulated radial falloff, fieldModifiers, terrainMap). No placeholder — the epicenter system works correctly from Phase A onward; Phase G only tunes parameters. Phases C and F are independent — ridged noise can be implemented before or after water-adjusted moisture. Phase D depends on C (rivers need water bodies to terminate at). All phases after A depend on the calibration values and quantile LUTs from Phase 0.

---

## 13. Known Limitations & Deferred Items

| Item | Status | Tracking |
|------|--------|----------|
| Hard biome boundaries (no ecotones) | Deferred to Phase G | smoothstep blending over 2-3 hex transition zone |
| Rain shadow | Deferred to Phase G | Requires wind direction + cross-wind elevation sampling |
| Beach terrain type | Deferred to Phase G | Second classification pass near water edges |
| Tundra/taiga/scrubland biomes | Deferred to Phase G | Additional climate range entries |
| Domain warping | Deferred to Phase G | Mitigates blob artifacts if present after tuning |
| Supernatural biome tuning (Brass Grave, etc.) | Deferred to Phase G | Epicenter radii, noise modulation, and per-biome coverage tuned with playtesting |
| River termination at local minima | Known limitation | Without sink filling, rivers that dead-end in basins produce dead-end rivers rather than lakes |
| Biome topological smoothing | Deferred to Phase G | Lightweight post-pass to reassign isolated single-hex biome outliers |
| Player terraforming / world modification | Out of scope | System assumes static deterministic world |
| TEMP_VARIATION frequency (0.08) may cause salt-and-pepper biome boundaries | Phase 0 verification | Reduce frequency to ~0.02 (50-hex scale) if speckle is visible; quantile normalization amplifies threshold noise at high frequencies |
| Quantile LUT regeneration after Phase B / Phase F | Operational | Re-run Phase 0 calibration → regenerate LUTs; thresholds remain stable |

---

## 14. File Summary

| File | Phase 0 | A | B | C | D | E | F | G |
|------|---------|---|---|---|---|---|---|---|
| `src/engine/rules/noise.js` | — | — | — | — | — | — | **add** | — |
| `src/params/game/worldParams.js` | **rewrite** | **rewrite** | edit | edit | edit | — | edit | edit |
| `src/game/rules/terrainGenerator.js` | — | **rewrite** | **rewrite** | edit | edit | edit | edit | edit |
| `src/game/rules/terrainTypes.js` | — | edit | edit | — | edit | — | — | edit |
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
