import * as THREE from '../../lib/three.module.js';

// World-space hex radius — must match terrain.js
const HEX_RADIUS = 1.0;

/**
 * Convert pixel coordinates to normalized device coordinates (-1..1)
 * for use with Raycaster.
 */
function pixelToNDC(clientX, clientY, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width)  * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;
  return { x, y };
}

/**
 * Get the hex key (q,r) of the tile under the given mouse/touch position.
 * Returns null if no terrain mesh is hit.
 *
 * @param {number} clientX   - Pointer X relative to viewport
 * @param {number} clientY   - Pointer Y relative to viewport
 * @param {THREE.Camera} camera
 * @param {THREE.Mesh} terrainMesh
 * @param {HTMLCanvasElement} canvas
 * @returns {string|null} "q,r" key or null
 */
export function pickHex(clientX, clientY, camera, terrainMesh, canvas) {
  if (!terrainMesh || !camera) return null;

  const ndc = pixelToNDC(clientX, clientY, canvas);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);

  const intersects = raycaster.intersectObject(terrainMesh, false);
  if (intersects.length === 0) return null;

  // Find the closest intersection
  let closest = null;
  let closestDist = Infinity;
  for (const hit of intersects) {
    if (hit.distance < closestDist) {
      closestDist = hit.distance;
      closest = hit;
    }
  }
  if (!closest) return null;

  // The hit point is in world space. Compute tile coordinates from that.
  // Flat-top layout: x = sqrt(3) * (q + r/2), z = 1.5 * r
  const { x, z } = closest.point;
  const r = Math.round((2 * z) / (3 * HEX_RADIUS));
  const q = Math.round((x / (Math.sqrt(3) * HEX_RADIUS)) - r / 2);

  // Validate: compute expected center and check distance
  const cx = Math.sqrt(3) * HEX_RADIUS * (q + r / 2);
  const cz = 1.5 * HEX_RADIUS * r;
  const dx = x - cx;
  const dz = z - cz;
  const distSq = dx * dx + dz * dz;
  // Accept if within a reasonable tolerance of the hex center
  // (radius tolerance is generous — ~90% of hex radius)
  if (distSq > HEX_RADIUS * HEX_RADIUS * 0.9) {
    return null;
  }

  return `${q},${r}`;
}

/**
 * Get the hex key under a pointer position, accounting for the terrain mesh
 * being the only pickable object.
 */
export function hexAtPointer(clientX, clientY, sceneContext, getTerrainMesh) {
  const terrainMesh = getTerrainMesh ? getTerrainMesh() : null;
  if (!sceneContext || !terrainMesh) return null;
  return pickHex(clientX, clientY, sceneContext.camera, terrainMesh, sceneContext.renderer.domElement);
}