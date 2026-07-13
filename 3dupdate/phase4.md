## Phase 4: Fog of War

**Goal**: Unexplored hexes render as face-down tiles (dark, blank tops). Explored-but-not-visible hexes get a semi-transparent dark overlay. Fog updates when vision changes.

### Files to create

**`src/render/hexmap3d/fogOfWar.js`** — Two merged meshes: unexplored face-down tiles and explored dark mist:

```javascript src/render/hexmap3d/fogOfWar.js
import * as THREE from 'three';
import { TERRAIN } from '../../world/map.js';

const HEX_RADIUS = 1.0;

// Face-down tile appearance
const FACEDOWN_COLOR = [0.15, 0.12, 0.08];  // dark brown
const FACEDOWN_Y = 0.16;  // sits just above normal tiles

// Dark mist appearance (explored but not visible)
const MIST_COLOR = [0.1, 0.08, 0.04];
const MIST_OPACITY = 0.5;
const MIST_Y = 0.17;

function hexCenter(q, r) {
  const x = Math.sqrt(3) * HEX_RADIUS * (q + r / 2);
  const z = 1.5 * HEX_RADIUS * r;
  return { x, z };
}

function hexCornersXZ(cx, cz) {
  const verts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    verts.push({
      x: cx + HEX_RADIUS * Math.cos(angle),
      z: cz + HEX_RADIUS * Math.sin(angle),
    });
  }
  return verts;
}

/**
 * Build a merged mesh of face-down tiles for completely unexplored hexes.
 * These cover the terrain with a "flipped over" board-game piece look.
 */
export function buildUnexploredMesh(tiles, explored) {
  const unexplored = Object.values(tiles).filter(t => !explored.has(`${t.q},${t.r}`));
  if (unexplored.length === 0) return null;

  const vertsPerHex = 54; // same as terrain top face + sides
  const positions = new Float32Array(unexplored.length * vertsPerHex * 3);
  const colors = new Float32Array(unexplored.length * vertsPerHex * 3);
  let vi = 0;

  for (const tile of unexplored) {
    const { x: cx, z: cz } = hexCenter(tile.q, tile.r);
    const corners = hexCornersXZ(cx, cz);
    const topY = FACEDOWN_Y + 0.15;
    const botY = FACEDOWN_Y;

    // Top face
    for (let i = 0; i < 6; i++) {
      const c0 = corners[i];
      const c1 = corners[(i + 1) % 6];
      addVert(positions, colors, vi,      cx, topY, cz, FACEDOWN_COLOR);
      addVert(positions, colors, vi + 3,  c0.x, topY, c0.z, FACEDOWN_COLOR);
      addVert(positions, colors, vi + 6,  c1.x, topY, c1.z, FACEDOWN_COLOR);
      vi += 9;
    }
    // Sides
    for (let i = 0; i < 6; i++) {
      const c0 = corners[i];
      const c1 = corners[(i + 1) % 6];
      addVert(positions, colors, vi,      c0.x, topY, c0.z, FACEDOWN_COLOR);
      addVert(positions, colors, vi + 3,  c0.x, botY, c0.z, FACEDOWN_COLOR);
      addVert(positions, colors, vi + 6,  c1.x, botY, c1.z, FACEDOWN_COLOR);
      addVert(positions, colors, vi + 9,  c0.x, topY, c0.z, FACEDOWN_COLOR);
      addVert(positions, colors, vi + 12, c1.x, botY, c1.z, FACEDOWN_COLOR);
      addVert(positions, colors, vi + 15, c1.x, topY, c1.z, FACEDOWN_COLOR);
      vi += 18;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'fogUnexplored';
  return mesh;
}

/**
 * Build a merged transparent mesh for explored-but-not-visible hexes.
 * These are semi-transparent dark prisms hovering just above the terrain.
 */
export function buildExploredMistMesh(tiles, explored, visible) {
  const mistTiles = Object.values(tiles).filter(t => {
    const key = `${t.q},${t.r}`;
    return explored.has(key) && !visible.has(key);
  });
  if (mistTiles.length === 0) return null;

  const vertsPerHex = 54;
  const positions = new Float32Array(mistTiles.length * vertsPerHex * 3);
  const colors = new Float32Array(mistTiles.length * vertsPerHex * 3);
  let vi = 0;

  for (const tile of mistTiles) {
    const { x: cx, z: cz } = hexCenter(tile.q, tile.r);
    const corners = hexCornersXZ(cx, cz);
    const topY = MIST_Y + 0.08;
    const botY = MIST_Y;

    for (let i = 0; i < 6; i++) {
      const c0 = corners[i];
      const c1 = corners[(i + 1) % 6];
      addVert(positions, colors, vi,      cx, topY, cz, MIST_COLOR);
      addVert(positions, colors, vi + 3,  c0.x, topY, c0.z, MIST_COLOR);
      addVert(positions, colors, vi + 6,  c1.x, topY, c1.z, MIST_COLOR);
      vi += 9;
    }
    for (let i = 0; i < 6; i++) {
      const c0 = corners[i];
      const c1 = corners[(i + 1) % 6];
      addVert(positions, colors, vi,      c0.x, topY, c0.z, MIST_COLOR);
      addVert(positions, colors, vi + 3,  c0.x, botY, c0.z, MIST_COLOR);
      addVert(positions, colors, vi + 6,  c1.x, botY, c1.z, MIST_COLOR);
      addVert(positions, colors, vi + 9,  c0.x, topY, c0.z, MIST_COLOR);
      addVert(positions, colors, vi + 12, c1.x, botY, c1.z, MIST_COLOR);
      addVert(positions, colors, vi + 15, c1.x, topY, c1.z, MIST_COLOR);
      vi += 18;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    transparent: true,
    opacity: MIST_OPACITY,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'fogMist';
  mesh.renderOrder = 1;
  return mesh;
}

function addVert(positions, colors, offset, x, y, z, color) {
  positions[offset]     = x;
  positions[offset + 1] = y;
  positions[offset + 2] = z;
  colors[offset]        = color[0];
  colors[offset + 1]    = color[1];
  colors[offset + 2]    = color[2];
}
```

### Files to edit

**`src/render/hexmap3d/index.js`** — Add fog mesh management:

In `renderHexMap3D()`, after building terrain, build fog meshes:

```javascript src/render/hexmap3d/index.js
import { buildUnexploredMesh, buildExploredMistMesh } from './fogOfWar.js';

// Track fog meshes
let unexploredMesh = null;
let mistMesh = null;

export function renderHexMap3D(state) {
  if (!ctx) return;
  const humanView = getHumanView(state);

  // Dispose old terrain + fog
  disposeMesh(terrainMesh);
  disposeMesh(unexploredMesh);
  disposeMesh(mistMesh);

  // Build terrain
  terrainMesh = buildTerrainMesh(state, humanView.visible, humanView.explored);
  ctx.scene.add(terrainMesh);

  // Build fog
  unexploredMesh = buildUnexploredMesh(state.tiles, humanView.explored);
  if (unexploredMesh) ctx.scene.add(unexploredMesh);

  mistMesh = buildExploredMistMesh(state.tiles, humanView.explored, humanView.visible);
  if (mistMesh) ctx.scene.add(mistMesh);
}

function disposeMesh(mesh) {
  if (mesh) {
    mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
    ctx.scene.remove(mesh);
  }
}
```

### What you'll see
- Unexplored hexes are covered by dark brown face-down tiles
- Explored-but-not-visible hexes have a dark semi-transparent mist overlay
- Visible hexes show terrain normally
- Fog updates when you move your champion (vision changes)
- Still no 3D features (trees, mountains) or units

---