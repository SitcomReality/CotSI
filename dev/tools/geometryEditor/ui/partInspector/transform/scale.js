/**
 * scale.js — Scale section of the part inspector: per-axis stretch/squash for
 * every node. When the State toggle is "empty", the rows edit the
 * `states.empty` keyframe.
 */
import { el, numberInput, tupleRow } from '../../formControls/index.js';
import { section, fmt } from '../sectionShell.js';
import { editingEmptyState, emptyKeyframe } from '../stateKeyframes.js';

/** Per-axis scale — every node can stretch or squash on any axis. When the
 *  State toggle is "empty", the rows edit the `states.empty` keyframe. */
export function renderScaleSection(container, entry, ctx) {
  const t = entry.node.transform ?? (entry.node.transform = {});
  const empty = editingEmptyState();
  const sec = section('scale', container, () => {
    const sx = t.scaleX ?? 1;
    const sy = t.scaleY ?? 1;
    const sz = t.scaleZ ?? 1;
    if (sx === 1 && sy === 1 && sz === 1) return 'default';
    return `X ${fmt(sx)} · Y ${fmt(sy)} · Z ${fmt(sz)}`;
  });
  if (empty) {
    sec.append(el('div', 'hint', 'Editing the EMPTY keyframe (growth 0) — these scales lerp to the full-state scales as the feature regrows.'));
  }
  const axisSlot = (axis) => {
    const key = `scale${axis}`;
    return {
      read: () => empty ? (entry.node.states?.empty?.[key] ?? t[key] ?? 1) : (t[key] ?? 1),
      write: (v) => ctx.mutate(() => {
        if (empty) emptyKeyframe(entry.node)[key] = v;
        else t[key] = v;
      }),
    };
  };
  const cells = [];
  for (const axis of ['x', 'y', 'z']) {
    const slot = axisSlot(axis);
    cells.push({ input: numberInput(slot.read(), { min: 0.01, onChange: (v) => slot.write(v) }), micro: axis });
  }
  sec.append(tupleRow('Part scale', cells));
}
