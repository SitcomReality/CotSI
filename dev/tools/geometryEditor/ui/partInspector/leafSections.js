/**
 * leafSections.js — Leaf-only inspector sections: shape params, color, biome
 * tint and stretch variation. Groups are pure containers (no visuals of their
 * own), so these fields never appear for group nodes.
 */
import { S } from '../../state.js';
import { el, row, numberInput, intInput, selectInput, colorInput } from '../formControls.js';
import { SHAPE_TYPES } from '../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { ENTITY_KINDS } from '../../entityView.js';
import { section } from './sectionShell.js';
import { editingEmptyState, emptyKeyframe } from './stateKeyframes.js';

/** Shape params (leaves only): enum/int/number rows from the SHAPE_TYPES registry. */
function renderShapeSection(container, part, ctx) {
  const sec = section('shape', container);
  const shape = SHAPE_TYPES[part.shape];
  for (const [key, rule] of Object.entries(shape.params)) {
    const current = part.params[key] ?? shape.defaults[key];
    if (rule.type === 'enum') {
      sec.append(row(key, selectInput(rule.values, current, (v) => ctx.mutate(() => { part.params[key] = v; }))));
    } else if (rule.type === 'int') {
      sec.append(row(key, intInput(current, { min: rule.min, onChange: (v) => ctx.mutate(() => { part.params[key] = v; }) })));
    } else {
      sec.append(row(key, numberInput(current, { min: rule.min, onChange: (v) => ctx.mutate(() => { part.params[key] = v; }) })));
    }
  }
}

/** Color — leaves only (groups are pure containers, no visuals of their own).
 *  When the State toggle is "empty" (tile-driven kinds), the color row edits
 *  the `states.empty` keyframe — the color lerps to the base as the feature
 *  regrows (e.g. dull puddle → vibrant water, unripe → ripe fruit). */
function renderColorSection(container, part, ctx) {
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

/** Biome tint — leaves only. */
function renderBiomeSection(container, part, ctx) {
  const sec = section('biome', container);
  sec.append(el('div', 'hint', 'Tints this part toward the tile\'s blended biome color. Applies only to parts with a literal color; Untouched and Painforest tiles skip signature (primary/accent) tints — terrain still matches the ground.'));
  const biome = part.biomeColor;
  const source = biome?.source ?? '';
  sec.append(row('Source', selectInput(
    [{ value: '', label: '— none' }, { value: 'primary', label: 'primary' }, { value: 'accent', label: 'accent' }, { value: 'terrain', label: 'terrain' }],
    source,
    (v) => ctx.mutate(() => {
      if (!v) {
        if (part.biomeColor) delete part.biomeColor;
      } else {
        part.biomeColor = { source: v, influence: part.biomeColor?.influence ?? 0.5 };
      }
    }),
  )));
  if (biome?.source) {
    sec.append(row('Influence', numberInput(biome.influence ?? 0.5, { min: 0, step: 0.1, onChange: (v) => ctx.mutate(() => { biome.influence = Math.max(0, Math.min(1, v)); }) })));
  }
}

/** Stretch variation — leaves only. */
function renderStretchSection(container, part, ctx) {
  const d = S.descriptor;
  const sec = section('stretch', container);
  sec.append(el('div', 'hint', 'Per-axis variation ranges for this part; "follow object" uses the object-level ranges, "fixed" pins the axis at 1.'));
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
    modeLine.append(el('label', null, `stretch ${axis}`), modeSelect);
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

export { renderShapeSection, renderColorSection, renderBiomeSection, renderStretchSection };
