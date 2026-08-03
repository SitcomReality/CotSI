// src/render/hexmap3d/features/mountainMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { toonMaterial } from '../scene/materials.js';
import { getMountainGeo } from './geometries/index.js';
import { collectInstances, buildInstanced } from './meshBuilder.js';
import {
  MOUNTAIN_HASH_SEEDS,
  MOUNTAIN_VARIANTS,
  MOUNTAIN_PEAK_SCALE,
  MOUNTAIN_PEAK_SCALE_RANGE,
  MOUNTAIN_SLOPE_SCALE,
  MOUNTAIN_SLOPE_SCALE_RANGE,
  MOUNTAIN_NORMAL_SCALE,
  MOUNTAIN_NORMAL_SCALE_RANGE,
} from '../../../params/render/geometryParams.js';

/**
 * Build mountain InstancedMeshes from visible tiles.
 *
 * Uses mountainType tags from terrainGeneration for grouped chains:
 *   - 'peak':    tall (center of a large group)
 *   - 'slope':   short (edges of a group — foothills)
 *   - undefined: medium-height single peak (isolated or untagged)
 *
 * Each mountain gets a profile variant (`classic` / `offpeak`)
 * picked from the per-tile hash, so a range reads as varied massifs instead
 * of clones. All variants share the same hex base (radius 1.0, matching
 * hexCornersXZ), so adjacent mountain edges align perfectly with no gaps —
 * instances never rotate or scale non-uniformly.
 *
 * Instances are bucketed by variant so each InstancedMesh shares one
 * geometry; peak/slope/normal height is per-instance scaleY, so one mesh
 * per variant is enough (2 draw calls max).
 *
 * @param {Map} state.tiles
 * @param {string[]} visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildMountainMeshes(state, visible) {
  return buildMountainGroup(state.tiles, visible);
}

/**
 * Build mountain InstancedMeshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkMountainMeshes(chunkTiles, visible) {
  return buildMountainGroup(chunkTiles, visible);
}

const MOUNTAIN_MATERIAL = toonMaterial({
  vertexColors: true,
});
// Module-level asset shared across chunks — disposal guards skip it (see chunkManager.js).
MOUNTAIN_MATERIAL.userData.shared = true;

function buildMountainGroup(tilesOrArray, visible) {
  const records = collectInstances(
    tilesOrArray,
    visible,
    (tile) => tile.terrain === 'mountain',
    (tile, pos) => {
      const hash = ((tile.q * MOUNTAIN_HASH_SEEDS[0] + tile.r * MOUNTAIN_HASH_SEEDS[1]) * MOUNTAIN_HASH_SEEDS[2]) % MOUNTAIN_HASH_SEEDS[3];
      return {
        ...pos,
        scaleY: mountainScale(tile, hash),
        variant: MOUNTAIN_VARIANTS[hash % MOUNTAIN_VARIANTS.length],
      };
    },
  );

  const byVariant = new Map();
  for (const record of records) {
    const list = byVariant.get(record.variant) ?? [];
    list.push(record);
    byVariant.set(record.variant, list);
  }

  const results = [];
  for (const [variant, instances] of byVariant) {
    results.push(buildInstanced(getMountainGeo(variant), MOUNTAIN_MATERIAL, instances, `mountains-${variant}`));
  }
  return results;
}

function mountainScale(tile, hash) {
  if (tile.mountainType === 'peak') {
    return MOUNTAIN_PEAK_SCALE + (hash % MOUNTAIN_PEAK_SCALE_RANGE) / 100;
  }
  if (tile.mountainType === 'slope') {
    return MOUNTAIN_SLOPE_SCALE + (hash % MOUNTAIN_SLOPE_SCALE_RANGE) / 100;
  }
  return MOUNTAIN_NORMAL_SCALE + (hash % MOUNTAIN_NORMAL_SCALE_RANGE) / 100;
}
