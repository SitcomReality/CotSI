// worldMeshes.js — Top-level world-object mesh entry point: descriptor-driven
// features + terrain decor, and champion bases.
import { buildChunkBaseMeshes } from './baseMeshes.js';
import { buildChunkDescriptorFeatureMeshes } from './descriptors/gameBuilder.js';
import { addOutlines } from '../scene/outline.js';
import { occupiedKeys } from './decorEmphasis.js';

export { buildChunkBaseMeshes, buildChunkDescriptorFeatureMeshes };

/**
 * Gate set for terrain decorations: `visible` ∪ `explored`. Decor is purely
 * cosmetic, so it also renders on explored-but-out-of-sight tiles (features,
 * bases, and units stay gated on `visible`). Built once per chunk so the tree
 * and descriptor passes share the same union.
 */
function decorGate(visible, explored) {
  return explored && explored.size > 0 ? new Set([...visible, ...explored]) : visible;
}

/**
 * Build world-object meshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {object} state - Game state (occupant positions for de-emphasis)
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @param {Set<string>} [explored] - Set of hex keys ever explored; terrain
 *        decorations (mountain, hill mound, grove) render on explored tiles
 *        even outside the view radius
 * @returns {(THREE.InstancedMesh|THREE.Group)[]}
 */
export function buildChunkWorldMeshes(chunkTiles, state, visible, explored = new Set()) {
  const results = [];
  const occupants = occupiedKeys(state);
  const decor = decorGate(visible, explored);

  results.push(...buildChunkDescriptorFeatureMeshes(chunkTiles, visible, occupants, decor, state.biomeColors ?? null, state.biomePalettes ?? null, state.biomeDecorOverrides ?? null));
  results.push(...buildChunkBaseMeshes(chunkTiles, visible));

  // Ink-outline twins for every feature mesh (units + features coverage —
  // see aestheticConventions §11). addOutlines returns [source, ...hulls].
  return results.flatMap(addOutlines);
}
