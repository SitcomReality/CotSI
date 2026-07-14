import * as THREE from 'three';
import { coordKey } from '../../world/map.js';

const HEX_RADIUS = 1.0; // must match terrain.js

const raycaster = new THREE.Raycaster();

/**
 * Convert a screen-space mouse event to a hex key string.
 *
 * @param {number} clientX - Mouse X relative to viewport
 * @param {number} clientY - Mouse Y relative to viewport
 * @param {HTMLCanvasElement} canvas
 * @param {THREE.OrthographicCamera} camera
 * @param {THREE.Mesh} terrainMesh - The merged terrain mesh to raycast against
 * @returns {string|null} Hex key like "3,-2" or null if no hit
 */
export function hexKeyAtPosition3D(clientX, clientY, canvas, camera, terrainMesh) {
  // Normalized device coordinates (-1 to +1)
  const rect = canvas.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width)  * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

  const hits = raycaster.intersectObject(terrainMesh, false);
  if (hits.length === 0) return null;

  const point = hits[0].point;

  // Convert world-space (x, z) back to hex axial coordinates
  // Inverse of: x = sqrt(3) * (q + r/2), z = 1.5 * r
  const z = point.z;
  const x = point.x;

  // r = z / 1.5
  const r = z / (1.5 * HEX_RADIUS);
  // q = (x / sqrt(3)) - r/2
  const q = (x / (Math.sqrt(3) * HEX_RADIUS)) - r / 2;

  // Cube rounding (same as existing SVG hex-picking)
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;

  return coordKey({ q: rq, r: rr });
}