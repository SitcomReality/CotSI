/**
 * biomeTitanstain.js — 'Titanstain' biome.
 * A supernatural biome of cold titanflesh and titanblood, with unique features.
 */

import { defineArchetype } from '../../archetypes.js';

defineArchetype('biome_titanstain', {
  type: 'biome',
  id: 'biome_titanstain',
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

  // Titanflesh palette — the whole biome is corrupted titanflesh: sickly
  // flesh-pinks and bruised purples on land, deep titanblood crimson where
  // the world bleeds. Deliberately unnatural — nothing like the warm earthy
  // browns/oranges of the natural biomes.
  palette: {
    plains:      [0.720, 0.360, 0.500],  // titanflesh pink
    forest:      [0.500, 0.220, 0.380],  // dark flesh
    denseForest: [0.360, 0.150, 0.280],  // deep bruise
    desert:      [0.820, 0.560, 0.620],  // sickly pale flesh
    marsh:       [0.540, 0.300, 0.440],  // murky flesh
    hill:        [0.640, 0.320, 0.460],  // flesh-grey
    plateau:     [0.720, 0.440, 0.540],  // pale flesh
    mountain:    [0.460, 0.240, 0.340],  // dark flesh rock
    water:       [0.400, 0.060, 0.140],  // titanblood crimson
    ice:         [0.640, 0.320, 0.400],  // frozen titanblood
    beach:       [0.820, 0.580, 0.620],  // pale flesh sand
    river:       [0.400, 0.060, 0.140],  // titanblood
  },
  // Biome signature colors for terrain-decor tinting (decor-consolidation):
  // primary is the biome's hue, accent its secondary highlight; decor parts
  // sample these via a per-part influence parameter, blended across hexes.
  colors: {
    primary: [0.720, 0.360, 0.500], // #b85c80 — titanflesh pink
    accent: [0.400, 0.060, 0.140],  // #660f24 — titanblood crimson
  },
  // Supernatural terrain supersede: mountains stay Titanflesh Mountain, water
  // becomes titanblood, and every other hex is Titanflesh. movementCost is
  // uniform (no faction terrain bonuses apply) — see terrainOverrides.js.
  terrainOverrides: {
    mountain:    { name: 'Titanflesh Mountain' },
    water:       { name: 'Titanblood', decor: 'titanblood' },
    ice:         { name: 'Frozen Titanblood', decor: 'titanblood' },
    river:       { name: 'Titanblood River', movementCost: 30, decor: 'titanblood' },
    plains:      { name: 'Titanflesh', movementCost: 10, decor: 'titanflesh' },
    beach:       { name: 'Titanflesh', movementCost: 10, decor: 'titanflesh' },
    desert:      { name: 'Titanflesh', movementCost: 10, decor: 'titanflesh' },
    marsh:       { name: 'Titanflesh', movementCost: 15, decor: 'titanflesh' },
    hill:        { name: 'Titanflesh', movementCost: 12, decor: 'titanflesh' },
    plateau:     { name: 'Titanflesh', movementCost: 15, decor: 'titanflesh' },
    forest:      { name: 'Titanflesh', movementCost: 12, decor: 'titanflesh' },
    denseForest: { name: 'Titanflesh', movementCost: 20, decor: 'titanflesh' },
  },
  terrainTags: ['plains', 'beach', 'desert', 'hill', 'plateau', 'mountain', 'water', 'ice'],
  weatherAffinity: ['arid'],
});
