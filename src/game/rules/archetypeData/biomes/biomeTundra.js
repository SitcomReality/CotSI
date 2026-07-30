/**
 * biomeTundra.js — 'The Tundra' biome.
 * Cold wet biome — fills gap above mourning_marsh's maxTemperature at moist >= 0.60.
 */

import { defineArchetype } from '../../archetypes.js';

defineArchetype('biome_tundra', {
  type: 'biome',
  id: 'biome_tundra',
  name: 'The Tundra',
  origin: 'natural',

  // Cold + wet — widened minMoisture from 0.58→0.50 and maxTemperature from
  // 0.42→0.52 so tundra captures wet cold tiles that frigid_silence excludes
  // (frigid maxMoist 0.55) and covers a wider cold-wet band.
  climateRange: {
    minMoisture: 0.50,
    maxTemperature: 0.52,
  },

  // Tundra: cold suppresses forests, abundant ice, sparse growth
  terrainRules: {
    forestMinMoisture:      0.80,
    denseForestMinMoisture: 0.90,
    desertMaxMoisture:      0.05,
    marshMinMoisture:       0.30,
    marshMaxElevation:      0.50,
    freezeTempMax:          0.60,
    mountainThreshold:      0.52,
  },

  // Tundra: sparse — cold stunts growth.
  // Snowperson at rare threshold (unique decorative feature, non-functional).
  features: [
    { kind: 'snowperson',     threshold: 0.97, compare: 'gt', terrainExclude: [] },
    { kind: 'waxbloom',       threshold: 0.94, compare: 'gt', terrainExclude: [] },
    { kind: 'knot',           threshold: 0.05, compare: 'lt' },
  ],

  palette: {
    plains:        [0.780, 0.800, 0.820],  // snow-covered white
    forest:        [0.480, 0.620, 0.550],  // sparse taiga
    denseForest:   [0.320, 0.480, 0.400],  // dark taiga
    desert:        [0.650, 0.620, 0.550],  // rare frozen sand
    marsh:         [0.520, 0.580, 0.520],  // frosty marsh
    hill:          [0.620, 0.680, 0.620],  // snow-dusted hill
    plateau:       [0.680, 0.700, 0.680],  // snowy plateau
    mountain:      [0.580, 0.600, 0.620],  // cold grey rock
    peak:          [0.750, 0.820, 0.880],  // bright snow peak
    water:         [0.350, 0.520, 0.580],  // cold blue
    ice:           [0.720, 0.820, 0.880],  // pale ice
    beach:         [0.750, 0.720, 0.650],  // frost-bleached pale sand
  },
  terrainTags: ['plains', 'beach', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'water', 'ice'],
  weatherAffinity: ['snowy', 'temperate'],

  terrainElevation: null,
  supportsFloatingIslands: false,
});
