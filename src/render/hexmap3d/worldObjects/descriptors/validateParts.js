/**
 * validateParts.js — Per-part and parts-tree validation.
 *
 * `validatePart` checks one node of a parts tree (a shape leaf or a group with
 * a `children` array), recursing into nested nodes; `validatePartsList` checks
 * a whole parts set (the descriptor's `parts` or one variant's). Per-part
 * field validators for `biomeColor`, `biomeScale`, and `stretch` live here;
 * shape params and transforms validate in validateShapes.js, and the
 * descriptor-level entry point is descriptorValidation.js.
 */
import { SHAPE_TYPES } from './shapeTypes.js';
import { COLOR_TOKEN_PATTERN } from './typeChecks.js';
import { isPlainObject, isPositiveNumber, isFiniteNumber, isColorInt, isColorToken, ID_PATTERN } from './typeChecks.js';
import { validateShapeParams, validateTransform } from './validateShapes.js';
import { ALTERNATIVE_SEED_MIN, ALTERNATIVE_SEED_MAX } from './descriptorDefaults.js';

const PART_KEYS = ['id', 'shape', 'params', 'transform', 'color', 'materialColor', 'stretch', 'biomeColor', 'biomeScale', 'states', 'children', 'alternatives', 'seed', 'default', 'chance'];

const STRETCH_AXES = ['x', 'y', 'z', 'xz']; // 'xz' is the legacy combined axis

/**
 * Growth-state keyframes a part may carry. `states.empty` is the part's look
 * at growth 0 (depleted/empty); the part's authored base values are its look
 * at growth 1 (full). The render lerps each overridden field from the empty
 * keyframe to the base by the feature's continuous `growth` value, so a
 * depleted font's water can be a tiny dull puddle that grows to a vivid
 * brimming pool, or unripe fruit can be small and green before it swells and
 * colors. Only shape leaves carry states (groups have no visuals of their own).
 */
const EMPTY_STATE_KEYS = ['scaleX', 'scaleY', 'scaleZ', 'y', 'localPos', 'color'];

/**
 * Biome tint sources a part may pull from — the biome's material-class color
 * swatches (see biomeColorDefaults.js). A part tints from the swatch matching
 * the material it depicts: `foliage` for leaves/grass/scrub, `wood` for
 * trunks/logs/driftwood, `soil` for dirt/sand/clods, `stone` for rocks and
 * rubble, `bloom` for flowers/fruits, `exotic` for crystals/ores/glows and
 * supernatural bits. `terrain` tints toward the tile's own terrain surface
 * color (its biome palette entry for the tile's terrain type,
 * neighbor-blended) — ground-matching decor such as hill and plateau mounds.
 * The influence strength is 0..1, where 0 keeps the part's default color.
 * Every biome swatch-tints; tiles with no known biome colors keep the
 * authored color (`terrain` still tints wherever palettes are known).
 */
const BIOME_COLOR_SOURCES = ['foliage', 'wood', 'soil', 'stone', 'bloom', 'exotic', 'terrain'];

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
 * Validate a part's `states` — the growth-state keyframes. Only the `empty`
 * keyframe exists today (the base values ARE the full state); it carries
 * optional overrides for the fields the render lerps: per-axis scale, the
 * root bottom height `y`, the nested `localPos`, and `color`. Any subset may
 * be present — unlisted fields keep their base (full) value at every growth.
 */
function validateStates(states, path, errors) {
  if (!isPlainObject(states)) {
    errors.push(`${path}: must be an object { empty }`);
    return;
  }
  for (const key of Object.keys(states)) {
    if (key !== 'empty') errors.push(`${path}: unknown state "${key}"`);
  }
  const empty = states.empty;
  if (empty === undefined) return;
  if (!isPlainObject(empty)) {
    errors.push(`${path}.empty: must be an object of keyframe overrides`);
    return;
  }
  for (const key of Object.keys(empty)) {
    if (!EMPTY_STATE_KEYS.includes(key)) errors.push(`${path}.empty: unknown field "${key}"`);
  }
  if (empty.scaleX !== undefined && !isPositiveNumber(empty.scaleX)) errors.push(`${path}.empty.scaleX: must be a positive number`);
  if (empty.scaleY !== undefined && !isPositiveNumber(empty.scaleY)) errors.push(`${path}.empty.scaleY: must be a positive number`);
  if (empty.scaleZ !== undefined && !isPositiveNumber(empty.scaleZ)) errors.push(`${path}.empty.scaleZ: must be a positive number`);
  if (empty.y !== undefined && !isFiniteNumber(empty.y)) errors.push(`${path}.empty.y: must be a number`);
  if (empty.color !== undefined && !isColorInt(empty.color)) errors.push(`${path}.empty.color: must be an integer 0..0xFFFFFF`);
  if (empty.localPos !== undefined) {
    if (!isPlainObject(empty.localPos)) {
      errors.push(`${path}.empty.localPos: must be an object { x, y, z }`);
    } else {
      for (const axis of ['x', 'y', 'z']) {
        if (empty.localPos[axis] !== undefined && !isFiniteNumber(empty.localPos[axis])) {
          errors.push(`${path}.empty.localPos.${axis}: must be a number`);
        }
      }
    }
  }
}

/**
 * Validate a single node of a parts tree: either a shape leaf, a group (a
 * `children` array), or an `alternatives` choice point (an `alternatives`
 * array — no shape, no children, no transform). `seen` is the id set shared
 * across the whole parts set (fallback `parts` or one variant's `parts`) —
 * ids must be unique across the entire subtree because records and
 * InstancedMeshes are keyed by partId. `nested` marks nodes below the root,
 * which use the nested transform field set (no `y`/`lift`/`tilt`).
 * @param {object} part - the node
 * @param {string} path - error prefix, e.g. `descriptor.parts[0]`
 * @param {string[]} errors - accumulator
 * @param {Set<string>} seen - ids already claimed in this parts set
 * @param {boolean} [nested=false] - node is below the root of the parts tree
 * @param {Set<string>} [biomeIds=null] - registered biome ids to check option
 *        `biomeWeight` keys against (null = skip the unknown-id check; bare
 *        Node runs may not have the archetype registry loaded)
 */
export function validatePart(part, path, errors, seen = new Set(), nested = false, biomeIds = null) {
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

  const isAlternatives = Array.isArray(part.alternatives);
  const isGroup = Array.isArray(part.children);
  if (isAlternatives) {
    // A choice point: not a shape and not a group — it emits no geometry of
    // its own and carries no position, so the full geometry field set is
    // rejected (STRICTER than the group rule, which keeps `transform`).
    if (part.shape !== undefined) errors.push(`${path}${label}: alternatives nodes have no shape`);
    if (part.params !== undefined) errors.push(`${path}${label}: alternatives nodes have no params`);
    if (part.transform !== undefined) errors.push(`${path}${label}: alternatives nodes carry no transform — wrap a hinged config in a group`);
    if (part.color !== undefined) errors.push(`${path}${label}: alternatives nodes have no color`);
    if (part.materialColor !== undefined) errors.push(`${path}${label}: alternatives nodes have no materialColor`);
    if (part.stretch !== undefined) errors.push(`${path}${label}: alternatives nodes have no stretch`);
    if (part.biomeColor !== undefined) errors.push(`${path}${label}: alternatives nodes have no biomeColor`);
    if (part.biomeScale !== undefined) errors.push(`${path}${label}: alternatives nodes have no biomeScale`);
    if (part.states !== undefined) errors.push(`${path}${label}: alternatives nodes have no states`);
    if (isGroup) errors.push(`${path}${label}: a node is either alternatives or a group, not both`);
    if (part.seed !== undefined && !(Number.isInteger(part.seed) && part.seed >= ALTERNATIVE_SEED_MIN && part.seed <= ALTERNATIVE_SEED_MAX)) {
      errors.push(`${path}${label}.seed: must be an integer in the reserved ${ALTERNATIVE_SEED_MIN}–${ALTERNATIVE_SEED_MAX} draw lane`);
    }
    validateAlternativesNode(part, path, errors, seen, nested, biomeIds);
  } else if (isGroup) {
    if (part.children.length === 0) errors.push(`${path}${label}: group must have at least one child`);
    if (part.shape !== undefined) errors.push(`${path}${label}: groups have no shape — a part is either a shape leaf or a group (children)`);
    if (part.params !== undefined) errors.push(`${path}${label}: groups have no params`);
    if (part.color !== undefined) errors.push(`${path}${label}: groups have no color`);
    if (part.materialColor !== undefined) errors.push(`${path}${label}: groups have no materialColor`);
    if (part.stretch !== undefined) errors.push(`${path}${label}: groups have no stretch`);
    if (part.biomeColor !== undefined) errors.push(`${path}${label}: groups have no biomeColor`);
    if (part.biomeScale !== undefined) errors.push(`${path}${label}: groups have no biomeScale`);
    if (part.states !== undefined) errors.push(`${path}${label}: groups have no states`);
    part.children.forEach((child, ci) => validatePart(child, `${path}.children[${ci}]`, errors, seen, true, biomeIds));
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
    if (part.states !== undefined) validateStates(part.states, `${path}${label}.states`, errors);
  }

  // Groups use the nested field set at any depth (they are never grounded);
  // leaves use it only below the root.
  if (part.transform !== undefined) validateTransform(part.transform, `${path}${label}`, errors, isGroup || nested);
  // Per-node spawn chance (transformVariation.js): independent present/absent
  // roll per item on any node kind.
  if (part.chance !== undefined && !(isFiniteNumber(part.chance) && part.chance >= 0 && part.chance <= 1)) {
    errors.push(`${path}${label}.chance: must be a number in [0, 1]`);
  }
  for (const key of Object.keys(part)) {
    if (!PART_KEYS.includes(key)) errors.push(`${path}${label}: unknown field "${key}"`);
  }
}

function validatePartsList(parts, path, errors, seen, biomeIds = null) {
  if (!Array.isArray(parts) || parts.length === 0) {
    errors.push(`${path}.parts: required non-empty array`);
    return;
  }
  const shared = seen ?? new Set();
  parts.forEach((part, i) => {
    validatePart(part, `${path}.parts[${i}]`, errors, shared, false, biomeIds);
  });
}

/**
 * Validate an `alternatives` choice point's option table. Each option is
 * `{ id, weight?, biomeWeight?, parts }` — `parts` MAY be empty (the `none`
 * option), the one list in the schema that allows it. Option ids live in the
 * GLOBAL part-id namespace (two co-candidate arms must not share an id), so
 * they claim the shared `seen` set too. `weight` must be >= 0 (0 = never
 * drawn); `biomeWeight` is a sparse per-biome multiplier (absent key ≡ 1,
 * present 0 ≡ excluded — decorComposition.md §2.2) whose keys must be
 * registered biome ids when the registry is available. `default` must name an
 * option that exists. Options reject the explicit GEOMETRY field set (they are
 * parts lists, not shapes) but tolerate unknown NON-geometry keys — the node
 * may gain further per-option fields in a later schema rev, so the validator
 * must not reject keys it expects to grow.
 */
function validateAlternativesNode(part, path, errors, seen, nested, biomeIds = null) {
  const list = part.alternatives;
  if (list.length === 0) {
    errors.push(`${path}${part.id ? ` "${part.id}"` : ''}: alternatives must be a non-empty array`);
    return;
  }
  const optionIds = new Set();
  list.forEach((option, oi) => {
    const opath = `${path}.alternatives[${oi}]`;
    if (!isPlainObject(option)) {
      errors.push(`${opath}: option must be an object { id, weight?, parts }`);
      return;
    }
    // An option is a parts list entry, not a shape — the explicit geometry
    // field set is rejected; unknown non-geometry keys are tolerated (future
    // per-option fields like biomeWeight).
    for (const key of ['shape', 'params', 'transform', 'color', 'materialColor', 'stretch', 'biomeColor', 'biomeScale', 'states', 'children', 'alternatives', 'seed', 'default']) {
      if (option[key] !== undefined) errors.push(`${opath}: option has no "${key}" — config lives on the choice-point node, geometry in its parts`);
    }
    if (typeof option.id !== 'string' || !option.id) {
      errors.push(`${opath}: missing option id`);
    } else {
      if (!ID_PATTERN.test(option.id)) errors.push(`${opath}.id: must match /^[A-Za-z0-9_-]+$/`);
      if (seen.has(option.id)) errors.push(`${opath}: duplicate part id "${option.id}"`);
      seen.add(option.id);
      optionIds.add(option.id);
    }
    if (option.weight !== undefined && (typeof option.weight !== 'number' || !Number.isFinite(option.weight) || option.weight < 0)) {
      errors.push(`${opath}.weight: must be a number >= 0`);
    }
    // Per-biome option bias (decorComposition.md §2.2): a sparse multiplier
    // (absent key ≡ 1, present 0 ≡ excluded) mirroring the motif-slot
    // `biomeWeight`. Biome-id keys are checked against the registry when it is
    // available — a typo'd biome id must not silently no-op.
    if (option.biomeWeight !== undefined) {
      if (!isPlainObject(option.biomeWeight)) {
        errors.push(`${opath}.biomeWeight: must be an object of biome id → multiplier (absent ≡ 1, 0 ≡ excluded)`);
      } else {
        for (const [biomeId, factor] of Object.entries(option.biomeWeight)) {
          if (typeof factor !== 'number' || !Number.isFinite(factor) || factor < 0) {
            errors.push(`${opath}.biomeWeight.${biomeId}: must be a number >= 0`);
          }
          if (biomeIds && biomeIds.size > 0 && !biomeIds.has(biomeId)) {
            errors.push(`${opath}.biomeWeight: unknown biome id "${biomeId}" (registered: ${[...biomeIds].join(', ')})`);
          }
        }
      }
    }
    // The one schema list whose `parts` may be empty — the `none` option.
    if (!Array.isArray(option.parts)) {
      errors.push(`${opath}.parts: required array (may be empty for a "none" option)`);
    } else {
      option.parts.forEach((child, ci) => validatePart(child, `${opath}.parts[${ci}]`, errors, seen, nested, biomeIds));
    }
  });
  if (part.default !== undefined) {
    if (typeof part.default !== 'string' || !part.default) {
      errors.push(`${path}.default: must name an option id`);
    } else if (!optionIds.has(part.default)) {
      errors.push(`${path}.default: unknown option "${part.default}"`);
    }
  }
}

export { validatePartsList };
