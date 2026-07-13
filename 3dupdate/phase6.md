## Phase 6: Units — Miniature Figurines

**Goal**: Champions, mobs, and traders become tiny 3D figurines on the board. The active champion gets a glowing base ring. HP bars are small colored planes.

### Files to create

**`src/render/hexmap3d/units3d.js`** — Unit figurine InstancedMeshes:

```javascript src/render/hexmap3d/units3d.js
import * as THREE from 'three';
import { FACTIONS } from '../../core/factions.js';

const HEX_RADIUS = 1.0;

// Shared geometries
let championBodyGeo = null;
let championRingGeo = null;
let mobBodyGeo = null;
let traderBodyGeo = null;

function getChampionBodyGeo() {
  if (!championBodyGeo) {
    // Pawn-shaped body: cylinder body + sphere head merged as a single group
    // We'll use a simple shape: tapered cylinder
    championBodyGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.5, 8);
  }
  return championBodyGeo;
}

function getChampionHeadGeo() {
  // Sphere head — separate to allow different color
  return new THREE.SphereGeometry(0.1, 8, 6);
}

function getChampionRingGeo() {
  if (!championRingGeo) {
    championRingGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 12);
  }
  return championRingGeo;
}

function getMobBodyGeo() {
  if (!mobBodyGeo) {
    // Slightly bulkier pawn
    mobBodyGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.4, 8);
  }
  return mobBodyGeo;
}

function getTraderBodyGeo() {
  if (!traderBodyGeo) {
    // Hooded shape: cone on cylinder
    traderBodyGeo = new THREE.ConeGeometry(0.13, 0.45, 8);
  }
  return traderBodyGeo;
}

function hexCenter3D(q, r, baseY) {
  const x = Math.sqrt(3) * HEX_RADIUS * (q + r / 2);
  const z = 1.5 * HEX_RADIUS * r;
  return { x, y: baseY + 0.15, z }; // on top of tile
}

function getElevationY(terrain) {
  const map = { plains: 0, forest: 0.08, desert: 0.03, marsh: -0.05, mountain: 0.6, water: -0.15 };
  return map[terrain] || 0;
}

/**
 * Build unit meshes for all visible champions, mobs, and traders.
 * Returns { championMeshes[], mobMesh, traderMesh } to add to scene.
 */
export function buildUnitMeshes(state, visible) {
  const results = [];
  const activeId = state.activeChampionId;

  // Collect instances
  const championBodyInstances = [];
  const championHeadInstances = [];
  const championRingInstances = [];
  const mobInstances = [];
  const traderInstances = [];

  for (const key of visible) {
    const tile = state.tiles[key];
    if (!tile) continue;

    // Check for units on this tile
    const champ = state.champions.find(c => coordKey(c.pos) === key);
    const mob = state.mobs?.find(m => coordKey(m.pos) === key);
    const trader = state.traders?.find(t => coordKey(t.pos) === key);

    if (!champ && !mob && !trader) continue;

    const baseY = getElevationY(tile.terrain);
    const { x, z } = hexCenter3D(tile.q, tile.r, baseY);

    if (champ) {
      const fac = FACTIONS[champ.faction];
      const color = fac ? hexToRgb(fac.color) : [0.8, 0.8, 0.8];
      championBodyInstances.push({ x, y: baseY + 0.15, z, color });
      championHeadInstances.push({ x, y: baseY + 0.45, z, color: [1, 1, 1] });
      if (champ.id === activeId) {
        championRingInstances.push({ x, y: baseY + 0.18, z });
      }
    } else if (mob) {
      const fac = FACTIONS[mob.faction];
      const color = fac ? hexToRgb(fac.color).map(c => c * 0.7) : [0.4, 0.3, 0.2];
      mobInstances.push({ x, y: baseY + 0.15, z, color });
    } else if (trader) {
      traderInstances.push({ x, y: baseY + 0.2, z, color: [0.29, 0.75, 0.6] });
    }
  }

  // Create champion body InstancedMesh
  if (championBodyInstances.length > 0) {
    const mat = new THREE.MeshLambertMaterial({ flatShading: true });
    const im = new THREE.InstancedMesh(getChampionBodyGeo(), mat, championBodyInstances.length);
    const dummy = new THREE.Object3D();
    championBodyInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      im.setColorAt(i, new THREE.Color(inst.color[0], inst.color[1], inst.color[2]));
    });
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
    im.name = 'championBodies';
    results.push(im);
  }

  // Create champion heads
  if (championHeadInstances.length > 0) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xffe8c8, flatShading: true });
    const im = new THREE.InstancedMesh(getChampionHeadGeo(), mat, championHeadInstances.length);
    const dummy = new THREE.Object3D();
    championHeadInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.name = 'championHeads';
    results.push(im);
  }

  // Create champion rings (active champion)
  if (championRingInstances.length > 0) {
    const ringMat = new THREE.MeshLambertMaterial({
      color: 0xffd86b,
      emissive: 0xffd86b,
      emissiveIntensity: 0.5,
      flatShading: true,
    });
    const im = new THREE.InstancedMesh(getChampionRingGeo(), ringMat, championRingInstances.length);
    const dummy = new THREE.Object3D();
    championRingInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.rotation.x = -Math.PI / 2; // lay flat
      dummy.scale.setScalar(1.0);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.name = 'championRings';
    results.push(im);
  }

  // Create mob InstancedMesh
  if (mobInstances.length > 0) {
    const mat = new THREE.MeshLambertMaterial({ flatShading: true });
    const im = new THREE.InstancedMesh(getMobBodyGeo(), mat, mobInstances.length);
    const dummy = new THREE.Object3D();
    mobInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      im.setColorAt(i, new THREE.Color(inst.color[0], inst.color[1], inst.color[2]));
    });
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
    im.name = 'mobs';
    results.push(im);
  }

  // Create trader InstancedMesh
  if (traderInstances.length > 0) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x4abf9a, flatShading: true });
    const im = new THREE.InstancedMesh(getTraderBodyGeo(), mat, traderInstances.length);
    const dummy = new THREE.Object3D();
    traderInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.name = 'traders';
    results.push(im);
  }

  return results;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

// Need coordKey from world/map
import { coordKey } from '../../world/map.js';
```

### Files to edit

**`src/render/hexmap3d/index.js`** — Add unit mesh management:

```javascript src/render/hexmap3d/index.js
import { buildUnitMeshes } from './units3d.js';

let unitMeshes = [];

export function renderHexMap3D(state) {
  // ... existing dispose ...
  for (const um of unitMeshes) disposeMesh(um);
  unitMeshes = [];

  // ... rebuild terrain, fog, features ...

  unitMeshes = buildUnitMeshes(state, humanView.visible);
  for (const um of unitMeshes) ctx.scene.add(um);
}
```

### What you'll see
- Champions as pawn-shaped figurines in faction colors
- Active champion has a glowing golden ring at its base
- Mobs as darker pawn shapes
- Traders as green hooded cone shapes
- Units appear, disappear, and reposition as the game state changes
- **The game is fully playable in 3D!**

---