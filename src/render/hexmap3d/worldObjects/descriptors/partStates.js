/**
 * partStates.js — Growth-state keyframe resolution for descriptor parts.
 *
 * A shape leaf may carry `states.empty`: the part's look at growth 0
 * (depleted/empty). The part's authored base values are its look at growth 1
 * (full). `stateTransform` lerps the keyframed transform fields (per-axis
 * scale, root bottom height `y`, nested `localPos`) from the empty keyframe
 * to the base by the continuous 0..1 `growth` value; `stateColor` does the
 * same for `color` (channel-wise). Any field the keyframe omits keeps the base
 * value at every growth, so a descriptor without states — or a feature whose
 * growth is 1 — renders byte-identical to before. Pure — no THREE.
 */
import { isPlainObject } from './typeChecks.js';

/**
 * The transform a part renders with at the given growth: the base transform
 * with every keyframed field lerped empty → base. Returns the part's own
 * transform (no copy) when there is nothing to lerp — the common case for
 * decor/mountains and full-grown features.
 * @param {object} part - normalized shape-leaf part (may carry `states`)
 * @param {number} [growth] - 0..1 continuous growth; <1 lerps toward `empty`,
 *        1 (or undefined) keeps the authored base
 * @returns {object} the effective transform
 */
export function stateTransform(part, growth) {
  const empty = part?.states?.empty;
  if (!empty || growth == null || growth >= 1) return part.transform ?? {};
  const t = part.transform ?? {};
  const out = { ...t };
  const lerp = (from, to) => from + (to - from) * growth;
  if (empty.scaleX !== undefined) out.scaleX = lerp(empty.scaleX, t.scaleX ?? 1);
  if (empty.scaleY !== undefined) out.scaleY = lerp(empty.scaleY, t.scaleY ?? 1);
  if (empty.scaleZ !== undefined) out.scaleZ = lerp(empty.scaleZ, t.scaleZ ?? 1);
  if (empty.y !== undefined && t.y !== undefined) out.y = lerp(empty.y, t.y);
  if (isPlainObject(empty.localPos)) {
    const lp = t.localPos ?? {};
    out.localPos = {
      x: empty.localPos.x !== undefined ? lerp(empty.localPos.x, lp.x ?? 0) : (lp.x ?? 0),
      y: empty.localPos.y !== undefined ? lerp(empty.localPos.y, lp.y ?? 0) : (lp.y ?? 0),
      z: empty.localPos.z !== undefined ? lerp(empty.localPos.z, lp.z ?? 0) : (lp.z ?? 0),
    };
  }
  return out;
}

/** Channel-wise integer-color lerp: growth 0 → `from`, 1 → `to`. */
export function mixColor(from, to, growth) {
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = ch(((from >> 16) & 0xff) * (1 - growth) + ((to >> 16) & 0xff) * growth);
  const g = ch(((from >> 8) & 0xff) * (1 - growth) + ((to >> 8) & 0xff) * growth);
  const b = ch((from & 0xff) * (1 - growth) + (to & 0xff) * growth);
  return (r << 16) | (g << 8) | b;
}

/**
 * The base color a part renders with at the given growth: its authored color
 * lerped from the `empty` keyframe when one overrides `color`. Returns the
 * authored color when there is nothing to lerp. The caller (tileColorForPart)
 * applies jitter and biome tint AFTER this — per-instance variation layers on
 * top of the growth-state color.
 * @param {object} part - normalized shape-leaf part
 * @param {number} [growth] - 0..1 continuous growth
 * @returns {number|undefined} the effective base color, or undefined when the
 *         part has no literal color
 */
export function stateColor(part, growth) {
  const c = part?.color;
  if (c === undefined || typeof c === 'string') return undefined;
  const empty = part?.states?.empty?.color;
  if (empty === undefined || growth == null || growth >= 1) return c;
  return mixColor(empty, c, growth);
}
