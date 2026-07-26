// src/render/hexmap3d/features/geometries/knotGeometries.js
import * as THREE from '../../../../vendor/three.module.js';
import { KNOT_RADIUS } from '../../../../params/render/geometryParams.js';

// =========================================================================
// Knot geometry
// =========================================================================

let knotGeo = null;

export function getKnotGeo() {
  if (!knotGeo) {
    knotGeo = new THREE.OctahedronGeometry(KNOT_RADIUS, 0);
  }
  return knotGeo;
}
