/**
 * biomeSereWastes.js — 'Sere Wastes' biome.
 * Hot arid desert with sparse everything — rare Blessed Fonts, very rare decorative features.
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
    mountainThreshold: 0.60,
    waterMaxElevation: 0.04,
    waterMinMoisture: 0.70,
    forestMinMoisture: 0.85,
    desertMaxMoisture: 0.35,
    marshMinMoisture: 0.75,
    marshMaxElevation: 0.20,
  },

  // Sere Wastes: sparse everything — rare Blessed Fonts
  features: [
    // High-roll features — rarest first
    { kind: 'blessedFont',       threshold: 0.985, compare: 'gt', terrainOnly: ['forest', 'deepWood'] },
    { kind: 'ouroborosLoop',     threshold: 0.970, compare: 'gt', terrainExclude: [], tier: 'T4' },
    // Treasure chest — any-biome collectible
    { kind: 'treasureChest',             threshold: 0.900, compare: 'gt', terrainExclude: [], tier: 'T2' },
    { kind: 'listenerLichen',    threshold: 0.025, compare: 'lt', terrainExclude: ['desert'], tier: 'T3' },
    // Resources
    { kind: 'knot',              threshold: 0.040, compare: 'lt' },
  ],

  palette: {
    plains:        [0.620, 0.520, 0.280],  // sun-bleached tan
    forest:        [0.400, 0.450, 0.200],  // sparse olive
    deepWood:   [0.350, 0.380, 0.180],  // withered olive
    desert:        [0.880, 0.720, 0.380],  // bright golden sand
    marsh:         [0.580, 0.520, 0.350],  // dry reed-brown
    hill:          [0.580, 0.480, 0.300],  // reddish tan
    plateau:       [0.620, 0.540, 0.420],  // warm pale grey
    mountain:      [0.580, 0.440, 0.350],  // warm reddish rock
    water:         [0.190, 0.400, 0.570],  // deep ocean blue, faintly warm
    beach:         [0.880, 0.750, 0.520],  // bleached golden sand
  },
  // Biome color swatches for terrain-decor tinting (decor-consolidation):
  // material-class colors — foliage/bloom/exotic are this biome's identity
  // colors; wood/soil/stone fall back to BIOME_COLOR_DEFAULTS unless
  // overridden here. Decor parts sample a swatch via a per-part influence
  // parameter, blended across hexes.
  colors: {
    foliage: [0.620, 0.520, 0.280], // #9e8547 — sun-bleached tan
    bloom: [0.780, 0.520, 0.380],   // #c78561 — dusty desert rose
    exotic: [0.920, 0.900, 0.840],  // #ebe6d6 — bone white
  },
  terrainTags: ['plains', 'beach', 'forest', 'deepWood', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'water'],
  weatherAffinity: ['arid', 'temperate'],

  terrainElevation: {
    mountain: 0.75,
    plains: 0.05,
  },
});
