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
    mountainThreshold:      0.62,
  },

  // Tundra: sparse — cold stunts growth.
  // Snowperson at rare threshold (Tundra's signature feature).
  features: [
    { kind: 'snowperson',     threshold: 0.97, compare: 'gt', terrainExclude: [], tier: 'T2' },
    { kind: 'chest',          threshold: 0.90, compare: 'gt', terrainExclude: [], tier: 'T2' },
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
    water:         [0.350, 0.520, 0.580],  // cold blue
    ice:           [0.720, 0.820, 0.880],  // pale ice
    beach:         [0.750, 0.720, 0.650],  // frost-bleached pale sand
  },
  // Biome signature colors for terrain-decor tinting (decor-consolidation):
  // primary is the biome's hue, accent its secondary highlight; decor parts
  // sample these via a per-part influence parameter, blended across hexes.
  colors: {
    primary: [0.160, 0.300, 0.550], // #294d8c — deep blue
    accent: [0.940, 0.960, 1.000],  // #f0f5ff — near-white (snow)
  },
  terrainTags: ['plains', 'beach', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'water', 'ice'],
  weatherAffinity: ['snowy', 'temperate'],

  terrainElevation: null,
});
