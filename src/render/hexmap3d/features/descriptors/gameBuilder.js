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
 *   feature (claims the hex center):
 *     mountain terrain            → mountain descriptor (emphasis 'none')
 *     knot feature (unmined)      → knot descriptor
 *     tree / largeTree on open terrain → solitary tree descriptor
 *     any other kind with a descriptor → that descriptor (26 simple archetypes)
 *   terrain decoration (composes with the feature above):
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

/** The feature that claims the hex center, or null. */
function resolveFeatureForTile(tile, occupants) {
  const kind = tile.feature?.kind;
  const occupied = isTileOccupied(occupants, tile);
  if (tile.terrain === 'mountain') {
    return { descriptor: normalizedDescriptor(MOUNTAIN_DESCRIPTOR), displacement: {} };
  }
  if (kind === 'knot') {
    if (tile.feature.mined) return null;
    return { descriptor: normalizedDescriptor(KNOT_DESCRIPTOR), displacement: { displaced: occupied } };
  }
  if (kind === 'fruitTree') return null; // legacy tree builder
  if (kind === 'tree' || kind === 'largeTree') {
    // On woods these are the grove (or the legacy Painforest grove) — the
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

/** The grove terrain decoration, or null. */
function resolveGroveForTile(tile, occupants) {
  if (!isGroveTerrain(tile)) return null;
  const kind = tile.feature?.kind;
  if (kind === 'fruitTree') return null; // fruit tree claims the tile — no grove
  const mode = decorState({
    hasOccupant: isTileOccupied(occupants, tile),
    hasFeature: !!tile.feature && kind !== 'tree',
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

/** The hill mound terrain decoration, or null. */
function resolveHillForTile(tile, occupants) {
  if (tile.terrain !== 'hill') return null;
  const mode = decorState({
    hasOccupant: isTileOccupied(occupants, tile),
    hasFeature: !!tile.feature,
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
 * @returns {{ descriptor: object, displacement: object }[]}
 */
export function resolveDescriptorForTile(tile, occupants) {
  return [
    resolveFeatureForTile(tile, occupants),
    resolveGroveForTile(tile, occupants),
    resolveHillForTile(tile, occupants),
  ].filter(Boolean);
}

/**
 * Collect instance records from every visible tile, grouped by descriptor id.
 * Runs one pass per resolution rule so a tile may contribute to several groups
 * (a knot on a forest tile resolves to both the knot and the dispersed grove).
 *
 * @param {Map|object[]} tilesOrArray - state.tiles Map or chunkTiles array
 * @param {Set<string>}  visible      - Set of "q,r" keys currently visible
 * @param {Set<string>}  occupants    - "q,r" keys of tiles with an occupant
 * @returns {Map<string, object[]>} descriptor id → instance records
 */
function collectDescriptorRecords(tilesOrArray, visible, occupants) {
  const groups = new Map();

  const runPass = (resolve) => {
    collectInstances(
      tilesOrArray, visible,
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

  runPass((tile) => resolveFeatureForTile(tile, occupants));
  runPass((tile) => resolveGroveForTile(tile, occupants));
  runPass((tile) => resolveHillForTile(tile, occupants));
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
 * @returns {THREE.InstancedMesh[]}
 */
export function buildDescriptorFeatureMeshes(state, visible, occupants) {
  return buildGroups(collectDescriptorRecords(state.tiles, visible, occupants));
}

/**
 * Build descriptor-driven feature InstancedMeshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of "q,r" keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkDescriptorFeatureMeshes(chunkTiles, visible, occupants) {
  return buildGroups(collectDescriptorRecords(chunkTiles, visible, occupants));
}
