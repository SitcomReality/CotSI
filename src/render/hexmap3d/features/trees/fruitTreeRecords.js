// src/render/hexmap3d/features/trees/fruitTreeRecords.js
// Fruit-tree treatment (an interactive feature that claims its tile): one
// forest-family tree — the same canopy family as the surrounding grove (round
// on forest, tall on denseForest), slightly larger and warmer-toned — with
// 1–2 fruits hanging just under the canopy. Fruit reflects the tree's game
// state (tile.feature.ripe): ripe trees show full red apples; harvested trees
// regrow as small green fruit, making the heal/regrow cycle visible.

import { tileHash, treeHash, frac, lerp } from './treeHash.js';
import { clusterVariant } from './treeVariants.js';
import { addTreeRecords, clusterColor } from './treeParts.js';
import {
  TREE_SOLITARY, TREE_CANOPY_COLORS,
  FRUIT_TREE_COLORS, FRUIT_TREE_FRUIT,
} from '../../../../params/render/geometryParams.js';
import { DECOR_STATE, DISPERSED_SCALE, dispersedSingleOffset } from '../decorEmphasis.js';

/**
 * Compose one forest-family fruit tree: shared trunk + terrain canopy parts
 * (addTreeRecords) plus hanging fruit. All parts share the tree's rotY and
 * world tilt, so the whole tree leans rigidly around its base.
 *
 * When `mode` is DISPERSED (an occupant shares the hex) the tree moves to the
 * shared upper-left-corner anchor and shrinks, keeping the center clear.
 *
 * @param {object} tile      - Tile with `feature`, `terrain`, `q`, `r`
 * @param {object} worldPos  - { x, y, z } hex center in world space
 * @param {string|null} [mode] - one of DECOR_STATE, or null for normal
 */
export function fruitTreeRecords(tile, worldPos, mode) {
  const tileH = tileHash(tile);
  const cfg = TREE_SOLITARY.fruitTree;
  const variant = clusterVariant(tile.terrain); // round on forest, tall on denseForest
  const dispersed = mode === DECOR_STATE.DISPERSED;
  let px = worldPos.x;
  let pz = worldPos.z;
  if (dispersed) {
    ({ dx: px, dz: pz } = dispersedSingleOffset());
    px += worldPos.x;
    pz += worldPos.z;
  }
  const off = frac(tileH) * Math.PI * 2;
  const tiltDir = frac(treeHash(tileH, 1)) * Math.PI * 2;
  const s = cfg.scale * lerp(0.92, 1.08, frac(treeHash(tileH, 2))) * (dispersed ? DISPERSED_SCALE : 1);
  const f = (i, min, max) => lerp(min, max, frac(treeHash(tileH, i)));

  const records = [];
  const canopy = addTreeRecords(records, {
    x: px, y: worldPos.y, z: pz,
    variant,
    scale: s,
    stretchY: cfg.stretchY ?? 1.0,
    stretchXZ: cfg.stretchXZ ?? 1.0,
    trunkStretch: cfg.trunkStretch ?? 1.0,
    rotY: off,
    tiltAxis: { x: Math.sin(tiltDir), z: -Math.cos(tiltDir) },
    tilt: cfg.lean ?? 0,
    color: clusterColor(TREE_CANOPY_COLORS.fruit, tileH, 29),
  });

  // ── Fruit hanging just under the canopy; ripe = full red, unripe = small green ──
  const ripe = tile.feature?.ripe !== false;
  const fruitScale = s * (ripe ? 1.0 : FRUIT_TREE_FRUIT.unripeScale);
  const fruitColor = ripe ? FRUIT_TREE_COLORS.apple : FRUIT_TREE_COLORS.unripe;
  const [minCount, maxCount] = FRUIT_TREE_FRUIT.count;
  const fruitCount = minCount + Math.floor(frac(treeHash(tileH, 30)) * (maxCount - minCount + 1));

  for (let i = 0; i < fruitCount; i++) {
    const ang = f(31 + i * 2, 0, Math.PI * 2);
    const rad = s * f(32 + i * 2, FRUIT_TREE_FRUIT.radius[0], FRUIT_TREE_FRUIT.radius[1]);
    const drop = s * f(34 + i, FRUIT_TREE_FRUIT.drop[0], FRUIT_TREE_FRUIT.drop[1]);
    records.push({
      x: px, z: pz,
      y: worldPos.y,
      geo: 'fruit-apple',
      localPos: {
        x: Math.cos(ang) * rad + (frac(treeHash(tileH, 36 + i)) - 0.5) * FRUIT_TREE_FRUIT.jitter,
        y: canopy.canopyLift - drop,
        z: Math.sin(ang) * rad + (frac(treeHash(tileH, 38 + i)) - 0.5) * FRUIT_TREE_FRUIT.jitter,
      },
      rotY: off,
      tiltAxis: { x: Math.sin(tiltDir), z: -Math.cos(tiltDir) },
      tilt: cfg.lean ?? 0,
      scaleXZ: fruitScale, scaleY: fruitScale,
      color: clusterColor(fruitColor, tileH, 40 + i, 0.05),
    });
  }

  return records;
}
