/**
 * schema.js — Public API for the descriptor schema (barrel).
 *
 * A descriptor is the single source of truth for how a game object (feature,
 * decor, mountain, or an entity — base, champion, mob, trader) is composed and
 * placed. It describes shape parts with per-part transforms, cluster/size
 * ranges, placement, variants + variantRule, emphasis, and material (see
 * descriptorAuthoring.md for the full model). This module is pure data + pure
 * functions — no THREE, no game state — so it is unit-testable in Node and
 * shared by the editor page and the game's generic mesh builder. Values are
 * JSON-safe (colors as integers, angles in radians, lengths in world units
 * where hex radius = 1.0).
 *
 * Implementation lives in the focused sibling modules, re-exported here so
 * importers see one stable surface:
 *
 *   shapeTypes.js           — SHAPE_TYPES registry, shapeBaseOffset
 *   descriptorDefaults.js   — kinds, emphasis/placement/variant enums,
 *                             SCHEMA_VERSION, object/transform defaults
 *   typeChecks.js           — value type guards, COLOR_TOKEN_PATTERN
 *   validateShapes.js       — shape-param + transform validation
 *   validateParts.js        — per-part and parts-tree validation
 *   descriptorValidation.js — descriptor-level validation (validateDescriptor)
 *   descriptorNormalize.js  — normalizeDescriptor (defaults + legacy migration)
 *   descriptorDenormalize.js— denormalizeDescriptor (strip defaults)
 */
export {
  SHAPE_TYPES,
  shapeBaseOffset,
} from './shapeTypes.js';

export {
  OBJECT_KINDS,
  ITEM_SLOTS,
  EMPHASIS_BEHAVIORS,
  PLACEMENT_MODES,
  SCHEMA_VERSION,
  MOTIF_SEED,
  OPTIONAL_GROUP_SEED,
  ALTERNATIVE_SEED_MIN,
  ALTERNATIVE_SEED_MAX,
  OBJECT_DEFAULTS,
  PORTRAIT_DEFAULTS,
  PART_TRANSFORM_DEFAULTS,
  NESTED_PART_TRANSFORM_DEFAULTS,
  VARIANT_RULES,
} from './descriptorDefaults.js';

export {
  COLOR_TOKEN_PATTERN,
} from './typeChecks.js';

export {
  validateShapeParams,
  validateTransform,
} from './validateShapes.js';

export {
  validatePart,
} from './validateParts.js';

export {
  validateDescriptor,
  validateMotifBlock,
} from './descriptorValidation.js';

export {
  normalizeDescriptor,
} from './descriptorNormalize.js';

export {
  denormalizeDescriptor,
} from './descriptorDenormalize.js';
