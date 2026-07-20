// src/render/hexmap3d/features/debrisMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileTopY } from '../terrain/terrainMesh.js';
import {
  getDebrisTuftGeo,
  getDebrisRockGeo,
  getDebrisFlowerGeo,
} from './featureGeometries.js';

/**
 * Build InstancedMeshes for environmental debris (grass tufts, rocks, flowers)
 * placed by terrainGeneration.js on empty passable tiles.
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
    const hash = ((tile.q * 17 + tile.r * 11) * 13) % 100;

    // Random position offset within the hex so debris isn't perfectly centered
    const angle = (hash * 0.618) % (Math.PI * 2);
    const dist = 0.15 + (hash % 30) / 200; // 0.15–0.30 from center
    const ox = Math.cos(angle) * dist;
    const oz = Math.sin(angle) * dist;

    const g = groups[tile.debris.kind];
    if (g) {
      g.push({
        x: x + ox,
        y: surfaceY + 0.03,
        z: z + oz,
        rotY: (hash * 0.723) % (Math.PI * 2),
        scale: 0.8 + (hash % 20) / 100,
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
    mesh.name = `debris-${kind}`;
    results.push(mesh);
  }

  return results;
}
