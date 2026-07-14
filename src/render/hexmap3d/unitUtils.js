import * as THREE from '../../lib/three.module.js';
import { coordKey } from '../../world/map.js';
import { tileTopY } from './terrain.js';
import { hexCenter3D } from './hexUtils.js';

/**
 * Convert a hex color string (#rrggbb) to an RGB array (0..1).
 */
export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export { hexCenter3D, coordKey, tileTopY };
