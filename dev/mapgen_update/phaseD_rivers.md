# Phase D: Rivers

**Depends on:** Phase C (water-adjusted moisture), Phase B (elevation composite + slope)  
**Deliverable:** Rivers flowing from mountains to oceans/lakes, with fertile river valleys that affect terrain classification. Natural exploration corridors.

---

## 1. Objective

Add the biggest missing geographical connector: rivers. They influence moisture, create natural boundaries, form fertile valleys, and make exploration feel directed ("follow the river downstream").

The critical fix from the original design: river moisture boost runs **before** final terrain classification, so fertile river valleys produce real terrain changes (more forest, less desert along river paths) — not just cosmetic tags.

---

## 2. Scope

**In scope:**
- Downhill river trace from high-elevation, high-moisture source points
- Seeded tie-breaking in descent (avoids straight rivers locked to hex axes)
- River moisture boost applied before terrain classification
- `isRiver: true` flag on river-path tiles
- Source count scales with map area
- River config in `worldParams.js`

**Out of scope:**
- River rendering (meshes, water shaders) — data only, rendering deferred
- Cross-chunk river tracing (traces truncate at generation boundary — on finite maps, global post-pass handles full trace)
- River width variation, meandering, or tributary joining

---

## 3. Pre-requisites

- Phase C complete: moisture field is water-adjusted, provisional water classification exists.
- Phase B complete: elevation composite provides realistic downhill gradients.
- Phase 0 calibration values for `RIVER_SOURCE_MIN_ELEV` (calibrated to be reachable given the elevation distribution).

---

## 4. Detailed Changes

### 4.1 River Configuration (`worldParams.js`)

```js
// River source selection
export const RIVER_SOURCE_MIN_ELEV    = 0.65;  // calibrated percentile
export const RIVER_SOURCE_MIN_MOIST   = 0.45;
export const RIVER_SOURCE_FRACTION    = 0.0005; // sources per tile; total river coverage ≈ fraction × avg river length

// River tracing
export const RIVER_MAX_LENGTH         = 200;

// River effects
export const RIVER_MOISTURE_BOOST     = 0.15;
export const RIVER_BOOST_RADIUS       = 1;
```

The number of river sources is `Math.max(1, Math.ceil(mapTileCount * RIVER_SOURCE_FRACTION))`. At radius 7 (169 tiles), this produces 1 source. At radius 50 (~7,651 tiles), ~4 sources. This scales naturally with map size.

### 4.2 Source Selection

```js
function selectRiverSources(tiles, fieldMap, params) {
  const candidates = [];
  for (const tile of tiles) {
    const fields = fieldMap.get(coordKey(tile));
    if (!fields) continue;
    if (fields.elevation > params.sourceMinElev &&
        fields.baseMoisture > params.sourceMinMoist) {
      candidates.push(tile);
    }
  }

  // Deterministic shuffle (seeded by world seed)
  const shuffled = seededShuffle(candidates, params.seed);

  const count = Math.max(1, Math.ceil(tiles.length * RIVER_SOURCE_FRACTION));
  return shuffled.slice(0, count);
}
```

### 4.3 Downhill Trace with Seeded Tie-Breaking

```js
function traceRiver(start, fieldMap, provisionalWaterSet, params) {
  const path = [];
  const visited = new Set();
  let current = start;
  let steps = 0;

  while (steps < RIVER_MAX_LENGTH) {
    const key = coordKey(current);
    if (visited.has(key)) break;  // loop detected
    visited.add(key);
    path.push(current);

    // Stop at water
    if (provisionalWaterSet.has(key)) break;

    const centerFields = fieldMap.get(key);
    if (!centerFields) break;

    // Find all neighbors with lower elevation
    const lower = [];
    for (const n of neighbors(current)) {
      const nFields = fieldMap.get(coordKey(n));
      if (!nFields) continue;
      if (nFields.elevation < centerFields.elevation) {
        lower.push({ q: n.q, r: n.r, elev: nFields.elevation });
      }
    }

    if (lower.length === 0) break;  // local minimum

    // Sort by elevation (ascending)
    lower.sort((a, b) => a.elev - b.elev);

    // Seeded tie-breaking: if multiple neighbors share the minimum elevation,
    // use deterministic noise to pick among them, rather than always picking
    // the lowest-index neighbor (which locks rivers to hex axes).
    const minElev = lower[0].elev;
    const tied = lower.filter(n => n.elev === minElev);

    if (tied.length === 1) {
      current = tied[0];
    } else {
      // Deterministic tie-break: seeded hash of (position, step)
      const hash = seededHash(current.q, current.r, steps, params.seed);
      current = tied[hash % tied.length];
    }

    steps++;
  }

  return path;
}
```

The seeded tie-breaking is the key improvement over the original design. Without it, when three downhill neighbors share the same elevation, the river always picks the one that sorts first in array order — creating straight, axis-locked rivers. The seeded hash distributes choices naturally.

### 4.4 River Moisture Boost (Before Classification)

After all rivers are traced, the moisture field is boosted along river paths. This runs **before** terrain classification:

```js
function applyRiverMoistureBoost(tiles, riverPaths, fieldMap) {
  // Collect all tiles within RIVER_BOOST_RADIUS of any river tile
  const boosted = new Set();
  for (const path of riverPaths) {
    for (const tile of path) {
      boosted.add(coordKey(tile));
      for (const n of hexesWithinRadius(tile.q, tile.r, RIVER_BOOST_RADIUS)) {
        boosted.add(coordKey(n));
      }
    }
  }

  // Apply boost
  for (const key of boosted) {
    const fields = fieldMap.get(key);
    if (fields) {
      fields.baseMoisture = clamp01(fields.baseMoisture + RIVER_MOISTURE_BOOST);
    }
  }
}
```

Because this boost mutates `baseMoisture` before `classifyTerrain` runs, river valleys get:

- Higher moisture → more likely to be forest/denseForest/marsh
- Lower likelihood of desert classification
- Higher feature density (Phase E builds on this)

This is the "fertile river valley" effect — real terrain changes, not just a cosmetic `isRiver` flag.

### 4.5 Updated Generation Pass Order

The pass order within `generateChunkTiles` (per-chunk generation) does **not** include river tracing — rivers cross chunk boundaries and are handled by the `generateTiles` wrapper after all chunks are assembled.

**`generateChunkTiles` pass order (per-chunk):**
```
Pass 1: sampleBaseFields for core + border ring
Pass 2: classify provisional water (elevation-based)
Pass 3: adjust moisture (coastal boost)
Pass 4: selectBiome + applySupernaturalOverrides + classifyTerrain
Pass 5: slope computation
Pass 6: mountain type tagging
Pass 7: water type tagging
Pass 8: features
Pass 9: debris
```

**`generateTiles` wrapper (global post-processing, runs after all chunks):**
```
Post-pass 1: [NEW] select river sources (from all assembled tiles)
Post-pass 2: [NEW] trace rivers downhill (using global fieldMap)
Post-pass 3: [NEW] apply river moisture boost to affected tiles
Post-pass 4: re-classify terrain for river-affected tiles (fertile valleys)
Post-pass 5: set isRiver flags on river-path tiles
```

Rivers run after moisture adjustment and before final terrain classification in the global pass — this is the critical reordering from the original design. The river moisture boost produces real terrain changes (more forest, less desert along river paths) rather than just cosmetic `isRiver` tags.

### 4.6 River Data on Tiles

Each river-path tile gets:

```js
tile.isRiver = true;
// Future: tile.riverWidth, tile.riverDirection (for rendering)
```

The `isRiver` flag is a boolean tag overlaid on the existing terrain. River tiles keep their base terrain type — a river through a forest is still `forest` with `isRiver: true`. Rendering layers river meshes on top.

### 4.7 Update to `generateChunkTiles`

The river tracing step runs after all chunks for the visible area are generated. For a finite map (radius N), this is straightforward:

```js
export function generateTiles(seedText, radius, biomeDef, params) {
  // ... generate all chunk tiles as before ...

  // After all chunks have their tileMap populated:
  // 1. Build a flat fieldMap from all generated tiles
  // 2. Select river sources from all tiles
  // 3. Trace rivers downhill (using fieldMap for elevation queries)
  // 4. Apply river moisture boost to fieldMap
  // 5. Re-run classifyTerrain for affected tiles
  // 6. Set isRiver flags

  return tiles;
}
```

For per-chunk generation (`generateChunkTiles`), river tracing is deferred to the `generateTiles` wrapper because rivers cross chunk boundaries. Per-chunk generation doesn't know about tiles in other chunks. This is the same approach as the current code's `generateTiles` wrapper — it assembles all chunks and then runs global post-processing.

### 4.8 Finite Map Generation

On finite maps (the target for this redesign), the full world is generated upfront in `generateTiles`. Rivers are traced across all assembled chunks in a global post-pass — no truncation at chunk boundaries, no cross-chunk coordination issues. The water-type BFS for ocean/lake determination also runs globally on the complete map.

### 4.9 River Termination at Local Minima (Known Limitation)

Rivers trace downhill until they hit water, a local minimum, or `RIVER_MAX_LENGTH`. A river that dead-ends in a basin without water terminates in the middle of land. Without sink filling, this produces dead-end rivers rather than lakes. Realistic (endorheic basins exist) but may look odd for single-hex basins. Future enhancement: create a small lake at the river's terminus if the basin is enclosed.

---

## 5. Files Touched

| File | Change | Summary |
|------|--------|---------|
| `src/params/game/worldParams.js` | edit | River config constants (`RIVER_SOURCE_FRACTION`, `RIVER_MOISTURE_BOOST`, etc.) |
| `src/game/rules/terrainGen/rivers/riverSources.js` | **add** | `selectRiverSources` |
| `src/game/rules/terrainGen/rivers/riverTrace.js`   | **add** | `traceRiver` with seeded tie-breaking |
| `src/game/rules/terrainGen/rivers/riverMoisture.js` | **add** | `applyRiverMoistureBoost` |
| `src/game/rules/terrainGen/flatGeneration.js`       | edit | River post-passes in `generateTiles` wrapper |
| `src/game/rules/terrainTypes.js` | — | No changes (river is a tag, not a terrain type) |

---

## 6. Deliverable

- Rivers flow downhill from mountain sources to oceans and lakes.
- River valleys are visibly greener: forest and marsh along river paths where desert or plains would otherwise be.
- `isRiver: true` on all river-path tiles (data ready for future rendering).
- River paths are natural rather than axis-locked (seeded tie-breaking).
- Analysis tool shows river paths and the moisture boost halo around them.
- River count scales with map size (1 river on radius 7, ~4 on radius 50).

---

## 7. Risks & Edge Cases

- **River tracing is ~O(sources × maxSteps).** At radius 50 with 23 sources × 200 max steps = 4,600 steps. Each step samples up to 6 neighbor elevations. Total: ~27,600 elevation lookups. Negligible for a generation post-pass.
- **Rivers don't join.** Each river traces independently. Two rivers that would naturally merge remain separate. Tributary joining is deferred to Phase G — the cost is that two parallel rivers to the same ocean are independent rather than one large river.
- **Local minima create dead-end rivers.** A river that flows into a basin with no lower neighbor stops there. If that basin isn't water, the river terminates in the middle of land. This is realistic (endorheic basins exist) but may look odd if the basin is a single hex. Future: endorheic lake formation (create a small lake at the river's terminus).
- **Chunk-boundary rivers in per-chunk mode.** `generateChunkTiles` alone doesn't produce rivers — the `generateTiles` wrapper handles them. This is acceptable: single-chunk generation is used for on-demand chunk loading (future), and the river post-pass runs after all chunks in the visible area are loaded.
- **River moisture boost might reclassify tiles as water.** If a tile near a river has elevation just above `waterMaxElevation` and gets enough boost, it could cross the water threshold. The moisture boost for rivers is +0.10, and the moisture gate for water is `waterMinMoisture: 0.50`. A tile previously at moisture 0.45 → 0.55 could become water. This is rare (requires a coincidence of low elevation + near-river + moisture just below threshold) and acceptable — it represents river-fed lakes and wetlands.
