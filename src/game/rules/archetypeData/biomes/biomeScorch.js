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
    mountainThreshold: 0.60,
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
    // High-roll features — rarest first
    { kind: 'fruitTree', threshold: 0.980, compare: 'gt', terrainOnly: ['forest', 'denseForest'] },
    { kind: 'saintsRib', threshold: 0.965, compare: 'gt', terrainExclude: [], tier: 'T3' },
    { kind: 'tree',      threshold: 0.945, compare: 'gt', terrainExclude: ['desert', 'forest', 'denseForest'] },
    // Treasure chest — any-biome collectible
    { kind: 'treasureChest',     threshold: 0.900, compare: 'gt', terrainExclude: [], tier: 'T2' },
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
    water:       [0.340, 0.560, 0.700],  // warm blue
    beach:       [0.900, 0.750, 0.500],  // hot bright sand
  },
  // Biome signature colors for terrain-decor tinting (decor-consolidation):
  // primary is the biome's hue, accent its secondary highlight; decor parts
  // sample these via a per-part influence parameter, blended across hexes.
  colors: {
    primary: [0.910, 0.440, 0.100], // #e8701a — hot orange
    accent: [0.550, 0.550, 0.550],  // #8c8c8c — ash grey
  },
  terrainTags: ['plains', 'beach', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'water'],
  weatherAffinity: ['arid', 'temperate'],
  terrainElevation: { mountain: 0.70, plains: 0.05 },
});
