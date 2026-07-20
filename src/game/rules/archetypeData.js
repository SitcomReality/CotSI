/**
 * archetypeData.js — All archetype definitions, loaded at import time.
 *
 * Each archetype is registered via defineArchetype() when this module is
 * first imported. This file is the single source of truth for what exists
 * in the game world.
 *
 * Categories (by `type` field): mob, feature, biome, weather
 * Start with mob archetypes — the worst offenders for indistinguishability.
 */

import { defineArchetype, createVariant } from './archetypes.js';

// =========================================================================
// MOB ARCHETYPES
// =========================================================================

// Each mob archetype defines:
//   type:          'mob'
//   name:          Display name
//   archetypeShape: Geometry identifier used by the renderer
//   baseStats:     { hp, maxHp, tier }
//   lootGold:      [min, max] — random range for gold dropped
//   aggressiveChance: 0–1 probability of being aggressive
//   tags:          Biome/terrain affinity tags
//   visual:        { scale, tint } — render hints

defineArchetype('mob_bear', {
  type: 'mob',
  name: 'Ink Bear',
  archetypeShape: 'bear',
  baseStats: { hp: 36, maxHp: 52, tier: 1 },
  lootGold: [12, 26],
  aggressiveChance: 0.25,
  tags: ['forest', 'plains'],
  visual: { scale: 1.0, tint: 'factionMutated' },
});

defineArchetype('mob_leopard', {
  type: 'mob',
  name: 'Lunar Leopard',
  archetypeShape: 'leopard',
  baseStats: { hp: 30, maxHp: 44, tier: 1 },
  lootGold: [10, 20],
  aggressiveChance: 0.40,
  tags: ['forest', 'desert', 'marsh'],
  visual: { scale: 1.0, tint: 'factionMutated' },
});

defineArchetype('mob_snail_knight', {
  type: 'mob',
  name: 'Snail Knight',
  archetypeShape: 'snail',
  baseStats: { hp: 48, maxHp: 64, tier: 1 },
  lootGold: [18, 34],
  aggressiveChance: 0.15,
  tags: ['marsh', 'plains'],
  visual: { scale: 1.0, tint: 'factionMutated' },
});

defineArchetype('mob_tapir', {
  type: 'mob',
  name: 'Solar Tapir',
  archetypeShape: 'tapir',
  baseStats: { hp: 40, maxHp: 56, tier: 1 },
  lootGold: [14, 28],
  aggressiveChance: 0.10,
  tags: ['plains', 'forest', 'desert'],
  visual: { scale: 1.0, tint: 'factionMutated' },
});

defineArchetype('mob_mushroom', {
  type: 'mob',
  name: 'Abusive Mushroom',
  archetypeShape: 'mushroom',
  baseStats: { hp: 24, maxHp: 36, tier: 1 },
  lootGold: [8, 16],
  aggressiveChance: 0.60,
  tags: ['marsh', 'forest'],
  visual: { scale: 1.0, tint: 'factionMutated' },
});

defineArchetype('mob_goose', {
  type: 'mob',
  name: 'Marginal Goose',
  archetypeShape: 'goose',
  baseStats: { hp: 28, maxHp: 40, tier: 1 },
  lootGold: [6, 12],
  aggressiveChance: 0.70,
  tags: ['plains', 'marsh'],
  visual: { scale: 1.0, tint: 'factionMutated' },
});

defineArchetype('mob_scorpion', {
  type: 'mob',
  name: 'Scorpiocelot',
  archetypeShape: 'scorpion',
  baseStats: { hp: 38, maxHp: 52, tier: 1 },
  lootGold: [16, 30],
  aggressiveChance: 0.35,
  tags: ['desert', 'plains'],
  visual: { scale: 1.0, tint: 'factionMutated' },
});

// ---- Mob variants (higher tier) ----

createVariant('mob_bear_elder', 'mob_bear', {
  name: 'Elder Ink Bear',
  archetypeShape: 'bear',
  baseStats: { hp: 72, maxHp: 84, tier: 2 },
  lootGold: [30, 50],
  aggressiveChance: 0.60,
  visual: { scale: 1.4, tint: 'factionMutated' },
});

createVariant('mob_scorpion_queen', 'mob_scorpion', {
  name: 'Scorpiocelot Queen',
  archetypeShape: 'scorpion',
  baseStats: { hp: 68, maxHp: 80, tier: 2 },
  lootGold: [34, 56],
  aggressiveChance: 0.80,
  visual: { scale: 1.5, tint: 'factionMutated' },
});

// =========================================================================
// FEATURE ARCHETYPES (placeholder definitions, expanded in Phase 3/5)
// =========================================================================

defineArchetype('feature_tree', {
  type: 'feature',
  name: 'Manuscript Tree',
  archetypeShape: 'tree',
  tags: ['forest', 'plains'],
  visual: { scale: 1.0 },
});

defineArchetype('feature_knot', {
  type: 'feature',
  name: "God's Knot",
  archetypeShape: 'knot',
  tags: ['any'],
  visual: { scale: 1.0 },
});

// =========================================================================
// BIOME ARCHETYPES
// =========================================================================

// Each biome defines:
//   type:              'biome'
//   name:              Display name shown in setup UI
//   terrainThresholds: Noise cutoffs for assigning terrain types.
//                      Each key is a terrain type; values are { minElevation, maxElevation,
//                      minMoisture, maxMoisture } — a tile must satisfy ALL specified
//                      conditions to be assigned that terrain.
//   featureFrequencies: Noise thresholds for spawning features per tile
//   palette:           RGB color tuples that override the default TERRAIN_COLOR in terrainMesh.js
//   terrainTags:       Terrain types this biome supports
//   weatherAffinity:   Weather types this biome is most associated with

defineArchetype('biome_default', {
  type: 'biome',
  name: 'Default Manuscript',
  terrainThresholds: {
    mountain: { minElevation: 0.905 },
    water: { maxElevation: 0.07, minMoisture: 0.5 },
    forest: { minMoisture: 0.72 },
    desert: { maxMoisture: 0.20 },
    marsh: { minMoisture: 0.58, maxElevation: 0.35 },
  },
  featureFrequencies: {
    tree: { threshold: 0.935, exclude: ['desert'] },
    knot: { threshold: 0.038 },
  },
  palette: {
    plains:   [0.455, 0.678, 0.365],  // vibrant meadow green
    forest:   [0.294, 0.557, 0.255],  // deep vivid forest
    desert:   [0.839, 0.694, 0.357],  // warm golden sand
    marsh:    [0.506, 0.600, 0.404],  // murky vibrant marsh
    mountain: [0.529, 0.486, 0.416],  // rocky warm gray
    water:    [0.373, 0.604, 0.757],  // bright cyan-blue
  },
  terrainTags: ['plains', 'forest', 'desert', 'marsh', 'mountain', 'water'],
  weatherAffinity: ['temperate', 'rainy'],
});

defineArchetype('biome_verdant', {
  type: 'biome',
  name: 'Verdant Weald',
  terrainThresholds: {
    mountain: { minElevation: 0.920 },
    water: { maxElevation: 0.05, minMoisture: 0.4 },
    forest: { minMoisture: 0.55 },
    desert: { maxMoisture: 0.08 },
    marsh: { minMoisture: 0.50, maxElevation: 0.40 },
  },
  featureFrequencies: {
    tree: { threshold: 0.880, exclude: ['desert'] },  // more trees
    knot: { threshold: 0.035 },
  },
  palette: {
    plains:   [0.380, 0.620, 0.280],  // deeper, richer green
    forest:   [0.220, 0.500, 0.180],  // darker, lusher forest
    desert:   [0.780, 0.650, 0.400],  // muted, sandy — rare here
    marsh:    [0.420, 0.550, 0.340],  // greener marsh
    mountain: [0.480, 0.520, 0.450],  // mossy gray
    water:    [0.300, 0.550, 0.700],  // deeper blue
  },
  terrainTags: ['plains', 'forest', 'marsh', 'mountain', 'water'],
  weatherAffinity: ['rainy', 'temperate'],
});

defineArchetype('biome_arid', {
  type: 'biome',
  name: 'Sere Wastes',
  terrainThresholds: {
    mountain: { minElevation: 0.890 },  // more mountains
    water: { maxElevation: 0.04, minMoisture: 0.7 },  // very rare water
    forest: { minMoisture: 0.85 },  // rare forest
    desert: { maxMoisture: 0.35 },  // very common desert
    marsh: { minMoisture: 0.75, maxElevation: 0.20 },
  },
  featureFrequencies: {
    tree: { threshold: 0.970, exclude: [] },  // very rare trees
    knot: { threshold: 0.040 },
  },
  palette: {
    plains:   [0.620, 0.520, 0.280],  // sun-bleached tan
    forest:   [0.400, 0.450, 0.200],  // sparse olive
    desert:   [0.880, 0.720, 0.380],  // bright golden sand
    marsh:    [0.580, 0.520, 0.350],  // dry reed-brown
    mountain: [0.580, 0.440, 0.350],  // warm reddish rock
    water:    [0.300, 0.520, 0.680],  // pale desert blue
  },
  terrainTags: ['plains', 'desert', 'mountain', 'water'],
  weatherAffinity: ['arid', 'temperate'],
});

// =========================================================================
// WEATHER ARCHETYPES (future — placeholder for the system)
// =========================================================================

// Weather is currently handled by weatherScript.js — archetype integration TBD
