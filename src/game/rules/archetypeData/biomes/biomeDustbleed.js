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
    { kind: 'dustbleedCrystal', threshold: 0.94, compare: 'gt', terrainExclude: [] },
    { kind: 'screamroot',       threshold: 0.96, compare: 'gt', terrainExclude: [] },
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
    peak:          [0.600, 0.450, 0.400],  // pale red-grey
    water:         [0.200, 0.450, 0.500],  // murky teal (tainted water)
    beach:         [0.650, 0.350, 0.250],  // rusty tainted sand
  },
  terrainTags: ['plains', 'beach', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'water'],
  weatherAffinity: ['arid', 'temperate'],

  terrainElevation: null,
  supportsFloatingIslands: false,
});
