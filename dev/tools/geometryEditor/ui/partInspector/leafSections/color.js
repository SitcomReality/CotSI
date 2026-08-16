/**
 * color.js — Color section (leaves only). Entities pick between faction
 * color tokens and a custom literal; tile-driven parts get a plain color
 * picker that edits the `states.empty` keyframe in the empty growth state.
 */
import { S } from '../../../state.js';
import { el, row, selectInput, colorInput } from '../../formControls/index.js';
import { ENTITY_KINDS } from '../../../entityView.js';
import { section } from '../sectionShell.js';
import { editingEmptyState, emptyKeyframe } from '../stateKeyframes.js';

/**
 * Color — leaves only (groups are pure containers, no visuals of their own).
 * When the State toggle is "empty" (tile-driven kinds), the color row edits
 * the `states.empty` keyframe — the color lerps to the base as the feature
 * regrows (e.g. dull puddle → vibrant water, unripe → ripe fruit).
 */
export function renderColorSection(container, part, ctx) {
  const d = S.descriptor;
  const sec = section('color', container);
  const empty = editingEmptyState();
  if (empty) {
    sec.append(el('div', 'hint', 'Editing the EMPTY keyframe (growth 0) — this color lerps to the full-state color as the feature regrows.'));
  } else {
    sec.append(el('div', 'hint', 'Every part has its own color — the object has no base color (v4).'));
  }
  if (ENTITY_KINDS.has(d.kind)) {
    const TOKENS = ['factionBase', 'factionAccent', 'factionBody'];
    const isToken = typeof part.color === 'string' && TOKENS.includes(part.color);
    const current = isToken ? part.color : 'custom';
    sec.append(row('Color', selectInput([...TOKENS, 'custom'], current, (v) => ctx.mutate(() => {
      if (v === 'custom') part.color = typeof part.color === 'number' ? part.color : 0xffffff;
      else part.color = v;
    }))));
    if (!isToken) {
      sec.append(row('Custom color', colorInput(typeof part.color === 'number' ? part.color : 0xffffff, (v) => ctx.mutate(() => { part.color = v; }))));
    }
  } else {
    const value = empty ? (part.states?.empty?.color ?? part.color ?? 0xffffff) : (part.color ?? 0xffffff);
    sec.append(row('Color', colorInput(value, (v) => ctx.mutate(() => {
      if (empty) emptyKeyframe(part).color = v;
      else part.color = v;
    }))));
  }
}
