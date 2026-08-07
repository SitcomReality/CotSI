/**
 * biomeMourningMarsh.js — 'Mourning Marsh' biome.
 * Cold wetland — marsh dominates, lots of ice, almost no desert, very sparse features.
 */

import { defineArchetype } from '../../archetypes.js';

defineArchetype('biome_mourning_marsh', {
  type: 'biome',
  id: 'biome_mourning_marsh',
  name: 'Mourning Marsh',
  origin: 'natural',

  // Very cold + wet — the most extreme cold biome. maxTemperature raised from
  // 0.35→0.45 so it captures more cold-wet tiles. Sits before tundra in
  // priority so tiles ≤ 0.45 temp with ≥ 0.58 moist go to mourning_marsh.
  climateRange: {
    minMoisture: 0.58,
    maxTemperature: 0.45,
  },

  // Cold wetland: marsh dominates, lots of ice, almost no desert
  terrainRules: {
    marshMinMoisture:        0.20,
    marshMaxElevation:       0.50,
    waterMinMoisture:        0.15,
    waterMaxElevation:       0.08,
    forestMinMoisture:       0.30,
    denseForestMinMoisture:  0.50,
    desertMaxMoisture:       0.05,
    freezeTempMax:           0.60,
  },

  // Mourning Marsh: very sparse — cold, wet, not hospitable
  features: [
    { kind: 'foolsFire',      threshold: 0.98, compare: 'gt', terrainExclude: [], tier: 'T3' },
    { kind: 'drownedCopyist', threshold: 0.96, compare: 'gt', terrainExclude: [], tier: 'T3' },
    { kind: 'screamroot',     threshold: 0.93, compare: 'gt', terrainExclude: [], tier: 'T3' },
    { kind: 'chest',          threshold: 0.90, compare: 'gt', terrainExclude: [], tier: 'T2' },
    { kind: 'knot',           threshold: 0.04, compare: 'lt' },
  ],

  palette: {
    plains:        [0.350, 0.480, 0.350],  // dark wet grass
    forest:        [0.220, 0.380, 0.220],  // murky woodland
    denseForest:   [0.120, 0.280, 0.150],  // deep dark mire
    desert:        [0.550, 0.480, 0.350],  // rare dry patch
    marsh:         [0.300, 0.420, 0.280],  // deep marsh green
    hill:          [0.380, 0.440, 0.320],  // wet hill
    plateau:       [0.420, 0.460, 0.400],  // wet grey
    mountain:      [0.400, 0.440, 0.420],  // wet rock
    water:         [0.250, 0.420, 0.550],  // deep mournful blue
    ice:           [0.550, 0.650, 0.750],  // pale ice
    beach:         [0.500, 0.480, 0.420],  // dark wet sand
  },
  terrainTags: ['plains', 'beach', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'water', 'ice'],
  weatherAffinity: ['rainy', 'snowy'],

  terrainElevation: {
    marsh: -0.08,
  },
});
