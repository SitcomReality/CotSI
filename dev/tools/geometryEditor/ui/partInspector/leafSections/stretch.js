/**
 * stretch.js — Stretch-variation section (leaves only): per-axis mode select
 * (follow / fixed / custom) with the min/max/seed inputs for custom axes.
 */
import { S } from '../../../state.js';
import { el, numberInput, intInput, selectInput } from '../../formControls/index.js';
import { ENTITY_KINDS } from '../../../entityView.js';
import { section, fmt } from '../sectionShell.js';

/** Stretch variation — leaves only. */
export function renderStretchSection(container, part, ctx) {
  const d = S.descriptor;
  const sec = section('stretch', container, () => {
    const stretch = part.stretch;
    if (!stretch) return 'default';
    const parts = [];
    for (const axis of ['x', 'y', 'z']) {
      const current = stretch[axis];
      const mode = current === false ? 'fixed' : current ? 'custom' : 'follow';
      if (mode !== 'follow') {
        if (mode === 'fixed') parts.push(`${axis} fixed`);
        else parts.push(`${axis} ${fmt(current.min)}–${fmt(current.max)}`);
      }
    }
    return parts.length === 0 ? 'default' : parts.join(' · ');
  });
  const MODE_TITLE = '"follow" uses the object-level ranges, "fixed" pins the axis at 1';
  if (ENTITY_KINDS.has(d.kind)) {
    sec.append(el('div', 'hint', 'Entity parts ignore stretch variation — entities have no per-tile hash draws.'));
  }
  const STRETCH_SEED_DEFAULTS = { x: 5, y: 4, z: 5 };
  for (const axis of ['x', 'y', 'z']) {
    const current = part.stretch?.[axis];
    const mode = current === false ? 'fixed' : current ? 'custom' : 'follow';
    const modeSelect = selectInput(['follow', 'fixed', 'custom'], mode, (m) => ctx.mutate(() => {
      if (m === 'fixed') part.stretch = { ...part.stretch, [axis]: false };
      else if (m === 'custom') part.stretch = { ...part.stretch, [axis]: { min: 0.9, max: 1.1, seed: STRETCH_SEED_DEFAULTS[axis] } };
      else {
        part.stretch = { ...part.stretch };
        delete part.stretch[axis];
        if (Object.keys(part.stretch).length === 0) delete part.stretch;
      }
    }));
    // Two-line layout: mode on the first line, the min/max/seed inputs below —
    // the row no longer overflows the 310px inspector column.
    const stretchRow = el('div', 'stretch-row');
    const modeLine = el('div', 'control-row');
    const modeLabel = el('label', null, `stretch ${axis}`);
    modeLabel.title = MODE_TITLE;
    modeLine.append(modeLabel, modeSelect);
    stretchRow.append(modeLine);
    if (current && current !== false) {
      const inputsLine = el('div', 'stretch-inputs');
      inputsLine.append(
        numberInput(current.min, { min: 0.01, onChange: (v) => ctx.mutate(() => { current.min = v; }) }),
        numberInput(current.max, { min: 0.01, onChange: (v) => ctx.mutate(() => { current.max = v; }) }),
        intInput(current.seed ?? STRETCH_SEED_DEFAULTS[axis], { min: 0, onChange: (v) => ctx.mutate(() => { current.seed = v; }) }),
      );
      stretchRow.append(inputsLine);
    }
    sec.append(stretchRow);
  }
}
