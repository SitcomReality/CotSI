// src/render/hexmap3d/features/featureVisuals.js
// Visual registry for feature kinds consumed by simpleFeatureMeshes.js.
//
// Each entry maps a feature `kind` string to its render configuration:
//   geometry   — factory () => THREE.BufferGeometry (lazy, shared across instances)
//   material   — factory () => THREE.Material        (lazy, one per InstancedMesh)
//   meshName   — string name for the InstancedMesh (used for debugging / disposal)
//   scale      — default per-instance scale multiplier
//
// Features with dedicated builders (tree, fruitTree, largeTree, knot, base, mountain)
// are NOT in this registry — they have their own complex logic and are handled
// by separate mesh builders called before simpleFeatureMeshes in the barrel.

import * as THREE from '../../../vendor/three.module.js';
import { getDebrisTuftGeo, getDebrisRockGeo, getDebrisFlowerGeo } from './featureGeometries.js';

export const FEATURE_VISUALS = {
  bush: {
    geometry: getDebrisTuftGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0x4A7A3A, flatShading: true }),
    meshName: 'flora-bush',
    scale: 1.5,
  },
  vine: {
    geometry: getDebrisTuftGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0x5A9A4A, flatShading: true }),
    meshName: 'flora-vine',
    scale: 0.8,
  },
};
