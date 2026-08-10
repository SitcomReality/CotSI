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
 *     write into instance records (see meshBuilder.js). A part is either a
 *     shape leaf or a group: a group carries a `children` array of further
 *     parts/groups and a transform that composes onto its descendants, so
 *     sub-assemblies (a hinged lid with its straps) share one transform;
 *   - cluster min/max — how many items share a hex (default 1);
 *   - size min/max — the per-item scale range (default 1..1) and finer
 *     variation ranges (canopy stretch, color jitter);
 *   - placement — how items sit inside the hex (center / scatter / ring);
 *   - variants + variantRule — alternative part sets picked by rule
 *     (hash/solitary/cluster for tile-driven objects; faction/archetype for
 *     entities, whose variant ids match the entity's faction or archetype);
 *   - emphasis — what happens when something more important claims the hex
 *     center (decorEmphasis.js): dispersed to the edge, sunk flat, or hidden;
 *   - material — optional emissive for resource-node glow (v4 has no
 *     object-level base color; each part carries its own).
 *
 * Parts carry a `color` for the instance-color path: an integer literal for
 * tile-driven objects (subject to the per-tile color jitter and biome tint),
 * or a named-color token ('factionBase' etc.) that entity records resolve from
 * the entity's palette. The shared toon material stays white; instance colors
 * drive the look. The v3 `materialColor` per-part field is migrated into
 * `color` on normalize (and the v3 object-level `material.color` is pushed
 * into every part that lacks one).
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

/** Kinds driven by entity state (recordsForEntity) — their instance colors
 *  come from the entity (part token / entity.color), never from the object
 *  material, so the v4 material-color migration skips them. */
const ENTITY_DRIVEN_KINDS = new Set(['base', 'champion', 'mob', 'trader']);

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

/**
 * Bump when the descriptor shape changes in a breaking way. v4 removed the
 * object-level material color and the per-part materialColor — every part now
 * carries its own `color`; normalizeDescriptor migrates v3 files. v5 added
 * nested part groups: a part is either a shape leaf or a group (a `children`
 * array) whose transform composes onto its descendants, so sub-assemblies
 * (hinged lids, attached straps) share one transform instead of duplicating
 * numbers. v4 files need no migration — groups are optional, absent means the
 * flat all-leaves model.
 */
export const SCHEMA_VERSION = 5;

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
  material: {}, // emissive only — colors live on the parts (v4)
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
 * Defaults for a NESTED part's or group's transform — any node below the root
 * of a parts tree. Nested nodes have no grounding: they sit purely in their
 * parent's frame, so the bottom-height fields (`y`, `lift`) and the world-space
 * lean (`tiltAxis`, `tilt`) are root-only and never appear here. Position is
 * `localPos`; orientation is `localAxis`/`localAngle` (parent-frame rotation)
 * plus `rotY` (spin about the node's own origin); scaleX/Y/Z are the
 * non-uniform scale. Groups use this set at any depth (they are never
 * grounded), nested leaves use it too.
 */
export const NESTED_PART_TRANSFORM_DEFAULTS = Object.freeze({
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
      const thetaStart = params.thetaStart ?? 0;
      const thetaEnd = thetaStart + (params.thetaLength ?? Math.PI);
      // Lowest vertex: -r when the band covers the south pole (theta = π);
      // otherwise it sits at whichever band endpoint dips lower.
      const coversSouthPole = thetaStart <= Math.PI && thetaEnd >= Math.PI;
      const lowest = coversSouthPole ? -r : r * Math.min(Math.cos(thetaStart), Math.cos(thetaEnd));
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
    if (nested && (key === 'y' || key === 'lift' || key === 'tiltAxis' || key === 'tilt')) {
      errors.push(`${path}.transform.${key}: only root parts may set this field — nested parts and groups sit in their parent's frame`);
    } else if (TRANSFORM_NUMBER_KEYS.includes(key)) {
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

const PART_KEYS = ['id', 'shape', 'params', 'transform', 'color', 'materialColor', 'stretch', 'biomeColor', 'biomeScale', 'children'];

const STRETCH_AXES = ['x', 'y', 'z', 'xz']; // 'xz' is the legacy combined axis

/**
 * Biome tint sources a part may pull from. `primary` tints toward the biome's
 * primary color, `accent` toward its accent color (e.g. Tundra leaves use the
 * near-white accent to read as snow). The influence strength is 0..1, where 0
 * keeps the part's default color (also the behavior in Untouched and
 * Painforest, whose tiles never tint).
 */
const BIOME_COLOR_SOURCES = ['primary', 'accent'];

/**
 * Validate a part's `biomeColor` — the per-part biome tint: which biome color
 * it targets and how strongly the tile's blended biome color replaces the
 * part's default color. Optional; absent = no biome tint.
 */
function validateBiomeColor(biomeColor, path, errors) {
  if (!isPlainObject(biomeColor)) {
    errors.push(`${path}: must be an object { source, influence }`);
    return;
  }
  for (const key of Object.keys(biomeColor)) {
    if (key !== 'source' && key !== 'influence') errors.push(`${path}: unknown field "${key}"`);
  }
  if (biomeColor.source !== undefined && !BIOME_COLOR_SOURCES.includes(biomeColor.source)) {
    errors.push(`${path}.source: must be one of ${BIOME_COLOR_SOURCES.join(', ')}`);
  }
  if (biomeColor.influence !== undefined && !(isFiniteNumber(biomeColor.influence) && biomeColor.influence >= 0 && biomeColor.influence <= 1)) {
    errors.push(`${path}.influence: must be a number in [0, 1]`);
  }
}

/**
 * Validate a part's `biomeScale` — optional per-biome size factors: a map of
 * biome id → positive multiplier applied to the part's scale on tiles of that
 * biome (e.g. Tundra's stunted trees). Optional; absent = scale 1 everywhere.
 */
function validateBiomeScale(biomeScale, path, errors) {
  if (!isPlainObject(biomeScale)) {
    errors.push(`${path}: must be an object of biome id → positive number`);
    return;
  }
  for (const [biomeId, factor] of Object.entries(biomeScale)) {
    if (!isPositiveNumber(factor)) errors.push(`${path}.${biomeId}: must be a positive number`);
  }
}

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
 * Validate a single node of a parts tree: either a shape leaf or a group
 * (a `children` array). `seen` is the id set shared across the whole parts set
 * (fallback `parts` or one variant's `parts`) — ids must be unique across the
 * entire subtree because records and InstancedMeshes are keyed by partId.
 * `nested` marks nodes below the root, which use the nested transform field
 * set (no `y`/`lift`/`tilt`).
 * @param {object} part - the node
 * @param {string} path - error prefix, e.g. `descriptor.parts[0]`
 * @param {string[]} errors - accumulator
 * @param {Set<string>} seen - ids already claimed in this parts set
 * @param {boolean} [nested=false] - node is below the root of the parts tree
 */
export function validatePart(part, path, errors, seen = new Set(), nested = false) {
  if (!isPlainObject(part)) {
    errors.push(`${path}: part must be an object`);
    return;
  }
  if (typeof part.id !== 'string' || !part.id) errors.push(`${path}: missing part id`);
  const label = part.id ? ` "${part.id}"` : '';
  if (typeof part.id === 'string' && part.id) {
    if (seen.has(part.id)) errors.push(`${path}: duplicate part id "${part.id}"`);
    seen.add(part.id);
  }

  const isGroup = Array.isArray(part.children);
  if (isGroup) {
    if (part.children.length === 0) errors.push(`${path}${label}: group must have at least one child`);
    if (part.shape !== undefined) errors.push(`${path}${label}: groups have no shape — a part is either a shape leaf or a group (children)`);
    if (part.params !== undefined) errors.push(`${path}${label}: groups have no params`);
    if (part.color !== undefined) errors.push(`${path}${label}: groups have no color`);
    if (part.materialColor !== undefined) errors.push(`${path}${label}: groups have no materialColor`);
    if (part.stretch !== undefined) errors.push(`${path}${label}: groups have no stretch`);
    if (part.biomeColor !== undefined) errors.push(`${path}${label}: groups have no biomeColor`);
    if (part.biomeScale !== undefined) errors.push(`${path}${label}: groups have no biomeScale`);
    part.children.forEach((child, ci) => validatePart(child, `${path}.children[${ci}]`, errors, seen, true));
  } else {
    if (part.children !== undefined) errors.push(`${path}${label}: children must be an array`);
    if (typeof part.shape !== 'string' || !SHAPE_TYPES[part.shape]) {
      errors.push(`${path}${label}: unknown shape "${part.shape ?? '(missing)'}" (known: ${Object.keys(SHAPE_TYPES).join(', ')})`);
    } else if (part.params !== undefined) {
      errors.push(...validateShapeParams(part.shape, part.params));
    }

    if (part.color !== undefined && !isColorInt(part.color) && !isColorToken(part.color)) {
      errors.push(`${path}${label}: color must be an integer 0..0xFFFFFF or a named-color token (${COLOR_TOKEN_PATTERN})`);
    }
    // materialColor is legacy (v3): normalizeDescriptor merges it into `color`,
    // which is why it stays integer-only here (the material path never resolves
    // tokens). Accepted so old downloads still validate; never emitted by Save.
    if (part.materialColor !== undefined && !isColorInt(part.materialColor)) {
      errors.push(`${path}${label}: materialColor must be an integer 0..0xFFFFFF`);
    }
    if (part.stretch !== undefined) validateStretch(part.stretch, `${path}${label}.stretch`, errors);
    if (part.biomeColor !== undefined) validateBiomeColor(part.biomeColor, `${path}${label}.biomeColor`, errors);
    if (part.biomeScale !== undefined) validateBiomeScale(part.biomeScale, `${path}${label}.biomeScale`, errors);
  }

  // Groups use the nested field set at any depth (they are never grounded);
  // leaves use it only below the root.
  if (part.transform !== undefined) validateTransform(part.transform, `${path}${label}`, errors, isGroup || nested);
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
    validatePart(part, `${path}.parts[${i}]`, errors, seen);
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

const MATERIAL_KEYS = ['emissive', 'emissiveIntensity'];

function validateMaterial(material, path, errors) {
  if (material === undefined) return;
  if (!isPlainObject(material)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  for (const key of Object.keys(material)) {
    if (!MATERIAL_KEYS.includes(key)) errors.push(`${path}: unknown field "${key}"`);
  }
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
 * Normalize one node of a parts tree (a shape leaf or a group). `nested` marks
 * nodes below the root: they get the nested transform defaults (no `y`/`lift`)
 * and skip the legacy grounding migration. Groups keep no shape/params and
 * their `children` recurse. `legacyGrounding` migrates pre-v3 vertical
 * placement (see normalizeDescriptor): files authored before the
 * bottom-anchored convention encoded `transform.y` as the part's CENTER height.
 * The record path bakes the shape's base offset × Y scale into `y`
 * (recordBuilder), which compensates a matching `base × scaleY` subtraction
 * from `transform.y` exactly at scale 1 — so the migration pulls the base out
 * of the authored center height and the part renders at the same height (its
 * lowest vertex lands at the old center height, and stretch grows it upward
 * from there instead of from its center). `lift` / `localPos.y` are pure
 * offsets and stay as authored. Idempotent: only schemaVersion < SCHEMA_VERSION
 * triggers it.
 */
function normalizePart(part, legacyGrounding = false, nested = false) {
  if (!isPlainObject(part)) return part;
  const out = { ...part };
  const isGroup = Array.isArray(out.children);

  // Shape leaves resolve params + legacy shape names; groups carry neither.
  if (!isGroup) {
    const shapeName = LEGACY_SHAPE_NAMES[out.shape] ?? out.shape;
    const shape = SHAPE_TYPES[shapeName];
    const params = isPlainObject(out.params) ? out.params : {};
    out.shape = shapeName;
    out.params = shape ? { ...shape.defaults, ...params } : { ...params };
  } else {
    delete out.shape;
    delete out.params;
  }

  // v3 → v4: `materialColor` merges into the single per-part `color`. A literal
  // `color` wins when both are present — the old instance-color path already
  // overrode the material color visually. Idempotent: v4 parts carry neither.
  if (out.materialColor !== undefined) {
    if (!isGroup && out.color === undefined) out.color = out.materialColor;
    delete out.materialColor;
  }

  // Resolve the legacy combined XZ scale into independent scaleX/scaleZ
  // (an explicit per-axis scale wins over the legacy value).
  const defaults = isGroup || nested ? NESTED_PART_TRANSFORM_DEFAULTS : PART_TRANSFORM_DEFAULTS;
  const transform = isPlainObject(out.transform) ? out.transform : {};
  const merged = { ...defaults, ...transform };
  if (transform.scaleXZ !== undefined) {
    if (!('scaleX' in transform)) merged.scaleX = transform.scaleXZ;
    if (!('scaleZ' in transform)) merged.scaleZ = transform.scaleXZ;
  }
  delete merged.scaleXZ;
  out.transform = merged;

  // Root-only grounding fields (y / lift) and the world-space lean
  // (tiltAxis / tilt) never appear on groups or nested nodes — the schema
  // rejects them and the render ignores them. Fold the vertical offsets into
  // localPos.y (the same convention as the editor's rootToNestedTransform, so
  // a bottom-anchored root leaf keeps its height when wrapped) and drop the
  // lean (no nested expression). Idempotent: canonical nodes carry none of
  // these fields.
  if (isGroup || nested) {
    const yFold = (merged.y ?? 0) + (merged.lift ?? 0);
    if (yFold !== 0) {
      merged.localPos = {
        x: merged.localPos?.x ?? 0,
        y: (merged.localPos?.y ?? 0) + yFold,
        z: merged.localPos?.z ?? 0,
      };
    }
    delete merged.y;
    delete merged.lift;
    delete merged.tiltAxis;
    delete merged.tilt;
  }

  // Resolve the legacy combined stretch axis `xz` into x + z (false pins both).
  if (isPlainObject(out.stretch) && out.stretch.xz !== undefined) {
    const stretch = { ...out.stretch };
    if (stretch.x === undefined) stretch.x = stretch.xz;
    if (stretch.z === undefined) stretch.z = stretch.xz;
    delete stretch.xz;
    out.stretch = stretch;
  }

  // Legacy (pre-v3) grounding migration — root shape leaves only. Groups have
  // no geometry and nested nodes have no grounding to migrate.
  if (!isGroup && !nested && legacyGrounding) {
    const base = shapeBaseOffset(out.shape, out.params);
    out.transform.y -= base * (out.transform.scaleY ?? 1);
  }

  // Children recurse as nested nodes (nested defaults, no grounding).
  if (isGroup) {
    out.children = out.children.map((child) => normalizePart(child, legacyGrounding, true));
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

  // v3 → v4: object-level material color moves onto each part that has no
  // color of its own (the material color was the render fallback for those
  // parts). Captured from the RAW material before the defaults merge below.
  const legacyMaterialColor = isPlainObject(out.material) ? out.material.color : undefined;

  // Files older than v3 encoded `transform.y` as the part's CENTER height; the
  // bottom-anchored convention reads it as bottom height, so only pre-v3 files
  // are migrated per part (see normalizePart). This floor is a constant on
  // purpose: bumping SCHEMA_VERSION (e.g. v4's color migration) must not
  // re-apply the grounding migration to v3+ files.
  const legacyGrounding = (out.schemaVersion ?? 1) < 3;
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

  // v3 → v4 color migration: push the object's material color into every part
  // that lacks an explicit color, then drop it from the material. Entity parts
  // are skipped for the push — their instance color comes from the entity
  // (token or the entity.color fallback), so the material color never rendered
  // for them — but material.color is removed for every kind. The push walks the
  // parts trees recursively and touches shape leaves only (groups have no
  // color). Idempotent: a v4 file has no material.color, so the push no-ops.
  if (legacyMaterialColor !== undefined) {
    if (!ENTITY_DRIVEN_KINDS.has(out.kind)) {
      const push = (node) => {
        if (Array.isArray(node.children)) {
          for (const child of node.children) push(child);
          return;
        }
        if (node.color === undefined) node.color = legacyMaterialColor;
      };
      for (const part of out.parts) push(part);
      for (const variant of out.variants ?? []) {
        for (const part of variant.parts) push(part);
      }
    }
    if (isPlainObject(out.material)) delete out.material.color;
  }

  return out;
}

// ── Denormalization ─────────────────────────────────────────────────────────

/** Recursive deep-equality for JSON-safe values (objects, arrays, primitives). */
function sameValue(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  }
  if (isPlainObject(a)) {
    const aKeys = Object.keys(a);
    const bKeys = isPlainObject(b) ? Object.keys(b) : null;
    return !!bKeys && aKeys.length === bKeys.length && aKeys.every((k) => sameValue(a[k], b[k]));
  }
  return false;
}

/** Strip the fields normalizeDescriptor fills for moisture-rule clusters. */
const MOISTURE_COUNTS_DEFAULT = Object.freeze({ forest: [3, 5], denseForest: [4, 7] });

/**
 * Strip every optional field equal to its default — the inverse of
 * normalizeDescriptor — producing the minimal hand-authored form used by the
 * data files (only non-default fields). Saving an edited descriptor through
 * denormalizeDescriptor keeps the diff small instead of writing every default
 * back into the file. Pure, idempotent, JSON-safe.
 *
 * `schemaVersion` is deliberately retained: its absence would make a later
 * normalizeDescriptor run treat the file as pre-v3 and re-apply the legacy
 * grounding migration (transform.y -= base × scaleY), corrupting values.
 *
 * Round-trip invariant: normalizeDescriptor(denormalizeDescriptor(d))
 * deep-equals normalizeDescriptor(d) for every valid descriptor. The split
 * migration and the descriptor round-trip tests enforce it.
 *
 * @param {object} def - normalized descriptor
 * @returns {object} minimal descriptor
 */
export function denormalizeDescriptor(def) {
  const out = cloneJson(isPlainObject(def) ? def : {});

  if (out.scale === OBJECT_DEFAULTS.scale) delete out.scale;
  if (out.variantRule === 'hash') delete out.variantRule;

  if (isPlainObject(out.cluster)) {
    const cluster = out.cluster;
    const rule = cluster.rule ?? 'uniform';
    if (rule === 'uniform') {
      // min/max only — moisture fields left over from a rule switch are inert.
      delete cluster.countsByTerrain;
      delete cluster.densityRange;
      delete cluster.jitter;
      if (cluster.min === OBJECT_DEFAULTS.cluster.min) delete cluster.min;
      if (cluster.max === OBJECT_DEFAULTS.cluster.max) delete cluster.max;
      delete cluster.rule; // 'uniform' is the default
    } else {
      // moisture — counts come from countsByTerrain; min/max are uniform-only.
      delete cluster.min;
      delete cluster.max;
      if (sameValue(cluster.countsByTerrain, MOISTURE_COUNTS_DEFAULT)) delete cluster.countsByTerrain;
      if (sameValue(cluster.densityRange, [0.55, 0.85])) delete cluster.densityRange;
      if (cluster.jitter === 1) delete cluster.jitter;
    }
    if (Object.keys(cluster).length === 0) delete out.cluster;
  }

  if (isPlainObject(out.size)) {
    if (out.size.min === OBJECT_DEFAULTS.size.min) delete out.size.min;
    if (out.size.max === OBJECT_DEFAULTS.size.max) delete out.size.max;
    if (Object.keys(out.size).length === 0) delete out.size;
  }

  if (isPlainObject(out.variation)) {
    const variation = out.variation;
    for (const [key, defValue] of Object.entries(OBJECT_DEFAULTS.variation)) {
      if (sameValue(variation[key], defValue)) delete variation[key];
    }
    if (Object.keys(variation).length === 0) delete out.variation;
  }

  if (isPlainObject(out.placement)) {
    const placement = out.placement;
    const mode = placement.mode ?? 'center';
    // Each placement mode owns a fixed sub-field set; fields left over from
    // other modes (editor mode switches) are inert and stripped on emit.
    const MODE_FIELDS = {
      scatter: ['offsetMin', 'offsetMax'],
      ring: ['ringMin', 'ringMax', 'leanMin', 'leanMax'],
      jitter: ['offset', 'tiltMin', 'tiltMax', 'tiltSeed'],
      center: [],
    };
    const own = new Set(MODE_FIELDS[mode] ?? []);
    for (const key of Object.keys(placement)) {
      if (key !== 'mode' && !own.has(key)) delete placement[key];
    }
    if (mode === 'scatter') {
      if (placement.offsetMin === 0.15) delete placement.offsetMin;
      if (placement.offsetMax === 0.3) delete placement.offsetMax;
    } else if (mode === 'ring') {
      if (placement.ringMin === 0.18) delete placement.ringMin;
      if (placement.ringMax === 0.55) delete placement.ringMax;
      if (placement.leanMin === 0.045) delete placement.leanMin;
      if (placement.leanMax === 0.12) delete placement.leanMax;
    } else if (mode === 'jitter') {
      if (placement.offset === 0.08) delete placement.offset;
      if (placement.tiltMin === 0) delete placement.tiltMin;
      if (placement.tiltMax === 0) delete placement.tiltMax;
      if (placement.tiltSeed === 1) delete placement.tiltSeed;
    } else {
      delete placement.mode; // 'center' is the default
    }
    if (Object.keys(placement).length === 0) delete out.placement;
  }

  if (isPlainObject(out.emphasis) && out.emphasis.behavior === 'none') delete out.emphasis;
  if (isPlainObject(out.material) && sameValue(out.material, OBJECT_DEFAULTS.material)) delete out.material;

  const denormPart = (part, nested = false) => {
    if (!isPlainObject(part)) return part;
    const p = cloneJson(part);
    const isGroup = Array.isArray(p.children);
    const shape = SHAPE_TYPES[p.shape];
    if (!isGroup && shape && isPlainObject(p.params)) {
      const params = {};
      for (const [key, value] of Object.entries(p.params)) {
        if (!(key in shape.defaults) || !Object.is(value, shape.defaults[key])) params[key] = value;
      }
      if (Object.keys(params).length === 0) delete p.params;
      else p.params = params;
    }
    if (isPlainObject(p.transform)) {
      const defaults = isGroup || nested ? NESTED_PART_TRANSFORM_DEFAULTS : PART_TRANSFORM_DEFAULTS;
      const transform = {};
      for (const [key, value] of Object.entries(p.transform)) {
        if (!(key in defaults) || !Object.is(value, defaults[key])) transform[key] = value;
      }
      if (Object.keys(transform).length === 0) delete p.transform;
      else p.transform = transform;
    }
    if (isGroup) {
      p.children = p.children.map((child) => denormPart(child, true));
    }
    return p;
  };

  out.parts = (Array.isArray(out.parts) ? out.parts : []).map(denormPart);
  if (Array.isArray(out.variants)) {
    out.variants = out.variants.map((variant) => {
      const v = { ...variant };
      v.parts = (Array.isArray(variant.parts) ? variant.parts : []).map(denormPart);
      return v;
    });
  }

  return out;
}
