/**
 * schema.js — Pure descriptor schema for the geometry editor.
 *
 * A descriptor is the single source of truth for how a game object (feature,
 * decor, mountain, or an entity — base, champion, mob, trader) is composed and
 * placed. It describes:
 *
 *   - shape parts (cylinder / cone / sphere / torus / box / dodecahedron /
 *     octahedron / cube / spheroid, plus bespoke shapes like the mountain
 *     pyramid and the lathe solid of revolution) with their dimensions and
 *     per-part transforms — the same fields the mesh builders
 *     write into instance records (see meshBuilder.js);
 *   - cluster min/max — how many items share a hex (default 1);
 *   - size min/max — the per-item scale range (default 1..1) and finer
 *     variation ranges (canopy stretch, color jitter);
 *   - placement — how items sit inside the hex (center / scatter / ring);
 *   - variants + variantRule — alternative part sets picked by rule
 *     (hash/solitary/cluster for tile-driven objects; faction/archetype for
 *     entities, whose variant ids match the entity's faction or archetype);
 *   - emphasis — what happens when something more important claims the hex
 *     center (decorEmphasis.js): dispersed to the edge, sunk flat, or hidden;
 *   - material — base color (and optional emissive for resource nodes).
 *
 * Parts carry a `color` for the instance-color path: an integer literal, or a
 * named-color token ('factionBase' etc.) that entity records resolve from the
 * entity's palette. Entity descriptors keep the material white so instance
 * colors drive the look.
 *
 * The current game builds these objects from hard-coded constants scattered
 * across geometryParams.js, FEATURE_VISUALS, and the per-kind record builders.
 * Descriptors capture that content as data so the editor can visualize and
 * edit it, and so a generic mesh builder can consume it directly.
 *
 * This module is pure data + pure functions — no THREE, no game state — so it
 * is unit-testable in Node and shared by the editor page and the game's
 * generic mesh builder. Values are JSON-safe (colors as integers, angles in
 * radians, lengths in world units where hex radius = 1.0).
 */

// ── Shape registry ─────────────────────────────────────────────────────────

/**
 * Shape types the editor can compose. `params` maps each editable dimension to
 * its validation rule; `defaults` seeds new parts and fills omitted params.
 * Param names mirror the THREE constructor arguments the game's geometry
 * factories use (see geometries/), so a descriptor's params map 1:1 onto the
 * factory calls. Bespoke shapes (mountain) carry a variant enum instead.
 */
export const SHAPE_TYPES = Object.freeze({
  cylinder: {
    params: {
      bottomR: { type: 'number', min: 0.001 },
      topR: { type: 'number', min: 0.001 },
      height: { type: 'number', min: 0.001 },
      segments: { type: 'int', min: 3 },
    },
    defaults: Object.freeze({ bottomR: 0.08, topR: 0.1, height: 0.4, segments: 6 }),
  },
  cone: {
    params: {
      bottomR: { type: 'number', min: 0.001 },
      height: { type: 'number', min: 0.001 },
      radialSegs: { type: 'int', min: 3 },
      heightSegs: { type: 'int', min: 1 },
    },
    defaults: Object.freeze({ bottomR: 0.25, height: 0.72, radialSegs: 6, heightSegs: 2 }),
  },
  sphere: {
    params: {
      radius: { type: 'number', min: 0.001 },
      wSegs: { type: 'int', min: 3 },
      hSegs: { type: 'int', min: 2 },
      phiStart: { type: 'number' },
      phiLength: { type: 'number', min: 0.001 },
      thetaStart: { type: 'number' },
      thetaLength: { type: 'number', min: 0.001 },
    },
    defaults: Object.freeze({
      radius: 0.3, wSegs: 6, hSegs: 4,
      phiStart: 0, phiLength: Math.PI * 2, thetaStart: 0, thetaLength: Math.PI,
    }),
  },
  spheroid: {
    // A stretchable sphere: non-uniform elongation comes from the part's
    // transform scale (scaleX/scaleY/scaleZ), so the params stay simple.
    params: {
      radius: { type: 'number', min: 0.001 },
      wSegs: { type: 'int', min: 3 },
      hSegs: { type: 'int', min: 2 },
    },
    defaults: Object.freeze({ radius: 0.3, wSegs: 6, hSegs: 4 }),
  },
  torus: {
    params: {
      radius: { type: 'number', min: 0.001 },
      tube: { type: 'number', min: 0.001 },
      radialSegs: { type: 'int', min: 3 },
      tubularSegs: { type: 'int', min: 3 },
      arc: { type: 'number', min: 0.001, max: Math.PI * 2 },
    },
    defaults: Object.freeze({ radius: 0.1, tube: 0.02, radialSegs: 4, tubularSegs: 8, arc: Math.PI * 2 }),
  },
  box: {
    params: {
      width: { type: 'number', min: 0.001 },
      height: { type: 'number', min: 0.001 },
      depth: { type: 'number', min: 0.001 },
    },
    defaults: Object.freeze({ width: 0.25, height: 0.05, depth: 0.18 }),
  },
  cube: {
    // A regular cube; non-uniform elongation is a transform-scale concern
    // (scaleX/scaleY/scaleZ), keeping the part itself a true cube.
    params: {
      size: { type: 'number', min: 0.001 },
    },
    defaults: Object.freeze({ size: 0.3 }),
  },
  dodecahedron: {
    params: {
      radius: { type: 'number', min: 0.001 },
      detail: { type: 'int', min: 0 },
    },
    defaults: Object.freeze({ radius: 0.08, detail: 0 }),
  },
  octahedron: {
    params: {
      radius: { type: 'number', min: 0.001 },
      detail: { type: 'int', min: 0 },
    },
    defaults: Object.freeze({ radius: 0.2, detail: 0 }),
  },
  mountain: {
    params: {
      variant: { type: 'enum', values: ['classic', 'offpeak'] },
    },
    defaults: Object.freeze({ variant: 'classic' }),
  },
  lathe: {
    // Bespoke solid of revolution (featureGeometries.js — the former
    // "snowperson" shape) — no editable dimensions.
    params: {},
    defaults: Object.freeze({}),
  },
});

// ── Enumerations and defaults ──────────────────────────────────────────────

/**
 * Content categories a descriptor can represent. Features, decor, and
 * mountains are tile-driven (records from a tile hash); bases, champions,
 * mobs, and traders are entity-driven (records from entity state, one per
 * entity — see recordBuilder.recordsForEntity).
 */
export const OBJECT_KINDS = Object.freeze(['feature', 'decor', 'mountain', 'base', 'champion', 'mob', 'trader']);

/**
 * Emphasis behavior — what the object does when the hex center is claimed by
 * something more important (an occupant or feature). Mirrors decorEmphasis.js:
 *   none       — stays put (e.g. mountains)
 *   dispersed  — shrinks and steps aside: to the shared upper-left corner
 *                anchor for a single item, to a ring near the edge for a cluster
 *   sunk       — shrinks and descends below the tile surface (hill mounds)
 *   hidden     — not rendered when the center is claimed
 */
export const EMPHASIS_BEHAVIORS = Object.freeze(['none', 'dispersed', 'sunk', 'hidden']);

/** How items of a cluster sit inside the hex. */
export const PLACEMENT_MODES = Object.freeze(['center', 'scatter', 'ring', 'jitter']);

/** Bump when the descriptor shape changes in a breaking way. */
export const SCHEMA_VERSION = 3;

/**
 * Defaults for optional object-level fields. Values mirror the current game
 * constants in geometryParams.js so a bare descriptor reproduces current
 * content (cluster 1 = a single item, size 1..1 = no scale variation, etc.).
 * Stretch variation is per-axis now: stretchY (Y), stretchX (X), stretchZ (Z);
 * a legacy `stretchXZ` input resolves to stretchX + stretchZ on normalize.
 */
export const OBJECT_DEFAULTS = Object.freeze({
  schemaVersion: SCHEMA_VERSION,
  scale: 1,
  cluster: { min: 1, max: 1, rule: 'uniform' },
  size: { min: 1, max: 1 },
  variation: { stretchY: [1, 1], stretchX: [1, 1], stretchZ: [1, 1], colorJitter: 0 },
  placement: { mode: 'center' },
  emphasis: { behavior: 'none' },
  material: { color: 0xffffff },
});

/**
 * Defaults for a part's transform — the instance-record extras in
 * meshBuilder.js. `y` / `lift` are the height of the part's BOTTOM above the
 * placement surface: 0 = sitting flush on the ground (see shapeBaseOffset for
 * how the record path anchors vertically-centered primitives). `lift` raises
 * the part in its own frame (pre-scale, so it is the same bottom-height
 * measure under stretch); `localPos` overrides `lift` with a full local
 * offset. Angles are radians.
 * scaleX/scaleY/scaleZ are the part's independent non-uniform scale (base 1);
 * a legacy `scaleXZ` input resolves to scaleX + scaleZ on normalize.
 */
export const PART_TRANSFORM_DEFAULTS = Object.freeze({
  y: 0,
  lift: 0,
  rotY: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
});

/**
 * Vertical distance from a shape's origin to its lowest vertex, in world units
 * (pre-scale), for a part with the given params.
 *
 * Three.js primitives (cylinder, cone, sphere, box, torus, polyhedra) are
 * vertically CENTERED at the origin, so their base offset is half their
 * vertical extent (a cylinder of height 0.4 spans -0.2..+0.2 around the
 * origin); custom bottom-anchored geometries (mountain pyramid, lathe profile)
 * start at y=0 and offset to 0. `recordBuilder` bakes `baseOffset * sy` (sy =
 * the record's Y scale, including stretch) into the record y, so every part's
 * lowest point lands at `transform.y + lift (+ localPos.y)` — the
 * bottom-anchored convention: y = 0 / lift = 0 sits flush on the surface, and
 * stretch grows a part upward from the ground instead of from its center.
 *
 * Spheres are theta-aware: the polar range [thetaStart, thetaStart+thetaLength]
 * places the lowest vertex at r·cos(thetaEnd), or at y = -r when the range
 * covers the south pole — a full sphere offsets by its radius, while the hill
 * mound's top hemisphere (thetaLength π/2) starts at y=0 and offsets to 0.
 * The azimuth (phi) range never affects the vertical extent.
 *
 * @param {string} shape  - key of SHAPE_TYPES
 * @param {object} params - normalized shape params (defaults applied)
 * @returns {number} base offset in world units (pre-scale)
 */
export function shapeBaseOffset(shape, params) {
  switch (shape) {
    case 'cylinder':
    case 'cone':
      return params.height / 2;
    case 'box':
      return params.height / 2;
    case 'cube':
      return params.size / 2;
    case 'sphere':
    case 'spheroid': {
      const r = params.radius;
      const thetaEnd = (params.thetaStart ?? 0) + (params.thetaLength ?? Math.PI);
      const lowest = thetaEnd >= Math.PI ? -r : r * Math.cos(thetaEnd);
      return -lowest;
    }
    case 'torus':
      return params.tube;
    case 'dodecahedron':
    case 'octahedron':
      return params.radius;
    case 'mountain':
    case 'lathe':
      return 0; // bottom-anchored geometry — the base ring / profile starts at y=0
    default:
      return 0;
  }
}

// ── Type helpers ───────────────────────────────────────────────────────────

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function isNonNegativeNumber(v) {
  return isFiniteNumber(v) && v >= 0;
}

function isPositiveNumber(v) {
  return isFiniteNumber(v) && v > 0;
}

function isColorInt(v) {
  return Number.isInteger(v) && v >= 0 && v <= 0xffffff;
}

/**
 * Named-color tokens for entity-driven parts. An entity part's `color` may be
 * a token string instead of an integer; the entity record path
 * (recordBuilder.recordsForEntity) resolves it from the entity's `colors` map
 * (e.g. 'factionBase' / 'factionAccent' → the faction's palette entries).
 */
export const COLOR_TOKEN_PATTERN = /^[A-Za-z0-9_]+$/;
const isColorToken = (v) => typeof v === 'string' && COLOR_TOKEN_PATTERN.test(v);

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const cloneJson = (v) => JSON.parse(JSON.stringify(v));

// ── Validation ─────────────────────────────────────────────────────────────

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
    if (!isFiniteNumber(value[axis])) errors.push(`${path}.${axis}: expected a finite number`);
  }
  for (const key of Object.keys(value)) {
    if (!axes.includes(key)) errors.push(`${path}: unknown field "${key}"`);
  }
}

/**
 * Validate a part's transform (the per-part placement fields).
 * @param {object} transform - part.transform
 * @param {string} path - error prefix, e.g. `descriptor.parts[0] "trunk"`
 * @param {string[]} errors - accumulator
 */
export function validateTransform(transform, path, errors) {
  if (!isPlainObject(transform)) {
    errors.push(`${path}.transform: must be an object`);
    return;
  }
  for (const key of Object.keys(transform)) {
    const value = transform[key];
    if (TRANSFORM_NUMBER_KEYS.includes(key)) {
      if (!isFiniteNumber(value)) errors.push(`${path}.transform.${key}: expected a finite number (angles in radians)`);
    } else if (TRANSFORM_SCALE_KEYS.includes(key)) {
      if (!isPositiveNumber(value)) errors.push(`${path}.transform.${key}: must be a positive number`);
    } else if (TRANSFORM_VEC3_KEYS.includes(key)) {
      validateVec(value, ['x', 'y', 'z'], `${path}.transform.${key}`, errors);
    } else if (TRANSFORM_VEC2_KEYS.includes(key)) {
      validateVec(value, ['x', 'z'], `${path}.transform.${key}`, errors);
    } else {
      errors.push(`${path}.transform: unknown field "${key}"`);
    }
  }
}

const PART_KEYS = ['id', 'shape', 'params', 'transform', 'color', 'materialColor', 'stretch'];

const STRETCH_AXES = ['x', 'y', 'z', 'xz']; // 'xz' is the legacy combined axis

/**
 * Validate a part's optional `stretch` overrides — per-axis variation ranges
 * that replace the object-level `variation.stretchX/Y/Z` for this part only.
 * Each axis is either `false` (no stretch — that axis stays at 1) or
 * `{ min, max, seed? }` (draw from this range using the given sub-hash seed;
 * defaults to the object-variation seeds: 4 for Y, 5 for X and Z). The legacy
 * `xz` axis is accepted and resolved to x + z on normalize.
 */
function validateStretch(stretch, path, errors) {
  if (!isPlainObject(stretch)) {
    errors.push(`${path}: must be an object { x, y, z } of ranges or false`);
    return;
  }
  for (const key of Object.keys(stretch)) {
    if (!STRETCH_AXES.includes(key)) {
      errors.push(`${path}: unknown axis "${key}"`);
      continue;
    }
    const rule = stretch[key];
    if (rule === false) continue;
    if (!isPlainObject(rule)) {
      errors.push(`${path}.${key}: must be false or an object { min, max, seed? }`);
      continue;
    }
    if (!isPositiveNumber(rule.min)) errors.push(`${path}.${key}.min: must be a positive number`);
    if (!isPositiveNumber(rule.max)) errors.push(`${path}.${key}.max: must be a positive number`);
    if (isPositiveNumber(rule.min) && isPositiveNumber(rule.max) && rule.min > rule.max) {
      errors.push(`${path}.${key}: min must be <= max`);
    }
    if (rule.seed !== undefined && !(Number.isInteger(rule.seed) && rule.seed >= 0)) {
      errors.push(`${path}.${key}.seed: must be a non-negative integer`);
    }
  }
}

/**
 * Validate a single shape part.
 * @param {object} part - the part
 * @param {string} path - error prefix, e.g. `descriptor.parts[0]`
 * @param {string[]} errors - accumulator
 */
export function validatePart(part, path, errors) {
  if (!isPlainObject(part)) {
    errors.push(`${path}: part must be an object`);
    return;
  }
  if (typeof part.id !== 'string' || !part.id) errors.push(`${path}: missing part id`);
  const label = part.id ? ` "${part.id}"` : '';

  if (typeof part.shape !== 'string' || !SHAPE_TYPES[part.shape]) {
    errors.push(`${path}${label}: unknown shape "${part.shape ?? '(missing)'}" (known: ${Object.keys(SHAPE_TYPES).join(', ')})`);
  } else if (part.params !== undefined) {
    errors.push(...validateShapeParams(part.shape, part.params));
  }

  if (part.transform !== undefined) validateTransform(part.transform, `${path}${label}`, errors);
  if (part.color !== undefined && !isColorInt(part.color) && !isColorToken(part.color)) {
    errors.push(`${path}${label}: color must be an integer 0..0xFFFFFF or a named-color token (${COLOR_TOKEN_PATTERN})`);
  }
  // materialColor is baked into the per-descriptor material (materialForPart),
  // which has no entity context — tokens are only valid on the instance-color
  // path (part.color), so materialColor stays integer-only.
  if (part.materialColor !== undefined && !isColorInt(part.materialColor)) {
    errors.push(`${path}${label}: materialColor must be an integer 0..0xFFFFFF`);
  }
  if (part.stretch !== undefined) validateStretch(part.stretch, `${path}${label}.stretch`, errors);
  for (const key of Object.keys(part)) {
    if (!PART_KEYS.includes(key)) errors.push(`${path}${label}: unknown field "${key}"`);
  }
}

function validatePartsList(parts, path, errors) {
  if (!Array.isArray(parts) || parts.length === 0) {
    errors.push(`${path}.parts: required non-empty array`);
    return;
  }
  const seen = new Set();
  parts.forEach((part, i) => {
    validatePart(part, `${path}.parts[${i}]`, errors);
    if (isPlainObject(part) && part.id) {
      if (seen.has(part.id)) errors.push(`${path}.parts: duplicate part id "${part.id}"`);
      seen.add(part.id);
    }
  });
}

const CLUSTER_KEYS = ['min', 'max', 'rule', 'countsByTerrain', 'densityRange', 'jitter'];
const CLUSTER_RULES = ['uniform', 'moisture'];

function validateCluster(cluster, path, errors) {
  if (cluster === undefined) return;
  if (!isPlainObject(cluster)) {
    errors.push(`${path}: must be an object { min, max, rule? }`);
    return;
  }
  for (const key of Object.keys(cluster)) {
    if (!CLUSTER_KEYS.includes(key)) errors.push(`${path}: unknown field "${key}"`);
  }
  if (cluster.min !== undefined && !(Number.isInteger(cluster.min) && cluster.min >= 1)) {
    errors.push(`${path}.min: must be an integer >= 1`);
  }
  if (cluster.max !== undefined && !(Number.isInteger(cluster.max) && cluster.max >= 1)) {
    errors.push(`${path}.max: must be an integer >= 1`);
  }
  if (cluster.min !== undefined && cluster.max !== undefined && cluster.min > cluster.max) {
    errors.push(`${path}: min must be <= max`);
  }
  if (cluster.rule !== undefined && !CLUSTER_RULES.includes(cluster.rule)) {
    errors.push(`${path}.rule: must be one of ${CLUSTER_RULES.join(', ')}`);
  }
  if (cluster.rule === 'moisture') {
    if (cluster.countsByTerrain !== undefined) {
      if (!isPlainObject(cluster.countsByTerrain)) {
        errors.push(`${path}.countsByTerrain: must be an object of terrain → [min, max] pairs`);
      } else {
        for (const [terrain, pair] of Object.entries(cluster.countsByTerrain)) {
          const pairPath = `${path}.countsByTerrain.${terrain}`;
          if (!Array.isArray(pair) || pair.length !== 2) {
            errors.push(`${pairPath}: must be a [min, max] pair`);
            continue;
          }
          if (!(Number.isInteger(pair[0]) && pair[0] >= 1)) errors.push(`${pairPath}[0]: must be an integer >= 1`);
          if (!(Number.isInteger(pair[1]) && pair[1] >= 1)) errors.push(`${pairPath}[1]: must be an integer >= 1`);
          if (Number.isInteger(pair[0]) && Number.isInteger(pair[1]) && pair[0] > pair[1]) {
            errors.push(`${pairPath}: min must be <= max`);
          }
        }
      }
    }
    validateRangePair(cluster.densityRange, `${path}.densityRange`, errors);
    if (cluster.jitter !== undefined && !(Number.isInteger(cluster.jitter) && cluster.jitter >= 0)) {
      errors.push(`${path}.jitter: must be a non-negative integer`);
    }
  }
}

const SIZE_BUCKET_KEYS = ['peak', 'slope', 'normal'];

function validateSize(size, path, errors) {
  if (size === undefined) return;
  if (!isPlainObject(size)) {
    errors.push(`${path}: must be an object { min, max }`);
    return;
  }
  for (const key of Object.keys(size)) {
    if (key !== 'min' && key !== 'max' && key !== 'byMountainType') {
      errors.push(`${path}: unknown field "${key}"`);
    }
  }
  if (size.min !== undefined && !isPositiveNumber(size.min)) errors.push(`${path}.min: must be a positive number`);
  if (size.max !== undefined && !isPositiveNumber(size.max)) errors.push(`${path}.max: must be a positive number`);
  if (size.min !== undefined && size.max !== undefined && size.min > size.max) {
    errors.push(`${path}: min must be <= max`);
  }
  if (size.byMountainType !== undefined) {
    if (!isPlainObject(size.byMountainType)) {
      errors.push(`${path}.byMountainType: must be an object of { peak, slope, normal } buckets`);
    } else {
      for (const [bucket, pair] of Object.entries(size.byMountainType)) {
        const bucketPath = `${path}.byMountainType.${bucket}`;
        if (!SIZE_BUCKET_KEYS.includes(bucket)) {
          errors.push(`${bucketPath}: unknown bucket (known: ${SIZE_BUCKET_KEYS.join(', ')})`);
          continue;
        }
        if (!isPlainObject(pair)) {
          errors.push(`${bucketPath}: must be an object { min, max }`);
          continue;
        }
        if (!isPositiveNumber(pair.min)) errors.push(`${bucketPath}.min: must be a positive number`);
        if (!isPositiveNumber(pair.max)) errors.push(`${bucketPath}.max: must be a positive number`);
        if (isPositiveNumber(pair.min) && isPositiveNumber(pair.max) && pair.min > pair.max) {
          errors.push(`${bucketPath}: min must be <= max`);
        }
      }
    }
  }
}

function validateRangePair(pair, path, errors) {
  if (pair === undefined) return;
  if (!Array.isArray(pair) || pair.length !== 2) {
    errors.push(`${path}: must be a [min, max] pair`);
    return;
  }
  if (!isPositiveNumber(pair[0])) errors.push(`${path}[0]: must be a positive number`);
  if (!isPositiveNumber(pair[1])) errors.push(`${path}[1]: must be a positive number`);
  if (isPositiveNumber(pair[0]) && isPositiveNumber(pair[1]) && pair[0] > pair[1]) {
    errors.push(`${path}: min must be <= max`);
  }
}

const VARIATION_KEYS = ['stretchY', 'stretchX', 'stretchZ', 'stretchXZ', 'colorJitter'];

function validateVariation(variation, path, errors) {
  if (variation === undefined) return;
  if (!isPlainObject(variation)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  for (const key of Object.keys(variation)) {
    if (!VARIATION_KEYS.includes(key)) errors.push(`${path}: unknown field "${key}"`);
  }
  validateRangePair(variation.stretchY, `${path}.stretchY`, errors);
  validateRangePair(variation.stretchX, `${path}.stretchX`, errors);
  validateRangePair(variation.stretchZ, `${path}.stretchZ`, errors);
  validateRangePair(variation.stretchXZ, `${path}.stretchXZ`, errors);
  if (variation.colorJitter !== undefined && !isNonNegativeNumber(variation.colorJitter)) {
    errors.push(`${path}.colorJitter: must be >= 0`);
  }
}

const PLACEMENT_KEYS = ['mode', 'offsetMin', 'offsetMax', 'ringMin', 'ringMax', 'leanMin', 'leanMax', 'offset', 'tiltMin', 'tiltMax', 'tiltSeed'];

function validatePlacement(placement, path, errors) {
  if (placement === undefined) return;
  if (!isPlainObject(placement)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  for (const key of Object.keys(placement)) {
    if (!PLACEMENT_KEYS.includes(key)) errors.push(`${path}: unknown field "${key}"`);
  }
  if (placement.mode !== undefined && !PLACEMENT_MODES.includes(placement.mode)) {
    errors.push(`${path}.mode: must be one of ${PLACEMENT_MODES.join(', ')}`);
  }
  if (placement.mode === 'scatter') {
    if (placement.offsetMin !== undefined && !isNonNegativeNumber(placement.offsetMin)) errors.push(`${path}.offsetMin: must be >= 0`);
    if (placement.offsetMax !== undefined && !isNonNegativeNumber(placement.offsetMax)) errors.push(`${path}.offsetMax: must be >= 0`);
    if (placement.offsetMin !== undefined && placement.offsetMax !== undefined && placement.offsetMin > placement.offsetMax) {
      errors.push(`${path}: offsetMin must be <= offsetMax`);
    }
  }
  if (placement.mode === 'ring') {
    if (placement.ringMin !== undefined && !isPositiveNumber(placement.ringMin)) errors.push(`${path}.ringMin: must be > 0`);
    if (placement.ringMax !== undefined && !isPositiveNumber(placement.ringMax)) errors.push(`${path}.ringMax: must be > 0`);
    if (placement.ringMin !== undefined && placement.ringMax !== undefined && placement.ringMin > placement.ringMax) {
      errors.push(`${path}: ringMin must be <= ringMax`);
    }
    if (placement.leanMin !== undefined && !isNonNegativeNumber(placement.leanMin)) errors.push(`${path}.leanMin: must be >= 0`);
    if (placement.leanMax !== undefined && !isNonNegativeNumber(placement.leanMax)) errors.push(`${path}.leanMax: must be >= 0`);
    if (placement.leanMin !== undefined && placement.leanMax !== undefined && placement.leanMin > placement.leanMax) {
      errors.push(`${path}: leanMin must be <= leanMax`);
    }
  }
  if (placement.mode === 'jitter') {
    if (placement.offset !== undefined && !isNonNegativeNumber(placement.offset)) errors.push(`${path}.offset: must be >= 0`);
    if (placement.tiltMin !== undefined && !isNonNegativeNumber(placement.tiltMin)) errors.push(`${path}.tiltMin: must be >= 0`);
    if (placement.tiltMax !== undefined && !isNonNegativeNumber(placement.tiltMax)) errors.push(`${path}.tiltMax: must be >= 0`);
    if (placement.tiltMin !== undefined && placement.tiltMax !== undefined && placement.tiltMin > placement.tiltMax) {
      errors.push(`${path}: tiltMin must be <= tiltMax`);
    }
    if (placement.tiltSeed !== undefined && !(Number.isInteger(placement.tiltSeed) && placement.tiltSeed >= 0)) {
      errors.push(`${path}.tiltSeed: must be a non-negative integer`);
    }
  }
}

function validateEmphasis(emphasis, path, errors) {
  if (emphasis === undefined) return;
  if (!isPlainObject(emphasis)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  for (const key of Object.keys(emphasis)) {
    if (key !== 'behavior') errors.push(`${path}: unknown field "${key}"`);
  }
  if (emphasis.behavior !== undefined && !EMPHASIS_BEHAVIORS.includes(emphasis.behavior)) {
    errors.push(`${path}.behavior: must be one of ${EMPHASIS_BEHAVIORS.join(', ')}`);
  }
}

const MATERIAL_KEYS = ['color', 'emissive', 'emissiveIntensity'];

function validateMaterial(material, path, errors) {
  if (material === undefined) return;
  if (!isPlainObject(material)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  for (const key of Object.keys(material)) {
    if (!MATERIAL_KEYS.includes(key)) errors.push(`${path}: unknown field "${key}"`);
  }
  if (material.color !== undefined && !isColorInt(material.color)) errors.push(`${path}.color: must be an integer 0..0xFFFFFF`);
  if (material.emissive !== undefined && !isColorInt(material.emissive)) errors.push(`${path}.emissive: must be an integer 0..0xFFFFFF`);
  if (material.emissiveIntensity !== undefined && !isNonNegativeNumber(material.emissiveIntensity)) {
    errors.push(`${path}.emissiveIntensity: must be >= 0`);
  }
}

const OBJECT_KEYS = [
  'schemaVersion', 'id', 'kind', 'displayName', 'parts', 'variants', 'variantRule',
  'scale', 'cluster', 'size', 'variation', 'placement', 'emphasis', 'material',
];

/** How a descriptor's `variants` list is resolved to the parts of one item. */
export const VARIANT_RULES = Object.freeze(['hash', 'solitary', 'cluster', 'faction', 'archetype']);

/**
 * Validate a descriptor. Accepts raw (un-normalized) descriptors — optional
 * fields may be absent; `normalizeDescriptor` fills their defaults.
 * @param {object} def - descriptor
 * @returns {string[]} errors ([] = valid)
 */
export function validateDescriptor(def) {
  const errors = [];
  if (!isPlainObject(def)) return ['descriptor must be an object'];

  if (typeof def.id !== 'string' || !ID_PATTERN.test(def.id)) {
    errors.push('descriptor.id: required, must match /^[A-Za-z0-9_-]+$/');
  }
  if (typeof def.displayName !== 'string' || !def.displayName.trim()) {
    errors.push('descriptor.displayName: required non-empty string');
  }
  if (!OBJECT_KINDS.includes(def.kind)) {
    errors.push(`descriptor.kind: must be one of ${OBJECT_KINDS.join(', ')}`);
  }

  validatePartsList(def.parts, 'descriptor', errors);

  if (def.variants !== undefined) {
    if (!Array.isArray(def.variants) || def.variants.length === 0) {
      errors.push('descriptor.variants: must be a non-empty array of { id, parts }');
    } else {
      const seenVariants = new Set();
      def.variants.forEach((variant, vi) => {
        const vpath = `descriptor.variants[${vi}]`;
        if (!isPlainObject(variant)) {
          errors.push(`${vpath}: variant must be an object { id, parts }`);
          return;
        }
        if (typeof variant.id !== 'string' || !variant.id) {
          errors.push(`${vpath}: missing variant id`);
        } else if (seenVariants.has(variant.id)) {
          errors.push(`${vpath}: duplicate variant id "${variant.id}"`);
        }
        seenVariants.add(variant.id);
        validatePartsList(variant.parts, vpath, errors);
      });
    }
  }

  if (def.variantRule !== undefined && !VARIANT_RULES.includes(def.variantRule)) {
    errors.push(`descriptor.variantRule: must be one of ${VARIANT_RULES.join(', ')}`);
  }

  if (def.scale !== undefined && !isPositiveNumber(def.scale)) errors.push('descriptor.scale: must be a positive number');
  validateCluster(def.cluster, 'descriptor.cluster', errors);
  validateSize(def.size, 'descriptor.size', errors);
  validateVariation(def.variation, 'descriptor.variation', errors);
  validatePlacement(def.placement, 'descriptor.placement', errors);
  validateEmphasis(def.emphasis, 'descriptor.emphasis', errors);
  validateMaterial(def.material, 'descriptor.material', errors);

  for (const key of Object.keys(def)) {
    if (!OBJECT_KEYS.includes(key)) errors.push(`descriptor: unknown field "${key}"`);
  }

  return errors;
}

// ── Normalization ──────────────────────────────────────────────────────────

/**
 * Legacy shape names accepted from older descriptor JSON. `knot` always
 * rendered as an octahedron (knotGeometries.js) and the snowperson lathe is
 * now simply `lathe`; remapping lets old downloads keep loading through
 * normalizeDescriptor.
 */
const LEGACY_SHAPE_NAMES = Object.freeze({
  knot: 'octahedron',
  snowperson: 'lathe',
});

/**
 * Normalize one part. `legacyGrounding` migrates pre-v3 vertical placement (see
 * normalizeDescriptor): files authored before the bottom-anchored convention
 * encoded `transform.y` as the part's CENTER height. The record path bakes the
 * shape's base offset × Y scale into `y` (recordBuilder), which compensates a
 * matching `base × scaleY` subtraction from `transform.y` exactly at scale 1 —
 * so the migration pulls the base out of the authored center height and the
 * part renders at the same height (its lowest vertex lands at the old center
 * height, and stretch grows it upward from there instead of from its center).
 * `lift` / `localPos.y` are pure offsets and stay as authored. Idempotent:
 * only schemaVersion < SCHEMA_VERSION triggers it.
 */
function normalizePart(part, legacyGrounding = false) {
  if (!isPlainObject(part)) return part;
  const shapeName = LEGACY_SHAPE_NAMES[part.shape] ?? part.shape;
  const shape = SHAPE_TYPES[shapeName];
  const params = isPlainObject(part.params) ? part.params : {};
  const transform = isPlainObject(part.transform) ? part.transform : {};
  const out = { ...part, shape: shapeName };
  out.params = shape ? { ...shape.defaults, ...params } : { ...params };

  // Resolve the legacy combined XZ scale into independent scaleX/scaleZ
  // (an explicit per-axis scale wins over the legacy value).
  const merged = { ...PART_TRANSFORM_DEFAULTS, ...transform };
  if (transform.scaleXZ !== undefined) {
    if (!('scaleX' in transform)) merged.scaleX = transform.scaleXZ;
    if (!('scaleZ' in transform)) merged.scaleZ = transform.scaleXZ;
  }
  delete merged.scaleXZ;
  out.transform = merged;

  // Resolve the legacy combined stretch axis `xz` into x + z (false pins both).
  if (isPlainObject(out.stretch) && out.stretch.xz !== undefined) {
    const stretch = { ...out.stretch };
    if (stretch.x === undefined) stretch.x = stretch.xz;
    if (stretch.z === undefined) stretch.z = stretch.xz;
    delete stretch.xz;
    out.stretch = stretch;
  }

  // Legacy (pre-v3) grounding migration — see the function docstring.
  if (legacyGrounding) {
    const base = shapeBaseOffset(out.shape, out.params);
    out.transform.y -= base * (out.transform.scaleY ?? 1);
  }
  return out;
}

/**
 * Fill every optional field with its default, deep-copying the input.
 * Idempotent: normalizeDescriptor(normalizeDescriptor(x)) equals
 * normalizeDescriptor(x). The result is JSON-safe.
 *
 * `placement` sub-fields are filled per mode: scatter gets offset
 * min/max, ring gets ring radii + lean ranges; the other fields stay
 * absent. `cluster`/`size` halves are filled from the defaults pair.
 *
 * @param {object} def - raw descriptor
 * @returns {object} normalized descriptor
 */
export function normalizeDescriptor(def) {
  const out = cloneJson(isPlainObject(def) ? def : {});

  // Pre-v3 files encoded `transform.y` as the part's center height; the
  // bottom-anchored convention reads it as bottom height, so old files are
  // migrated per part (see normalizePart). Captured before schemaVersion is
  // rewritten, so re-normalizing a v3 document never migrates twice.
  const legacyGrounding = (out.schemaVersion ?? 1) < SCHEMA_VERSION;
  out.schemaVersion = SCHEMA_VERSION;
  out.scale = out.scale ?? OBJECT_DEFAULTS.scale;
  out.variantRule = out.variantRule ?? 'hash';
  out.cluster = { ...OBJECT_DEFAULTS.cluster, ...(isPlainObject(out.cluster) ? out.cluster : {}) };
  if (out.cluster.rule === 'moisture') {
    out.cluster.countsByTerrain = isPlainObject(out.cluster.countsByTerrain)
      ? out.cluster.countsByTerrain
      : { forest: [3, 5], denseForest: [4, 7] };
    out.cluster.densityRange = out.cluster.densityRange ?? [0.55, 0.85];
    out.cluster.jitter = out.cluster.jitter ?? 1;
  }
  out.size = { ...OBJECT_DEFAULTS.size, ...(isPlainObject(out.size) ? out.size : {}) };
  const rawVariation = isPlainObject(out.variation) ? out.variation : {};
  // Resolve the legacy combined stretchXZ into independent stretchX/stretchZ
  // before the defaults merge (an explicit per-axis range wins).
  if (rawVariation.stretchXZ !== undefined) {
    if (rawVariation.stretchX === undefined) rawVariation.stretchX = rawVariation.stretchXZ;
    if (rawVariation.stretchZ === undefined) rawVariation.stretchZ = rawVariation.stretchXZ;
    delete rawVariation.stretchXZ;
  }
  out.variation = { ...OBJECT_DEFAULTS.variation, ...rawVariation };
  out.placement = { ...OBJECT_DEFAULTS.placement, ...(isPlainObject(out.placement) ? out.placement : {}) };
  if (out.placement.mode === 'scatter') {
    out.placement.offsetMin = out.placement.offsetMin ?? 0.15;
    out.placement.offsetMax = out.placement.offsetMax ?? 0.3;
  } else if (out.placement.mode === 'ring') {
    out.placement.ringMin = out.placement.ringMin ?? 0.18;
    out.placement.ringMax = out.placement.ringMax ?? 0.55;
    out.placement.leanMin = out.placement.leanMin ?? 0.045;
    out.placement.leanMax = out.placement.leanMax ?? 0.12;
  } else if (out.placement.mode === 'jitter') {
    out.placement.offset = out.placement.offset ?? 0.08;
    out.placement.tiltMin = out.placement.tiltMin ?? 0;
    out.placement.tiltMax = out.placement.tiltMax ?? 0;
    out.placement.tiltSeed = out.placement.tiltSeed ?? 1;
  }
  out.emphasis = { ...OBJECT_DEFAULTS.emphasis, ...(isPlainObject(out.emphasis) ? out.emphasis : {}) };
  out.material = { ...OBJECT_DEFAULTS.material, ...(isPlainObject(out.material) ? out.material : {}) };

  out.parts = (Array.isArray(out.parts) ? out.parts : []).map((p) => normalizePart(p, legacyGrounding));
  if (Array.isArray(out.variants)) {
    out.variants = out.variants.map((variant) => {
      const v = { ...variant };
      v.parts = (Array.isArray(variant.parts) ? variant.parts : []).map((p) => normalizePart(p, legacyGrounding));
      return v;
    });
  }

  return out;
}
