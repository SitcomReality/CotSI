/**
 * biomeUnfinishedLands.js — 'Unfinished Lands' biome.
 * Supernatural half-formed terrain with incomplete rock, unfinished features, and desaturated palette.
 */

import { defineArchetype } from '../../archetypes.js';

defineArchetype('biome_unfinished_lands', {
  type: 'biome',
  id: 'biome_unfinished_lands',
  name: 'Unfinished Lands',
  origin: 'supernatural',

  epicenter: {
    radiusFraction:  0.11,
    radiusNoise:    1.5,
    noiseScale:     0.07,
  },

  fieldModifiers: {
    elevationOffset:     0.02,
    moistureMultiplier:  0.70,
    temperatureOffset:  -0.10,
  },

  // Raw, half-formed terrain: lots of mountains, barren, incomplete
  terrainRules: {
    mountainThreshold:      0.44,
    hillElevationMin:       0.08,
    forestMinMoisture:      0.80,
    denseForestMinMoisture: 0.90,
    desertMaxMoisture:      0.35,
    waterMaxElevation:      0.04,
  },

  features: [
    { kind: 'errataSlip',       threshold: 0.99, compare: 'gt', terrainExclude: [], tier: 'T4' },
    { kind: 'gildedInitial',    threshold: 0.98, compare: 'gt', terrainExclude: [], tier: 'T3' },
    { kind: 'palimpsestSlab',   threshold: 0.96, compare: 'gt', terrainExclude: [], tier: 'T3' },
    { kind: 'halfDrawnObelisk', threshold: 0.95, compare: 'gt', terrainExclude: [], tier: 'T4' },
    { kind: 'nullLily',         threshold: 0.93, compare: 'gt', terrainExclude: [], tier: 'T3' },
    { kind: 'chest',            threshold: 0.90, compare: 'gt', terrainExclude: [], tier: 'T2' },
    { kind: 'knot',             threshold: 0.03, compare: 'lt' },
  ],

  palette: {
    plains:   [0.650, 0.620, 0.580],  // faded earth
    desert:   [0.750, 0.680, 0.550],  // bleached sand
    hill:     [0.580, 0.550, 0.520],  // washed grey-brown
    plateau:  [0.550, 0.520, 0.500],  // unfinished grey
    mountain: [0.520, 0.500, 0.480],  // pale incomplete rock
    water:    [0.400, 0.480, 0.580],  // desaturated blue
    ice:      [0.650, 0.680, 0.720],  // pale teal
    beach:    [0.750, 0.700, 0.620],  // faded half-formed sand
  },
  terrainTags: ['plains', 'beach', 'desert', 'hill', 'plateau', 'mountain', 'water', 'ice'],
  weatherAffinity: ['arid', 'temperate'],
});
