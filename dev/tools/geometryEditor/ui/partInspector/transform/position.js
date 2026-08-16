/**
 * position.js — Position section of the part inspector: ground heights for
 * root leaves, frame localPos for every node. When the State toggle is
 * "empty", the Y and localPos rows edit the `states.empty` keyframe instead of
 * the base transform — the values lerp to the base as the feature regrows.
 */
import { el, row, numberInput } from '../../formControls/index.js';
import { isGroupNode } from '../../partTree/index.js';
import { section } from '../sectionShell.js';
import { editingEmptyState, emptyKeyframe, emptyLocalPos, pruneZeroLocalPos } from '../stateKeyframes.js';

/**
 * Write one localPos component of `t`, deleting the field when every component
 * is 0 again — keeps denormalized files free of `localPos: {0,0,0}` noise.
 */
export function setLocalPos(t, axis, v) {
  const lp = t.localPos ?? {};
  const next = { x: lp.x ?? 0, y: lp.y ?? 0, z: lp.z ?? 0, [axis]: v };
  if (next.x === 0 && next.y === 0 && next.z === 0) delete t.localPos;
  else t.localPos = next;
}

/**
 * Position: ground heights for root leaves, frame localPos for every node.
 * Groups are never grounded (schema: the nested field set at any depth), so
 * Y/Lift stay off root groups — only root shape leaves may set them.
 * When the State toggle is "empty", the Y and localPos rows edit the
 * `states.empty` keyframe instead of the base transform — the values lerp to
 * the base as the feature regrows. Lift is base-only (not keyframed).
 */
export function renderPositionSection(container, entry, ctx) {
  const { node, parent } = entry;
  const t = node.transform ?? (node.transform = {});
  const empty = editingEmptyState();
  const sec = section('position', container);
  if (empty) {
    sec.append(el('div', 'hint', 'Editing the EMPTY keyframe (growth 0) — these values lerp to the full-state values as the feature regrows.'));
  }
  if (parent === null && !isGroupNode(node)) {
    sec.append(el('div', 'hint', 'Y / Lift / localPos are world offsets (item-scaled). The part\'s lowest vertex lands at Y + Lift (+ localPos.y).'));
    const yValue = empty ? (node.states?.empty?.y ?? t.y ?? 0) : (t.y ?? 0);
    sec.append(row('Y (bottom height)', numberInput(yValue, { onChange: (v) => ctx.mutate(() => {
      if (empty) emptyKeyframe(node).y = v;
      else t.y = v;
    }) })));
    sec.append(row('Lift (bottom height)', numberInput(t.lift ?? 0, { onChange: (v) => ctx.mutate(() => { t.lift = v; }) })));
  } else if (parent === null) {
    sec.append(el('div', 'hint', 'Groups are never grounded — localPos offsets in the item frame (pre-scale units).'));
  } else {
    sec.append(el('div', 'hint', 'localPos offsets in the parent frame (pre-scale units); a leaf\'s bottom sits at its localPos point.'));
  }
  const lpValue = (axis) => empty ? (node.states?.empty?.localPos?.[axis] ?? t.localPos?.[axis] ?? 0) : (t.localPos?.[axis] ?? 0);
  const writeLp = (axis, v) => ctx.mutate(() => {
    if (empty) {
      const lp = emptyLocalPos(node);
      lp[axis] = v;
      pruneZeroLocalPos(node);
    } else {
      setLocalPos(t, axis, v);
    }
  });
  sec.append(row('localPos X', numberInput(lpValue('x'), { onChange: (v) => writeLp('x', v) })));
  sec.append(row('localPos Y', numberInput(lpValue('y'), { onChange: (v) => writeLp('y', v) })));
  sec.append(row('localPos Z', numberInput(lpValue('z'), { onChange: (v) => writeLp('z', v) })));
}
