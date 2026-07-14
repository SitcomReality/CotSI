// src/render/hexmap3d/bases.js
import * as THREE from '../../../lib/three.module.js';
import { FACTIONS } from '../../../core/factions.js';
import { hexCenter3D } from '../hexUtils.js';
import { tileTopY } from '../terrain/terrain.js';

/**
 * Build base meshes (groups) for visible tiles with 'base' feature.
 * @param {Map} state.tiles
 * @param {string[]} visible
 * @returns {THREE.Group[]}
 */
export function buildBaseMeshes(state, visible) {
  const results = [];

  for (const key of visible) {
    const tile = state.tiles[key];
    if (!tile || !tile.feature || tile.feature.kind !== 'base') continue;
    const f = tile.feature;
    const fac = FACTIONS[f.faction];
    if (!fac) continue;

    const surfaceY = tileTopY(tile.terrain);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
    const group = new THREE.Group();
    group.name = `base_${f.faction}`;

    // Tower body
    const towerGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.7, 8);
    const towerMat = new THREE.MeshLambertMaterial({ color: fac.color, flatShading: true });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(x, surfaceY + 0.50, z);
    group.add(tower);

    // Top cap
    const capGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.15, 8);
    const cap = new THREE.Mesh(capGeo, towerMat);
    cap.position.set(x, surfaceY + 0.90, z);
    group.add(cap);

    results.push(group);
  }

  return results;
}