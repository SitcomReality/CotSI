/**
 * features.js — Feature archetype definitions (placeholder, expanded in Phase 3/5).
 *
 * Each feature archetype defines:
 *   type:          'feature'
 *   name:          Display name
 *   archetypeShape: Geometry identifier used by the renderer
 *   tags:          Biome/terrain affinity tags
 *   visual:        { scale } — render hints
 */

import { defineArchetype } from '../archetypes.js';

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
