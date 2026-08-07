/**
 * biomeDefault.js — 'Untouched' biome.
 * The default catch-all biome with vibrant temperate ecology.
 */

import { defineArchetype } from '../../archetypes.js';

defineArchetype('biome_default', {
  type: 'biome',
  id: 'biome_default',
  name: 'Untouched',
  origin: 'natural',

  // No climateRange — catch-all (last in priority, always matches)

  terrainRules: {
    // Inherits all DEFAULT_TERRAIN_RULES; override only if needed
  },

  // Features ordered by priority — first match wins.
  // fruitTree at high threshold (rare), tree at medium threshold (common),
  // then knot at the low end.
  features: [
    { kind: 'fruitTree',          threshold: 0.970, compare: 'gt', terrainOnly: ['forest', 'denseForest'] },
    { kind: 'tree',               threshold: 0.935, compare: 'gt', terrainExclude: ['desert', 'forest', 'denseForest'] },
    { kind: 'vegetableLamb',      threshold: 0.925, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'witnessStone',       threshold: 0.910, compare: 'gt', terrainExclude: ['desert', 'marsh'] },
    { kind: 'chest',              threshold: 0.900, compare: 'gt', terrainExclude: [] },
    { kind: 'screamroot',         threshold: 0.890, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'palimpsestSlab',     threshold: 0.875, compare: 'gt', terrainExclude: ['desert', 'marsh'] },
    { kind: 'gildedInitial',      threshold: 0.865, compare: 'gt', terrainExclude: ['desert', 'marsh'] },
    { kind: 'knot',               threshold: 0.038, compare: 'lt' },
  ],

  palette: {
    plains:        [0.455, 0.678, 0.365],  // vibrant meadow green
    forest:        [0.294, 0.557, 0.255],  // deep vivid forest
    denseForest:   [0.176, 0.420, 0.137],  // dark rich green
    desert:        [0.839, 0.694, 0.357],  // warm golden sand
    marsh:         [0.506, 0.600, 0.404],  // murky vibrant marsh
    hill:          [0.545, 0.659, 0.388],  // olive-green
    plateau:       [0.604, 0.565, 0.471],  // warm grey
    mountain:      [0.529, 0.486, 0.416],  // rocky warm gray
    peak:          [0.690, 0.729, 0.784],  // pale snowy rock
    floatingIsland:[0.753, 0.847, 0.910],  // pale cyan-white
    water:         [0.373, 0.604, 0.757],  // bright cyan-blue
    beach:         [0.878, 0.824, 0.627],  // warm golden sand
  },
  terrainTags: ['plains', 'beach', 'forest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'floatingIsland', 'water'],
  weatherAffinity: ['temperate', 'rainy'],

  terrainElevation: null,
  supportsFloatingIslands: false,
});
