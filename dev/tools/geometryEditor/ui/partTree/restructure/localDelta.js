/**
 * localDelta.js — Small transform-edit helper for the viewport gizmo:
 * applying a parent-frame delta to a node's `localPos` while keeping
 * denormalized files free of `localPos: {0,0,0}` noise.
 */
export function addLocalDelta(t, dx, dy, dz) {
  const lp = t.localPos ?? {};
  const next = { x: (lp.x ?? 0) + dx, y: (lp.y ?? 0) + dy, z: (lp.z ?? 0) + dz };
  if (next.x === 0 && next.y === 0 && next.z === 0) delete t.localPos;
  else t.localPos = next;
}
