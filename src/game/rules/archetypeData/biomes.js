/**
 * biomes.js — Biome archetype definitions.
 *
 * Each biome defines:
 *   type:                   'biome'
 *   name:                   Display name shown in setup UI
 *   terrainRules:           Flat noise thresholds (e.g. forestMinMoisture, mountainThreshold).
 *                           Merged on top of DEFAULT_TERRAIN_RULES; override selectively.
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
 *   origin:                'natural' | 'supernatural' — how this biome is placed.
 *   climateRange:          (natural only) Climate constraints for biome selection.
 *   supportsFloatingIslands: (optional) Whether this biome can contain floating-island terrain.
 */

import { defineArchetype } from '../archetypes.js';

defineArchetype('biome_default', {
  type: 'biome',
  id: 'biome_default',
  name: 'Default Manuscript',
  origin: 'natural',

  // No climateRange — catch-all (last in priority, always matches)

  terrainRules: {
    // Inherits all DEFAULT_TERRAIN_RULES; override only if needed
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

  // Lush: abundant fruit trees + decorative trees + bushes on low-moisture tiles
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
  supportsFloatingIslands: false,
});


