/**
 * recordBuilder.js — Public API for descriptor record generation (barrel).
 *
 * Turns a descriptor (see schema.js) + one tile into instance records — the
 * same record format the mesh builders write (see meshBuilder.js), tagged with
 * `partId` so the assembler can group them by part geometry. Deterministic:
 * every decision is derived from the tile hash (tileHash.js), so the same tile
 * always produces the same records across chunk rebuilds. Entities (bases,
 * champions, mobs, traders) use the entity-driven path instead: one entity per
 * hex, variants and colors from entity state rather than the tile hash.
 *
 * Implementation lives in the focused sibling modules, re-exported here so
 * importers see one stable surface:
 *
 *   clusterCount.js    — item count from the descriptor's cluster rule
 *   variantSelection.js— which variant composes a tile's items / an entity
 *   itemPlacement.js   — displacement + per-item scatter/ring/jitter placement
 *   partScale.js       — per-part X/Y/Z scale (stretch, mountain height rule)
 *   partColor.js       — per-part instance colors (jitter, biome tint, tokens)
 *   partFrames.js      — group / nested-leaf / world-base frame matrices
 *   tileRecords.js     — recordsForDescriptor, nodeWorldFrames (tile path)
 *   entityRecords.js   — recordsForEntity, nodeWorldFramesForEntity (entity path)
 *
 * All modules are pure (no THREE) so the record math — cluster count, size
 * range, placement, and emphasis — is unit-testable in Node.
 */
export {
  recordsForDescriptor,
  nodeWorldFrames,
} from './tileRecords.js';

export {
  recordsForEntity,
  nodeWorldFramesForEntity,
} from './entityRecords.js';
