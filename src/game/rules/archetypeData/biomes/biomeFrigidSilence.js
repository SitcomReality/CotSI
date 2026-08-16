/**
 * biomeFrigidSilence.js — 'The Frigid Silence' biome.
 * Cold steppe/tundra with sparse growth, abundant ice, and frost-bleached palette.
 */

import { defineArchetype } from '../../archetypes.js';

defineArchetype('biome_frigid_silence', {
  type: 'biome',
  id: 'biome_frigid_silence',
  name: 'The Frigid Silence',
  origin: 'natural',

  // Covers cold+dry through mid-moisture. maxTemperature raised from 0.47→0.52
  // so it captures more cold tiles. maxMoisture narrowed 0.58→0.55 so the
  // wetter cold niche (moist ≥ 0.55) falls to tundra / mourning_marsh.
  climateRange: {
    maxMoisture: 0.55,
    maxTemperature: 0.52,
  },

  // Cold steppe/tundra: cold suppresses forest, more ice, sparse growth
  terrainRules: {
    forestMinMoisture:      0.65,
    denseForestMinMoisture: 0.75,
    freezeTempMax:          0.60,
    desertMaxMoisture:      0.30,
    marshMinMoisture:       0.55,
  },

  // Frigid: very sparse — cold stunts growth
  features: [
    { kind: 'waxbloom',       threshold: 0.97, compare: 'gt', terrainExclude: [], tier: 'T2' },
    { kind: 'listenerLichen', threshold: 0.94, compare: 'gt', terrainExclude: [], tier: 'T3' },
    { kind: 'treasureChest',          threshold: 0.90, compare: 'gt', terrainExclude: [], tier: 'T2' },
    { kind: 'knot',           threshold: 0.05, compare: 'lt' },
  ],

  palette: {
    plains:        [0.580, 0.620, 0.550],  // frost-bleached grass
    forest:        [0.340, 0.480, 0.350],  // sparse taiga green
    denseForest:   [0.220, 0.350, 0.250],  // deep cold green
    desert:        [0.720, 0.680, 0.550],  // pale cold sand
    marsh:         [0.480, 0.540, 0.480],  // frosty marsh
    hill:          [0.520, 0.580, 0.480],  // cold olive
    plateau:       [0.550, 0.560, 0.520],  // pale grey-green
    mountain:      [0.500, 0.520, 0.500],  // cold grey
    water:         [0.350, 0.500, 0.620],  // cold blue
    ice:           [0.680, 0.780, 0.850],  // pale frost
    beach:         [0.680, 0.650, 0.580],  // cold pale grey sand
  },
  // Biome color swatches for terrain-decor tinting (decor-consolidation):
  // material-class colors — foliage/bloom/exotic are this biome's identity
  // colors; wood/soil/stone fall back to BIOME_COLOR_DEFAULTS unless
  // overridden here. Decor parts sample a swatch via a per-part influence
  // parameter, blended across hexes.
  colors: {
    foliage: [0.580, 0.620, 0.550], // #949e8c — frost-bleached grey-green
    bloom: [0.550, 0.620, 0.750],   // #8c9ebf — muted periwinkle blossom
    exotic: [0.680, 0.780, 0.850],  // #adc7d9 — pale frost (ice crystals)
  },
  terrainTags: ['plains', 'beach', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'water', 'ice'],
  weatherAffinity: ['temperate', 'snowy'],

  terrainElevation: null,
});
