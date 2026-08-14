/**
 * biomeBrassGrave.js — 'Titanstain' biome.
 * A supernatural biome of cold titanflesh and titanblood, with unique features.
 */

import { defineArchetype } from '../../archetypes.js';

defineArchetype('biome_brass_grave', {
  type: 'biome',
  id: 'biome_brass_grave',
  name: 'Titanstain',
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
    mountainThreshold:  0.62,
    forestMinMoisture:  0.92,
    desertMaxMoisture:  0.35,
    waterMaxElevation:  0.06,
  },

  features: [
    // Rare unique features
    { kind: 'volvelle',       threshold: 0.99, compare: 'gt', terrainExclude: [], tier: 'T3' },
    { kind: 'censerSaint',    threshold: 0.98, compare: 'gt', terrainExclude: [], tier: 'T3' },
    // Decorative features
    { kind: 'scoriaRose',     threshold: 0.95, compare: 'gt', terrainExclude: ['ice'], tier: 'T2' },
    { kind: 'cinderbloom',    threshold: 0.92, compare: 'gt', terrainExclude: ['ice'], tier: 'T2' },
    // Treasure chest — any-biome collectible
    { kind: 'treasureChest',          threshold: 0.90, compare: 'gt', terrainExclude: [], tier: 'T2' },
    // Resources
    { kind: 'knot',           threshold: 0.08, compare: 'lt' },
  ],

  palette: {
    plains:   [0.710, 0.630, 0.420],  // warm brass
    desert:   [0.780, 0.650, 0.380],  // bleached brass
    hill:     [0.620, 0.550, 0.370],  // brass-toned brown
    plateau:  [0.550, 0.480, 0.380],  // dark oxidized brass
    mountain: [0.580, 0.450, 0.320],  // dark oxidized brass
    water:    [0.350, 0.450, 0.500],  // murky metallic blue
    ice:      [0.600, 0.680, 0.720],  // cold brass-teal
    beach:    [0.780, 0.680, 0.480],  // warm brass-tinged sand
  },
  // Biome signature colors for terrain-decor tinting (decor-consolidation):
  // primary is the biome's hue, accent its secondary highlight; decor parts
  // sample these via a per-part influence parameter, blended across hexes.
  colors: {
    primary: [0.710, 0.630, 0.420], // #b5a16b — warm brass
    accent: [0.600, 0.680, 0.720],  // #99adb8 — cold patina teal
  },
  // Supernatural terrain supersede: mountains stay Titanflesh Mountain, water
  // becomes titanblood, and every other hex is Titanflesh. movementCost is
  // uniform (no faction terrain bonuses apply) — see terrainOverrides.js.
  terrainOverrides: {
    mountain:    { name: 'Titanflesh Mountain' },
    water:       { name: 'Titanblood' },
    ice:         { name: 'Frozen Titanblood' },
    river:       { name: 'Titanblood River', movementCost: 30 },
    plains:      { name: 'Titanflesh', movementCost: 10 },
    beach:       { name: 'Titanflesh', movementCost: 10 },
    desert:      { name: 'Titanflesh', movementCost: 10 },
    marsh:       { name: 'Titanflesh', movementCost: 15 },
    hill:        { name: 'Titanflesh', movementCost: 12 },
    plateau:     { name: 'Titanflesh', movementCost: 15 },
    forest:      { name: 'Titanflesh', movementCost: 12 },
    denseForest: { name: 'Titanflesh', movementCost: 20 },
  },
  terrainTags: ['plains', 'beach', 'desert', 'hill', 'plateau', 'mountain', 'water', 'ice'],
  weatherAffinity: ['arid'],
});
