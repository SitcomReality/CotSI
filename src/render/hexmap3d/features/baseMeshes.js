// src/render/hexmap3d/features/baseMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { FACTIONS } from '../../../game/rules/factionData.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileTopY } from '../terrain/terrainMesh.js';

/**
 * Build base meshes (groups) for visible tiles with 'base' feature.
 * Each faction gets a small distinctive decoration on top of the shared tower shape.
 *
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

    const towerMat = new THREE.MeshLambertMaterial({ color: fac.color, flatShading: true });
    const accentMat = new THREE.MeshLambertMaterial({ color: fac.glow || fac.color, flatShading: true });

    // ---- Tower body ----
    const towerGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.7, 8);
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(x, surfaceY + 0.50, z);
    group.add(tower);

    // ---- Top cap ----
    const capGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.15, 8);
    const cap = new THREE.Mesh(capGeo, towerMat);
    cap.position.set(x, surfaceY + 0.90, z);
    group.add(cap);

    // ---- Faction-specific decoration ----
    switch (f.faction) {
      case 0: // CRU — short spikes around the base
        addSpikes(group, x, surfaceY + 0.30, z, 6, 0.06, 0.10, accentMat);
        break;
      case 1: // REV — floating ring above cap
        addRing(group, x, surfaceY + 1.00, z, 0.28, 0.02, accentMat);
        break;
      case 2: // VER — leafy crown on top
        addSpikes(group, x, surfaceY + 0.95, z, 8, 0.04, 0.08, accentMat);
        break;
      case 3: // ARC — small satellite dots
        addRingDots(group, x, surfaceY + 0.70, z, 0.32, 4, accentMat);
        break;
      case 4: // HRT — wide round cap (like a hearth)
        {
          const domeGeo = new THREE.SphereGeometry(0.18, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
          const dome = new THREE.Mesh(domeGeo, accentMat);
          dome.position.set(x, surfaceY + 0.98, z);
          group.add(dome);
        }
        break;
      case 5: // MSK — pointed spire
        {
          const spireGeo = new THREE.ConeGeometry(0.05, 0.15, 6);
          const spire = new THREE.Mesh(spireGeo, accentMat);
          spire.position.set(x, surfaceY + 1.02, z);
          group.add(spire);
        }
        break;
      case 6: // HOL — inverted spike (hanging)
        {
          const spikeGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
          const spike = new THREE.Mesh(spikeGeo, accentMat);
          spike.position.set(x, surfaceY + 0.22, z);
          spike.rotation.x = Math.PI; // point downward
          group.add(spike);
        }
        break;
    }

    results.push(group);
  }

  return results;
}

/**
 * Add N small cone spikes in a ring around a center point.
 */
function addSpikes(group, cx, cy, cz, count, radius, height, mat) {
  const spikeGeo = new THREE.ConeGeometry(radius, height, 4);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i;
    const spike = new THREE.Mesh(spikeGeo, mat);
    spike.position.set(
      cx + Math.cos(angle) * 0.28,
      cy,
      cz + Math.sin(angle) * 0.28
    );
    spike.rotation.z = Math.cos(angle) * 0.3;
    spike.rotation.x = Math.sin(angle) * 0.3;
    group.add(spike);
  }
}

/**
 * Add a thin torus ring.
 */
function addRing(group, cx, cy, cz, radius, thickness, mat) {
  const ringGeo = new THREE.TorusGeometry(radius, thickness, 6, 12);
  const ring = new THREE.Mesh(ringGeo, mat);
  ring.position.set(cx, cy, cz);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
}

/**
 * Add small dots in a ring.
 */
function addRingDots(group, cx, cy, cz, ringRadius, count, mat) {
  const dotGeo = new THREE.SphereGeometry(0.03, 4, 3);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i;
    const dot = new THREE.Mesh(dotGeo, mat);
    dot.position.set(
      cx + Math.cos(angle) * ringRadius,
      cy,
      cz + Math.sin(angle) * ringRadius
    );
    group.add(dot);
  }
}
