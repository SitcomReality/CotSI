/**
 * axisPresets.js — Cardinal axis presets and direction helpers for the
 * part inspector's orientation / tilt fields.
 *
 * The axis is a direction only (the render normalizes it), so the presets are
 * exact unit vectors. Also provides the unit-vector and preset-matching
 * helpers shared by the rotation and tilt pickers.
 */

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

export {
  AXIS3_PRESETS,
  AXIS3_OPTIONS,
  TILT_AXIS_PRESETS,
  TILT_AXIS_OPTIONS,
  unitVec3,
  unitVec2,
  cardinalAxis3,
  cardinalAxis2,
};
