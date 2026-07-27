# Phase G: Tuning & Polish

**Depends on:** All prior phases (A through F)  
**Deliverable:** Playtested, well-tuned terrain generation across all target map sizes. Deferred items are tracked with explicit acceptance criteria for future work.

---

## 1. Objective

Tune noise parameters, terrain thresholds, and feature densities based on playtesting. Address known limitations deferred from earlier phases. Polish the player experience: no dead terrain types, natural biome transitions (within the limits of hard thresholds), and map-size-appropriate detail.

---

## 2. Scope

**In scope:**
- Tune frequencies and composite weights for radius 7, 21, and 50 maps
- Optional domain warping if blob/camouflage artifacts persist
- Add deferred terrain types: `beach`, and optionally `scrubland`, `tundra`, `taiga`
- Add deferred biomes to fill climate space gaps (cold+dry → tundra/snow)
- Biome topological smoothing (lightweight outlier reassignment)
- River source count and path length tuning
- Feature spawn rate tuning after density modulation changed effective probabilities
- Rain shadow algorithm (properly designed or permanently deferred)

**Out of scope:**
- Player terraforming / world modification
- Ecotone blending (smoothstep biome transitions) — tracked as future enhancement

---

## 3. Pre-requisites

- Phases A through F complete and stable.
- Playtesting feedback on map feel at multiple seed/radius combinations.
- Phase 0 calibration infrastructure available for re-deriving thresholds.

---

## 4. Tuning Targets

### 4.1 Frequency Tuning by Map Size

The current frequencies were chosen for radius-21 maps. Small maps (radius 7) and large maps (radius 50) need different effective scales.

| Noise Field | radius 7 | radius 21 | radius 50 | Notes |
|-------------|----------|-----------|-----------|-------|
| `ELEVATION_DETAIL` | 0.030 | 0.020 | 0.012 | Detail scale should feel local (~10 hexes) regardless of map size |
| `RIDGE` | 0.015 | 0.008 | 0.005 | Mountain chains ~25-hex scale |
| `MOISTURE` | 0.010 | 0.006 | 0.004 | Climate bands visible at all scales |
| `REGION` | 0.004 | 0.0015 | 0.0008 | 3-5 biome regions per map |

**Implementation:** Either make frequencies map-size-dependent (scale by `1/radius`), or pick a single set that works adequately at all target sizes. The analysis tool's multi-radius calibration (Phase 0) informs this decision.

### 4.2 Composite Weight Tuning

```js
elevation = clamp01(
  worldShape(dist, radius) * (detail * W_D + ridges * W_R)
)
```

Current weights: `W_D=0.50, W_R=0.50` (equal blend). Tuning adjusts:
- **Too much detail weight** → uniform noise, mountains everywhere.
- **Too much ridge weight** → everything is sharp ridges, no rolling terrain.

Target: ~30-40% of landmass has some elevation variation (hills or higher), ~5-10% is mountain or peak. World shape function parameters tuned separately — center peak steepness, rim width, etc.

### 4.3 Threshold Tuning

Run the full pipeline across 20 seeds at radius 21, classify all tiles, compute terrain type percentages. Adjust `DEFAULT_TERRAIN_RULES` thresholds to hit the target distribution budgets from Phase 0. Iterate until snapshot tests pass at all three radii.

### 4.4 Feature Density Tuning

After Phase E's density modulation changed effective spawn rates:
- Run feature spawn statistics across 10 seeds.
- Adjust each biome's `features[].threshold` values so tree/bush/knot densities match the intended feel.
- Verify fruit trees don't appear in deserts (climate check) or above tree line.

---

## 5. Deferred Items — Now Addressed

### 5.1 Beach Terrain Type

Land tiles adjacent to water get reclassified as `beach`:

```js
// In classifyTerrain, after water check, before other terrain:
if (isAdjacentToWater(q, r, tileLookup)) {
  return 'beach';
}
```

Add `beach` to `TERRAIN`:
```js
beach: {
  fill:'#e8d8a0', ink:'#f5ecd0', label:'Beach',
  passable:true, movementCost:1, mark:'∿'
}
```

Beach is a narrow (1-hex) transition band that softens the hard water/land boundary. It's passable and feature-sparse.

### 5.2 Additional Biomes (if needed)

**Tundra (cold + wet):**
```js
defineArchetype('biome_tundra', {
  // ...
  climateRange: {
    maxTemperature: 0.20,
    minMoisture: 0.60,
  },
  terrainRules: {
    treeLineMax: 0.30,    // very low tree line
    mountainThreshold: 0.85,
  },
  // palette: cold blues and whites
  // features: sparse, no fruit trees
});
```

**Cold steppe (cold + dry):**
```js
defineArchetype('biome_cold_steppe', {
  climateRange: {
    maxTemperature: 0.20,
    maxMoisture: 0.22,
  },
  // ...
});
```

These fill the climate space gap identified in both reviews (cold+dry → `biome_default` currently). Add to `BIOME_PRIORITY_ORDER` before `biome_default`.

### 5.2b Supernatural Biome Tuning (epicenter pass)

The jittered-grid epicenter system is implemented in Phase A. Phase G tunes its parameters:

- Grid cell size (`EPICENTER_GRID.cellSize`): controls epicenter seed density. Smaller cells → more event regions; larger cells → fewer. Target: 1-3 active epicenter regions per supernatural biome on radius-21 maps.
- Per-biome `epicenter.radius`: base region size in hexes. Larger radius → more map coverage. Target: 5-15% of map area per supernatural biome.
- Per-biome `epicenter.radiusNoise`: boundary irregularity. Higher values → more organic/jagged region edges. Target: visible irregularity without scattered outlier hexes.
- Per-biome `epicenter.noiseScale`: frequency of radius-modulation noise. Lower = smoother boundaries, higher = more frequent undulations.
- Per-biome `fieldModifiers`: elevationOffset, moistureMultiplier, temperatureOffset tuned for compelling environmental alteration. Verify that floating islands appear naturally via elevationOffset within epicenter regions.

**Per-biome tuning targets:**
- Epicenter coverage: 3-10% of map area per supernatural biome (across ensemble)
- Region shape: organic (noise-modulated), not hexagonal (grid-aligned) or circular
- Distribution: snapshot test verifies supernatural coverage in target range
- Floating islands: `fieldModifiers.elevationOffset` pushes some tiles above `floatingIslandThreshold` — tune the offset so ~1-3% of epicenter tiles become floating islands

**Tuning process:**
1. Run epicenter generation across 10 seeds at radius 21
2. Verify 1-3 active regions per supernatural biome
3. Adjust `EPICENTER_GRID.cellSize` until seed count target is hit
4. Tune per-biome `epicenter.radius` for target coverage percentage
5. Tune per-biome `epicenter.radiusNoise` and `noiseScale` for organic boundary feel
6. Tune per-biome `fieldModifiers` — verify floating island production and environmental alteration
7. Snapshot test supernatural biome coverage percentage

### 5.3 Domain Warping (if needed)

If blob/camouflage artifacts persist after tuning, apply domain warping to the elevation coordinates:

```js
// Warp input coordinates by a low-amplitude noise field
const warpX = fbm2D(q * 0.02, r * 0.02, warpSeed) * WARP_AMPLITUDE;
const warpY = fbm2D(q * 0.02 + 100, r * 0.02 + 100, warpSeed) * WARP_AMPLITUDE;
const { x, y } = hexToWorld(q + warpX, r + warpY);
// Use (x, y) instead of raw hex coords for the main elevation FBM
```

Domain warping breaks up the grid-aligned simplex artifacts without changing the noise algorithm. `WARP_AMPLITUDE` of 0.5-1.5 hex units is typical.

### 5.4 Biome Topological Smoothing

A lightweight post-pass that removes isolated single-hex biome outliers:

```js
function smoothBiomes(tiles, fieldMap) {
  for (const tile of Object.values(tiles)) {
    const neighbors = hexNeighbors(tile.q, tile.r);
    const neighborBiomes = neighbors
      .map(n => fieldMap.get(coordKey(n))?.biomeId)
      .filter(Boolean);

    // If this tile's biome differs from ALL 6 neighbors, and it's not
    // explained by a sharp elevation cliff, reassign to majority neighbor
    const sameCount = neighborBiomes.filter(b => b === tile.biomeId).length;
    if (sameCount === 0) {
      // Check for elevation cliff (abrupt change justifies biome change)
      const elevDiff = neighbors.map(n => {
        const nf = fieldMap.get(coordKey(n));
        return nf ? Math.abs(nf.elevation - tile.elevation) : 0;
      });
      const maxDiff = Math.max(...elevDiff);

      if (maxDiff < 0.15) {  // no cliff → noise artifact, smooth it
        const majority = mode(neighborBiomes);
        tile.biomeId = majority;
        // Re-resolve biome def and reclassify terrain
      }
    }
  }
}
```

This is optional — only apply if playtesting shows visible single-hex biome speckles. The threshold (elevation cliff detection) prevents genuine biome transitions at mountain edges from being smoothed away.

### 5.5 Rain Shadow

If implementing in this phase (rather than deferring permanently):

```js
/**
 * Rain shadow effect: tiles downwind of mountain ranges are drier.
 * Wind blows along the +q axis. A tile is in rain shadow if
 * the average elevation of upwind neighbors is significantly higher.
 */
function computeRainShadow(q, r, elevationAt) {
  const WIND_DIRECTION = { q: -1, r: 0 };  // wind blows +q, so check -q neighbors

  let upwindElevSum = 0;
  let upwindCount = 0;

  // Sample upwind tiles at distances 1, 2, 3
  for (let dist = 1; dist <= 3; dist++) {
    const uq = q + WIND_DIRECTION.q * dist;
    const ur = r + WIND_DIRECTION.r * dist;
    const elev = elevationAt(uq, ur);
    if (elev !== undefined) {
      upwindElevSum += elev;
      upwindCount++;
    }
  }

  if (upwindCount === 0) return 0;

  const upwindAvg = upwindElevSum / upwindCount;
  const localElev = elevationAt(q, r);
  const elevDiff = upwindAvg - localElev;

  if (elevDiff > 0.2) {
    return (elevDiff - 0.2) * 0.3;  // drying effect, clamped by moisture formula
  }
  return 0;
}
```

Apply in the moisture adjustment pass:
```js
moisture = clamp01(baseMoisture + coastalBoost - rainShadow);
```

---

## 6. Snapshot Test Hardening

Tighten the Phase 0 snapshot test ranges from their initial wide bounds:

```js
// Phase 0: wide ranges (regression catchers)
// Phase G: tightened ranges (precision checks)

const TARGETS = {
  water:    [0.08, 0.15],   // was [0.06, 0.20]
  mountain: [0.05, 0.10],   // was [0.03, 0.15]
  peak:     [0.01, 0.03],   // was [0.00, 0.05]
  hill:     [0.10, 0.18],
  plateau:  [0.03, 0.08],
  forest:   [0.15, 0.25],
  desert:   [0.08, 0.15],
  marsh:    [0.03, 0.08],
};
```

---

## 7. Known Limitations (Post-G)

These items remain deferred after Phase G:

| Item | Reason | Future phase |
|------|--------|-------------|
| Ecotone blending (smooth biome transitions) | Requires smoothstep at boundaries, nontrivial to implement without breaking deterministic classification | Post-G enhancement |
| Player terraforming | Requires modification overlay on deterministic base | TBD (not in current roadmap) |
| River tributaries and meandering | Complex; current simple trace is adequate for v1 | Post-G enhancement |
| Endorheic lake formation at river termini | Nice-to-have realism feature | Post-G enhancement |
| Supernatural biome gameplay mechanics | Terrain types, features, mobs, weather overrides — design-dependent, not gen-dependent | Design phase (not gen roadmap) |

---

## 8. Files Touched

| File | Change | Summary |
|------|--------|---------|
| `src/params/game/worldParams.js` | edit | Tuned frequencies, composite weights, thresholds; new terrain rule entries for beach |
| `src/game/rules/terrainGenerator.js` | edit | Beach classification, biome smoothing, rain shadow (optional), domain warping (optional) |
| `src/game/rules/terrainTypes.js` | edit | Add `beach` (and optionally `tundra`, `scrubland`) |
| `src/game/rules/archetypeData/biomes.js` | edit | New biome definitions (tundra, cold steppe); updated feature thresholds; tuned epicenter params|
| `src/engine/rules/noise.js` | edit | Domain warping helper (optional) |
| `src/params/game/worldParams.js` | edit | Tuned frequencies, composite weights, thresholds; tuned `EPICENTER_GRID.cellSize` |
| `dev/analysis/generation/snapshotTest.js` | edit | Tightened snapshot ranges, supernatural coverage check |

---

## 9. Deliverable

- Consistent terrain feel across radius 7, 21, and 50 maps. Small maps have appropriate scale (not a zoomed-in corner of a region). Large maps have visible regional variation.
- No dead terrain types: `peak` and `floatingIsland` appear at appropriate frequencies.
- Beach hexes provide a natural water/land transition.
- Biome coverage is complete: no climate zone falls through to `biome_default` without an explicit decision.
- Supernatural biomes appear as organic, contiguous event regions (noise-modulated radial falloff from jittered-grid seeds). 1-3 event regions per supernatural biome on radius-21 maps.
- Snapshot tests pass at tightened tolerance ranges, including supernatural biome coverage check.
- Rain shadow either implemented and visible in moisture maps, or explicitly documented as permanently deferred with rationale.
