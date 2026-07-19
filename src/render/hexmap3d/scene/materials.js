import * as THREE from '../../../vendor/three.module.js';

/** Single shared material for all terrain — vertex colors drive the look */
export const terrainMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,     // low-poly faceted look
  side: THREE.FrontSide,
});

/** Slightly darker material for terrain side faces (the "thickness" of tiles) */
export const terrainSideMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
  side: THREE.FrontSide,
});