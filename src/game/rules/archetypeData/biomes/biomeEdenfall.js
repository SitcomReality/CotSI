/**
 * biomeEdenfall.js — 'Edenfall' biome.
 * Temperate mid-moisture biome with purple-grass palette and giant mushrooms.
 */

import { defineArchetype } from '../../archetypes.js';

defineArchetype('biome_edenfall', {
  type: 'biome',
  id: 'biome_edenfall',
  name: 'Edenfall',
  origin: 'natural',

  // Temperate mid-moisture — expanded to fill the gap left by scorch's retreat.
  // minTemperature lowered from 0.47→0.42 so it catches cool moderate-moist
  // tiles that would otherwise fall into biome_default (the classic gap at
  // temp 0.43-0.47, moist 0.58-0.63). maxTemperature widened from 0.67→0.82
  // so it captures warm tiles that scorch (minTemp 0.68) no longer covers.
  climateRange: {
    minMoisture: 0.22,
    maxMoisture: 0.68,
    minTemperature: 0.42,
    maxTemperature: 0.82,
  },

  // Fertile temperate: abundant forests, sparse desert, moderate marsh
  terrainRules: {
    forestMinMoisture:      0.40,
    denseForestMinMoisture: 0.55,
    desertMaxMoisture:      0.15,
    marshMinMoisture:       0.60,
    marshMaxElevation:      0.35,
    mountainThreshold:      0.60,
    waterMaxElevation:      0.10,
  },

  features: [
    // Giant mushrooms — rarest first
    { kind: 'edenMushroom',          threshold: 0.970, compare: 'gt', terrainExclude: ['desert', 'marsh'], tier: 'T2' },
    { kind: 'edenShroomlet',         threshold: 0.920, compare: 'gt', terrainExclude: ['desert'], tier: 'T2' },
    // Treasure chest — any-biome collectible
    { kind: 'treasureChest',                 threshold: 0.900, compare: 'gt', terrainExclude: [], tier: 'T2' },
    // Standard features
    { kind: 'blessedFont',           threshold: 0.890, compare: 'gt', terrainOnly: ['forest', 'denseForest'] },
    // Resources
    { kind: 'knot',                  threshold: 0.038, compare: 'lt' },
  ],

  // Purple grass palette — all terrain types get a violet-magenta shift
  palette: {
    plains:        [0.550, 0.300, 0.550],  // purple grass
    forest:        [0.420, 0.200, 0.480],  // deep purple woodland
    denseForest:   [0.300, 0.150, 0.380],  // dark purple thicket
    desert:        [0.680, 0.550, 0.650],  // pale purple sand (rare)
    marsh:         [0.450, 0.350, 0.480],  // purple marsh
    hill:          [0.500, 0.320, 0.520],  // purple-tinted hill
    plateau:       [0.550, 0.420, 0.560],  // pale purple plateau
    mountain:      [0.480, 0.380, 0.500],  // purplish rock
    water:         [0.300, 0.380, 0.600],  // deep blue-purple
    beach:         [0.700, 0.550, 0.600],  // purple-tinted sand
  },
  // Biome color swatches for terrain-decor tinting (decor-consolidation):
  // material-class colors — foliage/bloom/exotic are this biome's identity
  // colors; wood/soil/stone fall back to BIOME_COLOR_DEFAULTS unless
  // overridden here. Decor parts sample a swatch via a per-part influence
  // parameter, blended across hexes.
  colors: {
    foliage: [0.550, 0.300, 0.550], // #8c4d8c — the distinctive purple
    wood: [0.350, 0.150, 0.300],    // #59264d — dark purple-barked trunks
    stone: [0.478, 0.380, 0.502],   // #7a6180 — purple-tinted rock
    bloom: [0.910, 0.760, 0.290],   // #e8c24a — gold
    exotic: [0.800, 0.650, 0.950],  // #cca7f2 — luminous orchid glow
  },
  terrainTags: ['plains', 'beach', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'water'],
  weatherAffinity: ['temperate', 'rainy'],

  terrainElevation: {
    forest: 0.20,
    denseForest: 0.30,
  },
});
