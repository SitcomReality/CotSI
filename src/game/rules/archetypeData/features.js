/**
 * features.js — Feature archetype definitions.
 *
 * Each feature archetype defines:
 *   type:           'feature'
 *   name:           Display name
 *   archetypeShape: Geometry identifier used by the renderer.
 *                   'tree' / 'knot' → dedicated builder.
 *                   Anything else → simpleFeatureMeshes.js + FEATURE_VISUALS registry.
 *   tags:           Biome/terrain affinity tags for spawn rules
 *   visual:         { scale } — render hints
 *
 * Adding a new simple feature:
 *   1. Add its defineArchetype call here
 *   2. Add an entry to src/render/hexmap3d/features/descriptors/data/simpleFeatures.js
 *   3. Add a biome rule referencing its kind
 *   4. Add an entry to dev/analysis/render/theme.js FEATURES table
 */

import { defineArchetype } from '../archetypes.js';

// ── Existing features ──────────────────────────────────────────────────────────

defineArchetype('feature_tree', {
  type: 'feature',
  name: 'Tree',
  archetypeShape: 'tree',
  tags: ['forest', 'plains'],
  visual: { scale: 1.0 },
});

defineArchetype('feature_fruitTree', {
  type: 'feature',
  name: 'Moonberry Tree',
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

defineArchetype('feature_treasureChest', {
  type: 'feature',
  name: 'Treasure Chest',
  archetypeShape: 'box',
  tags: ['any'],
  visual: { scale: 1.0 },
});

defineArchetype('feature_bush', {
  type: 'feature',
  name: 'Scrub Bush',
  archetypeShape: 'tuft',
  tags: ['plains', 'forest', 'hill'],
  visual: { scale: 1.5 },
});

// ── Group 1: Unique mechanics, strong theme ─────────────────────────────────────

defineArchetype('feature_palimpsestSlab', {
  type: 'feature',
  name: 'Palimpsest Slab',
  archetypeShape: 'slab',
  tags: ['unfinished', 'untouched'],
  visual: { scale: 1.0 },
});

defineArchetype('feature_volvelle', {
  type: 'feature',
  name: 'Volvelle',
  archetypeShape: 'disc',
  tags: ['brass_grave'],
  visual: { scale: 0.9 },
});

defineArchetype('feature_foolsFire', {
  type: 'feature',
  name: "Fool's-Fire",
  archetypeShape: 'orb',
  tags: ['mourning_marsh'],
  visual: { scale: 0.7 },
});

defineArchetype('feature_vegetableLamb', {
  type: 'feature',
  name: 'Vegetable Lamb of Tartary',
  archetypeShape: 'plant',
  tags: ['plains', 'forest'],
  visual: { scale: 1.1 },
});

defineArchetype('feature_scoriaRose', {
  type: 'feature',
  name: 'Scoria Rose',
  archetypeShape: 'plant',
  tags: ['brass_grave'],
  visual: { scale: 0.8 },
});

defineArchetype('feature_waxbloom', {
  type: 'feature',
  name: 'Waxbloom',
  archetypeShape: 'plant',
  tags: ['frigid_silence'],
  visual: { scale: 0.9 },
});

defineArchetype('feature_errataSlip', {
  type: 'feature',
  name: 'Errata Slip',
  archetypeShape: 'slab',
  tags: ['unfinished'],
  visual: { scale: 1.2 },
});

// ── Group 2: Strong but simpler, or modest overlap ──────────────────────────────

defineArchetype('feature_gildedInitial', {
  type: 'feature',
  name: 'Gilded Initial',
  archetypeShape: 'monument',
  tags: ['untouched', 'unfinished'],
  visual: { scale: 1.5 },
});

defineArchetype('feature_peridexionTree', {
  type: 'feature',
  name: 'Peridexion Tree',
  archetypeShape: 'tree',
  tags: ['forest'],
  visual: { scale: 1.6 },
});

defineArchetype('feature_listenerLichen', {
  type: 'feature',
  name: 'Listener Lichen',
  archetypeShape: 'cluster',
  tags: ['frigid_silence', 'sere_wastes'],
  visual: { scale: 0.7 },
});

defineArchetype('feature_saintsRib', {
  type: 'feature',
  name: "Saint's Rib",
  archetypeShape: 'arch',
  tags: ['sere_wastes', 'scorch'],
  visual: { scale: 2.0 },
});

defineArchetype('feature_drownedCopyist', {
  type: 'feature',
  name: 'Drowned Copyist',
  archetypeShape: 'figure',
  tags: ['mourning_marsh'],
  visual: { scale: 1.2 },
});

defineArchetype('feature_censerSaint', {
  type: 'feature',
  name: 'Censer Saint',
  archetypeShape: 'censer',
  tags: ['brass_grave'],
  visual: { scale: 1.1 },
});

defineArchetype('feature_screamroot', {
  type: 'feature',
  name: 'Screamroot',
  archetypeShape: 'plant',
  tags: ['untouched', 'painforest', 'mourning_marsh'],
  visual: { scale: 1.0 },
});

defineArchetype('feature_nullLily', {
  type: 'feature',
  name: 'Null Lily',
  archetypeShape: 'plant',
  tags: ['unfinished'],
  visual: { scale: 0.8 },
});

defineArchetype('feature_halfDrawnObelisk', {
  type: 'feature',
  name: 'Half-Drawn Obelisk',
  archetypeShape: 'obelisk',
  tags: ['unfinished'],
  visual: { scale: 1.8 },
});

defineArchetype('feature_witnessStone', {
  type: 'feature',
  name: 'Witness-Stone',
  archetypeShape: 'stone',
  tags: ['untouched', 'scorch'],
  visual: { scale: 1.3 },
});

defineArchetype('feature_cinderbloom', {
  type: 'feature',
  name: 'Cinderbloom',
  archetypeShape: 'plant',
  tags: ['brass_grave'],
  visual: { scale: 0.8 },
});

defineArchetype('feature_ouroborosLoop', {
  type: 'feature',
  name: 'Ouroboros Loop',
  archetypeShape: 'ring',
  tags: ['sere_wastes'],
  visual: { scale: 1.2 },
});

// ── Edenfall biome features ─────────────────────────────────────────────────

defineArchetype('feature_edenMushroom', {
  type: 'feature',
  name: 'Eden Mushroom',
  archetypeShape: 'bigtree',
  tags: ['edenfall'],
  visual: { scale: 2.5 },
});

defineArchetype('feature_edenShroomlet', {
  type: 'feature',
  name: 'Shroomlet',
  archetypeShape: 'cluster',
  tags: ['edenfall'],
  visual: { scale: 1.2 },
});

// ── Dustbleed biome features ──────────────────────────────────────────────

defineArchetype('feature_dustbleedCrystal', {
  type: 'feature',
  name: 'Dustbleed Crystal',
  archetypeShape: 'cluster',
  tags: ['dustbleed'],
  visual: { scale: 1.2 },
});

// ── Tundra biome features ──────────────────────────────────────────

defineArchetype('feature_snowperson', {
  type: 'feature',
  name: 'Snowperson',
  archetypeShape: 'snowperson',
  tags: ['tundra'],
  visual: { scale: 1.0 },
});
