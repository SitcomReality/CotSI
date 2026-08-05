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
import { toonMaterial } from '../scene/materials.js';
import {
  getTuftGeo,
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
  getSnowpersonGeo,
} from './geometries/index.js';

export const FEATURE_VISUALS = {
  bush: {
    geometry: getTuftGeo,
    material: () => toonMaterial({ color: 0x4A7A3A }),
    meshName: 'flora-bush',
    scale: 1.5,
  },
  vine: {
    geometry: getTuftGeo,
    material: () => toonMaterial({ color: 0x5A9A4A }),
    meshName: 'flora-vine',
    scale: 0.8,
  },
  palimpsestSlab: {
    geometry: getSlabGeo,
    material: () => toonMaterial({ color: 0xC8C0A8 }),
    meshName: 'feature-slab',
    scale: 1.0,
  },
  volvelle: {
    geometry: getDiscGeo,
    material: () => toonMaterial({ color: 0xD4B830 }),
    meshName: 'feature-disc',
    scale: 0.9,
  },
  foolsFire: {
    geometry: getOrbGeo,
    material: () => toonMaterial({ color: 0x40D0E0 }),
    meshName: 'feature-orb',
    scale: 0.7,
  },
  placeholderCypress: {
    geometry: getCypressGeo,
    material: () => toonMaterial({ color: 0x3A5A2A }),
    meshName: 'feature-cypress',
    scale: 1.0,
  },
  vegetableLamb: {
    geometry: getPlantGeo,
    material: () => toonMaterial({ color: 0xC0D8A0 }),
    meshName: 'feature-plant',
    scale: 1.1,
  },
  scoriaRose: {
    geometry: getPlantGeo,
    material: () => toonMaterial({ color: 0xE87030 }),
    meshName: 'feature-plant',
    scale: 0.8,
  },
  waxbloom: {
    geometry: getPlantGeo,
    material: () => toonMaterial({ color: 0xA0D8E8 }),
    meshName: 'feature-plant',
    scale: 0.9,
  },
  errataSlip: {
    geometry: getSlabGeo,
    material: () => toonMaterial({ color: 0xF0E8D0 }),
    meshName: 'feature-slab',
    scale: 1.2,
  },
  redLetterBramble: {
    geometry: getTuftGeo,
    material: () => toonMaterial({ color: 0x1A1010 }),
    meshName: 'feature-bramble',
    scale: 1.3,
  },
  gildedInitial: {
    geometry: getMonumentGeo,
    material: () => toonMaterial({ color: 0xD8B830 }),
    meshName: 'feature-monument',
    scale: 1.5,
  },
  peridexionTree: {
    geometry: getBigtreeGeo,
    material: () => toonMaterial({ color: 0x1A5A0A }),
    meshName: 'feature-bigtree',
    scale: 1.6,
  },
  listenerLichen: {
    geometry: getClusterGeo,
    material: () => toonMaterial({ color: 0x80C0A0 }),
    meshName: 'feature-cluster',
    scale: 0.7,
  },
  saintsRib: {
    geometry: getArchGeo,
    material: () => toonMaterial({ color: 0xE8E0D0 }),
    meshName: 'feature-arch',
    scale: 2.0,
  },
  drownedCopyist: {
    geometry: getFigureGeo,
    material: () => toonMaterial({ color: 0x405868 }),
    meshName: 'feature-figure',
    scale: 1.2,
  },
  censerSaint: {
    geometry: getCenserGeo,
    material: () => toonMaterial({ color: 0xB89840 }),
    meshName: 'feature-censer',
    scale: 1.1,
  },
  screamroot: {
    geometry: getPlantGeo,
    material: () => toonMaterial({ color: 0x682040 }),
    meshName: 'feature-plant',
    scale: 1.0,
  },
  nullLily: {
    geometry: getPlantGeo,
    material: () => toonMaterial({ color: 0xE0E0E8 }),
    meshName: 'feature-plant',
    scale: 0.8,
  },
  halfDrawnObelisk: {
    geometry: getObeliskGeo,
    material: () => toonMaterial({ color: 0xA0A098 }),
    meshName: 'feature-obelisk',
    scale: 1.8,
  },
  witnessStone: {
    geometry: getStoneGeo,
    material: () => toonMaterial({ color: 0xB0A890 }),
    meshName: 'feature-stone',
    scale: 1.3,
  },
  cinderbloom: {
    geometry: getPlantGeo,
    material: () => toonMaterial({ color: 0xE88040 }),
    meshName: 'feature-plant',
    scale: 0.8,
  },
  brassLungVent: {
    geometry: getVentGeo,
    material: () => toonMaterial({ color: 0xA08050 }),
    meshName: 'feature-vent',
    scale: 1.0,
  },
  ouroborosLoop: {
    geometry: getRingGeo,
    material: () => toonMaterial({ color: 0xC8A020 }),
    meshName: 'feature-ring',
    scale: 1.2,
  },

  // ── Edenfall biome features ──────────────────────────────────────────────

  edenMushroom: {
    geometry: getBigtreeGeo,
    material: () => toonMaterial({ color: 0x7A2A8A }),
    meshName: 'flora-mushroom',
    scale: 2.5,
  },
  edenShroomlet: {
    geometry: getClusterGeo,
    material: () => toonMaterial({ color: 0xA060C0 }),
    meshName: 'flora-shroomlet',
    scale: 1.2,
  },

  // ── Tundra biome features ──────────────────────────────────────────────

  snowperson: {
    geometry: getSnowpersonGeo,
    material: () => toonMaterial({ color: 0xF0F4F8 }),
    meshName: 'feature-snowperson',
    scale: 1.0,
  },
};
