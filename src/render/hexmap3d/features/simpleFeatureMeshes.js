// src/render/hexmap3d/features/simpleFeatureMeshes.js
// Generic builder for features registered in FEATURE_VISUALS.
// Handles any feature kind with a simple entry (one geometry, one material, one InstancedMesh).
// Features with dedicated builders (trees, knots, mountains, bases) are handled elsewhere.

import { FEATURE_VISUALS } from './featureVisuals.js';
import { collectInstances, buildInstanced } from './meshBuilder.js';
import {
  DEBRIS_HASH_SEEDS, DEBRIS_ANGLE_STEP, DEBRIS_OFFSET_MIN,
  DEBRIS_OFFSET_RANGE, DEBRIS_ROTATION_SEED,
  DEBRIS_SCALE_BASE, DEBRIS_SCALE_RANGE,
} from '../../../params/render/geometryParams.js';

/**
 * Compute a deterministic jitter offset and rotation for a tile,
 * used to scatter simple features naturally across their hex.
 */
function jitterForTile(tile) {
  const hash = ((tile.q * DEBRIS_HASH_SEEDS[0] + tile.r * DEBRIS_HASH_SEEDS[1]) * DEBRIS_HASH_SEEDS[2]) % DEBRIS_HASH_SEEDS[3];
  const angle = (hash * DEBRIS_ANGLE_STEP) % (Math.PI * 2);
  const dist = DEBRIS_OFFSET_MIN + (hash % DEBRIS_OFFSET_RANGE[0]) / DEBRIS_OFFSET_RANGE[1];
  const rotY = (hash * DEBRIS_ROTATION_SEED) % (Math.PI * 2);
  const scaleVar = DEBRIS_SCALE_BASE + (hash % DEBRIS_SCALE_RANGE[0]) / DEBRIS_SCALE_RANGE[1];
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
 * @returns {THREE.InstancedMesh[]}
 */
export function buildSimpleFeatureMeshes(state, visible) {
  return _buildSimpleFeatures(state.tiles, visible);
}

/**
 * Build simple-feature InstancedMeshes for a single chunk's tiles.
 *
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of "q,r" keys currently visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkSimpleFeatureMeshes(chunkTiles, visible) {
  return _buildSimpleFeatures(chunkTiles, visible);
}

function _buildSimpleFeatures(tilesOrArray, visible) {
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
      const scale = (cfg.scale ?? 1.0) * jitter.scaleVar;
      const inst = {
        x: worldPos.x + jitter.ox,
        y: worldPos.y,
        z: worldPos.z + jitter.oz,
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
