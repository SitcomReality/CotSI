// src/render/hexmap3d/features/geometries/tuftGeometries.js
// Small grass-tuft geometry shared by the flora features (bush, vine,
// redLetterBramble) whose shapes are too small to deserve a dedicated geometry.

import * as THREE from '../../../../vendor/three.module.js';
import { TUFT } from '../../../../params/render/geometryParams.js';

let tuftGeo = null;

/** Small grass tuft — shared by the flora features (bush, vine, redLetterBramble). */
export function getTuftGeo() {
  if (!tuftGeo) {
    tuftGeo = new THREE.ConeGeometry(TUFT.bottomR, TUFT.height, TUFT.segments);
  }
  return tuftGeo;
}
