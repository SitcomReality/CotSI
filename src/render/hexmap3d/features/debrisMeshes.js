// src/render/hexmap3d/features/debrisMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileSurfaceY } from '../terrain/index.js';
import {
  getDebrisTuftGeo,
  getDebrisRockGeo,
  getDebrisFlowerGeo,
  getDebrisBoneGeo,
  getDebrisCrystalGeo,
  getDebrisShroomGeo,
  getDebrisLogGeo,
} from './featureGeometries.js';
import { DEBRIS_HASH_SEEDS, DEBRIS_ANGLE_STEP, DEBRIS_OFFSET_MIN, DEBRIS_OFFSET_RANGE, DEBRIS_Y_OFFSET, DEBRIS_ROTATION_SEED, DEBRIS_SCALE_BASE, DEBRIS_SCALE_RANGE } from '../../../params/render/geometryParams.js';

/**
 * Per-instance debris color, tinted by terrain/biome so scatter matches its
 * tile — desert tufts read dry tan, Edenfall crystals read purple, etc.
 * RGB tuples in 0-1.
 */
function debrisColor(tile, kind) {
  const terrain = tile.terrain;
  const isEdenfall = tile.biomeId === 'biome_edenfall';
  switch (kind) {
    case 'tuft':
      if (terrain === 'desert' || terrain === 'beach') return [0.78, 0.66, 0.40]; // dry tan
      if (terrain === 'marsh') return [0.35, 0.42, 0.30];                        // dark reed green
      return [0.42, 0.56, 0.35];                                                 // grass green
    case 'rock':
      return [0.55, 0.51, 0.44];
    case 'flower':
      return [0.83, 0.63, 0.75];
    case 'bone':
      return [0.88, 0.85, 0.72];
    case 'crystal':
      return isEdenfall ? [0.72, 0.38, 0.88] : [0.55, 0.85, 0.95];               // purple / pale cyan
    case 'shroom':
      return isEdenfall ? [0.62, 0.30, 0.70] : [0.62, 0.40, 0.28];               // purple / brown
    case 'log':
      return [0.45, 0.32, 0.20];
    default:
      return [0.53, 0.53, 0.53];
  }
}

// Kind → geometry factory. Material color stays white; per-instance colors
// (setColorAt) carry the tint so one InstancedMesh can host mixed colors.
const DEBRIS_GEO = {
  tuft:    getDebrisTuftGeo,
  rock:    getDebrisRockGeo,
  flower:  getDebrisFlowerGeo,
  bone:    getDebrisBoneGeo,
  crystal: getDebrisCrystalGeo,
  shroom:  getDebrisShroomGeo,
  log:     getDebrisLogGeo,
};

/**
 * Collect instance data (with per-tile color) from a tile list.
 * Shared by the global and chunk builders.
 */
function collectDebrisInstances(tiles, visible) {
  const groups = new Map();
  for (const key of visible) {
    const tile = tiles[key];
    if (!tile || !tile.debris) continue;
    const kind = tile.debris.kind;
    if (!DEBRIS_GEO[kind]) continue;

    const surfaceY = tileSurfaceY(tile);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
    const hash = ((tile.q * DEBRIS_HASH_SEEDS[0] + tile.r * DEBRIS_HASH_SEEDS[1]) * DEBRIS_HASH_SEEDS[2]) % DEBRIS_HASH_SEEDS[3];

    const angle = (hash * DEBRIS_ANGLE_STEP) % (Math.PI * 2);
    const dist = DEBRIS_OFFSET_MIN + (hash % DEBRIS_OFFSET_RANGE[0]) / DEBRIS_OFFSET_RANGE[1];
    const ox = Math.cos(angle) * dist;
    const oz = Math.sin(angle) * dist;

    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push({
      x: x + ox, y: surfaceY + DEBRIS_Y_OFFSET, z: z + oz,
      rotY: (hash * DEBRIS_ROTATION_SEED) % (Math.PI * 2),
      scale: DEBRIS_SCALE_BASE + (hash % DEBRIS_SCALE_RANGE[0]) / DEBRIS_SCALE_RANGE[1],
      color: debrisColor(tile, kind),
    });
  }
  return groups;
}

/** Build one InstancedMesh per debris kind from the collected groups. */
function buildDebrisMeshesFromGroups(groups) {
  const results = [];
  const dummy = new THREE.Object3D();

  for (const [kind, instances] of groups) {
    if (instances.length === 0) continue;
    const mat = new THREE.MeshLambertMaterial({
      color: 0xffffff, // instance colors carry the tint
      flatShading: true,
    });
    const mesh = new THREE.InstancedMesh(DEBRIS_GEO[kind](), mat, instances.length);
    instances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(inst.scale);
      dummy.rotation.y = inst.rotY;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(inst.color[0], inst.color[1], inst.color[2]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.name = `debris-${kind}`;
    results.push(mesh);
  }

  return results;
}

/**
 * Build InstancedMeshes for environmental debris (grass tufts, rocks, flowers,
 * bones, crystals, mushrooms, logs) placed by terrainGeneration on empty
 * passable tiles.
 *
 * Flora features (bush, vine) are handled by simpleFeatureMeshes.js.
 *
 * @param {Map} state.tiles
 * @param {string[]} visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildDebrisMeshes(state, visible) {
  return buildDebrisMeshesFromGroups(collectDebrisInstances(state.tiles, visible));
}

/**
 * Build debris InstancedMeshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkDebrisMeshes(chunkTiles, visible) {
  const tileMap = new Map();
  for (const tile of chunkTiles) {
    tileMap.set(`${tile.q},${tile.r}`, tile);
  }
  return buildDebrisMeshesFromGroups(collectDebrisInstances(tileMap, visible));
}
