// src/render/hexmap3d/features/trees/clusterTreeRecords.js
// Cluster (woods/forest) treatment — the terrain decoration for forest and
// denseForest tiles: 3–7 trees scattered inside the hex. forest is a spherical
// (round) deciduous grove; denseForest (deep wood) a conical (tall) pine stand.
// In the Painforest biome the grove members are gnarled twisted trees
// (gnarledTreeRecords.js) with dark foliage. Each tree varies slightly in
// size, trunk height, leaf height/width, and rotation, and leans slightly away
// from the hex center (cartoony bouquet look). Tile moisture drives grove size.

import { tileHash, treeHash, frac, lerp, clamp01 } from './treeHash.js';
import { clusterVariant } from './treeVariants.js';
import { addTreeRecords, clusterColor } from './treeParts.js';
import { gnarledTreeRecords } from './gnarledTreeRecords.js';
import {
  TREE_CLUSTER_COUNTS, TREE_CLUSTER_RING, TREE_CLUSTER_LEAN,
  TREE_VARIATION, TREE_CANOPY_COLORS, PAINFOREST_GROVE_SCALE,
} from '../../../../params/render/geometryParams.js';
import { DECOR_STATE, DISPERSED_SCALE, dispersedRingOffsets } from '../decorEmphasis.js';

const PAINFOREST_BIOME = 'biome_painforest';

/** Grove density from tile moisture: forest ≈ sparse, denseForest ≈ denser. */
function clusterDensity(tile) {
  const m = tile.moisture;
  if (!Number.isFinite(m)) return 0.5;
  return clamp01((m - 0.55) / 0.3);
}

/** Cluster size from density: forest 3–5, denseForest 4–7, ±1 hash jitter. */
function clusterCount(terrain, density, tileH) {
  const [min, max] = TREE_CLUSTER_COUNTS[terrain] || TREE_CLUSTER_COUNTS.forest;
  // Density is continuous (forest tiles ≈ 0.1–1.0); clamp to 0..1.
  const d = clamp01(density);
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
 * Painforest grove members are gnarled trees; all other biomes use the
 * terrain's canopy family (round forest / tall denseForest).
 *
 * When `mode` is DISPERSED (an occupant or feature claims the hex center)
 * the trees move to a ring near the hex edge and shrink; when HIDDEN (an
 * occupant + feature share the tile) no grove is emitted at all.
 *
 * @param {object[]} records  - accumulator array
 * @param {object}   tile     - Tile with `terrain`, `biomeId`, `moisture`
 * @param {object}   worldPos - { x, y, z } hex center in world space
 * @param {number}   tileH    - deterministic per-tile hash
 * @param {string|null} [mode] - one of DECOR_STATE, or null for normal
 */
export function clusterTreeRecords(records, tile, worldPos, tileH, mode) {
  if (mode === DECOR_STATE.HIDDEN) return records;
  const dispersed = mode === DECOR_STATE.DISPERSED;
  const count = clusterCount(tile.terrain, clusterDensity(tile), tileH);
  const gnarled = tile.biomeId === PAINFOREST_BIOME;
  const ringOffsets = dispersed ? dispersedRingOffsets(count, tileH) : null;
  for (let i = 0; i < count; i++) {
    const v = treeVariation(tileH, i);
    const variant = gnarled ? null : clusterVariant(tile.terrain);

    let dx;
    let dz;
    if (dispersed) {
      ({ dx, dz } = ringOffsets[i]);
    } else {
      // Position on a jittered ring around the hex center (well inside the hex)
      const ringT = clamp01(frac(treeHash(tileH, i + 1)) + (frac(treeHash(tileH, i + 2)) - 0.5) * TREE_VARIATION.ringJitter * 2);
      const r = TREE_CLUSTER_RING.min + (TREE_CLUSTER_RING.max - TREE_CLUSTER_RING.min) * ringT;
      const angle = (i / count) * Math.PI * 2 + (frac(treeHash(tileH, i + 2)) - 0.5) * TREE_VARIATION.angleJitter;
      dx = Math.cos(angle) * r;
      dz = Math.sin(angle) * r;
    }

    // Lean away from the hex center: tilt axis ⊥ outward direction, positive tilt → outward
    const len = Math.hypot(dx, dz) || 1e-6;
    const tilt = lerp(TREE_CLUSTER_LEAN.min, TREE_CLUSTER_LEAN.max, frac(treeHash(tileH, i + 8)));
    const memberPos = { x: worldPos.x + dx, y: worldPos.y, z: worldPos.z + dz };
    const groveScale = dispersed ? DISPERSED_SCALE : 1;

    if (gnarled) {
      gnarledTreeRecords(records, tile, memberPos, {
        hashOffset: i,
        scale: PAINFOREST_GROVE_SCALE * groveScale,
        canopyColor: TREE_CANOPY_COLORS.painforest,
        tiltAxis: { x: dz / len, z: -dx / len },
        tilt,
      });
      continue;
    }

    addTreeRecords(records, {
      x: memberPos.x, y: memberPos.y, z: memberPos.z,
      variant, ...v,
      scale: v.scale * groveScale,
      tiltAxis: { x: dz / len, z: -dx / len }, tilt,
      color: clusterColor(TREE_CANOPY_COLORS[variant], tileH, i),
    });
  }
  return records;
}
