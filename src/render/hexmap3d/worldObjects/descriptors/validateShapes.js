/**
 * validateShapes.js — Shape-param and part-transform validation.
 *
 * The bottom of the validation recursion: `validateShapeParams` checks a
 * shape's params against its SHAPE_TYPES registry entry, `validateTransform`
 * checks a part's placement fields (including the root-only `liftRange`).
 * See validateParts.js for per-part rules and descriptorValidation.js for the
 * descriptor-level entry point.
 */
import { SHAPE_TYPES } from './shapeTypes.js';
import { isPlainObject, isFiniteNumber, isPositiveNumber } from './typeChecks.js';

function validateParamValue(value, rule, errors, path) {
  if (rule.type === 'number' || rule.type === 'int') {
    if (rule.type === 'int' && !Number.isInteger(value)) {
      errors.push(`${path}: expected an integer`);
      return;
    }
    if (!isFiniteNumber(value)) {
      errors.push(`${path}: expected a finite number`);
      return;
    }
    if (rule.min !== undefined && value < rule.min) errors.push(`${path}: must be >= ${rule.min}`);
    if (rule.max !== undefined && value > rule.max) errors.push(`${path}: must be <= ${rule.max}`);
    return;
  }
  if (rule.type === 'enum') {
    if (!rule.values.includes(value)) errors.push(`${path}: must be one of ${rule.values.join(', ')}`);
    return;
  }
  errors.push(`${path}: unknown param rule type "${rule.type}"`);
}

/**
 * Validate a shape's params against its registry entry.
 * @param {string} shapeType - key of SHAPE_TYPES
 * @param {object} params - shape params object
 * @returns {string[]} errors ([] = valid)
 */
export function validateShapeParams(shapeType, params) {
  const errors = [];
  const shape = SHAPE_TYPES[shapeType];
  if (!shape) {
    errors.push(`unknown shape "${shapeType}" (known: ${Object.keys(SHAPE_TYPES).join(', ')})`);
    return errors;
  }
  if (!isPlainObject(params)) {
    errors.push(`shape "${shapeType}": params must be an object`);
    return errors;
  }
  for (const key of Object.keys(params)) {
    const rule = shape.params[key];
    if (!rule) {
      errors.push(`shape "${shapeType}": unknown param "${key}"`);
      continue;
    }
    validateParamValue(params[key], rule, errors, `shape "${shapeType}" param "${key}"`);
  }
  return errors;
}

const TRANSFORM_NUMBER_KEYS = ['y', 'lift', 'rotY', 'localAngle', 'tilt'];
const TRANSFORM_SCALE_KEYS = ['scaleX', 'scaleY', 'scaleZ', 'scaleXZ'];
const TRANSFORM_VEC3_KEYS = ['localPos', 'localAxis'];
const TRANSFORM_VEC2_KEYS = ['tiltAxis'];

function validateVec(value, axes, path, errors) {
  if (!isPlainObject(value)) {
    errors.push(`${path}: must be an object { ${axes.join(', ')} }`);
    return;
  }
  for (const axis of axes) {
    const v = value[axis];
    if (v === undefined) continue; // optional axis
    if (isRangeValue(v)) {
      if (!isFiniteNumber(v.min)) errors.push(`${path}.${axis}.min: expected a finite number`);
      if (!isFiniteNumber(v.max)) errors.push(`${path}.${axis}.max: expected a finite number`);
      if (isFiniteNumber(v.min) && isFiniteNumber(v.max) && v.min > v.max) errors.push(`${path}.${axis}: min must be <= max`);
      continue;
    }
    if (!isFiniteNumber(v)) errors.push(`${path}.${axis}: expected a finite number or a { min, max } range`);
  }
  for (const key of Object.keys(value)) {
    if (!axes.includes(key)) errors.push(`${path}: unknown field "${key}"`);
  }
}

/**
 * A range-form component — `{ min, max }` in place of a fixed number, drawn
 * once per node per item (transformVariation.js). Accepted for localPos axes
 * and the scale fields only.
 */
function isRangeValue(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    && (v.min !== undefined || v.max !== undefined);
}

/** A positive number or a positive { min, max } range. */
function validateScaleValue(value, path, errors) {
  if (isRangeValue(value)) {
    if (!isPositiveNumber(value.min)) errors.push(`${path}.min: must be a positive number`);
    if (!isPositiveNumber(value.max)) errors.push(`${path}.max: must be a positive number`);
    if (isPositiveNumber(value.min) && isPositiveNumber(value.max) && value.min > value.max) {
      errors.push(`${path}: min must be <= max`);
    }
    return;
  }
  if (!isPositiveNumber(value)) errors.push(`${path}: must be a positive number or a { min, max } range`);
}

/**
 * Validate a part's transform (the per-part placement fields).
 * @param {object} transform - part.transform
 * @param {string} path - error prefix, e.g. `descriptor.parts[0] "trunk"`
 * @param {string[]} errors - accumulator
 * @param {boolean} [nested=false] - nested parts and groups sit in their
 *        parent's frame with no grounding: `y`, `lift`, `tiltAxis`, and
 *        `tilt` are root-only fields and rejected here.
 */
export function validateTransform(transform, path, errors, nested = false) {
  if (!isPlainObject(transform)) {
    errors.push(`${path}.transform: must be an object`);
    return;
  }
  for (const key of Object.keys(transform)) {
    const value = transform[key];
    if (nested && (key === 'y' || key === 'lift' || key === 'liftRange' || key === 'tiltAxis' || key === 'tilt')) {
      errors.push(`${path}.transform.${key}: only root parts may set this field — nested parts and groups sit in their parent's frame`);
    } else if (TRANSFORM_NUMBER_KEYS.includes(key)) {
      if (!isFiniteNumber(value)) errors.push(`${path}.transform.${key}: expected a finite number (angles in radians)`);
    } else if (key === 'liftRange') {
      validateLiftRange(value, `${path}.transform.liftRange`, errors);
    } else if (TRANSFORM_SCALE_KEYS.includes(key)) {
      validateScaleValue(value, `${path}.${key}`, errors);
    } else if (TRANSFORM_VEC3_KEYS.includes(key)) {
      validateVec(value, ['x', 'y', 'z'], `${path}.transform.${key}`, errors);
    } else if (TRANSFORM_VEC2_KEYS.includes(key)) {
      validateVec(value, ['x', 'z'], `${path}.transform.${key}`, errors);
    } else {
      errors.push(`${path}.transform: unknown field "${key}"`);
    }
  }
}

/**
 * Validate a part's optional `liftRange` — a per-item lift drawn from
 * [min, max] by the seeded hash instead of a fixed `lift` (see §5.3's canopy
 * anchor). `min`/`max` are finite bottom-heights (the same measure as `lift`),
 * `seed` the sub-hash seed to draw with — author the seed of the part this
 * lift tracks (the legacy trunk-stretch draw uses 6) so the canopy bottom
 * follows the per-tree trunk stretch. Root-only.
 */
function validateLiftRange(range, path, errors) {
  if (!isPlainObject(range)) {
    errors.push(`${path}: must be an object { min, max, seed? }`);
    return;
  }
  if (!isFiniteNumber(range.min)) errors.push(`${path}.min: expected a finite number`);
  if (!isFiniteNumber(range.max)) errors.push(`${path}.max: expected a finite number`);
  if (isFiniteNumber(range.min) && isFiniteNumber(range.max) && range.min > range.max) {
    errors.push(`${path}: min must be <= max`);
  }
  if (range.seed !== undefined && !(Number.isInteger(range.seed) && range.seed >= 0)) {
    errors.push(`${path}.seed: must be a non-negative integer`);
  }
}
