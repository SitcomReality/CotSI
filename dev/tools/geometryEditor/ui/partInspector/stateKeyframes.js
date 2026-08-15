/**
 * stateKeyframes.js — Growth-state keyframe helpers for the part inspector.
 *
 * The editor's State toggle (S.growth) chooses which keyframe the inspector
 * reads and writes: 1 = "full" (the part's authored base transform/color),
 * 0 = "empty" (the `states.empty` keyframe — fonts empty, fruit unripe).
 * Reads fall back to the base values; writes create the keyframe on demand
 * inside the caller's ctx.mutate, so an empty-state edit is undoable and only
 * an actual edit materializes `states` in the saved file.
 */
import { S } from '../../state.js';
import { ENTITY_KINDS } from '../../entityView.js';

/** True when the inspector edits the empty (growth 0) keyframe. Tile-driven
 *  kinds only — entity descriptors never render growth states. */
export function editingEmptyState() {
  return S.growth === 0 && !ENTITY_KINDS.has(S.descriptor?.kind);
}

/** The part's `states.empty` keyframe object, created on demand. Call inside
 *  ctx.mutate — creating `states` is a real descriptor edit (undoable). */
export function emptyKeyframe(part) {
  if (!part.states) part.states = {};
  if (!part.states.empty) part.states.empty = {};
  return part.states.empty;
}

/** The keyframe's `localPos`, created on demand (see emptyKeyframe). */
export function emptyLocalPos(part) {
  const kf = emptyKeyframe(part);
  if (!kf.localPos) kf.localPos = {};
  return kf.localPos;
}

/** Drop an all-zero keyframe localPos (mirroring setLocalPos's base cleanup),
 *  then drop the keyframe/states wrappers once nothing is authored. */
export function pruneZeroLocalPos(part) {
  const kf = part.states?.empty;
  const lp = kf?.localPos;
  if (lp && lp.x === 0 && lp.y === 0 && lp.z === 0) {
    delete kf.localPos;
  }
  if (kf && Object.keys(kf).length === 0) {
    delete part.states.empty;
    if (Object.keys(part.states).length === 0) delete part.states;
  }
}
