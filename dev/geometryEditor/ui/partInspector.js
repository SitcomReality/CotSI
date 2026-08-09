/**
 * partInspector.js — Selected-part fields for the geometry editor.
 *
 * Renders into `#inspector-body` when a part is selected: shape params from
 * the SHAPE_TYPES registry, transform (Y/lift/rotY), per-axis scale,
 * local-axis + tilt rotation, and stretch variation. `ctx` supplies
 * `mutate()` for every field change and `renderAll()` for the breadcrumb
 * (clearing the selection).
 */
import { S } from '../state.js';
import {
  el,
  row,
  subheading,
  numberInput,
  intInput,
  selectInput,
  colorInput,
} from './formControls.js';
import { inspectorHead } from './inspectorHead.js';
import { SHAPE_TYPES } from '../../../src/render/hexmap3d/features/descriptors/schema.js';
import { ENTITY_KINDS } from '../entityView.js';

/** Inspector header for part editing: breadcrumb back to the object. */
function renderPartHeader(container, part, ctx) {
  const d = S.descriptor;
  const back = el('button', 'breadcrumb', `← ${d.displayName}`);
  back.type = 'button';
  back.title = 'Back to object-level controls';
  back.addEventListener('click', () => {
    S.selectedPartId = null;
    ctx.renderAll();
  });
  container.append(inspectorHead(`${part.id} · ${part.shape}`, null, back));
}

/**
 * Render the selected part's shape + transform fields into `container`.
 * `ctx` supplies the mutation flow.
 */
export function renderPartInspector(container, part, ctx) {
  const d = S.descriptor;
  renderPartHeader(container, part, ctx);
  const shape = SHAPE_TYPES[part.shape];

  for (const [key, rule] of Object.entries(shape.params)) {
    const current = part.params[key] ?? shape.defaults[key];
    if (rule.type === 'enum') {
      container.append(row(key, selectInput(rule.values, current, (v) => ctx.mutate(() => { part.params[key] = v; }))));
    } else if (rule.type === 'int') {
      container.append(row(key, intInput(current, { min: rule.min, onChange: (v) => ctx.mutate(() => { part.params[key] = v; }) })));
    } else {
      container.append(row(key, numberInput(current, { min: rule.min, onChange: (v) => ctx.mutate(() => { part.params[key] = v; }) })));
    }
  }

  container.append(subheading('Color'));
  container.append(el('div', 'hint', 'Every part has its own color — the object has no base color (v4).'));
  if (ENTITY_KINDS.has(d.kind)) {
    const TOKENS = ['factionBase', 'factionAccent', 'factionBody'];
    const isToken = typeof part.color === 'string' && TOKENS.includes(part.color);
    const current = isToken ? part.color : 'custom';
    container.append(row('Color', selectInput([...TOKENS, 'custom'], current, (v) => ctx.mutate(() => {
      if (v === 'custom') part.color = typeof part.color === 'number' ? part.color : 0xffffff;
      else part.color = v;
    }))));
    if (!isToken) {
      container.append(row('Custom color', colorInput(typeof part.color === 'number' ? part.color : 0xffffff, (v) => ctx.mutate(() => { part.color = v; }))));
    }
  } else {
    container.append(row('Color', colorInput(part.color ?? 0xffffff, (v) => ctx.mutate(() => { part.color = v; }))));
  }

  container.append(subheading('Biome tint'));
  container.append(el('div', 'hint', 'Tints this part toward the tile\'s blended biome color. Applies only to parts with a literal color; Untouched and Painforest tiles never tint.'));
  const biome = part.biomeColor;
  const source = biome?.source ?? '';
  container.append(row('Source', selectInput(
    [{ value: '', label: '— none' }, { value: 'primary', label: 'primary' }, { value: 'accent', label: 'accent' }],
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
    container.append(row('Influence', numberInput(biome.influence ?? 0.5, { min: 0, step: 0.1, onChange: (v) => ctx.mutate(() => { biome.influence = Math.max(0, Math.min(1, v)); }) })));
  }

  container.append(subheading('Transform'));
  container.append(el('div', 'hint', 'Y / Lift are bottom heights — 0 = sitting on the ground. The part\'s lowest vertex lands at Y + Lift (+ localPos.y).'));
  const t = part.transform;
  container.append(row('Y (bottom height)', numberInput(t.y, { onChange: (v) => ctx.mutate(() => { t.y = v; }) })));
  container.append(row('Lift (bottom height)', numberInput(t.lift, { onChange: (v) => ctx.mutate(() => { t.lift = v; }) })));
  container.append(row('rotY (rad)', numberInput(t.rotY, { onChange: (v) => ctx.mutate(() => { t.rotY = v; }) })));

  container.append(subheading('Scale'));
  container.append(el('div', 'hint', 'Independent per-axis scale — stretch or squash the part on any axis (base 1).'));
  container.append(row('scaleX', numberInput(t.scaleX, { min: 0.01, onChange: (v) => ctx.mutate(() => { t.scaleX = v; }) })));
  container.append(row('scaleY', numberInput(t.scaleY, { min: 0.01, onChange: (v) => ctx.mutate(() => { t.scaleY = v; }) })));
  container.append(row('scaleZ', numberInput(t.scaleZ, { min: 0.01, onChange: (v) => ctx.mutate(() => { t.scaleZ = v; }) })));

  container.append(subheading('Rotation'));
  container.append(el('div', 'hint', 'localAxis + localAngle rotate the part around any axis in its own frame; tilt leans it in world space. Angles in radians.'));
  // Merge the loaded vec over defaults so a missing or partial localAxis still
  // renders every field, and each edit writes a complete vector back (a sparse
  // write would blank the sibling fields on the next render).
  const localAxis = { x: 0, y: 1, z: 0, ...(t.localAxis ?? {}) };
  container.append(row('localAxis X', numberInput(localAxis.x, { onChange: (v) => ctx.mutate(() => { t.localAxis = { ...localAxis, x: v }; }) })));
  container.append(row('localAxis Y', numberInput(localAxis.y, { onChange: (v) => ctx.mutate(() => { t.localAxis = { ...localAxis, y: v }; }) })));
  container.append(row('localAxis Z', numberInput(localAxis.z, { onChange: (v) => ctx.mutate(() => { t.localAxis = { ...localAxis, z: v }; }) })));
  container.append(row('localAngle (rad)', numberInput(t.localAngle ?? 0, { onChange: (v) => ctx.mutate(() => { t.localAngle = v; t.localAxis ??= { x: 0, y: 1, z: 0 }; }) })));
  const tiltAxis = { x: 0, z: 1, ...(t.tiltAxis ?? {}) };
  container.append(row('tiltAxis X', numberInput(tiltAxis.x, { onChange: (v) => ctx.mutate(() => { t.tiltAxis = { ...tiltAxis, x: v }; }) })));
  container.append(row('tiltAxis Z', numberInput(tiltAxis.z, { onChange: (v) => ctx.mutate(() => { t.tiltAxis = { ...tiltAxis, z: v }; }) })));
  container.append(row('tilt (rad)', numberInput(t.tilt ?? 0, { onChange: (v) => ctx.mutate(() => { t.tilt = v; t.tiltAxis ??= { x: 0, z: 1 }; }) })));

  container.append(subheading('Stretch variation'));
  container.append(el('div', 'hint', 'Per-axis variation ranges for this part; "follow object" uses the object-level ranges, "fixed" pins the axis at 1.'));
  if (ENTITY_KINDS.has(d.kind)) {
    container.append(el('div', 'hint', 'Entity parts ignore stretch variation — entities have no per-tile hash draws.'));
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
    container.append(stretchRow);
  }
}
