/**
 * transformVariation.js — Per-node spawn chance and range-form transforms.
 *
 * Two per-item variation mechanisms for parts-tree nodes on the tile path:
 *
 *  - `chance` on any node (leaf, group, or alternatives choice point): an
 *    independent present/absent roll per item. Absent ≡ always present;
 *    0 ≡ never. Sibling nodes roll independently, so e.g. two cactus arms
 *    with chance 0.45 yield none / left / right / both without any
 *    combinatorial `alternatives` authoring.
 *
 *  - Range form `{ min, max }` on nested-transform components (`localPos`
 *    axes and `scaleX/Y/Z`): one draw per node per item, deterministically
 *    from the tile hash + item index + a hash of the node id (renaming a
 *    node reshuffles only that node's draws).
 *
 * Both rolls come from `nodeDraw` — a decorrelated uniform [0, 1) per
 * (tile, item, node). Resolution happens at the top of collectPart
 * (tileRecords.js), so every downstream consumer (groupFrameMatrix,
 * nestedLeafFrameMatrix, leafScaleXYZ, stateTransform, recordForPart) sees
 * plain numbers; the editor's gizmo path shares collectPart, so preview
 * frames match rendered records by construction. Pure — no THREE.
 */
import { itemHash, lerp } from '../tileHash.js';

/** FNV-1a over the node id — decorrelates sibling nodes' draws. */
function idSalt(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic [0, 1) draw for one node of one item of one tile. */
export function nodeDraw(tileH, i, nodeId) {
  return itemHash((tileH ^ idSalt(nodeId)) | 0, i);
}

/** A range-form component — `{ min, max }` in place of a number. */
export function isRange(v) {
  return typeof v === 'object' && v !== null && typeof v.min === 'number' && typeof v.max === 'number';
}

const RANGE_KEYS = ['scaleX', 'scaleY', 'scaleZ'];

/** Does this part carry any range-form transform component? */
export function transformHasRange(part) {
  const t = part.transform;
  if (!t) return false;
  if (t.localPos && (isRange(t.localPos.x) || isRange(t.localPos.y) || isRange(t.localPos.z))) return true;
  return RANGE_KEYS.some((k) => isRange(t[k]));
}

/**
 * Collapse any range-form components to numbers drawn with `draw`. Shallow
 * copy — the original part (and every non-range field, params included) is
 * shared read-only with the caller.
 */
export function resolveTransformRanges(part, draw) {
  const t = part.transform;
  const nt = { ...t };
  if (nt.localPos) {
    nt.localPos = {
      x: isRange(t.localPos.x) ? lerp(t.localPos.x.min, t.localPos.x.max, draw) : t.localPos.x,
      y: isRange(t.localPos.y) ? lerp(t.localPos.y.min, t.localPos.y.max, draw) : t.localPos.y,
      z: isRange(t.localPos.z) ? lerp(t.localPos.z.min, t.localPos.z.max, draw) : t.localPos.z,
    };
  }
  for (const k of RANGE_KEYS) {
    if (isRange(nt[k])) nt[k] = lerp(t[k].min, t[k].max, draw);
  }
  return { ...part, transform: nt };
}

/**
 * The per-node spawn roll: true when the node should be present for this
 * item. Canonical previews (the geometry editor) skip the roll so authored
 * geometry always shows.
 */
export function chanceSpawns(part, tileH, i, canonical) {
  if (canonical) return true;
  const chance = part.chance;
  if (chance === undefined || chance >= 1) return true;
  return nodeDraw(tileH, i, part.id) < chance;
}
