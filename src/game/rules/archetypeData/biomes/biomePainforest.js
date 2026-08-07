/**
 * biomePainforest.js — 'Painforest' biome.
 * Wet temperate biome with abundant fruit trees and deep lush greenery.
 */

import { defineArchetype } from '../../archetypes.js';

defineArchetype('biome_painforest', {
  type: 'biome',
  id: 'biome_painforest',
  name: 'Painforest',
  origin: 'natural',

  climateRange: {
    minMoisture: 0.62,
    minTemperature: 0.25,
  },

  terrainRules: {
    forestMinMoisture: 0.55,
    denseForestMinMoisture: 0.80,
    desertMaxMoisture: 0.08,
    marshMinMoisture: 0.50,
    marshMaxElevation: 0.40,
    mountainThreshold: 0.65,
  },

  // Painforest: abundant fruit trees + decorative trees + bushes on low-moisture tiles
  features: [
    { kind: 'fruitTree',       threshold: 0.930, compare: 'gt', terrainOnly: ['forest', 'denseForest'] },
    { kind: 'peridexionTree',  threshold: 0.910, compare: 'gt', terrainExclude: ['desert', 'marsh'], tier: 'T3' },
    { kind: 'chest',           threshold: 0.900, compare: 'gt', terrainExclude: [], tier: 'T2' },
    { kind: 'screamroot',      threshold: 0.890, compare: 'gt', terrainExclude: ['desert'], tier: 'T3' },
    { kind: 'tree',            threshold: 0.860, compare: 'gt', terrainExclude: ['desert', 'forest', 'denseForest'] },
    { kind: 'bush',            threshold: 0.060, compare: 'lt', terrainExclude: ['desert', 'marsh'] },
    { kind: 'knot',            threshold: 0.035, compare: 'lt' },
  ],

  palette: {
    plains:        [0.380, 0.620, 0.280],  // deeper, richer green
    forest:        [0.220, 0.500, 0.180],  // darker, lusher forest
    denseForest:   [0.120, 0.350, 0.100],  // very dark deep wood
    desert:        [0.780, 0.650, 0.400],  // muted, sandy — rare here
    marsh:         [0.420, 0.550, 0.340],  // greener marsh
    hill:          [0.400, 0.580, 0.300],  // mossy green
    plateau:       [0.500, 0.520, 0.430],  // mossy grey
    mountain:      [0.480, 0.520, 0.450],  // mossy gray
    water:         [0.300, 0.550, 0.700],  // deeper blue
    beach:         [0.650, 0.550, 0.380],  // mossy green-tinged sand
  },
  terrainTags: ['plains', 'beach', 'forest', 'denseForest', 'marsh', 'hill', 'plateau', 'mountain', 'water'],
  weatherAffinity: ['rainy', 'temperate'],

  terrainElevation: {
    forest: 0.18,
    denseForest: 0.25,
    marsh: -0.08,
  },
});
