# Phase E: Feature Density from Climate

**Depends on:** Phase D (rivers with moisture boost), Phase C (water-adjusted moisture), Phase B (slope)  
**Deliverable:** Gradual forest edges, sparse vegetation near deserts, rich resources in wet valleys. Feature density derives from continuous climate values rather than hardcoded terrain-enum buckets.

---

## 1. Objective

The current feature system assigns density using the terrain enum: `'dense'` for forest/denseForest, `'medium'` for plains, `'sparse'` otherwise. This creates hard transitions — one hex is dense forest, the adjacent hex is sparse plains, with no gradual edge.

Replace with continuous density derived from climate fields:
- Tree density scales with moisture, falls off with elevation above tree line.
- Rocks more common on steep slopes and low moisture.
- Fruit trees require moisture above threshold + elevation below tree line.
- Feature noise thresholds are modulated by continuous density.

---

## 2. Scope

**In scope:**
- `featureDensity(terrain, elevation, moisture, slope)` returns a continuous [0, 1] density value
- Tree spawn threshold modulated by density (higher density → lower threshold → more trees)
- Rock probability increases with slope and decreases with moisture
- Fruit tree requires moisture > 0.60 && elevation < tree line
- Replace hardcoded density enums with continuous density in `spawnFeature`

**Out of scope:**
- New feature types (existing tree, fruitTree, knot, bush, vine remain)
- Feature clustering or placement patterns (features are still independent per-tile)
- Feature rendering changes (the renderer already handles varying density)

---

## 3. Pre-requisites

- Phase D complete: moisture field includes river boost, terrain classification reflects final moisture.
- Phase B complete: slope is available for rock placement.

---

## 4. Detailed Changes

### 4.1 Density Function

```js
/**
 * Compute continuous feature density [0, 1] for a tile.
 * Density modulates noise thresholds — higher density = lower threshold = more features.
 */
function featureDensity(terrain, elevation, moisture, slope, treeLineMax) {
  // Base density from terrain type (gentle fallback)
  let density = 0.5;  // plains baseline

  // Tree-bearing terrain gets density from climate
  if (terrain === 'forest' || terrain === 'denseForest') {
    // Moisture-driven: scales from forestMinMoisture to 1.0
    const moistFactor = clamp01((moisture - 0.72) / 0.28);  // 0.72 → 0, 1.0 → 1
    // Elevation penalty: above half tree line, density falls off
    const elevFactor  = elevation < treeLineMax * 0.5 ? 1.0
      : clamp01((treeLineMax - elevation) / (treeLineMax * 0.5));
    density = moistFactor * elevFactor * 0.8 + 0.2;  // range [0.2, 1.0]
  }

  if (terrain === 'plains' || terrain === 'hill') {
    density = clamp01(moisture * 0.6 + 0.1);  // sparse trees on moist plains
  }

  if (terrain === 'marsh') {
    density = clamp01(moisture * 0.4);  // sparse trees in marsh
  }

  if (terrain === 'desert') {
    density = clamp01(moisture * 0.15);  // very sparse in desert
  }

  return density;
}
```

### 4.2 Updated `spawnFeature`

The current `spawnFeature` assigns hardcoded density based on terrain. Replace with continuous density:

```js
function spawnFeature(roll, terrain, density, features) {
  for (const rule of features) {
    if (rule.terrainExclude && rule.terrainExclude.includes(terrain)) continue;

    // Density modulates the threshold: higher density → effective threshold is lower
    // e.g., threshold 0.935 with density 0.8 → effective threshold 0.935 * (1 - 0.8 * 0.5) = 0.561
    const densityMod = 1.0 - density * 0.5;  // density 0 → mod 1.0, density 1 → mod 0.5
    const effectiveThreshold = rule.threshold * densityMod;

    let matched = false;
    if (rule.compare === 'gt' && roll > effectiveThreshold) matched = true;
    else if (rule.compare === 'lt' && roll < effectiveThreshold) matched = true;

    if (!matched) continue;

    switch (rule.kind) {
      case 'tree':
      case 'largeTree':
        return { kind: rule.kind, density };
      case 'fruitTree':
        return { kind: 'fruitTree', nextFruitDay: 1, ripe: true, density };
      case 'knot':
        return {
          kind: 'knot', mined: false,
          amount: KNOT_BASE_AMOUNT + Math.floor(roll * KNOT_AMOUNT_VARIATION_SCALE) % KNOT_AMOUNT_VARIATION_MOD,
        };
      case 'bush':
        return { kind: 'bush' };
      case 'vine':
        return { kind: 'vine' };
      default:
        return { kind: rule.kind };
    }
  }

  return null;
}
```

**How density modulation works:**
- A tree rule with threshold 0.935 (spawn if roll > 0.935) at density 0.0 → effective threshold 0.935 (rare, ~6.5% chance).
- Same rule at density 1.0 → effective threshold 0.935 * 0.5 = 0.467 (common, ~53% chance).
- This creates smooth transitions: no hard cutoff between "forest" and "plains" for tree spawning.

### 4.3 Rock Placement

Rocks currently spawn only via the debris system (not features). The debris system should also use slope and moisture:

```js
function shouldSpawnRock(slope, moisture) {
  // Rocks more common on steep slopes
  const slopeFactor = clamp01(slope / 0.15);  // slope 0 → 0, slope 0.15+ → 1
  // Rocks more common in dry areas
  const dryFactor = clamp01((0.5 - moisture) / 0.5);  // moist 0.5+ → 0, moist 0 → 1
  return slopeFactor * 0.6 + dryFactor * 0.4;  // rock probability
}
```

This replaces the current binary debris threshold (`DEBRIS_SPAWN_THRESHOLD: 0.92`) with a terrain-aware probability.

### 4.4 Fruit Tree Requirements

Fruit trees have explicit climate requirements beyond the noise roll:

```js
function canSpawnFruitTree(elevation, moisture, treeLineMax) {
  return moisture > 0.60 && elevation < treeLineMax;
}
```

If a fruit tree feature rule matches the noise roll but the climate check fails, the rule is skipped and the next rule in the list is tried. This prevents fruit trees in deserts or above the tree line.

### 4.5 Updated Feature Pass in `generateChunkTiles`

```js
// Pass: Features
for (const [, tile] of tileMap) {
  if (!TERRAIN[tile.terrain].passable) continue;

  const tileBiomeDef = biomeDef || getArchetype(tile.biomeId) || getArchetype('biome_default');
  const density = featureDensity(
    tile.terrain, tile.elevation, tile.moisture, tile.slope,
    tileBiomeDef.terrainRules?.treeLineMax ?? DEFAULT_TERRAIN_RULES.treeLineMax
  );

  const roll = seededNoise(seed, tile.q, tile.r, NOISE_CHANNEL_FEATURES);
  const feature = spawnFeature(roll, tile.terrain, density, tileBiomeDef.features);

  // Fruit tree climate check
  if (feature && feature.kind === 'fruitTree') {
    if (!canSpawnFruitTree(tile.elevation, tile.moisture,
        tileBiomeDef.terrainRules?.treeLineMax ?? DEFAULT_TERRAIN_RULES.treeLineMax)) {
      // Skip fruit tree — try remaining rules? For simplicity, just null it.
      // (A more sophisticated version would re-roll without the fruitTree rule.)
      tile.feature = null;
      continue;
    }
  }

  if (feature) {
    tile.feature = feature;
  }
}
```

---

## 5. Files Touched

| File | Change | Summary |
|------|--------|---------|
| `src/game/rules/terrainGen/features/featureSpawning.js` | edit | `spawnFeature`, `featureDensity`, fruit tree climate check, updated debris rock logic |

---

## 6. Deliverable

- Forest edges are gradual: trees thin out as moisture decreases near desert boundaries, rather than abruptly stopping at the terrain-type boundary.
- Dense forests are truly dense (high feature density) and sparse compared to the current `'dense'` enum which is binary.
- Rocks cluster on mountain slopes and in dry regions, sparse in wet forests.
- Fruit trees only appear in suitable climate (moist, below tree line).
- The continuous density value is stored on the feature object for rendering use (`feature.density`).

---

## 7. Risks & Edge Cases

- **Density modulation changes spawn rates.** A tree rule that previously matched with probability ~6.5% (roll > 0.935) now matches with probability 6.5%–53% depending on density. Archetype feature thresholds may need retuning — biomes that previously relied on specific spawn rates may get too many or too few features. Compensate by adjusting `threshold` values in biome feature lists during Phase G tuning.
- **Fruit tree skip leaves a tile with no feature.** If the fruit tree rule matches but climate fails, the tile gets `feature: null` even though a lower-priority rule (e.g., bush) might have matched. The simple fix is acceptable for this phase — Phase G can add rule retry logic.
- **Debris rock placement interacts with feature placement.** Currently, debris only spawns on tiles without features. If rock probability increases on slopes, mountain tiles (which are impassable and get no features or debris) don't benefit. This is correct — mountains are already visually distinct.
- **Performance:** `featureDensity` is called once per passable tile. The computation is a few arithmetic ops — no new noise samples. Negligible overhead.
