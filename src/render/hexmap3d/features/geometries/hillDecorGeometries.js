// src/render/hexmap3d/features/geometries/hillDecorGeometries.js
import * as THREE from '../../../../vendor/three.module.js';
import { HILL_DECOR } from '../../../../params/render/geometryParams.js';

// =========================================================================
// Hill decoration geometry — a low flattened dome on hill tiles.
// Base sits at y = 0; the dome rises to HILL_DECOR.height.
// =========================================================================

let hillDecorGeo = null;

/** Low flattened dome — the terrain decoration for hill tiles. */
export function getHillDecorGeo() {
  if (!hillDecorGeo) {
    // Top hemisphere, then flatten to the configured height.
    hillDecorGeo = new THREE.SphereGeometry(HILL_DECOR.radius, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    hillDecorGeo.scale(1, HILL_DECOR.height / HILL_DECOR.radius, 1);
  }
  return hillDecorGeo;
}
