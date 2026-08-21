/**
 * rotation.js — Rotation section of the part inspector: local axis/angle +
 * rotY for every node, world tilt for roots only. Angles are displayed and
 * stepped in degrees; values are stored in radians.
 */
import { el, row, numberInput, selectInput, degreeInput, DEG_TO_RAD } from '../../formControls/index.js';
import { isGroupNode } from '../../partTree/index.js';
import { section, fmt } from '../sectionShell.js';
import {
  AXIS3_PRESETS,
  AXIS3_OPTIONS,
  TILT_AXIS_PRESETS,
  TILT_AXIS_OPTIONS,
  unitVec3,
  unitVec2,
  cardinalAxis3,
  cardinalAxis2,
} from '../axisPresets.js';

/** Rotation: local axis/angle + rotY for every node, world tilt for roots only. */
export function renderRotationSection(container, entry, ctx) {
  const { node, parent } = entry;
  const t = node.transform ?? (node.transform = {});
  const sec = section('rotation', container, () => {
    const axis = cardinalAxis3(t.localAxis);
    const angleDeg = (t.localAngle ?? 0) * 180 / Math.PI;
    const tiltDeg = (t.tilt ?? 0) * 180 / Math.PI;
    if (!axis && angleDeg === 0 && tiltDeg === 0) return 'default';
    const parts = [];
    if (axis) parts.push(`${axis} ${fmt(angleDeg)}°`);
    else parts.push(`custom ${fmt(angleDeg)}°`);
    if (tiltDeg !== 0) parts.push(`lean ${fmt(tiltDeg)}°`);
    return parts.join(' · ');
  });
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
