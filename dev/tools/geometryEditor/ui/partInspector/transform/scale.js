/**
 * scale.js — Scale section of the part inspector: per-axis stretch/squash for
 * every node, each axis toggleable between a fixed number and a `{min,max}`
 * range (one draw per item at render time). When the State toggle is "empty",
 * the rows edit the `states.empty` keyframe (keyframes stay fixed-number).
 */
import { el, numberInput, selectInput, tupleRow } from '../../formControls/index.js';
import { section, fmt } from '../sectionShell.js';
import { editingEmptyState, emptyKeyframe } from '../stateKeyframes.js';
import { isRange } from '../../../../../../src/render/hexmap3d/worldObjects/descriptors/transformVariation.js';

/** Round to 3 decimals — matches the emitter's precision. */
const round3 = (v) => Math.round(v * 1000) / 1000;

/** Format one component value: a number or a min–max span. */
const fmtValue = (v) => (isRange(v) ? `${fmt(v.min)}–${fmt(v.max)}` : fmt(v ?? 1));

/** Per-axis scale — every node can stretch or squash on any axis, per-axis
 *  Fixed/Range; when the State toggle is "empty", the rows edit the
 *  `states.empty` keyframe (fixed numbers only). */
export function renderScaleSection(container, entry, ctx) {
  const node = entry.node;
  const t = node.transform ?? (node.transform = {});
  const empty = editingEmptyState();
  const sec = section('scale', container, () => {
    const parts = [];
    for (const axis of ['x', 'y', 'z']) {
      const v = t[`scale${axis}`];
      if (isRange(v) || (v !== undefined && v !== 1)) parts.push(`${axis.toUpperCase()} ${fmtValue(v)}`);
    }
    return parts.length === 0 ? 'default' : parts.join(' · ');
  });
  if (empty) {
    sec.append(el('div', 'hint', 'Editing the EMPTY keyframe (growth 0) — these scales lerp to the full-state scales as the feature regrows.'));
    const cells = [];
    for (const axis of ['x', 'y', 'z']) {
      const key = `scale${axis}`;
      cells.push({ input: numberInput(node.states?.empty?.[key] ?? t[key] ?? 1, { min: 0.01, onChange: (v) => ctx.mutate(() => { emptyKeyframe(node)[key] = v; }) }), micro: axis });
    }
    sec.append(tupleRow('Part scale', cells));
    return;
  }
  // Pattern B (like Lift / stretch): Fixed writes a number, Range writes
  // `{ min, max }`. Switching modes converts the value and deletes the other
  // form, so the two can never fight.
  const MODE_TITLE = 'Fixed: one scale for every instance. Range: each instance draws its scale from min–max';
  for (const axis of ['x', 'y', 'z']) {
    const key = `scale${axis}`;
    const cur = t[key];
    const inRange = isRange(cur);
    const stretchRow = el('div', 'stretch-row');
    const modeLine = el('div', 'control-row');
    const modeLabel = el('label', null, `scale ${axis}`);
    modeLabel.title = MODE_TITLE;
    modeLine.append(modeLabel);
    modeLine.append(selectInput(['fixed', 'range'], inRange ? 'range' : 'fixed', (m) => ctx.mutate(() => {
      if (m === 'range' && !isRange(t[key])) {
        const base = typeof t[key] === 'number' ? t[key] : 1;
        t[key] = { min: Math.max(0.01, round3(base - 0.05)), max: round3(base + 0.05) };
      } else if (m === 'fixed' && isRange(t[key])) {
        t[key] = round3((t[key].min + t[key].max) / 2);
      }
    })));
    stretchRow.append(modeLine);
    const inputsLine = el('div', 'stretch-inputs');
    if (inRange) {
      inputsLine.append(
        numberInput(cur.min, { min: 0.01, onChange: (v) => ctx.mutate(() => { cur.min = Math.min(v, cur.max); }) }),
        numberInput(cur.max, { min: 0.01, onChange: (v) => ctx.mutate(() => { cur.max = Math.max(v, cur.min); }) }),
      );
    } else {
      inputsLine.append(numberInput(cur ?? 1, { min: 0.01, onChange: (v) => ctx.mutate(() => { t[key] = v; }) }));
    }
    stretchRow.append(inputsLine);
    sec.append(stretchRow);
  }
}
