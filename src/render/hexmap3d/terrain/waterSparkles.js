import * as THREE from '../../../vendor/three.module.js';
import { waterSparkleMaterial } from '../scene/materials.js';
import { hexCenter } from '../hexWorldSpace.js';
import { ELEVATION, resolveElev, HEX_THICKNESS } from './tileHeight.js';
import { phaseAt, ampAt } from './buildWaterMesh.js';
import { SPARKLE_DENSITY, SPARKLE_SIZE, SPARKLE_COLOR, SPARKLE_Y_OFFSET } from '../../../params/render/terrainParams.js';

/**
 * waterSparkles.js — accent glints on still water.
 *
 * Small unlit 4-point stars (InstancedMesh) hover just above lake/ocean
 * surfaces. Per-instance aSparklePhase/aSparkleAmp attributes are computed in
 * JS with the exact same world-position hash as the water mesh, so every
 * sparkle bobs in sync with the water it sits on; a per-instance twinkle pulse
 * scales the star around its own center (see waterSparkleMaterial).
 *
 * One draw call per chunk; entirely static geometry — only the shared uTime
 * uniform changes per frame, so the GPU cost is negligible.
 */

/** Deterministic [0,1) hash of a tile (q, r) + salt — placement scatter. */
function tileHash01(q, r, salt) {
  const s = Math.sin(q * 127.1 + r * 311.7 + salt * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * 4-point star (two thin crossed diamonds) lying in the XZ plane, unit size,
 * centered on the origin. Shared across chunks — marked shared so chunk
 * disposal skips it (see disposeMeshRecursive / chunkManager.js).
 */
export const starGeometry = (() => {
  const s = 0.5;   // half-length of each arm
  const t = 0.05;  // half-thickness of each arm
  const v = [
    // X arms (2 triangles, CCW from above → +Y winding)
    0, 0, t,   s, 0, 0,   -s, 0, 0,
    -s, 0, 0,  s, 0, 0,   0, 0, -t,
    // Z arms (2 triangles, CCW from above → +Y winding)
    0, 0, s,   t, 0, 0,   0, 0, -s,
    0, 0, s,   0, 0, -s,  -t, 0, 0,
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
  geo.computeVertexNormals();
  geo.userData.shared = true;
  return geo;
})();

/**
 * Build an InstancedMesh of sparkle glints for a chunk's explored water
 * terrain tiles (lakes and ocean; river channels get flow animation instead).
 * Placement is deterministic per tile, so rebuilds are stable.
 *
 * @param {object[]} chunkTiles - Array of tile objects belonging to this chunk
 * @param {object}   state      - Game state (for biomePalettes lookup per tile)
 * @param {Set}      visible    - Set of hex keys currently visible
 * @param {Set}      explored   - Set of hex keys ever explored
 * @returns {THREE.InstancedMesh|null} Mesh, or null if the chunk has no explored water
 */
export function buildChunkWaterSparkles(chunkTiles, state, visible, explored) {
  // Collect placements first, then allocate the exact instance count.
  const placements = [];
  for (const tile of chunkTiles) {
    const key = `${tile.q},${tile.r}`;
    if (tile.terrain !== 'water' || !explored.has(key)) continue;

    // 0-2 sparkles per tile: SPARKLE_DENSITY gates the first, a scattered
    // subset of tiles gets a second.
    if (tileHash01(tile.q, tile.r, 1) >= SPARKLE_DENSITY) continue;
    const extra = tileHash01(tile.q, tile.r, 2) > 0.7 ? 1 : 0;

    const { x: cx, z: cz } = hexCenter(tile.q, tile.r);
    const topY = resolveElev(tile, ELEVATION) + HEX_THICKNESS + SPARKLE_Y_OFFSET;
    for (let k = 0; k <= extra; k++) {
      const angle = tileHash01(tile.q, tile.r, 3 + k) * Math.PI * 2;
      const dist = (0.15 + tileHash01(tile.q, tile.r, 5 + k) * 0.45);
      placements.push({
        x: cx + Math.cos(angle) * dist,
        z: cz + Math.sin(angle) * dist,
        y: topY,
        rot: tileHash01(tile.q, tile.r, 7 + k) * Math.PI * 2,
      });
    }
  }
  if (placements.length === 0) return null;

  const mesh = new THREE.InstancedMesh(starGeometry, waterSparkleMaterial, placements.length);
  mesh.name = 'waterSparkles';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = true;

  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const scale = new THREE.Vector3(SPARKLE_SIZE, 1, SPARKLE_SIZE);
  const color = new THREE.Color();

  const phases = new Float32Array(placements.length);
  const amps = new Float32Array(placements.length);

  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    pos.set(p.x, p.y, p.z);
    quat.setFromAxisAngle(up, p.rot);
    m.compose(pos, quat, scale);
    mesh.setMatrixAt(i, m);

    // Same world-position hash as the water surface — the sparkle bobs with
    // the exact water beneath it.
    phases[i] = phaseAt(p.x, p.z);
    amps[i] = ampAt(p.x, p.z);

    // Bright white-blue glints with a little per-instance brightness spread.
    const tint = 0.7 + tileHash01(p.x, p.z, 9) * 0.3;
    color.setRGB(SPARKLE_COLOR[0] * tint, SPARKLE_COLOR[1] * tint, SPARKLE_COLOR[2] * tint);
    mesh.setColorAt(i, color);
  }

  mesh.geometry.setAttribute('aSparklePhase', new THREE.InstancedBufferAttribute(phases, 1));
  mesh.geometry.setAttribute('aSparkleAmp', new THREE.InstancedBufferAttribute(amps, 1));

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}
