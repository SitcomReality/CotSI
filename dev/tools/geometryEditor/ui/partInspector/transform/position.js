/**
 * position.js — Position section of the part inspector: ground heights for
 * root leaves, frame localPos for every node. When the State toggle is
 * "empty", the Y and localPos rows edit the `states.empty` keyframe instead of
 * the base transform — the values lerp to the base as the feature regrows.
 */
import { el, row, numberInput, intInput, selectInput, tupleRow } from '../../formControls/index.js';
import { isGroupNode } from '../../partTree/index.js';
import { section, fmt } from '../sectionShell.js';
import { editingEmptyState, emptyKeyframe, emptyLocalPos, pruneZeroLocalPos } from '../stateKeyframes.js';
import { LIFT_RANGE_SEED } from '../../../../../../src/render/hexmap3d/worldObjects/descriptors/partScale.js';
import { isRange } from '../../../../../../src/render/hexmap3d/worldObjects/descriptors/transformVariation.js';

/** Round to 3 decimals — matches the emitter's precision. */
const round3 = (v) => Math.round(v * 1000) / 1000;

/** A localPos component's display text: a number or a min–max span. */
function fmtComponent(v) {
  return isRange(v) ? `${fmt(v.min)}–${fmt(v.max)}` : fmt(v ?? 0);
}

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
  const sec = section('position', container, () => {
    const ty = t.y ?? 0;
    const tlift = t.lift ?? 0;
    const lr = t.liftRange;
    const lp = t.localPos;
    if (ty === 0 && tlift === 0 && !lr && (!lp || (lp.x === 0 && lp.y === 0 && lp.z === 0))) return 'default';
    const parts = [];
    if (ty !== 0) parts.push(`Y ${fmt(ty)}`);
    if (lr) parts.push(`lift ${fmt(lr.min)}–${fmt(lr.max)}`);
    else if (tlift !== 0) parts.push(`lift ${fmt(tlift)}`);
    if (lp) parts.push(`local (${fmtComponent(lp.x)}, ${fmtComponent(lp.y)}, ${fmtComponent(lp.z)})`);
    return parts.join(' · ');
  });
  if (empty) {
    sec.append(el('div', 'hint', 'Editing the EMPTY keyframe (growth 0) — these values lerp to the full-state values as the feature regrows.'));
  }
  if (parent === null && !isGroupNode(node)) {
    const yValue = empty ? (node.states?.empty?.y ?? t.y ?? 0) : (t.y ?? 0);
    sec.append(row('Y (bottom height)', numberInput(yValue, { onChange: (v) => ctx.mutate(() => {
      if (empty) emptyKeyframe(node).y = v;
      else t.y = v;
    }) }), 'World offset, item-scaled — the part\'s lowest vertex lands at Y + Lift (+ localPos.y)'));

    // Lift — pattern B, one source of truth: Fixed writes `lift`, Range
    // writes `liftRange` (a per-item draw between min and max). Switching
    // modes converts the value and deletes the other key, so the two can
    // never fight. Base pose only (not keyframed).
    if (!empty) {
      const inRange = t.liftRange !== undefined;
      const modeRow = el('div', 'control-row');
      const modeLabel = el('label', null, 'Lift');
      modeLabel.title = 'Fixed: one height for every instance. Range: each instance draws its lift from min–max (seeded)';
      modeRow.append(modeLabel);
      const modeSel = selectInput(['fixed', 'range'], inRange ? 'range' : 'fixed', (m) => ctx.mutate(() => {
        if (m === 'range') {
          const base = t.lift ?? (t.liftRange ? t.liftRange.min : 0);
          t.liftRange = { min: base, max: base + 0.2, seed: t.liftRange?.seed ?? 6 };
          delete t.lift;
        } else {
          const mid = t.liftRange ? (t.liftRange.min + t.liftRange.max) / 2 : 0;
          t.lift = Math.round(mid * 1000) / 1000;
          delete t.liftRange;
        }
      }));
      modeRow.append(modeSel);
      sec.append(modeRow);
    }
    if (empty || !t.liftRange) {
      sec.append(row('Lift (bottom height)', numberInput(t.lift ?? 0, { onChange: (v) => ctx.mutate(() => { t.lift = v; }) }), 'World offset, item-scaled; base transform only (not keyframed)'));
    } else {
      const lr = t.liftRange;
      sec.append(tupleRow('Lift range', [
        { input: numberInput(lr.min, { onChange: (v) => ctx.mutate(() => { lr.min = Math.min(v, lr.max); }) }), micro: 'min' },
        { input: numberInput(lr.max, { onChange: (v) => ctx.mutate(() => { lr.max = Math.max(v, lr.min); }) }), micro: 'max' },
      ], 'Each instance draws its lift from this range (item-scaled world units)'));
      sec.append(row('Range seed', intInput(lr.seed ?? LIFT_RANGE_SEED, { min: 0, onChange: (v) => ctx.mutate(() => { lr.seed = v; }) }), 'Per-instance draw seed — most authors leave it'));
    }
  }
  const lpTitle = parent === null
    ? (isGroupNode(node)
      ? 'Item-frame offset (pre-scale units) — groups are never grounded'
      : 'Item-frame offset (pre-scale units)')
    : 'Parent-frame offset (pre-scale units); a leaf\'s bottom sits at its localPos point';
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
  if (empty) {
    // Keyframes stay fixed-number — range form is a base-pose mechanism.
    sec.append(tupleRow('localPos', [
      { input: numberInput(lpValue('x'), { onChange: (v) => writeLp('x', v) }), micro: 'x' },
      { input: numberInput(lpValue('y'), { onChange: (v) => writeLp('y', v) }), micro: 'y' },
      { input: numberInput(lpValue('z'), { onChange: (v) => writeLp('z', v) }), micro: 'z' },
    ], lpTitle));
  } else {
    // Per-axis rows (pattern B, like Lift / stretch): a Fixed/Range select per
    // axis, values on the line below. Fixed writes a number, Range writes
    // `{ min, max }` (one draw per item); switching modes converts the value
    // and deletes the other form, so the two can never fight.
    const lpTitleRange = `${lpTitle}; Range draws once per item at render time`;
    for (const axis of ['x', 'y', 'z']) {
      const cur = t.localPos?.[axis];
      const inRange = isRange(cur);
      const stretchRow = el('div', 'stretch-row');
      const modeLine = el('div', 'control-row');
      const modeLabel = el('label', null, `localPos ${axis}`);
      modeLabel.title = lpTitleRange;
      modeLine.append(modeLabel);
      modeLine.append(selectInput(['fixed', 'range'], inRange ? 'range' : 'fixed', (m) => ctx.mutate(() => {
        if (m === 'range' && !isRange(t.localPos?.[axis])) {
          const base = typeof cur === 'number' ? cur : 0;
          setLocalPos(t, axis, { min: round3(base - 0.05), max: round3(base + 0.05) });
        } else if (m === 'fixed' && isRange(t.localPos?.[axis])) {
          setLocalPos(t, axis, round3((t.localPos[axis].min + t.localPos[axis].max) / 2));
        }
      })));
      stretchRow.append(modeLine);
      const inputsLine = el('div', 'stretch-inputs');
      if (inRange) {
        inputsLine.append(
          numberInput(cur.min, { onChange: (v) => ctx.mutate(() => { cur.min = Math.min(v, cur.max); }) }),
          numberInput(cur.max, { onChange: (v) => ctx.mutate(() => { cur.max = Math.max(v, cur.min); }) }),
        );
      } else {
        inputsLine.append(numberInput(cur ?? 0, { onChange: (v) => writeLp(axis, v) }));
      }
      stretchRow.append(inputsLine);
      sec.append(stretchRow);
    }
  }
}
