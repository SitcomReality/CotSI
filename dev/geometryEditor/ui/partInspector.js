/**
 * partInspector.js — Selected-part fields for the geometry editor.
 *
 * Renders into `#inspector-body` when a part is selected. The selection is a
 * parts-tree entry `{ node, parent, depth, index }` (see partTree.js): leaves
 * show shape params, color, biome tint and stretch variation; groups (nodes
 * with `children`) show structural actions instead of shape fields. Every node
 * gets transform editing — root leaves use Y/Lift/tilt (world-space
 * grounding), nested nodes use localPos in their parent frame — plus
 * nest/ungroup and copy-transform actions. Fields live in collapsible
 * `<details>` sections so the panel stays scannable. `ctx` supplies
 * `mutate()` for every field change and `renderAll()` for pure re-renders.
 */
import { S } from '../state.js';
import {
  el,
  row,
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
import { activeParts } from './variantQuery.js';
import {
  isGroupNode,
  findNodeById,
  siblingIds,
  nestNode,
  ungroupNode,
  canUngroup,
  groupTargets,
  moveIntoGroup,
  canExtract,
  extractNode,
} from './partTree.js';

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

/** Inspector sections: `key` → default open state. */
const SECTIONS = {
  shape: { title: 'Shape', open: true },
  position: { title: 'Position', open: true },
  rotation: { title: 'Rotation', open: true },
  scale: { title: 'Scale', open: false },
  color: { title: 'Color', open: false },
  biome: { title: 'Biome tint', open: false },
  stretch: { title: 'Stretch variation', open: false },
};
/** Which sections the user has open (session state, persisted across renders). */
const openSections = new Set(
  Object.entries(SECTIONS).filter(([, s]) => s.open).map(([key]) => key),
);

/**
 * A collapsible `<details>` section appended to `container`; its open state is
 * tracked in `openSections` so re-renders keep the user's layout.
 */
function section(key, container) {
  const det = el('details', 'inspector-section');
  det.open = openSections.has(key);
  det.addEventListener('toggle', () => {
    if (det.open) openSections.add(key);
    else openSections.delete(key);
  });
  det.append(el('summary', 'section-title', SECTIONS[key].title));
  container.append(det);
  return det;
}

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

/**
 * Write one localPos component of `t`, deleting the field when every component
 * is 0 again — keeps denormalized files free of `localPos: {0,0,0}` noise.
 */
function setLocalPos(t, axis, v) {
  const lp = t.localPos ?? {};
  const next = { x: lp.x ?? 0, y: lp.y ?? 0, z: lp.z ?? 0, [axis]: v };
  if (next.x === 0 && next.y === 0 && next.z === 0) delete t.localPos;
  else t.localPos = next;
}

/** Inspector header for part editing: breadcrumb back to the object. */
function renderPartHeader(container, node, ctx) {
  const d = S.descriptor;
  const back = el('button', 'breadcrumb', `← ${d.displayName}`);
  back.type = 'button';
  back.title = 'Back to object-level controls';
  back.addEventListener('click', () => {
    S.selectedPartId = null;
    ctx.renderAll();
  });
  const title = isGroupNode(node) ? `${node.id} · group` : `${node.id} · ${node.shape}`;
  container.append(inspectorHead(title, null, back));
}

/**
 * Structural actions for any node: nest into a new group, move into an
 * existing group, move out of the current group (nested nodes), ungroup
 * (groups only, when the fold is exact), and copy the transform from a
 * sibling.
 */
function renderPartActions(container, entry, ctx) {
  const { node } = entry;
  const actions = el('div', 'part-actions');

  const nestBtn = el('button', null, 'Nest into group');
  nestBtn.type = 'button';
  nestBtn.title = 'Wrap this part in a fresh group — its position is preserved';
  nestBtn.addEventListener('click', () => ctx.mutate(() => {
    const group = nestNode(activeParts(), entry);
    S.selectedPartId = group.id;
  }));
  actions.append(nestBtn);

  // Move into an existing group — position is preserved (frame conversion).
  const targets = groupTargets(activeParts(), entry);
  const moveSelect = selectInput(
    [{ value: '', label: '— move into group…' }, ...targets.map((g) => ({ value: g.id, label: `${g.id} · group` }))],
    '',
    (v) => {
      if (!v) return;
      ctx.mutate(() => {
        const target = findNodeById(activeParts(), v).node;
        moveIntoGroup(activeParts(), entry, target);
        S.selectedPartId = node.id; // the node keeps its id — stay on it
      });
    },
  );
  moveSelect.disabled = targets.length === 0;
  actions.append(moveSelect);

  // Move out of the current group — nested nodes only, exact when the group
  // is unscaled. The node lands beside its group in the group's parent list.
  if (entry.parent !== null) {
    const outBtn = el('button', null, 'Move out of group');
    outBtn.type = 'button';
    outBtn.title = 'Move this part out of its group to sit beside it — the group\'s transform folds in';
    outBtn.disabled = !canExtract(entry);
    outBtn.addEventListener('click', () => ctx.mutate(() => {
      extractNode(activeParts(), entry);
      S.selectedPartId = node.id;
    }));
    actions.append(outBtn);
  }

  if (isGroupNode(node)) {
    const ungroupBtn = el('button', null, 'Ungroup');
    ungroupBtn.type = 'button';
    ungroupBtn.title = 'Replace this group with its children, folding the transform into each';
    ungroupBtn.disabled = !canUngroup(node);
    ungroupBtn.addEventListener('click', () => ctx.mutate(() => {
      const promoted = ungroupNode(activeParts(), entry);
      S.selectedPartId = promoted[0].id;
    }));
    actions.append(ungroupBtn);
  }

  // Copy transform: adopt a sibling's transform wholesale. Root-only fields
  // (y / lift / tiltAxis / tilt) don't exist on nested nodes, so a nested
  // source simply lacks them — the copy leaves whatever the target had.
  const ids = siblingIds(activeParts(), entry);
  const copySelect = selectInput(
    [{ value: '', label: '— copy transform from…' }, ...ids],
    '',
    (v) => {
      if (!v) return;
      ctx.mutate(() => {
        const src = findNodeById(activeParts(), v).node.transform ?? {};
        const t = node.transform ?? (node.transform = {});
        const target = {};
        for (const key of ['localPos', 'localAxis', 'tiltAxis']) {
          if (src[key]) target[key] = { ...src[key] };
        }
        for (const key of ['rotY', 'scaleX', 'scaleY', 'scaleZ']) {
          if (src[key] !== undefined) target[key] = src[key];
        }
        if (entry.parent === null) {
          for (const key of ['y', 'lift', 'tilt']) {
            if (src[key] !== undefined) target[key] = src[key];
          }
        }
        Object.assign(t, target);
      });
    },
  );
  copySelect.disabled = ids.length === 0;
  actions.append(copySelect);

  container.append(actions);
}

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

/** Position: ground heights for roots, parent-frame localPos for every node. */
function renderPositionSection(container, entry, ctx) {
  const { node, parent } = entry;
  const t = node.transform ?? (node.transform = {});
  const sec = section('position', container);
  if (parent === null) {
    sec.append(el('div', 'hint', 'Y / Lift / localPos are world offsets (item-scaled). The part\'s lowest vertex lands at Y + Lift (+ localPos.y).'));
    sec.append(row('Y (bottom height)', numberInput(t.y ?? 0, { onChange: (v) => ctx.mutate(() => { t.y = v; }) })));
    sec.append(row('Lift (bottom height)', numberInput(t.lift ?? 0, { onChange: (v) => ctx.mutate(() => { t.lift = v; }) })));
  } else {
    sec.append(el('div', 'hint', 'localPos offsets in the parent frame (pre-scale units); a leaf\'s bottom sits at its localPos point.'));
  }
  sec.append(row('localPos X', numberInput(t.localPos?.x ?? 0, { onChange: (v) => ctx.mutate(() => setLocalPos(t, 'x', v)) })));
  sec.append(row('localPos Y', numberInput(t.localPos?.y ?? 0, { onChange: (v) => ctx.mutate(() => setLocalPos(t, 'y', v)) })));
  sec.append(row('localPos Z', numberInput(t.localPos?.z ?? 0, { onChange: (v) => ctx.mutate(() => setLocalPos(t, 'z', v)) })));
}

/** Rotation: local axis/angle + rotY for every node, world tilt for roots only. */
function renderRotationSection(container, entry, ctx) {
  const { node, parent } = entry;
  const t = node.transform ?? (node.transform = {});
  const sec = section('rotation', container);
  sec.append(el('div', 'hint', 'localAxis + localAngle rotate the part around any axis in its own frame; angles are degrees. The axis is a direction (magnitude is ignored).'));
  // Work on the NORMALIZED direction — the render rotates about the unit axis
  // (meshBuilder), so a stored vector like {x:-3, y:4, z:4} reads and edits as
  // its true direction {-0.47, 0.62, 0.62}. Edits write the full normalized
  // vector back; untouched parts keep their stored bytes.
  const localAxis = unitVec3(t.localAxis);
  const axisValue = cardinalAxis3(t.localAxis);
  sec.append(row('Axis', selectInput(AXIS3_OPTIONS, axisValue, (v) => ctx.mutate(() => {
    const preset = AXIS3_PRESETS[v];
    if (preset) {
      t.localAxis = { ...preset };
      t.localAngle ??= 0;
    }
    // 'custom' keeps the current direction and reveals the axis fields below.
  }))));
  if (axisValue === 'custom') {
    sec.append(row('Axis X', numberInput(localAxis.x, { step: 0.1, onChange: (v) => ctx.mutate(() => { t.localAxis = unitVec3({ ...unitVec3(t.localAxis), x: v }); }) })));
    sec.append(row('Axis Y', numberInput(localAxis.y, { step: 0.1, onChange: (v) => ctx.mutate(() => { t.localAxis = unitVec3({ ...unitVec3(t.localAxis), y: v }); }) })));
    sec.append(row('Axis Z', numberInput(localAxis.z, { step: 0.1, onChange: (v) => ctx.mutate(() => { t.localAxis = unitVec3({ ...unitVec3(t.localAxis), z: v }); }) })));
  }
  sec.append(row('Angle (deg)', degreeInput(t.localAngle ?? 0, { onChange: (deg) => ctx.mutate(() => { t.localAngle = deg; t.localAxis ??= { x: 0, y: 1, z: 0 }; }) })));
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
  sec.append(rotPresets);
  sec.append(row('rotY (deg)', degreeInput(t.rotY ?? 0, { onChange: (v) => ctx.mutate(() => { t.rotY = v; }) })));

  if (parent === null) {
    sec.append(el('div', 'hint', 'tilt leans the part in world space (horizontal axis, degrees) — root leaves only.'));
    const tiltAxis = unitVec2(t.tiltAxis);
    const tiltValue = cardinalAxis2(t.tiltAxis);
    sec.append(row('Lean axis', selectInput(TILT_AXIS_OPTIONS, tiltValue, (v) => ctx.mutate(() => {
      const preset = TILT_AXIS_PRESETS[v];
      if (preset) {
        t.tiltAxis = { ...preset };
        t.tilt ??= 0;
      }
    }))));
    if (tiltValue === 'custom') {
      sec.append(row('Lean X', numberInput(tiltAxis.x, { step: 0.1, onChange: (v) => ctx.mutate(() => { t.tiltAxis = unitVec2({ ...unitVec2(t.tiltAxis), x: v }); }) })));
      sec.append(row('Lean Z', numberInput(tiltAxis.z, { step: 0.1, onChange: (v) => ctx.mutate(() => { t.tiltAxis = unitVec2({ ...unitVec2(t.tiltAxis), z: v }); }) })));
    }
    sec.append(row('Lean (deg)', degreeInput(t.tilt ?? 0, { step: 1, onChange: (deg) => ctx.mutate(() => { t.tilt = deg; t.tiltAxis ??= { x: 0, z: 1 }; }) })));
  }
}

/** Per-axis scale — every node can stretch or squash on any axis. */
function renderScaleSection(container, entry, ctx) {
  const t = entry.node.transform ?? (entry.node.transform = {});
  const sec = section('scale', container);
  sec.append(el('div', 'hint', 'Independent per-axis scale — stretch or squash the part on any axis (base 1).'));
  sec.append(row('scaleX', numberInput(t.scaleX ?? 1, { min: 0.01, onChange: (v) => ctx.mutate(() => { t.scaleX = v; }) })));
  sec.append(row('scaleY', numberInput(t.scaleY ?? 1, { min: 0.01, onChange: (v) => ctx.mutate(() => { t.scaleY = v; }) })));
  sec.append(row('scaleZ', numberInput(t.scaleZ ?? 1, { min: 0.01, onChange: (v) => ctx.mutate(() => { t.scaleZ = v; }) })));
}

/** Color — leaves only (groups are pure containers, no visuals of their own). */
function renderColorSection(container, part, ctx) {
  const d = S.descriptor;
  const sec = section('color', container);
  sec.append(el('div', 'hint', 'Every part has its own color — the object has no base color (v4).'));
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
    sec.append(row('Color', colorInput(part.color ?? 0xffffff, (v) => ctx.mutate(() => { part.color = v; }))));
  }
}

/** Biome tint — leaves only. */
function renderBiomeSection(container, part, ctx) {
  const sec = section('biome', container);
  sec.append(el('div', 'hint', 'Tints this part toward the tile\'s blended biome color. Applies only to parts with a literal color; Untouched and Painforest tiles never tint.'));
  const biome = part.biomeColor;
  const source = biome?.source ?? '';
  sec.append(row('Source', selectInput(
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

/**
 * Render the selected part's fields into `container`. `entry` is the parts-tree
 * lookup ({ node, parent, depth, index }) — groups get structural actions and
 * transform editing; leaves additionally get shape params, color, biome tint
 * and stretch variation. `ctx` supplies the mutation flow.
 */
export function renderPartInspector(container, entry, ctx) {
  const { node } = entry;
  renderPartHeader(container, node, ctx);
  renderPartActions(container, entry, ctx);
  if (!isGroupNode(node)) {
    renderShapeSection(container, node, ctx);
  }
  renderPositionSection(container, entry, ctx);
  renderRotationSection(container, entry, ctx);
  renderScaleSection(container, entry, ctx);
  if (!isGroupNode(node)) {
    renderColorSection(container, node, ctx);
    renderBiomeSection(container, node, ctx);
    renderStretchSection(container, node, ctx);
  }
}
