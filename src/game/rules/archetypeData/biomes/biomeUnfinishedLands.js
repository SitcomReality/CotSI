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
    { kind: 'treasureChest',            threshold: 0.90, compare: 'gt', terrainExclude: [], tier: 'T2' },
    { kind: 'knot',             threshold: 0.03, compare: 'lt' },
  ],

  // Half-formed ghost palette — every terrain is a pale, unfinished echo of
  // itself, washed toward a cold electric cyan. Unnatural, alien vibrancy:
  // the world is literally not finished being rendered.
  palette: {
    plains:      [0.520, 0.740, 0.740],  // ghost cyan-green
    forest:      [0.300, 0.600, 0.640],  // electric teal
    denseForest: [0.200, 0.460, 0.520],  // deep electric
    desert:      [0.760, 0.780, 0.720],  // bleached ghost
    marsh:       [0.420, 0.660, 0.600],  // sickly teal
    hill:        [0.500, 0.680, 0.680],  // ghost hill
    plateau:     [0.580, 0.740, 0.720],  // pale ghost plateau
    mountain:    [0.420, 0.580, 0.640],  // ghost rock
    water:       [0.180, 0.520, 0.680],  // Forespring
    ice:         [0.620, 0.840, 0.880],  // pale cyan
    beach:       [0.760, 0.800, 0.760],  // pale ghost sand
    river:       [0.180, 0.520, 0.680],  // Forespring
  },
  // Biome signature colors for terrain-decor tinting (decor-consolidation):
  // primary is the biome's hue, accent its secondary highlight; decor parts
  // sample these via a per-part influence parameter, blended across hexes.
  colors: {
    primary: [0.940, 0.740, 0.800], // #f0bdcc — light pink
    accent: [0.300, 0.850, 1.000],  // #4dd9ff — electric blue
  },
  // Supernatural terrain supersede: the regular terrain is re-presented as a
  // half-formed analogue. movementCost is uniform (no faction terrain bonuses
  // apply) — see terrainOverrides.js.
  terrainOverrides: {
    water:       { name: 'Forespring', decor: 'forespring' },
    ice:         { name: 'Forespring', decor: 'forespring' },
    river:       { name: 'Forespring', movementCost: 30, decor: 'forespring' },
    plains:      { name: 'Yetlands', movementCost: 10, decor: 'unfinishedScrap' },
    beach:       { name: 'Yetlands', movementCost: 10, decor: 'unfinishedScrap' },
    desert:      { name: 'Yetlands', movementCost: 10, decor: 'unfinishedScrap' },
    plateau:     { name: 'Yetlands', movementCost: 15, decor: 'unfinishedScrap' },
    mountain:    { name: 'Sky Stalagmite' },
    forest:      { name: 'Protogrowth', movementCost: 12, decor: 'unfinishedScrap' },
    denseForest: { name: 'Protogrowth', movementCost: 20, decor: 'unfinishedScrap' },
    marsh:       { name: 'Protogrowth', movementCost: 15, decor: 'unfinishedScrap' },
    hill:        { name: 'Half-Hewn Rise', movementCost: 12, decor: 'unfinishedScrap' },
  },
  terrainTags: ['plains', 'beach', 'desert', 'hill', 'plateau', 'mountain', 'water', 'ice'],
  weatherAffinity: ['arid', 'temperate'],
});
