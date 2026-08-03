// src/render/hexmap3d/features/baseMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { toonMaterial } from '../scene/materials.js';
import { FACTIONS } from '../../../game/rules/factionData.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileSurfaceY } from '../terrain/index.js';
import { getBaseSpikeGeo, getBaseRingGeo, getBaseRingDotGeo } from './geometries/index.js';
import { BASE_TOWER, BASE_CAP, BASE_TOWER_Y_CENTER, BASE_CAP_Y_CENTER, BASE_CRU_SPIKE_Y, BASE_HEART_DOME, BASE_MASK_SPIRE, BASE_HOL_SPIKE, BASE_SPIKE_RING_RADIUS, BASE_SPIKE_TILT_AMOUNT, BASE_SPIKE, BASE_RING, BASE_RING_DOT } from '../../../params/render/geometryParams.js';

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

    const surfaceY = tileSurfaceY(tile);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
    const group = new THREE.Group();
    group.name = `base_${f.faction}`;

    const towerMat = toonMaterial({ color: fac.base });
    const accentMat = toonMaterial({ color: fac.color });

    // ---- Tower body ----
    const towerGeo = new THREE.CylinderGeometry(BASE_TOWER.bottomR, BASE_TOWER.topR, BASE_TOWER.height, BASE_TOWER.segments);
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(x, surfaceY + BASE_TOWER_Y_CENTER, z);
    group.add(tower);

    // ---- Top cap ----
    const capGeo = new THREE.CylinderGeometry(BASE_CAP.bottomR, BASE_CAP.topR, BASE_CAP.height, BASE_CAP.segments);
    const cap = new THREE.Mesh(capGeo, towerMat);
    cap.position.set(x, surfaceY + BASE_CAP_Y_CENTER, z);
    group.add(cap);

    // ---- Faction-specific decoration ----
    switch (f.faction) {
      case 0: // CRU — short spikes around the base
        addSpikes(group, x, surfaceY + BASE_CRU_SPIKE_Y, z, 6, BASE_SPIKE.bottomR, BASE_SPIKE.height, accentMat);
        break;
      case 1: // REV — floating ring above cap
        addRing(group, x, surfaceY + 0.85, z, BASE_RING.radius, BASE_RING.tube, accentMat);
        break;
      case 2: // VER — leafy crown on top
        addSpikes(group, x, surfaceY + 0.80, z, 8, 0.04, 0.08, accentMat);
        break;
      case 3: // ARC — small satellite dots
        addRingDots(group, x, surfaceY + 0.55, z, 0.32, 4, accentMat);
        break;
      case 4: // HRT — wide round cap (like a hearth)
        {
          const domeGeo = new THREE.SphereGeometry(BASE_HEART_DOME.radius, BASE_HEART_DOME.widthSegs, BASE_HEART_DOME.heightSegs, BASE_HEART_DOME.phiStart, BASE_HEART_DOME.phiLength, 0, Math.PI * 0.5);
          const dome = new THREE.Mesh(domeGeo, accentMat);
          dome.position.set(x, surfaceY + 0.83, z);
          group.add(dome);
        }
        break;
      case 5: // MSK — pointed spire
        {
          const spireGeo = new THREE.ConeGeometry(BASE_MASK_SPIRE.radius, BASE_MASK_SPIRE.topRadius, BASE_MASK_SPIRE.height);
          const spire = new THREE.Mesh(spireGeo, accentMat);
          spire.position.set(x, surfaceY + 0.87, z);
          group.add(spire);
        }
        break;
      case 6: // HOL — inverted spike (hanging)
        {
          const spikeGeo = new THREE.ConeGeometry(BASE_HOL_SPIKE.radius, BASE_HOL_SPIKE.height, BASE_HOL_SPIKE.segments);
          const spike = new THREE.Mesh(spikeGeo, accentMat);
          spike.position.set(x, surfaceY + 0.07, z);
          spike.rotation.x = Math.PI; // point downward
          group.add(spike);
        }
        break;
    }

    // All base children cast shadows (traverse after children are added)
    group.traverse(child => { if (child.isMesh) child.castShadow = true; });

    results.push(group);
  }

  return results;
}

/**
 * Build base meshes (groups) for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @returns {THREE.Group[]}
 */
export function buildChunkBaseMeshes(chunkTiles, visible) {
  const results = [];

  for (const tile of chunkTiles) {
    const key = `${tile.q},${tile.r}`;
    if (!visible.has(key)) continue;
    if (!tile.feature || tile.feature.kind !== 'base') continue;
    const f = tile.feature;
    const fac = FACTIONS[f.faction];
    if (!fac) continue;

    const surfaceY = tileSurfaceY(tile);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
    const group = new THREE.Group();
    group.name = `base_${f.faction}`;

    const towerMat = toonMaterial({ color: fac.base });
    const accentMat = toonMaterial({ color: fac.color });

    const towerGeo = new THREE.CylinderGeometry(BASE_TOWER.bottomR, BASE_TOWER.topR, BASE_TOWER.height, BASE_TOWER.segments);
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(x, surfaceY + BASE_TOWER_Y_CENTER, z);
    group.add(tower);

    const capGeo = new THREE.CylinderGeometry(BASE_CAP.bottomR, BASE_CAP.topR, BASE_CAP.height, BASE_CAP.segments);
    const cap = new THREE.Mesh(capGeo, towerMat);
    cap.position.set(x, surfaceY + BASE_CAP_Y_CENTER, z);
    group.add(cap);

    switch (f.faction) {
      case 0: addSpikes(group, x, surfaceY + BASE_CRU_SPIKE_Y, z, 6, BASE_SPIKE.bottomR, BASE_SPIKE.height, accentMat); break;
      case 1: addRing(group, x, surfaceY + 0.85, z, BASE_RING.radius, BASE_RING.tube, accentMat); break;
      case 2: addSpikes(group, x, surfaceY + 0.80, z, 8, 0.04, 0.08, accentMat); break;
      case 3: addRingDots(group, x, surfaceY + 0.55, z, 0.32, 4, accentMat); break;
      case 4: {
        const domeGeo = new THREE.SphereGeometry(BASE_HEART_DOME.radius, BASE_HEART_DOME.widthSegs, BASE_HEART_DOME.heightSegs, BASE_HEART_DOME.phiStart, BASE_HEART_DOME.phiLength, 0, Math.PI * 0.5);
        const dome = new THREE.Mesh(domeGeo, accentMat);
        dome.position.set(x, surfaceY + 0.83, z);
        group.add(dome);
      } break;
      case 5: {
        const spireGeo = new THREE.ConeGeometry(BASE_MASK_SPIRE.radius, BASE_MASK_SPIRE.topRadius, BASE_MASK_SPIRE.height);
        const spire = new THREE.Mesh(spireGeo, accentMat);
        spire.position.set(x, surfaceY + 0.87, z);
        group.add(spire);
      } break;
      case 6: {
        const spikeGeo = new THREE.ConeGeometry(BASE_HOL_SPIKE.radius, BASE_HOL_SPIKE.height, BASE_HOL_SPIKE.segments);
        const spike = new THREE.Mesh(spikeGeo, accentMat);
        spike.position.set(x, surfaceY + 0.07, z);
        spike.rotation.x = Math.PI;
        group.add(spike);
      } break;
    }

    group.traverse(child => { if (child.isMesh) child.castShadow = true; });
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
      cx + Math.cos(angle) * BASE_SPIKE_RING_RADIUS,
      cy,
      cz + Math.sin(angle) * BASE_SPIKE_RING_RADIUS
    );
    spike.rotation.z = Math.cos(angle) * BASE_SPIKE_TILT_AMOUNT;
    spike.rotation.x = Math.sin(angle) * BASE_SPIKE_TILT_AMOUNT;
    group.add(spike);
  }
}

/**
 * Add a thin torus ring.
 */
function addRing(group, cx, cy, cz, radius, thickness, mat) {
  const ringGeo = getBaseRingGeo();
  const ring = new THREE.Mesh(ringGeo, mat);
  ring.position.set(cx, cy, cz);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
}

/**
 * Add small dots in a ring.
 */
function addRingDots(group, cx, cy, cz, ringRadius, count, mat) {
  const dotGeo = getBaseRingDotGeo();
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
