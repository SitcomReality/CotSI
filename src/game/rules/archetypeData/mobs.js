/**
 * mobs.js — Mob archetype definitions.
 *
 * Each mob archetype defines:
 *   type:          'mob'
 *   name:          Display name
 *   archetypeShape: Geometry identifier used by the renderer
 *   baseStats:     { hp, maxHp, tier }
 *   lootGold:      [min, max] — random range for gold dropped
 *   aggressiveChance: 0–1 probability of being aggressive
 *   tags:          Biome/terrain affinity tags
 *   visual:        { scale, tint } — render hints
 *
 * The `archetypeShape` key must match a variant id in the mob descriptor
 * (worldObjects/descriptors/data/mob.js, variants composed from data/mobs/),
 * which the renderer resolves via variantRule 'archetype'.
 */

import { defineArchetype } from '../archetypes.js';

defineArchetype('mob_infernalpaca', {
  type: 'mob',
  name: 'Infernalpaca',
  archetypeShape: 'infernalpaca',
  baseStats: { hp: 36, maxHp: 52, tier: 1 },
  lootGold: [12, 26],
  aggressiveChance: 0.25,
  tags: ['forest', 'plains'],
  visual: { scale: 1.1, tint: 'factionMutated' },
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
  terrainCosts: { marsh: 6, river: 15 },
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
  terrainCosts: { river: 10, water: 20, marsh: 10 },
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
  terrainCosts: { river: 4, water: 4 },
  visual: { scale: 1.0, tint: 'factionMutated' },
});

defineArchetype('mob_scorpelican', {
  type: 'mob',
  name: 'Scorpelican',
  archetypeShape: 'scorpelican',
  baseStats: { hp: 38, maxHp: 52, tier: 1 },
  lootGold: [16, 30],
  aggressiveChance: 0.35,
  tags: ['desert', 'plains'],
  visual: { scale: 1.2, tint: 'factionMutated' },
});
