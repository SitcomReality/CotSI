/**
 * gameBuilder.js — Game-side resolution: tiles → descriptors → InstancedMeshes.
 *
 * The descriptor-pipeline replacement for the per-kind builders it supersedes
 * (mountainMeshes.js, knotMeshes.js, simpleFeatureMeshes.js, hillDecorMeshes.js
 * and the solitary-tree half of trees/treeRecordsForTile.js). Dispatch matches
 * the old builders' rules; once a tile resolves to a descriptor,
 * recordsForDescriptor → buildDescriptorMeshes renders it.
 *
 * A tile may resolve to several objects, one group per descriptor:
 *   feature (claims the hex center; gated on the visible set):
 *     knot feature (unmined)      → knot descriptor
 *     tree on open terrain → solitary tree descriptor
 *     any other kind with a descriptor → that descriptor (26 simple archetypes)
 *   terrain decoration (composes with the feature above; also rendered on
 *   explored-but-out-of-sight tiles, where it shows its unoccupied state):
 *     mountain terrain            → mountain descriptor (emphasis 'none')
 *     forest/denseForest (non-Painforest) → grove descriptor; dispersed to a
 *       ring near the hex edge when a non-tree feature claims the center,
 *       hidden when an occupant and feature share the tile
 *     hill terrain                → hill descriptor; sunk below the surface
 *       when the center is claimed, hidden when occupant + feature share it
 *
 * Kept on the legacy tree builder (not migrated — see descriptors/data/):
 * fruitTree and Painforest gnarled groves. Champion bases stay on
 * baseMeshes.js (out of scope).
 */

import { collectInstances } from '../meshBuilder.js';
import { buildDescriptorMeshes } from './meshAssembly.js';
import { recordsForDescriptor } from './recordBuilder.js';
import { normalizeDescriptor } from './schema.js';
import { descriptorById } from './data/index.js';
import { GROVE_DESCRIPTOR } from './data/trees.js';
import { HILL_DESCRIPTOR } from './data/hills.js';
import { KNOT_DESCRIPTOR } from './data/knots.js';
import { MOUNTAIN_DESCRIPTOR } from './data/mountains.js';
import {
  DECOR_STATE, DECORATION, decorState, isTileOccupied,
} from '../decorEmphasis.js';

/** Terrains whose default look is a scattered tree grove. */
const GROVE_TERRAINS = new Set(['forest', 'denseForest']);
/** Biome whose groves stay on the legacy gnarled-tree builder. */
const PAINFOREST_BIOME = 'biome_painforest';

/** True for a woods tile whose grove is migrated to descriptor data. */
function isGroveTerrain(tile) {
  return GROVE_TERRAINS.has(tile.terrain) && tile.biomeId !== PAINFOREST_BIOME;
}

/** True for any woods tile (descriptor grove or legacy Painforest grove). */
function isWoodsTerrain(tile) {
  return GROVE_TERRAINS.has(tile.terrain);
}

/**
 * Normalize a raw descriptor once per id. The data files ship schema-level
 * descriptors (no applied defaults); recordsForDescriptor and the mesh
 * assembler both expect the normalized form the editor edits.
 */
const normalizedCache = new Map();
function normalizedDescriptor(raw) {
  let normalized = normalizedCache.get(raw.id);
  if (!normalized) {
    normalized = normalizeDescriptor(raw);
    normalizedCache.set(raw.id, normalized);
  }
  return normalized;
}

/**
 * The mountain terrain decoration, or null. Mountains are terrain (emphasis
 * 'none' — never displaced), so they resolve independently of the feature pass
 * and, like the other terrain decorations, stay visible on explored tiles that
 * are out of sight.
 */
function resolveMountainForTile(tile) {
  if (tile.terrain !== 'mountain') return null;
  return { descriptor: normalizedDescriptor(MOUNTAIN_DESCRIPTOR), displacement: {} };
}

/** The feature that claims the hex center, or null. */
function resolveFeatureForTile(tile, occupants) {
  const kind = tile.feature?.kind;
  const occupied = isTileOccupied(occupants, tile);
  if (kind === 'knot') {
    if (tile.feature.mined) return null;
    return { descriptor: normalizedDescriptor(KNOT_DESCRIPTOR), displacement: { displaced: occupied } };
  }
  if (kind === 'fruitTree') return null; // legacy tree builder
  if (kind === 'tree') {
    // On woods this is the grove (or the legacy Painforest grove) — the
    // solitary landmark renders only on open terrain.
    if (isWoodsTerrain(tile)) return null;
    return { descriptor: normalizedDescriptor(descriptorById(kind)), displacement: { displaced: occupied } };
  }
  const descriptor = kind ? descriptorById(kind) : null;
  if (descriptor?.kind === 'feature') {
    return { descriptor: normalizedDescriptor(descriptor), displacement: { displaced: occupied } };
  }
  return null;
}

/**
 * The grove terrain decoration, or null. `visible` gates the unoccupied look:
 * while a tile is out of sight its occupants and features are not rendered,
 * so the grove shows its natural (NORMAL) state regardless of what sits on
 * the hex.
 */
function resolveGroveForTile(tile, occupants, visible = true) {
  if (!isGroveTerrain(tile)) return null;
  const kind = tile.feature?.kind;
  if (kind === 'fruitTree') return null; // fruit tree claims the tile — no grove
  const mode = decorState({
    hasOccupant: visible && isTileOccupied(occupants, tile),
    hasFeature: visible && !!tile.feature && kind !== 'tree',
    decoration: DECORATION.GROVE,
  });
  return {
    descriptor: normalizedDescriptor(GROVE_DESCRIPTOR),
    displacement: {
      hidden: mode === DECOR_STATE.HIDDEN,
      displaced: mode === DECOR_STATE.DISPERSED,
    },
  };
}

/**
 * The hill mound terrain decoration, or null. `visible` gates the unoccupied
 * look: out of sight the mound renders at full size (NORMAL), not sunk or
 * hidden by occupants/features it cannot be seen next to.
 */
function resolveHillForTile(tile, occupants, visible = true) {
  if (tile.terrain !== 'hill') return null;
  const mode = decorState({
    hasOccupant: visible && isTileOccupied(occupants, tile),
    hasFeature: visible && !!tile.feature,
    decoration: DECORATION.HILL,
  });
  return {
    descriptor: normalizedDescriptor(HILL_DESCRIPTOR),
    displacement: {
      hidden: mode === DECOR_STATE.HIDDEN,
      displaced: mode === DECOR_STATE.SUNK,
    },
  };
}

/**
 * Every descriptor resolution for one tile (features + terrain decorations),
 * or an empty array. Exported for tests and tooling.
 *
 * @param {object} tile - Tile with `terrain`, `feature`, `q`, `r`
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @param {boolean} [visible=true] - whether the tile is currently visible;
 *        when false the terrain decorations resolve in their unoccupied state
 *        (features still resolve — visibility gating happens at collect time)
 * @returns {{ descriptor: object, displacement: object }[]}
 */
export function resolveDescriptorForTile(tile, occupants, visible = true) {
  return [
    resolveMountainForTile(tile),
    resolveFeatureForTile(tile, occupants),
    resolveGroveForTile(tile, occupants, visible),
    resolveHillForTile(tile, occupants, visible),
  ].filter(Boolean);
}

/**
 * Collect instance records from every gated tile, grouped by descriptor id.
 * Runs one pass per resolution rule so a tile may contribute to several groups
 * (a knot on a forest tile resolves to both the knot and the dispersed grove).
 *
 * Terrain decorations are purely cosmetic — they may render on explored tiles
 * outside the view radius (fog doesn't hide them the way it hides features and
 * units). They are gated on `decorVisible` (visible ∪ explored); the feature
 * pass stays gated on `visible`. While a tile is out of sight its decor
 * resolves unoccupied (the resolvers receive `visible = false`).
 *
 * @param {Map|object[]} tilesOrArray - state.tiles Map or chunkTiles array
 * @param {Set<string>}  visible      - Set of "q,r" keys currently visible
 * @param {Set<string>}  occupants    - "q,r" keys of tiles with an occupant
 * @param {Set<string>}  [decorVisible=visible] - gate for terrain decorations
 * @returns {Map<string, object[]>} descriptor id → instance records
 */
function collectDescriptorRecords(tilesOrArray, visible, occupants, decorVisible = visible) {
  const groups = new Map();

  const runPass = (resolve, gate) => {
    collectInstances(
      tilesOrArray, gate,
      (tile) => resolve(tile) !== null,
      (tile, worldPos) => {
        const { descriptor, displacement } = resolve(tile);
        const records = recordsForDescriptor(descriptor, tile, worldPos, undefined, displacement);
        if (records.length === 0) return null;
        let list = groups.get(descriptor.id);
        if (!list) {
          list = [];
          groups.set(descriptor.id, list);
        }
        list.push(...records);
        return null;
      },
    );
  };

  runPass((tile) => resolveMountainForTile(tile), decorVisible);
  runPass((tile) => resolveFeatureForTile(tile, occupants), visible);
  runPass(
    (tile) => resolveGroveForTile(tile, occupants, visible.has(`${tile.q},${tile.r}`)),
    decorVisible,
  );
  runPass(
    (tile) => resolveHillForTile(tile, occupants, visible.has(`${tile.q},${tile.r}`)),
    decorVisible,
  );
  return groups;
}

/** Assemble one InstancedMesh per part geometry for every descriptor group. */
function buildGroups(groups) {
  const results = [];
  for (const [id, records] of groups) {
    if (records.length === 0) continue;
    results.push(...buildDescriptorMeshes(normalizedDescriptor(descriptorById(id)), records, id));
  }
  return results;
}

/**
 * Build descriptor-driven feature InstancedMeshes for the current full state.
 * @param {object} state - Game state (state.tiles Map)
 * @param {Set<string>} visible - Set of "q,r" keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @param {Set<string>} [decorVisible=visible] - gate for terrain decorations
 *        (visible ∪ explored); features stay gated on `visible`
 * @returns {THREE.InstancedMesh[]}
 */
export function buildDescriptorFeatureMeshes(state, visible, occupants, decorVisible = visible) {
  return buildGroups(collectDescriptorRecords(state.tiles, visible, occupants, decorVisible));
}

/**
 * Build descriptor-driven feature InstancedMeshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of "q,r" keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @param {Set<string>} [decorVisible=visible] - gate for terrain decorations
 *        (visible ∪ explored); features stay gated on `visible`
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkDescriptorFeatureMeshes(chunkTiles, visible, occupants, decorVisible = visible) {
  return buildGroups(collectDescriptorRecords(chunkTiles, visible, occupants, decorVisible));
}
