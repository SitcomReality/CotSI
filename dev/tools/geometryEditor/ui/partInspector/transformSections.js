/**
 * transformSections.js — Position / rotation / scale sections for the part
 * inspector. Every node gets transform editing: root leaves use Y/Lift/tilt
 * (world-space grounding), nested nodes use localPos in their parent frame.
 */
import { el, row, numberInput, selectInput, degreeInput, DEG_TO_RAD } from '../formControls.js';
import { isGroupNode } from '../partTree/index.js';
import { section } from './sectionShell.js';
import {
  AXIS3_PRESETS,
  AXIS3_OPTIONS,
  TILT_AXIS_PRESETS,
  TILT_AXIS_OPTIONS,
  unitVec3,
  unitVec2,
  cardinalAxis3,
  cardinalAxis2,
} from './axisPresets.js';

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

/** Position: ground heights for root leaves, frame localPos for every node.
 *  Groups are never grounded (schema: the nested field set at any depth), so
 *  Y/Lift stay off root groups — only root shape leaves may set them. */
function renderPositionSection(container, entry, ctx) {
  const { node, parent } = entry;
  const t = node.transform ?? (node.transform = {});
  const sec = section('position', container);
  if (parent === null && !isGroupNode(node)) {
    sec.append(el('div', 'hint', 'Y / Lift / localPos are world offsets (item-scaled). The part\'s lowest vertex lands at Y + Lift (+ localPos.y).'));
    sec.append(row('Y (bottom height)', numberInput(t.y ?? 0, { onChange: (v) => ctx.mutate(() => { t.y = v; }) })));
    sec.append(row('Lift (bottom height)', numberInput(t.lift ?? 0, { onChange: (v) => ctx.mutate(() => { t.lift = v; }) })));
  } else if (parent === null) {
    sec.append(el('div', 'hint', 'Groups are never grounded — localPos offsets in the item frame (pre-scale units).'));
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

  // Tilt is a world-space lean with no nested expression — root leaves only.
  if (parent === null && !isGroupNode(node)) {
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

export { setLocalPos, renderPositionSection, renderRotationSection, renderScaleSection };
