// src/render/hexmap3d/features/debrisMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileTopY } from '../terrain/terrainMesh.js';
import {
  getDebrisTuftGeo,
  getDebrisRockGeo,
  getDebrisFlowerGeo,
} from './featureGeometries.js';
import { DEBRIS_HASH_SEEDS, DEBRIS_ANGLE_STEP, DEBRIS_OFFSET_MIN, DEBRIS_OFFSET_RANGE, DEBRIS_Y_OFFSET, DEBRIS_ROTATION_SEED, DEBRIS_SCALE_BASE, DEBRIS_SCALE_RANGE } from '../../../params/render/geometryParams.js';

/**
 * Build InstancedMeshes for environmental debris (grass tufts, rocks, flowers)
 * placed by terrainGeneration.js on empty passable tiles.
 *
 * Flora features (bush, vine) are handled by simpleFeatureMeshes.js.
 *
 * @param {Map} state.tiles
 * @param {string[]} visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildDebrisMeshes(state, visible) {
  const groups = {
    tuft:   [],
    rock:   [],
    flower: [],
  };

  for (const key of visible) {
    const tile = state.tiles[key];
    if (!tile || !tile.debris) continue;

    const surfaceY = tileTopY(tile.terrain);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
    const hash = ((tile.q * DEBRIS_HASH_SEEDS[0] + tile.r * DEBRIS_HASH_SEEDS[1]) * DEBRIS_HASH_SEEDS[2]) % DEBRIS_HASH_SEEDS[3];

    const angle = (hash * DEBRIS_ANGLE_STEP) % (Math.PI * 2);
    const dist = DEBRIS_OFFSET_MIN + (hash % DEBRIS_OFFSET_RANGE[0]) / DEBRIS_OFFSET_RANGE[1];
    const ox = Math.cos(angle) * dist;
    const oz = Math.sin(angle) * dist;

    const g = groups[tile.debris.kind];
    if (g) {
      g.push({
        x: x + ox, y: surfaceY + DEBRIS_Y_OFFSET, z: z + oz,
        rotY: (hash * DEBRIS_ROTATION_SEED) % (Math.PI * 2),
        scale: DEBRIS_SCALE_BASE + (hash % DEBRIS_SCALE_RANGE[0]) / DEBRIS_SCALE_RANGE[1],
      });
    }
  }

  const results = [];
  const dummy = new THREE.Object3D();

  const geoMap = {
    tuft:   getDebrisTuftGeo,
    rock:   getDebrisRockGeo,
    flower: getDebrisFlowerGeo,
  };

  const colorMap = {
    tuft:   0x6B8E5A,
    rock:   0x8A8070,
    flower: 0xD4A0C0,
  };

  for (const [kind, instances] of Object.entries(groups)) {
    if (instances.length === 0) continue;
    const geo = geoMap[kind]();
    const mat = new THREE.MeshLambertMaterial({
      color: colorMap[kind] || 0x888888,
      flatShading: true,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, instances.length);
    instances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(inst.scale);
      dummy.rotation.y = inst.rotY;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.name = `debris-${kind}`;
    results.push(mesh);
  }

  return results;
}

/**
 * Build debris InstancedMeshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkDebrisMeshes(chunkTiles, visible) {
  const groups = { tuft: [], rock: [], flower: [] };

  for (const tile of chunkTiles) {
    const key = `${tile.q},${tile.r}`;
    if (!visible.has(key)) continue;
    if (!tile.debris) continue;

    const surfaceY = tileTopY(tile.terrain);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
    const hash = ((tile.q * DEBRIS_HASH_SEEDS[0] + tile.r * DEBRIS_HASH_SEEDS[1]) * DEBRIS_HASH_SEEDS[2]) % DEBRIS_HASH_SEEDS[3];

    const angle = (hash * DEBRIS_ANGLE_STEP) % (Math.PI * 2);
    const dist = DEBRIS_OFFSET_MIN + (hash % DEBRIS_OFFSET_RANGE[0]) / DEBRIS_OFFSET_RANGE[1];
    const ox = Math.cos(angle) * dist;
    const oz = Math.sin(angle) * dist;

    const g = groups[tile.debris.kind];
    if (g) {
      g.push({
        x: x + ox, y: surfaceY + DEBRIS_Y_OFFSET, z: z + oz,
        rotY: (hash * DEBRIS_ROTATION_SEED) % (Math.PI * 2),
        scale: DEBRIS_SCALE_BASE + (hash % DEBRIS_SCALE_RANGE[0]) / DEBRIS_SCALE_RANGE[1],
      });
    }
  }

  const results = [];
  const dummy = new THREE.Object3D();

  const geoMap = {
    tuft:   getDebrisTuftGeo,
    rock:   getDebrisRockGeo,
    flower: getDebrisFlowerGeo,
  };

  const colorMap = {
    tuft:   0x6B8E5A,
    rock:   0x8A8070,
    flower: 0xD4A0C0,
  };

  for (const [kind, instances] of Object.entries(groups)) {
    if (instances.length === 0) continue;
    const geo = geoMap[kind]();
    const mat = new THREE.MeshLambertMaterial({
      color: colorMap[kind] || 0x888888,
      flatShading: true,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, instances.length);
    instances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(inst.scale);
      dummy.rotation.y = inst.rotY;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.name = `debris-${kind}`;
    results.push(mesh);
  }

  return results;
}
