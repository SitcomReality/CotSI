# Phase C: Water-Adjusted Moisture

**Depends on:** Phase B (elevation composite + slope), Phase 0 (calibration values)  
**Deliverable:** Coastlines feel wet. Lakes have green surroundings. Deserts transition to greener terrain near water. No "dry ocean" basins.

---

## 1. Objective

Fix the two water-related problems in the current design:

1. **Water determination uses moisture as a gate**, creating "dry ocean basins" — low-elevation tiles in dry noise regions become plains/desert instead of water. Fix: water is primarily determined by elevation. Oceans are pure elevation cutoff; lakes use moisture as a secondary gate.

2. **Base moisture ignores water proximity.** A coastal tile has the same moisture as an inland tile at the same noise coordinate. Fix: after provisional water is classified, nearby land tiles receive a moisture boost.

This phase also defers rain shadow to Phase G — the original design mentioned it but provided no algorithm.

---

## 2. Scope

**In scope:**
- Water determined by elevation alone: `elevation < waterMaxElevation` → water (oceans)
- Inland lakes use moisture as secondary gate: `elevation < waterMaxElevation && moisture > waterMinMoisture` → water (lake)
- Coastal moisture boost: land tiles near water get moisture bonus
- Reclassify terrain with adjusted moisture (forest near coasts, marsh near lakes)
- Border ring hexes are fully classified through provisional water so `adjustMoisture` works correctly

**Out of scope:**
- Rain shadow (deferred to Phase G — requires wind direction + cross-wind sampling)
- Rivers (Phase D)

---

## 3. Pre-requisites

- Phase B complete: border ring infrastructure exists, all hexes within `MAX_LOOKUP_RADIUS` of chunk boundary have base fields available.
- Phase 0 calibration values for `waterMaxElevation` and `waterMinMoisture`.

---

## 4. Detailed Changes

### 4.1 Water Classification

Water is primarily an elevation phenomenon. The moisture gate is a secondary check for inland lakes — it prevents every low-elevation tile from being water regardless of climate.

```js
function isProvisionalWater(elevation, moisture, terrainRules) {
  const R = terrainRules;
  // Primary: elevation below sea level
  if (elevation >= R.waterMaxElevation) return false;
  // Secondary: moisture gate (inland lakes only; oceans bypass this via waterType BFS)
  return moisture > R.waterMinMoisture;
}
```

The `waterType` BFS (Phase B, unchanged) determines ocean vs lake. Tiles whose water body connects to the map boundary get `waterType: 'ocean'`. All ocean tiles are water regardless of moisture — but in practice, oceans are at the lowest elevations where moisture from water proximity (applied in this phase) ensures the moisture gate passes.

**"Dry basin" handling:** Tiles with `elevation < waterMaxElevation && moisture <= waterMinMoisture` fall through water classification and become terrain (plains, desert, or marsh depending on moisture). This is intentional — it represents salt flats, dry lake beds, and desert basins. The alternative (all low elevation = water) would flood every desert valley.

### 4.2 Coastal Moisture Boost

After provisional water is classified, land tiles within radius 2 of any water tile receive a moisture boost:

```js
function adjustMoisture(tile, q, r, fieldMap, provisionalWaterSet) {
  if (provisionalWaterSet.has(coordKey({ q, r }))) return;

  let waterNeighbors = 0;
  for (const n of hexesWithinRadius(q, r, 2)) {
    if (provisionalWaterSet.has(coordKey(n))) {
      waterNeighbors++;
    }
  }

  // Boost scales with proximity: more adjacent water → wetter
  const boost = waterNeighbors * 0.03;
  return clamp01(tile.moisture + boost);
}
```

The boost per water neighbor (0.03) means a tile with 10 water neighbors within radius 2 gets +0.30 moisture. A coastal tile typically has 3-6 water neighbors → +0.09 to +0.18 moisture. This is enough to push a borderline-desert coastal tile into plains or forest.

### 4.3 Border Ring Classification

For the moisture adjustment to work at chunk edges, border ring hexes must know whether they're water. The ring hexes are sampled via `sampleBaseFields` and then classified through `isProvisionalWater`:

```js
// During generateChunkTiles, after sampling base fields:
const provisionalWaterSet = new Set();
for (const [key, fields] of fieldMap) {
  if (isProvisionalWater(fields.elevation, fields.baseMoisture, DEFAULT_TERRAIN_RULES)) {
    provisionalWaterSet.add(key);
  }
}
```

This uses `DEFAULT_TERRAIN_RULES` for the ring check (biome-specific terrain rules aren't known for ring hexes — they haven't been biome-classified). For ocean/lake determination at the border, this is sufficient: the elevation cutoff is the primary factor.

### 4.4 Updated `generateChunkTiles` Pass Order

The generation pipeline within a chunk now runs:

```
Pass 1: sampleBaseFields for core + border ring
Pass 2: classify provisional water (elevation-based)
Pass 3: adjust moisture (coastal boost, using provisional water)
Pass 4: selectBiome + classifyTerrain (with adjusted moisture)
Pass 5: slope computation
Pass 6: mountain type tagging
Pass 7: water type tagging
Pass 8: features
Pass 9: debris
```

The key change is that moisture adjustment (Pass 3) runs before terrain classification (Pass 4), so terrain types reflect proximity to water.

### 4.5 Rule Update: Water Gate

The `classifyTerrain` water rule now reads:

```js
// In classifyTerrain:
if (elevation < R.waterMaxElevation) {
  if (moisture > R.waterMinMoisture) return 'water';
  // Low elevation + low moisture → falls through to terrain classification
  // (produces desert/plains/marsh — salt flat / dry basin)
}
```

The `waterMaxElevation` threshold is calibrated in Phase 0 to produce 8-15% water coverage on a reference map.

### 4.6 Rain Shadow — Explicitly Deferred

The original `design.md` passes moisture as:

```js
moisture = clamp01(baseMoisture + waterProximityBoost - rainShadow)
```

`rainShadow(elevation)` is never defined. A rain shadow requires:
- A prevailing wind direction
- Cross-wind elevation gradient sampling (upwind hexes)
- A decay function for the drying effect

This is deferred to Phase G with a stub interface reserved:

```js
// Placeholder (Phase G):
function computeRainShadow(q, r, elevationAt) {
  return 0;  // no rain shadow until wind model is designed
}
```

The moisture formula in Phase C is simply:

```js
moisture = clamp01(baseMoisture + coastalBoost)
```

---

## 5. Files Touched

| File | Change | Summary |
|------|--------|---------|
| `src/game/rules/terrainGenerator.js` | edit | `isProvisionalWater`, `adjustMoisture`, reorder generation passes, `computeRainShadow` stub |
| `src/params/game/worldParams.js` | — | No config changes (uses existing `waterMaxElevation`, `waterMinMoisture`) |

---

## 6. Deliverable

- Oceans at the lowest elevations regardless of moisture noise. No "dry ocean basins" where low-elevation hexes are plains or desert.
- Inland lakes still gated on moisture — a desert valley at low elevation isn't flooded.
- Coastlines have greener terrain: tiles near water are less likely to be desert, more likely to be forest or marsh.
- Lakes have green surroundings — the coastal moisture boost applies to lake shores too.
- Analysis tool shows the adjusted moisture field alongside base moisture, with the coastal boost clearly visible as halos around water bodies.

---

## 7. Risks & Edge Cases

- **Border ring uses `DEFAULT_TERRAIN_RULES` for water check.** This could cause a minor inconsistency at chunk boundaries if a ring tile would be classified differently by its actual biome. Mitigation: the elevation cutoff is biome-independent in practice (all biomes use similar `waterMaxElevation` ± a few percent). The moisture gate matters less for ring tiles because the ring is discarded — only the boolean `isWater` feeds into the coastal boost calculation.
- **Coastal boost is additive, not multiplicative.** A tile with 15 water neighbors (unusual, possible in island chains) gets +0.45 moisture. This is clamped to 1.0. Acceptable — excessively wet tiles just become marsh or water.
- **Boost applies before biome selection.** This means a tile near a lake in an arid region might get enough moisture to be classified as `biome_lush` instead of `biome_arid`. This is correct behavior — the lake creates a local microclimate. The regional bias fields still nudge toward the larger climate pattern.
- **Performance:** The `hexesWithinRadius(q, r, 2)` call for each land tile produces ~19 neighbor checks per tile. At radius 50 (~7,651 tiles), that's ~145k lookups. Acceptable for a once-per-startup generation pass.
