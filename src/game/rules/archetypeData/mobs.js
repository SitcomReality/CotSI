/**
 * mobs.js — Mob archetype definitions and their variants.
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
 */

import { defineArchetype, createVariant } from '../archetypes.js';

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
