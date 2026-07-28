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
import {
  getDebrisTuftGeo,
  getSlabGeo,
  getDiscGeo,
  getOrbGeo,
  getCypressGeo,
  getPlantGeo,
  getMonumentGeo,
  getBigtreeGeo,
  getClusterGeo,
  getArchGeo,
  getFigureGeo,
  getCenserGeo,
  getObeliskGeo,
  getStoneGeo,
  getVentGeo,
  getRingGeo,
} from './geometries/index.js';

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
  palimpsestSlab: {
    geometry: getSlabGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xC8C0A8, flatShading: true }),
    meshName: 'feature-slab',
    scale: 1.0,
  },
  volvelle: {
    geometry: getDiscGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xD4B830, flatShading: true }),
    meshName: 'feature-disc',
    scale: 0.9,
  },
  foolsFire: {
    geometry: getOrbGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0x40D0E0, flatShading: true }),
    meshName: 'feature-orb',
    scale: 0.7,
  },
  placeholderCypress: {
    geometry: getCypressGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0x3A5A2A, flatShading: true }),
    meshName: 'feature-cypress',
    scale: 1.0,
  },
  vegetableLamb: {
    geometry: getPlantGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xC0D8A0, flatShading: true }),
    meshName: 'feature-plant',
    scale: 1.1,
  },
  scoriaRose: {
    geometry: getPlantGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xE87030, flatShading: true }),
    meshName: 'feature-plant',
    scale: 0.8,
  },
  waxbloom: {
    geometry: getPlantGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xA0D8E8, flatShading: true }),
    meshName: 'feature-plant',
    scale: 0.9,
  },
  errataSlip: {
    geometry: getSlabGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xF0E8D0, flatShading: true }),
    meshName: 'feature-slab',
    scale: 1.2,
  },
  redLetterBramble: {
    geometry: getDebrisTuftGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0x1A1010, flatShading: true }),
    meshName: 'feature-bramble',
    scale: 1.3,
  },
  gildedInitial: {
    geometry: getMonumentGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xD8B830, flatShading: true }),
    meshName: 'feature-monument',
    scale: 1.5,
  },
  peridexionTree: {
    geometry: getBigtreeGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0x1A5A0A, flatShading: true }),
    meshName: 'feature-bigtree',
    scale: 1.6,
  },
  listenerLichen: {
    geometry: getClusterGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0x80C0A0, flatShading: true }),
    meshName: 'feature-cluster',
    scale: 0.7,
  },
  saintsRib: {
    geometry: getArchGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xE8E0D0, flatShading: true }),
    meshName: 'feature-arch',
    scale: 2.0,
  },
  drownedCopyist: {
    geometry: getFigureGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0x405868, flatShading: true }),
    meshName: 'feature-figure',
    scale: 1.2,
  },
  censerSaint: {
    geometry: getCenserGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xB89840, flatShading: true }),
    meshName: 'feature-censer',
    scale: 1.1,
  },
  screamroot: {
    geometry: getPlantGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0x682040, flatShading: true }),
    meshName: 'feature-plant',
    scale: 1.0,
  },
  nullLily: {
    geometry: getPlantGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xE0E0E8, flatShading: true }),
    meshName: 'feature-plant',
    scale: 0.8,
  },
  halfDrawnObelisk: {
    geometry: getObeliskGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xA0A098, flatShading: true }),
    meshName: 'feature-obelisk',
    scale: 1.8,
  },
  witnessStone: {
    geometry: getStoneGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xB0A890, flatShading: true }),
    meshName: 'feature-stone',
    scale: 1.3,
  },
  cinderbloom: {
    geometry: getPlantGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xE88040, flatShading: true }),
    meshName: 'feature-plant',
    scale: 0.8,
  },
  brassLungVent: {
    geometry: getVentGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xA08050, flatShading: true }),
    meshName: 'feature-vent',
    scale: 1.0,
  },
  ouroborosLoop: {
    geometry: getRingGeo,
    material: () => new THREE.MeshLambertMaterial({ color: 0xC8A020, flatShading: true }),
    meshName: 'feature-ring',
    scale: 1.2,
  },
};
