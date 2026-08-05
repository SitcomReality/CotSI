// src/render/hexmap3d/features/simpleFeatureMeshes.js
// Generic builder for features registered in FEATURE_VISUALS.
// Handles any feature kind with a simple entry (one geometry, one material, one InstancedMesh).
// Features with dedicated builders (trees, knots, mountains, bases) are handled elsewhere.

import { FEATURE_VISUALS } from './featureVisuals.js';
import { collectInstances, buildInstanced } from './meshBuilder.js';
import {
  SCATTER_HASH_SEEDS, SCATTER_ANGLE_STEP, SCATTER_OFFSET_MIN,
  SCATTER_OFFSET_RANGE, SCATTER_ROTATION_SEED,
  SCATTER_SCALE_BASE, SCATTER_SCALE_RANGE,
} from '../../../params/render/geometryParams.js';
import { DISPERSED_SCALE, dispersedSingleOffset, isTileOccupied } from './decorEmphasis.js';

/**
 * Compute a deterministic jitter offset and rotation for a tile,
 * used to scatter simple features naturally across their hex.
 */
function jitterForTile(tile) {
  const hash = ((tile.q * SCATTER_HASH_SEEDS[0] + tile.r * SCATTER_HASH_SEEDS[1]) * SCATTER_HASH_SEEDS[2]) % SCATTER_HASH_SEEDS[3];
  const angle = (hash * SCATTER_ANGLE_STEP) % (Math.PI * 2);
  const dist = SCATTER_OFFSET_MIN + (hash % SCATTER_OFFSET_RANGE[0]) / SCATTER_OFFSET_RANGE[1];
  const rotY = (hash * SCATTER_ROTATION_SEED) % (Math.PI * 2);
  const scaleVar = SCATTER_SCALE_BASE + (hash % SCATTER_SCALE_RANGE[0]) / SCATTER_SCALE_RANGE[1];
  return {
    ox: Math.cos(angle) * dist,
    oz: Math.sin(angle) * dist,
    rotY,
    scaleVar,
  };
}

/**
 * Build simple-feature InstancedMeshes for the current full game state.
 *
 * @param {object} state  - Game state (must have state.tiles Map)
 * @param {Set<string>} visible - Set of "q,r" keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @returns {THREE.InstancedMesh[]}
 */
export function buildSimpleFeatureMeshes(state, visible, occupants) {
  return _buildSimpleFeatures(state.tiles, visible, occupants);
}

/**
 * Build simple-feature InstancedMeshes for a single chunk's tiles.
 *
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of "q,r" keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkSimpleFeatureMeshes(chunkTiles, visible, occupants) {
  return _buildSimpleFeatures(chunkTiles, visible, occupants);
}

function _buildSimpleFeatures(tilesOrArray, visible, occupants) {
  // Group instances by kind: { kind → instances[] }
  const kindGroups = {};

  const allInstances = collectInstances(
    tilesOrArray, visible,
    (tile) => {
      if (!tile.feature) return false;
      const cfg = FEATURE_VISUALS[tile.feature.kind];
      return !!cfg;
    },
    (tile, worldPos) => {
      const cfg = FEATURE_VISUALS[tile.feature.kind];
      const jitter = jitterForTile(tile);
      // An occupant claims the hex center: the feature steps aside to the
      // shared upper-left-corner anchor and shrinks (decorEmphasis.js).
      let x = worldPos.x + jitter.ox;
      let z = worldPos.z + jitter.oz;
      let scale = (cfg.scale ?? 1.0) * jitter.scaleVar;
      if (isTileOccupied(occupants, tile)) {
        const { dx, dz } = dispersedSingleOffset();
        x = worldPos.x + dx;
        z = worldPos.z + dz;
        scale *= DISPERSED_SCALE;
      }
      const inst = {
        x, y: worldPos.y, z,
        scale,
        rotY: jitter.rotY,
        _kind: tile.feature.kind,
      };
      return inst;
    },
  );

  // Distribute into per-kind groups
  for (const inst of allInstances) {
    const kind = inst._kind;
    delete inst._kind;
    if (!kindGroups[kind]) kindGroups[kind] = [];
    kindGroups[kind].push(inst);
  }

  // Build one InstancedMesh per kind
  const results = [];
  for (const [kind, instances] of Object.entries(kindGroups)) {
    const cfg = FEATURE_VISUALS[kind];
    if (!cfg || instances.length === 0) continue;

    const geo = cfg.geometry();
    const mat = cfg.material();
    const meshName = cfg.meshName || `feature-${kind}`;
    const mesh = buildInstanced(geo, mat, instances, meshName);
    results.push(mesh);
  }

  return results;
}
