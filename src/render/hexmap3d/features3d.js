import * as THREE from '../../lib/three.module.js';
import { FACTIONS } from '../../core/factions.js';

const HEX_RADIUS = 1.0;

// --- Shared geometries (created once, reused via InstancedMesh) ---

let treeTrunkGeo = null;
let treeCanopyGeo = null;
let mountainGeo = null;
let knotGeo = null;
let baseTowerGeo = null;
let baseBattlementGeo = null;

function getTreeTrunkGeo() {
  if (!treeTrunkGeo) {
    treeTrunkGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 6);
  }
  return treeTrunkGeo;
}

function getTreeCanopyGeo() {
  if (!treeCanopyGeo) {
    // Low-poly cone: 6 sides, 2 stacks
    treeCanopyGeo = new THREE.ConeGeometry(0.4, 0.5, 6, 2);
  }
  return treeCanopyGeo;
}

function getMountainGeo() {
  if (!mountainGeo) {
    // 4-sided pyramid
    mountainGeo = new THREE.ConeGeometry(0.6, 0.9, 4);
  }
  return mountainGeo;
}

function getKnotGeo() {
  if (!knotGeo) {
    knotGeo = new THREE.OctahedronGeometry(0.2, 0);
  }
  return knotGeo;
}

function hexCenter3D(q, r, y) {
  const x = Math.sqrt(3) * HEX_RADIUS * (q + r / 2);
  const z = 1.5 * HEX_RADIUS * r;
  return { x, y, z };
}

/**
 * Build all feature InstancedMeshes for the current game state.
 * Returns an array of meshes to add to the scene.
 */
export function buildFeatureMeshes(state, visible) {
  const results = [];

  // Collect instance data
  const treeTrunkInstances = [];
  const treeCanopyInstances = [];
  const mountainInstances = [];
  const knotInstances = [];
  const baseInstances = [];

  for (const key of visible) {
    const tile = state.tiles[key];
    if (!tile || !tile.feature) continue;

    const f = tile.feature;
    const baseY = getElevationY(tile.terrain) + 2; // on top of tile

    if (f.kind === 'tree') {
      const { x, z } = hexCenter3D(tile.q, tile.r, baseY);
      // 3-5 trees per forest hex, pseudo-random offsets
      const seed = tile.q * 1000 + tile.r;
      const count = 3 + (Math.abs(seed) % 3); // 3-5
      for (let i = 0; i < count; i++) {
        const ox = pseudoRandom(seed + i * 7, -0.35, 0.35);
        const oz = pseudoRandom(seed + i * 13, -0.35, 0.35);
        const scale = 0.7 + pseudoRandom(seed + i * 17, 0, 0.6);
        treeTrunkInstances.push({
          x: x + ox, y: baseY, z: z + oz,
          scale,
          color: tile.feature?.ripe !== false
            ? [0.353, 0.227, 0.133] // ripe trunk
            : [0.478, 0.353, 0.227], // bare trunk
        });
        treeCanopyInstances.push({
          x: x + ox, y: baseY + 0.3, z: z + oz,
          scale,
          color: tile.feature?.ripe !== false
            ? [0.184, 0.494, 0.267] // ripe green
            : [0.416, 0.541, 0.353], // bare muted
        });
      }
    } else if (f.kind === 'mountain' || tile.terrain === 'mountain') {
      const { x, z } = hexCenter3D(tile.q, tile.r, baseY);
      mountainInstances.push({
        x, y: baseY + 0.2, z,
        scale: 1.0,
        color: [0.718, 0.667, 0.573],
      });
    } else if (f.kind === 'knot' && !f.mined) {
      const { x, z } = hexCenter3D(tile.q, tile.r, baseY);
      knotInstances.push({
        x, y: baseY + 0.15, z,
        scale: 1.0,
        color: [0.486, 0.247, 0.694], // purple
      });
    } else if (f.kind === 'base') {
      baseInstances.push({
        q: tile.q, r: tile.r, baseY,
        faction: f.faction,
      });
    }
  }

  // Create tree trunk InstancedMesh
  if (treeTrunkInstances.length > 0) {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a22, flatShading: true });
    const im = new THREE.InstancedMesh(getTreeTrunkGeo(), trunkMat, treeTrunkInstances.length);
    const dummy = new THREE.Object3D();
    treeTrunkInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.set(inst.scale, inst.scale * 1.3, inst.scale);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.name = 'treeTrunks';
    results.push(im);
  }

  // Create tree canopy InstancedMesh
  if (treeCanopyInstances.length > 0) {
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0x4a9f5a, flatShading: true });
    const im = new THREE.InstancedMesh(getTreeCanopyGeo(), canopyMat, treeCanopyInstances.length);
    const dummy = new THREE.Object3D();
    treeCanopyInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(inst.scale);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.name = 'treeCanopies';
    results.push(im);
  }

  // Create mountain InstancedMesh
  if (mountainInstances.length > 0) {
    const mountMat = new THREE.MeshLambertMaterial({ color: 0xb7aa92, flatShading: true });
    const im = new THREE.InstancedMesh(getMountainGeo(), mountMat, mountainInstances.length);
    const dummy = new THREE.Object3D();
    mountainInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.name = 'mountains';
    results.push(im);
  }

  // Create knot InstancedMesh
  if (knotInstances.length > 0) {
    const knotMat = new THREE.MeshLambertMaterial({
      color: 0x7c3fb1,
      emissive: 0xb79aff,
      emissiveIntensity: 0.4,
      flatShading: true,
    });
    const im = new THREE.InstancedMesh(getKnotGeo(), knotMat, knotInstances.length);
    const dummy = new THREE.Object3D();
    knotInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.name = 'knots';
    results.push(im);
  }

  // Create base meshes (individual, since there are at most ~7)
  for (const base of baseInstances) {
    const fac = FACTIONS[base.faction];
    if (!fac) continue;
    const { x, z } = hexCenter3D(base.q, base.r, base.baseY);
    const group = new THREE.Group();
    group.name = `base_${base.faction}`;

    // Tower body
    const towerGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.7, 8);
    const towerMat = new THREE.MeshLambertMaterial({ color: fac.color, flatShading: true });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(x, base.baseY + 0.35, z);
    group.add(tower);

    // Top cap
    const capGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.15, 8);
    const cap = new THREE.Mesh(capGeo, towerMat);
    cap.position.set(x, base.baseY + 0.75, z);
    group.add(cap);

    results.push(group);
  }

  return results;
}

function getElevationY(terrain) {
  const map = { plains: 0, forest: 0.08, desert: 0.03, marsh: -0.05, mountain: 0.6, water: -0.15 };
  return map[terrain] || 0;
}

function pseudoRandom(seed, min, max) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  const frac = x - Math.floor(x);
  return min + frac * (max - min);
}