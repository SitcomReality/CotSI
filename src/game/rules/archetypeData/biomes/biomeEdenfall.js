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

  // Temperate mid-moisture — fills the gap between hot savanna and cold frigid_silence
  // Wide maxMoisture (0.70) catches boundary tiles near painforest's edge
  // that would otherwise fall through due to regional bias.
  climateRange: {
    minMoisture: 0.20,
    maxMoisture: 0.70,
    minTemperature: 0.48,
    maxTemperature: 0.65,
  },

  // Fertile temperate: abundant forests, sparse desert, moderate marsh
  terrainRules: {
    forestMinMoisture:      0.40,
    denseForestMinMoisture: 0.55,
    desertMaxMoisture:      0.15,
    marshMinMoisture:       0.60,
    marshMaxElevation:      0.35,
    mountainThreshold:      0.50,
    waterMaxElevation:      0.10,
  },

  features: [
    // Giant mushrooms — rarest first
    { kind: 'edenMushroom',          threshold: 0.970, compare: 'gt', terrainExclude: ['desert', 'marsh'] },
    { kind: 'edenShroomlet',         threshold: 0.920, compare: 'gt', terrainExclude: ['desert'] },
    // Standard features
    { kind: 'fruitTree',             threshold: 0.890, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'tree',                  threshold: 0.830, compare: 'gt', terrainExclude: ['desert'] },
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
    peak:          [0.650, 0.580, 0.720],  // pale purple snow
    water:         [0.300, 0.380, 0.600],  // deep blue-purple
  },
  terrainTags: ['plains', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'water'],
  weatherAffinity: ['temperate', 'rainy'],

  terrainElevation: {
    forest: 0.20,
    denseForest: 0.30,
  },
  supportsFloatingIslands: false,
});
