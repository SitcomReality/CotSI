// src/render/hexmap3d/features/trees/treeParts.js
// Shared record helpers for the tree treatments: emitting one simple tree's
// trunk + canopy records (addTreeRecords) and jittering leaf/fruit colors
// (clusterColor).

import * as THREE from '../../../../vendor/three.module.js';
import { canopyForVariant } from './treeVariants.js';
import { frac, treeHash, clamp01 } from './treeHash.js';
import { TREE_TRUNK_Y_FRACTION, TREE_VARIATION } from '../../../../params/render/geometryParams.js';

/**
 * Emit trunk + canopy instance records for one tree.
 * Both parts pivot at the tree base `y`, with their center raised by `lift` in
 * their own frame — so the whole tree leans rigidly around its base and the
 * trunk/canopy stay perfectly coaxial (no sideways offset between them).
 * Trunk: uniform scale × trunkStretch on Y, planted on the surface.
 * Canopy: stretched in Y (leaf height) and XZ (leaf width); its Y-center shifts
 * up by halfHeight·(stretchY − 1) so the canopy bottom stays anchored to the trunk.
 */
export function addTreeRecords(records, tree) {
  const { x, y, z, variant, scale, stretchY, stretchXZ, trunkStretch, rotY, tiltAxis, tilt, color } = tree;
  const { heightOffset, canopyY, halfHeight, trunkScale = 1 } = canopyForVariant(variant);
  // The canopy keeps its original anchor (full trunkStretch) so the foliage's
  // vertical layout is unchanged; only the trunk shortens (tall trees), keeping
  // its top buried in the cone's fat lower part.
  const trunk = trunkStretch * trunkScale;
  const canopyLift = (canopyY * trunkStretch + halfHeight * (stretchY - 1)) * scale;

  records.push({
    x, z, geo: 'trunk',
    y,
    lift: heightOffset * TREE_TRUNK_Y_FRACTION * scale * trunk,
    scale, scaleY: scale * trunk,
    rotY, tiltAxis, tilt,
  });

  records.push({
    x, z, geo: `canopy-${variant}`,
    y,
    lift: canopyLift,
    scaleXZ: scale * stretchXZ, scaleY: scale * stretchY,
    rotY, tiltAxis, tilt,
    color,
  });

  // Canopy center in the tree's local frame — lets callers hang parts (fruit)
  // from the canopy with the same rigid transform.
  return { canopyLift };
}

/** Leaf/fruit color = base color with a small deterministic brightness jitter. */
export function clusterColor(baseHex, tileH, i, jitter = TREE_VARIATION.colorJitter) {
  const c = new THREE.Color(baseHex);
  const j = (frac(treeHash(tileH, i + 9)) - 0.5) * 2 * jitter;
  c.r = clamp01(c.r * (1 + j));
  c.g = clamp01(c.g * (1 + j));
  c.b = clamp01(c.b * (1 + j));
  return c;
}
