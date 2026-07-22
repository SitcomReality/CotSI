// src/render/hexmap3d/features/geometries/knotGeometries.js
import * as THREE from '../../../../vendor/three.module.js';

// =========================================================================
// Knot geometry
// =========================================================================

let knotGeo = null;

export function getKnotGeo() {
  if (!knotGeo) {
    knotGeo = new THREE.OctahedronGeometry(0.2, 0);
  }
  return knotGeo;
}
