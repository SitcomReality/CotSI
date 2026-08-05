// src/render/hexmap3d/features/trees/solitaryTreeRecords.js
// Solitary treatment: `largeTree` (Elder Tree landmark) and a lone `tree` on
// open terrain (plains, hill, marsh) render one bigger, more distinctive tree.
// (Fruit trees use the forest-family builder — see fruitTreeRecords.js.)

import * as THREE from '../../../../vendor/three.module.js';
import { treeHash, frac } from './treeHash.js';
import { treeVariant } from './treeVariants.js';
import { addTreeRecords } from './treeParts.js';
import { TREE_SOLITARY, TREE_CANOPY_COLORS } from '../../../../params/render/geometryParams.js';
import { DECOR_STATE, DISPERSED_SCALE, dispersedSingleOffset } from '../decorEmphasis.js';

/**
 * Emit records for one solitary tree — one bigger, more distinctive tree.
 * Slightly offset from the hex center and leaned on a deterministic tilt axis.
 * When `mode` is DISPERSED (an occupant shares the hex) the tree moves to the
 * shared upper-left-corner anchor and shrinks.
 *
 * @param {object[]} records  - accumulator array
 * @param {object}   tile     - Tile with `feature`, `terrain`, `q`, `r`
 * @param {object}   worldPos - { x, y, z } hex center in world space
 * @param {number}   tileH    - deterministic per-tile hash
 * @param {string|null} [mode] - one of DECOR_STATE, or null for normal
 */
export function solitaryTreeRecords(records, tile, worldPos, tileH, mode) {
  const kind = tile.feature.kind;
  const cfg = TREE_SOLITARY[kind] || TREE_SOLITARY.tree;
  const variant = kind === 'largeTree' ? 'round' : treeVariant(tile.terrain, tile.q, tile.r);
  const dispersed = mode === DECOR_STATE.DISPERSED;
  let ox;
  let oz;
  let off = 0;
  if (dispersed) {
    ({ dx: ox, dz: oz } = dispersedSingleOffset());
  } else {
    off = frac(tileH) * Math.PI * 2;
    ox = Math.cos(off) * 0.08;
    oz = Math.sin(off) * 0.08;
  }
  const tiltDir = frac(treeHash(tileH, 1)) * Math.PI * 2;
  const colorHex = kind === 'largeTree' ? TREE_CANOPY_COLORS.large : TREE_CANOPY_COLORS[variant];
  const scale = cfg.scale * (dispersed ? DISPERSED_SCALE : 1);

  addTreeRecords(records, {
    x: worldPos.x + ox, y: worldPos.y, z: worldPos.z + oz,
    variant,
    scale, stretchY: cfg.stretchY ?? 1.0, stretchXZ: cfg.stretchXZ ?? 1.0,
    trunkStretch: cfg.trunkStretch ?? 1.0,
    rotY: off,
    tiltAxis: { x: Math.sin(tiltDir), z: -Math.cos(tiltDir) },
    tilt: cfg.lean ?? 0,
    color: new THREE.Color(colorHex),
  });
  return records;
}
