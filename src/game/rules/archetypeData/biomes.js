/**
 * biomes.js — Biome archetype definitions.
 *
 * Each biome defines:
 *   type:                   'biome'
 *   name:                   Display name shown in setup UI
 *   terrainThresholds:      Noise cutoffs for assigning terrain types.
 *                           Each key is a terrain type; values are { minElevation, maxElevation,
 *                           minMoisture, maxMoisture } — a tile must satisfy ALL specified
 *                           conditions to be assigned that terrain.
 *   features:               Ordered list of feature spawn rules (replaces featureFrequencies).
 *                           Each entry: { kind, threshold, compare, terrainExclude? }.
 *                           First matching rule on the noise roll wins.
 *     kind:            Feature archetype kind ('tree', 'fruitTree', 'knot', 'bush', etc.)
 *     threshold:       Noise threshold value
 *     compare:         'gt' = roll > threshold, 'lt' = roll < threshold
 *     terrainExclude:  Terrain types that can't host this feature
 *   palette:               RGB color tuples that override the default TERRAIN_COLOR in terrainMesh.js
 *   terrainTags:           Terrain types this biome supports
 *   weatherAffinity:       Weather types this biome is most associated with
 *   terrainElevation:      (optional) Per-terrain height overrides (Y offset).
 *                          Falls back to TERRAIN_ELEVATION defaults.
 *   moistureBias:          (optional) Additive offset to raw moisture noise [0,1], clamped.
 *   supportsFloatingIslands: (optional) Whether this biome can contain floating-island terrain.
 */

import { defineArchetype } from '../archetypes.js';

defineArchetype('biome_default', {
  type: 'biome',
  id: 'biome_default',
  name: 'Default Manuscript',

  terrainThresholds: {
    ...buildDefaultThresholds(),
  },

  // Features ordered by priority — first match wins.
  // fruitTree at high threshold (rare), tree at medium threshold (common),
  // then knot at the low end.
  features: [
    { kind: 'fruitTree', threshold: 0.970, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'tree',      threshold: 0.935, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'knot',      threshold: 0.038, compare: 'lt' },
  ],

  palette: {
    plains:        [0.455, 0.678, 0.365],  // vibrant meadow green
    forest:        [0.294, 0.557, 0.255],  // deep vivid forest
    denseForest:   [0.176, 0.420, 0.137],  // dark rich green
    desert:        [0.839, 0.694, 0.357],  // warm golden sand
    marsh:         [0.506, 0.600, 0.404],  // murky vibrant marsh
    mountain:      [0.529, 0.486, 0.416],  // rocky warm gray
    peak:          [0.690, 0.729, 0.784],  // pale snowy rock
    floatingIsland:[0.753, 0.847, 0.910],  // pale cyan-white
    water:         [0.373, 0.604, 0.757],  // bright cyan-blue
  },
  terrainTags: ['plains', 'forest', 'desert', 'marsh', 'mountain', 'peak', 'floatingIsland', 'water'],
  weatherAffinity: ['temperate', 'rainy'],

  // Extended biome fields (default to current behaviour)
  terrainElevation: null,
  moistureBias: 0,
  supportsFloatingIslands: false,
});

defineArchetype('biome_verdant', {
  type: 'biome',
  id: 'biome_verdant',
  name: 'Verdant Weald',

  terrainThresholds: {
    mountain: { minElevation: 0.920 },
    water: { maxElevation: 0.05, minMoisture: 0.4 },
    forest: { minMoisture: 0.55 },
    desert: { maxMoisture: 0.08 },
    marsh: { minMoisture: 0.50, maxElevation: 0.40 },
    denseForest: { minMoisture: 0.80 },
  },

  // Verdant: abundant fruit trees + decorative trees + bushes on low-moisture tiles
  features: [
    { kind: 'fruitTree', threshold: 0.930, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'tree',      threshold: 0.860, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'bush',      threshold: 0.060, compare: 'lt', terrainExclude: ['desert', 'marsh'] },
    { kind: 'knot',      threshold: 0.035, compare: 'lt' },
  ],

  palette: {
    plains:        [0.380, 0.620, 0.280],  // deeper, richer green
    forest:        [0.220, 0.500, 0.180],  // darker, lusher forest
    denseForest:   [0.120, 0.350, 0.100],  // very dark deep wood
    desert:        [0.780, 0.650, 0.400],  // muted, sandy — rare here
    marsh:         [0.420, 0.550, 0.340],  // greener marsh
    mountain:      [0.480, 0.520, 0.450],  // mossy gray
    peak:          [0.650, 0.700, 0.750],  // moss-snow blend
    floatingIsland:[0.650, 0.750, 0.800],  // greenish float
    water:         [0.300, 0.550, 0.700],  // deeper blue
  },
  terrainTags: ['plains', 'forest', 'denseForest', 'marsh', 'mountain', 'peak', 'floatingIsland', 'water'],
  weatherAffinity: ['rainy', 'temperate'],

  terrainElevation: {
    forest: 0.18,
    denseForest: 0.25,
    marsh: -0.08,
  },
  moistureBias: 0.05,
  supportsFloatingIslands: false,
});

defineArchetype('biome_arid', {
  type: 'biome',
  id: 'biome_arid',
  name: 'Sere Wastes',

  terrainThresholds: {
    mountain: { minElevation: 0.890 },  // more mountains
    water: { maxElevation: 0.04, minMoisture: 0.7 },  // very rare water
    forest: { minMoisture: 0.85 },  // rare forest
    desert: { maxMoisture: 0.35 },  // very common desert
    marsh: { minMoisture: 0.75, maxElevation: 0.20 },
  },

  // Arid: sparse everything — rare fruit trees, very rare decorative trees
  features: [
    { kind: 'fruitTree', threshold: 0.985, compare: 'gt', terrainExclude: [] },
    { kind: 'tree',      threshold: 0.965, compare: 'gt', terrainExclude: [] },
    { kind: 'knot',      threshold: 0.040, compare: 'lt' },
  ],

  palette: {
    plains:        [0.620, 0.520, 0.280],  // sun-bleached tan
    forest:        [0.400, 0.450, 0.200],  // sparse olive
    denseForest:   [0.350, 0.380, 0.180],  // withered olive
    desert:        [0.880, 0.720, 0.380],  // bright golden sand
    marsh:         [0.580, 0.520, 0.350],  // dry reed-brown
    mountain:      [0.580, 0.440, 0.350],  // warm reddish rock
    peak:          [0.720, 0.680, 0.600],  // dusty pale
    floatingIsland:[0.750, 0.700, 0.650],  // dusty float
    water:         [0.300, 0.520, 0.680],  // pale desert blue
  },
  terrainTags: ['plains', 'desert', 'mountain', 'peak', 'floatingIsland', 'water'],
  weatherAffinity: ['arid', 'temperate'],

  terrainElevation: {
    mountain: 0.75,
    plains: 0.05,
  },
  moistureBias: -0.08,
  supportsFloatingIslands: false,
});

/**
 * Build default terrain thresholds matching original global defaults.
 * Extracted here so future new biomes can `...buildDefaultThresholds()`
 * and override selectively.
 */
function buildDefaultThresholds() {
  return {
    mountain: { minElevation: 0.905 },
    water: { maxElevation: 0.07, minMoisture: 0.5 },
    forest: { minMoisture: 0.72 },
    desert: { maxMoisture: 0.20 },
    marsh: { minMoisture: 0.58, maxElevation: 0.35 },
  };
}
