/**
 * biomeBrassGrave.js — 'Brass Grave' biome.
 * A supernatural biome of warm brass-toned wasteland with unique features.
 */

import { defineArchetype } from '../../archetypes.js';

defineArchetype('biome_brass_grave', {
  type: 'biome',
  id: 'biome_brass_grave',
  name: 'Brass Grave',
  origin: 'supernatural',

  epicenter: {
    radiusFraction:  0.11,
    radiusNoise:    0.50,
    noiseScale:     10.00,
  },

  fieldModifiers: {
    elevationOffset:    -0.05,
    moistureMultiplier:  0.50,
    temperatureOffset:  -0.15,
  },

  terrainRules: {
    mountainThreshold:  0.52,
    forestMinMoisture:  0.92,
    desertMaxMoisture:  0.35,
    waterMaxElevation:  0.06,
  },

  features: [
    // Rare unique features
    { kind: 'volvelle',       threshold: 0.99, compare: 'gt', terrainExclude: [] },
    { kind: 'censerSaint',    threshold: 0.98, compare: 'gt', terrainExclude: [] },
    // Decorative features
    { kind: 'scoriaRose',     threshold: 0.95, compare: 'gt', terrainExclude: ['ice'] },
    { kind: 'cinderbloom',    threshold: 0.92, compare: 'gt', terrainExclude: ['ice'] },
    // Treasure chest — any-biome collectible
    { kind: 'chest',          threshold: 0.90, compare: 'gt', terrainExclude: [] },
    // Hazard (narrow lt before broader knot)
    { kind: 'brassLungVent',  threshold: 0.02, compare: 'lt', terrainExclude: [] },
    // Resources
    { kind: 'knot',           threshold: 0.08, compare: 'lt' },
  ],

  palette: {
    plains:   [0.710, 0.630, 0.420],  // warm brass
    desert:   [0.780, 0.650, 0.380],  // bleached brass
    hill:     [0.620, 0.550, 0.370],  // brass-toned brown
    plateau:  [0.550, 0.480, 0.380],  // dark oxidized brass
    mountain: [0.580, 0.450, 0.320],  // dark oxidized brass
    peak:     [0.750, 0.680, 0.550],  // pale brass highlight
    water:    [0.350, 0.450, 0.500],  // murky metallic blue
    ice:      [0.600, 0.680, 0.720],  // cold brass-teal
    beach:    [0.780, 0.680, 0.480],  // warm brass-tinged sand
  },
  terrainTags: ['plains', 'beach', 'desert', 'hill', 'plateau', 'mountain', 'peak', 'water', 'ice'],
  weatherAffinity: ['arid'],
});
