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
  degreeInput,
  DEG_TO_RAD,
} from './formControls.js';
import { inspectorHead } from './inspectorHead.js';
import { SHAPE_TYPES } from '../../../src/render/hexmap3d/features/descriptors/schema.js';
import { ENTITY_KINDS } from '../entityView.js';

/** Cardinal axis presets for local orientation — the axis is a direction only
 *  (the render normalizes it), so these are exact unit vectors. */
const AXIS3_PRESETS = {
  x: { x: 1, y: 0, z: 0 },
  '-x': { x: -1, y: 0, z: 0 },
  y: { x: 0, y: 1, z: 0 },
  '-y': { x: 0, y: -1, z: 0 },
  z: { x: 0, y: 0, z: 1 },
  '-z': { x: 0, y: 0, z: -1 },
};
const AXIS3_OPTIONS = [
  { value: 'x', label: 'X' },
  { value: '-x', label: '−X' },
  { value: 'y', label: 'Y' },
  { value: '-y', label: '−Y' },
  { value: 'z', label: 'Z' },
  { value: '-z', label: '−Z' },
  { value: 'custom', label: 'custom' },
];

/** Cardinal lean axes for world-space tilt (horizontal { x, z } only). */
const TILT_AXIS_PRESETS = {
  x: { x: 1, z: 0 },
  '-x': { x: -1, z: 0 },
  z: { x: 0, z: 1 },
  '-z': { x: 0, z: -1 },
};
const TILT_AXIS_OPTIONS = [
  { value: 'x', label: 'X' },
  { value: '-x', label: '−X' },
  { value: 'z', label: 'Z' },
  { value: '-z', label: '−Z' },
  { value: 'custom', label: 'custom' },
];

/** Unit vector from a vec3 — zero or missing falls back to +Y. */
function unitVec3(v) {
  const x = v?.x ?? 0;
  const y = v?.y ?? 0;
  const z = v?.z ?? 0;
  const len = Math.hypot(x, y, z);
  return len > 1e-6 ? { x: x / len, y: y / len, z: z / len } : { x: 0, y: 1, z: 0 };
}

/** Unit horizontal vector from a { x, z } vec — zero or missing falls back to +Z. */
function unitVec2(v) {
  const x = v?.x ?? 0;
  const z = v?.z ?? 0;
  const len = Math.hypot(x, z);
  return len > 1e-6 ? { x: x / len, z: z / len } : { x: 0, z: 1 };
}

/** The cardinal preset matching a vec3's direction, or 'custom'. */
function cardinalAxis3(v) {
  const u = unitVec3(v);
  for (const [key, preset] of Object.entries(AXIS3_PRESETS)) {
    const dot = u.x * preset.x + u.y * preset.y + u.z * preset.z;
    if (dot > 0.99) return key;
  }
  return 'custom';
}

/** The cardinal preset matching a horizontal { x, z } direction, or 'custom'. */
function cardinalAxis2(v) {
  const u = unitVec2(v);
  for (const [key, preset] of Object.entries(TILT_AXIS_PRESETS)) {
    const dot = u.x * preset.x + u.z * preset.z;
    if (dot > 0.99) return key;
  }
  return 'custom';
}

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
  container.append(row('rotY (deg)', degreeInput(t.rotY, { onChange: (v) => ctx.mutate(() => { t.rotY = v; }) })));

  container.append(subheading('Scale'));
  container.append(el('div', 'hint', 'Independent per-axis scale — stretch or squash the part on any axis (base 1).'));
  container.append(row('scaleX', numberInput(t.scaleX, { min: 0.01, onChange: (v) => ctx.mutate(() => { t.scaleX = v; }) })));
  container.append(row('scaleY', numberInput(t.scaleY, { min: 0.01, onChange: (v) => ctx.mutate(() => { t.scaleY = v; }) })));
  container.append(row('scaleZ', numberInput(t.scaleZ, { min: 0.01, onChange: (v) => ctx.mutate(() => { t.scaleZ = v; }) })));

  container.append(subheading('Rotation'));
  container.append(el('div', 'hint', 'localAxis + localAngle rotate the part around any axis in its own frame; tilt leans it in world space. The axis is a direction (magnitude is ignored); angles are degrees.'));
  // Work on the NORMALIZED direction — the render rotates about the unit axis
  // (meshBuilder), so a stored vector like {x:-3, y:4, z:4} reads and edits as
  // its true direction {-0.47, 0.62, 0.62}. Edits write the full normalized
  // vector back; untouched parts keep their stored bytes.
  const localAxis = unitVec3(t.localAxis);
  const axisValue = cardinalAxis3(t.localAxis);
  container.append(row('Axis', selectInput(AXIS3_OPTIONS, axisValue, (v) => ctx.mutate(() => {
    const preset = AXIS3_PRESETS[v];
    if (preset) {
      t.localAxis = { ...preset };
      t.localAngle ??= 0;
    }
    // 'custom' keeps the current direction and reveals the axis fields below.
  }))));
  if (axisValue === 'custom') {
    container.append(row('Axis X', numberInput(localAxis.x, { step: 0.1, onChange: (v) => ctx.mutate(() => { t.localAxis = unitVec3({ ...unitVec3(t.localAxis), x: v }); }) })));
    container.append(row('Axis Y', numberInput(localAxis.y, { step: 0.1, onChange: (v) => ctx.mutate(() => { t.localAxis = unitVec3({ ...unitVec3(t.localAxis), y: v }); }) })));
    container.append(row('Axis Z', numberInput(localAxis.z, { step: 0.1, onChange: (v) => ctx.mutate(() => { t.localAxis = unitVec3({ ...unitVec3(t.localAxis), z: v }); }) })));
  }
  container.append(row('Angle (deg)', degreeInput(t.localAngle ?? 0, { onChange: (deg) => ctx.mutate(() => { t.localAngle = deg; t.localAxis ??= { x: 0, y: 1, z: 0 }; }) })));
  const rotPresets = el('div', 'preset-row');
  for (const deg of [90, -90, 45, -45]) {
    const btn = el('button', null, `${deg > 0 ? '+' : '−'}${Math.abs(deg)}°`);
    btn.type = 'button';
    btn.title = `Rotate ${deg > 0 ? '+' : '−'}${Math.abs(deg)}° about the selected axis`;
    btn.addEventListener('click', () => ctx.mutate(() => {
      t.localAngle = (t.localAngle ?? 0) + deg * DEG_TO_RAD;
      t.localAxis ??= { x: 0, y: 1, z: 0 };
    }));
    rotPresets.append(btn);
  }
  container.append(rotPresets);

  const tiltAxis = unitVec2(t.tiltAxis);
  const tiltValue = cardinalAxis2(t.tiltAxis);
  container.append(row('Lean axis', selectInput(TILT_AXIS_OPTIONS, tiltValue, (v) => ctx.mutate(() => {
    const preset = TILT_AXIS_PRESETS[v];
    if (preset) {
      t.tiltAxis = { ...preset };
      t.tilt ??= 0;
    }
  }))));
  if (tiltValue === 'custom') {
    container.append(row('Lean X', numberInput(tiltAxis.x, { step: 0.1, onChange: (v) => ctx.mutate(() => { t.tiltAxis = unitVec2({ ...unitVec2(t.tiltAxis), x: v }); }) })));
    container.append(row('Lean Z', numberInput(tiltAxis.z, { step: 0.1, onChange: (v) => ctx.mutate(() => { t.tiltAxis = unitVec2({ ...unitVec2(t.tiltAxis), z: v }); }) })));
  }
  container.append(row('Lean (deg)', degreeInput(t.tilt ?? 0, { step: 1, onChange: (deg) => ctx.mutate(() => { t.tilt = deg; t.tiltAxis ??= { x: 0, z: 1 }; }) })));

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
