/**
 * biomeSereWastes.js — 'Sere Wastes' biome.
 * Hot arid desert with sparse everything — rare fruit trees, very rare decorative features.
 */

import { defineArchetype } from '../../archetypes.js';

defineArchetype('biome_sere_wastes', {
  type: 'biome',
  id: 'biome_sere_wastes',
  name: 'Sere Wastes',
  origin: 'natural',

  // Covers hot+arid tiles. minTemperature lowered from 0.55→0.50 and maxMoisture
  // widened from 0.28→0.30 so sere_wastes catches more warm-dry tiles as scorch
  // retreats to higher temperatures (scorch minTemp 0.68).
  climateRange: {
    maxMoisture: 0.30,
    minTemperature: 0.50,
  },

  terrainRules: {
    mountainThreshold: 0.50,
    waterMaxElevation: 0.04,
    waterMinMoisture: 0.70,
    forestMinMoisture: 0.85,
    desertMaxMoisture: 0.35,
    marshMinMoisture: 0.75,
    marshMaxElevation: 0.20,
  },

  // Sere Wastes: sparse everything — rare fruit trees, very rare decorative trees
  features: [
    // High-roll features — rarest first
    { kind: 'fruitTree',         threshold: 0.985, compare: 'gt', terrainOnly: ['forest', 'denseForest'] },
    { kind: 'ouroborosLoop',     threshold: 0.970, compare: 'gt', terrainExclude: [] },
    { kind: 'tree',              threshold: 0.965, compare: 'gt', terrainExclude: ['forest', 'denseForest'] },
    // Treasure chest — any-biome collectible
    { kind: 'chest',             threshold: 0.900, compare: 'gt', terrainExclude: [] },
    { kind: 'listenerLichen',    threshold: 0.025, compare: 'lt', terrainExclude: ['desert'] },
    // Resources
    { kind: 'knot',              threshold: 0.040, compare: 'lt' },
  ],

  palette: {
    plains:        [0.620, 0.520, 0.280],  // sun-bleached tan
    forest:        [0.400, 0.450, 0.200],  // sparse olive
    denseForest:   [0.350, 0.380, 0.180],  // withered olive
    desert:        [0.880, 0.720, 0.380],  // bright golden sand
    marsh:         [0.580, 0.520, 0.350],  // dry reed-brown
    hill:          [0.580, 0.480, 0.300],  // reddish tan
    plateau:       [0.620, 0.540, 0.420],  // warm pale grey
    mountain:      [0.580, 0.440, 0.350],  // warm reddish rock
    peak:          [0.720, 0.680, 0.600],  // dusty pale
    floatingIsland:[0.750, 0.700, 0.650],  // dusty float
    water:         [0.300, 0.520, 0.680],  // pale desert blue
    beach:         [0.880, 0.750, 0.520],  // bleached golden sand
  },
  terrainTags: ['plains', 'beach', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'floatingIsland', 'water'],
  weatherAffinity: ['arid', 'temperate'],

  terrainElevation: {
    mountain: 0.75,
    plains: 0.05,
  },
  supportsFloatingIslands: false,
});
