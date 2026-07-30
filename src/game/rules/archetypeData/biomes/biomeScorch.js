/**
 * biomeScorch.js — 'Scorch' biome.
 * Hot dry savanna with sparse trees, rare fruit trees, and scattered knots.
 */

import { defineArchetype } from '../../archetypes.js';

defineArchetype('biome_scorch', {
  type: 'biome',
  id: 'biome_scorch',
  name: 'Scorch',
  origin: 'natural',

  climateRange: {
    minMoisture: 0.22,
    maxMoisture: 0.60,
    minTemperature: 0.68,
  },

  terrainRules: {
    mountainThreshold: 0.50,
    forestMinMoisture: 0.76,
    denseForestMinMoisture: 0.88,
    desertMaxMoisture: 0.12,
    marshMinMoisture: 0.62,
    marshMaxElevation: 0.30,
    waterMaxElevation: 0.08,
  },

  // Scorch: sparse trees, rare fruit trees, scattered knots
  // Note: fruitTree must come before tree (higher threshold = rarer, first-match-wins)
  features: [
    // Low-roll hazard (narrow lt before broader knot)
    { kind: 'redLetterBramble', threshold: 0.01, compare: 'lt', terrainExclude: ['water', 'ice'] },
    // High-roll features — rarest first
    { kind: 'fruitTree', threshold: 0.980, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'saintsRib', threshold: 0.965, compare: 'gt', terrainExclude: [] },
    { kind: 'tree',      threshold: 0.945, compare: 'gt', terrainExclude: ['desert'] },
    // Resources
    { kind: 'knot',      threshold: 0.038, compare: 'lt' },
  ],

  palette: {
    plains:      [0.620, 0.580, 0.310],  // sun-bleached grass
    forest:      [0.420, 0.480, 0.220],  // dry woodland
    denseForest: [0.320, 0.380, 0.160],  // dark thicket
    desert:      [0.840, 0.700, 0.400],  // warm sand
    marsh:       [0.560, 0.540, 0.360],  // dry reed
    hill:        [0.560, 0.540, 0.340],  // dry grass hill
    plateau:     [0.600, 0.540, 0.440],  // warm dusty plateau
    mountain:    [0.580, 0.500, 0.400],  // warm rock
    peak:        [0.700, 0.660, 0.580],  // dusty peak
    water:       [0.340, 0.560, 0.700],  // warm blue
  },
  terrainTags: ['plains', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'water'],
  weatherAffinity: ['arid', 'temperate'],
  terrainElevation: { mountain: 0.70, plains: 0.05 },
  supportsFloatingIslands: false,
});
