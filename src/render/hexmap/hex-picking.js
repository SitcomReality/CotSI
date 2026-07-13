// Pure coordinate utilities: screen ↔ hex conversion (no DOM or event logic)

import { HEX_SIZE } from './constants.js';
import { coordKey } from '../../world/map.js';

/**
 * Convert clientX/clientY (relative to viewport) to map-space coordinates
 * accounting for the SVG bounding rect and current camera transform.
 */
export function screenToMap(clientX, clientY, svg, camera) {
  const rect = svg.getBoundingClientRect();
  const x = (clientX - rect.left - camera.tx) / camera.scale;
  const y = (clientY - rect.top - camera.ty) / camera.scale;
  return { x, y };
}

/**
 * Inverse flat-top hex mapping: axial coordinates (q, r) from map-space position.
 * Accepts an optional offset (e.g. viewport offsetX/offsetY from layout).
 */
export function findHexAt(mapX, mapY, offsetX = 0, offsetY = 0, hexSize = HEX_SIZE) {
  const x = mapX - offsetX;
  const y = mapY - offsetY;

  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / hexSize;
  const r = (2 / 3 * y) / hexSize;

  // Cube rounding
  const cube_q = q, cube_r = r, cube_s = -cube_q - cube_r;
  let rq = Math.round(cube_q);
  let rr = Math.round(cube_r);
  let rs = Math.round(cube_s);

  const dq = Math.abs(rq - cube_q);
  const dr = Math.abs(rr - cube_r);
  const ds = Math.abs(rs - cube_s);

  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;

  return { q: rq, r: rr };
}

/**
 * Convenience: one call from client coordinates to hex key string.
 */
export function hexKeyAtPosition(clientX, clientY, svg, camera) {
  const pos = screenToMap(clientX, clientY, svg, camera);
  const hex = findHexAt(pos.x, pos.y, camera.offsetX || 0, camera.offsetY || 0);
  return coordKey(hex);
}