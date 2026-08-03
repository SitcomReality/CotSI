// src/render/hexmap3d/features/trees/clusterTreeRecords.js
// Cluster (woods/forest) treatment: a `tree` feature on forest/denseForest
// terrain renders 3–7 trees scattered inside the hex. forest is a spherical
// (round) deciduous grove; denseForest (deep wood) a conical (tall) pine stand.
// Each tree varies slightly in size, trunk height, leaf height/width, and
// rotation, and leans slightly away from the hex center (cartoony bouquet
// look). The tile's continuous density drives cluster size.

import * as THREE from '../../../../vendor/three.module.js';
import { tileHash, treeHash, frac, lerp, clamp01 } from './treeHash.js';
import { clusterVariant } from './treeVariants.js';
import { addTreeRecords, clusterColor } from './treeParts.js';
import {
  TREE_CLUSTER_COUNTS, TREE_CLUSTER_RING, TREE_CLUSTER_LEAN,
  TREE_VARIATION, TREE_CANOPY_COLORS,
} from '../../../../params/render/geometryParams.js';

/** Cluster size from density: forest 3–5, denseForest 4–7, ±1 hash jitter. */
function clusterCount(terrain, density, tileH) {
  const [min, max] = TREE_CLUSTER_COUNTS[terrain] || TREE_CLUSTER_COUNTS.forest;
  // Density is continuous (≈0.2 → 1.0 on forest tiles); clamp to 0..1.
  const d = clamp01((density - 0.2) / 0.8);
  const count = Math.round(lerp(min, max, d));
  return Math.min(max, Math.max(min, count + (tileH % 3) - 1));
}

/** Per-tree variation, deterministic from (tileH, i). */
function treeVariation(tileH, i) {
  return {
    scale:        lerp(TREE_VARIATION.scaleMin, TREE_VARIATION.scaleMax, frac(treeHash(tileH, i + 3))),
    stretchY:     lerp(TREE_VARIATION.stretchYMin, TREE_VARIATION.stretchYMax, frac(treeHash(tileH, i + 4))),
    stretchXZ:    lerp(TREE_VARIATION.stretchXZMin, TREE_VARIATION.stretchXZMax, frac(treeHash(tileH, i + 5))),
    trunkStretch: lerp(TREE_VARIATION.trunkStretchMin, TREE_VARIATION.trunkStretchMax, frac(treeHash(tileH, i + 6))),
    rotY:         frac(treeHash(tileH, i + 7)) * Math.PI * 2,
  };
}

/**
 * Emit cluster grove records for a tile: `count` trees on a jittered ring
 * around the hex center (well inside the hex), each leaning away from it.
 */
export function clusterTreeRecords(records, tile, worldPos, tileH) {
  const count = clusterCount(tile.terrain, tile.feature.density ?? 0.5, tileH);
  for (let i = 0; i < count; i++) {
    const v = treeVariation(tileH, i);
    const variant = clusterVariant(tile.terrain);

    // Position on a jittered ring around the hex center (well inside the hex)
    const ringT = clamp01(frac(treeHash(tileH, i + 1)) + (frac(treeHash(tileH, i + 2)) - 0.5) * TREE_VARIATION.ringJitter * 2);
    const r = TREE_CLUSTER_RING.min + (TREE_CLUSTER_RING.max - TREE_CLUSTER_RING.min) * ringT;
    const angle = (i / count) * Math.PI * 2 + (frac(treeHash(tileH, i + 2)) - 0.5) * TREE_VARIATION.angleJitter;
    const dx = Math.cos(angle) * r;
    const dz = Math.sin(angle) * r;

    // Lean away from the hex center: tilt axis ⊥ outward direction, positive tilt → outward
    const len = Math.hypot(dx, dz) || 1e-6;
    const tilt = lerp(TREE_CLUSTER_LEAN.min, TREE_CLUSTER_LEAN.max, frac(treeHash(tileH, i + 8)));

    addTreeRecords(records, {
      x: worldPos.x + dx, y: worldPos.y, z: worldPos.z + dz,
      variant, ...v,
      tiltAxis: { x: dz / len, z: -dx / len }, tilt,
      color: clusterColor(TREE_CANOPY_COLORS[variant], tileH, i),
    });
  }
  return records;
}
