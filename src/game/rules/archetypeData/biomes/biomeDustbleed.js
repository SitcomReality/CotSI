/**
 * biomeDustbleed.js — 'Dustbleed' biome.
 * Low-elevation, low-moisture cursed terrain tainted by dried god-blood.
 */

import { defineArchetype } from '../../archetypes.js';

defineArchetype('biome_dustbleed', {
  type: 'biome',
  id: 'biome_dustbleed',
  name: 'Dustbleed',
  origin: 'natural',

  // Widened to cover more low-elevation drylands and transitional tiles.
  // maxMoisture raised from 0.42→0.50 and maxElevation from 0.25→0.30
  // to catch more tiles that don't fit other biomes.
  // Stays after cold biomes in priority so cold-dry tiles go to frigid_silence.
  climateRange: {
    minElevation: 0,
    maxElevation: 0.30,
    maxMoisture:  0.50,
  },

  // Low-elevation, low-moisture cursed terrain — tainted by dried god-blood
  terrainRules: {
    desertMaxMoisture:    0.35,
    forestMinMoisture:    0.60,
    mountainThreshold:    0.92,
    waterMaxElevation:    0.04,
    waterMinMoisture:     0.70,
    marshMinMoisture:     0.60,
    marshMaxElevation:    0.15,
  },

  // Dustbleed: sparse cursed-land features — turquoise crystals, rare screamroot
  features: [
    { kind: 'screamroot',       threshold: 0.96, compare: 'gt', terrainExclude: [], tier: 'T3' },
    { kind: 'dustbleedCrystal', threshold: 0.94, compare: 'gt', terrainExclude: [], tier: 'T2' },
    { kind: 'treasureChest',            threshold: 0.90, compare: 'gt', terrainExclude: [], tier: 'T2' },
    { kind: 'knot',             threshold: 0.04, compare: 'lt' },
  ],

  palette: {
    plains:        [0.550, 0.200, 0.150],  // deep rusty red-brown (dead cursed grass)
    forest:        [0.250, 0.500, 0.450],  // dark teal (grass quenched by god blood)
    denseForest:   [0.150, 0.400, 0.350],  // deeper teal thicket
    desert:        [0.700, 0.350, 0.200],  // reddish sandy
    marsh:         [0.350, 0.250, 0.200],  // murky blood-mud
    hill:          [0.500, 0.250, 0.200],  // rusty hill
    plateau:       [0.550, 0.300, 0.250],  // dusty red plateau
    mountain:      [0.450, 0.250, 0.220],  // dark red rock
    water:         [0.200, 0.450, 0.500],  // murky teal (tainted water)
    beach:         [0.650, 0.350, 0.250],  // rusty tainted sand
  },
  // Biome color swatches for terrain-decor tinting (decor-consolidation):
  // material-class colors — foliage/bloom/exotic are this biome's identity
  // colors; wood/soil/stone fall back to BIOME_COLOR_DEFAULTS unless
  // overridden here. Decor parts sample a swatch via a per-part influence
  // parameter, blended across hexes.
  colors: {
    foliage: [0.550, 0.200, 0.150], // #8c3326 — deep rusty red
    soil: [0.470, 0.270, 0.210],    // #784536 — rusty tainted earth
    bloom: [0.720, 0.700, 0.500],   // #b8b380 — sickly pale blossom
    exotic: [0.250, 0.500, 0.450],  // #408073 — turquoise (the crystals)
  },
  terrainTags: ['plains', 'beach', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'water'],
  weatherAffinity: ['arid', 'temperate'],

  terrainElevation: null,
});
