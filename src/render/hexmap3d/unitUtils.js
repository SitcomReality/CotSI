import * as THREE from '../../lib/three.module.js';
import { coordKey } from '../../world/map.js';
import { tileTopY } from './terrain.js';

const HEX_RADIUS = 1.0;

/**
 * Convert hex coordinates (q,r) + terrain surface Y to 3D world position.
 */
export function hexCenter3D(q, r, terrainY) {
  const x = Math.sqrt(3) * HEX_RADIUS * (q + r / 2);
  const z = 1.5 * HEX_RADIUS * r;
  return { x, y: terrainY + 0.15, z };
}

/**
 * Convert a hex color string (#rrggbb) to an RGB array (0..1).
 */
export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export { coordKey, tileTopY };