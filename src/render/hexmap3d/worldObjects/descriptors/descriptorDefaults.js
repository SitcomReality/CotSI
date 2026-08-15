/**
 * descriptorDefaults.js — Schema enumerations, versions, and defaults.
 *
 * The object-level constants a descriptor may use: content categories
 * (OBJECT_KINDS), variant rules, emphasis behaviors, placement modes, the
 * schema version, and the default values for every optional field. Shared by
 * the validation, normalization, and denormalization modules.
 */
import { CAMERA_PITCH, CAMERA_YAW } from '../../../../params/render/cameraParams.js';

// ── Enumerations and defaults ──────────────────────────────────────────────

/**
 * Content categories a descriptor can represent. Features, decor, and
 * mountains are tile-driven (records from a tile hash); bases, champions,
 * mobs, and traders are entity-driven (records from entity state, one per
 * entity — see recordBuilder.recordsForEntity).
 */
export const OBJECT_KINDS = Object.freeze(['feature', 'decor', 'mountain', 'base', 'champion', 'mob', 'trader', 'item']);

/**
 * Equipment slots an `item` descriptor can belong to. Icons are authored as
 * regular descriptors (kind 'item') and presented in the editor + atlas by
 * slot; the game's equipment catalog (game/rules/equipment.js) links a catalog
 * item to its descriptor by id. Extensible as the equip model grows
 * (tools/clothes/…).
 */
export const ITEM_SLOTS = Object.freeze(['weapon', 'armor']);

/** Kinds driven by entity state (recordsForEntity) — their instance colors
 *  come from the entity (part token / entity.color), never from the object
 *  material, so the v4 material-color migration skips them. */
export const ENTITY_DRIVEN_KINDS = new Set(['base', 'champion', 'mob', 'trader']);

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
 * Defaults for the optional object-level `portrait` field — how the object is
 * framed when rendered as a UI icon/portrait (the geometry editor + the icon
 * atlas). Absent `portrait` means "auto-frame at the map's isometric camera
 * angle" (the long-standing portrait behavior): pitch/yaw mirror cameraParams,
 * `pad` is the bounding-sphere frame margin, `raise` shifts the view down so
 * grounded models sit above center. Any sub-field may be overridden per object;
 * the framing resolver (render/hexmap3d/portrait/portraitFraming.js) fills the
 * rest.
 */
export const PORTRAIT_DEFAULTS = Object.freeze({
  pitch: CAMERA_PITCH,
  yaw: CAMERA_YAW,
  pad: 1.25,
  raise: 0.12,
});

/**
 * Defaults for a part's transform — the instance-record extras in
 * meshBuilder.js. `y` / `lift` are the height of the part's BOTTOM above the
 * placement surface: 0 = sitting flush on the ground (see shapeBaseOffset for
 * how the record path anchors vertically-centered primitives). `lift` raises
 * the part in its own frame (pre-scale, so it is the same bottom-height
 * measure under stretch); `liftRange` draws that height from `[min, max]` by
 * the seeded hash instead — author it with the seed of the part this lift
 * tracks (e.g. the trunk) so the bottom follows a per-tree draw; `localPos`
 * overrides `lift` with a full local offset. Angles are radians.
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
 * How a descriptor's `variants` list is resolved to the parts of one item.
 * Tile-driven kinds: 'hash' (default) rolls from the tile hash; 'mountain'
 * keeps the legacy mountain hash roll. The legacy 'cluster' rule is retired —
 * its terrain half is now the `terrainVariants` map and its biome half
 * `biomeVariants` (normalizeDescriptor migrates old files). Entity-driven
 * kinds: 'faction' picks variant id === entity.faction, 'archetype' picks
 * variant id === entity.archetype.
 */
export const VARIANT_RULES = Object.freeze(['hash', 'faction', 'archetype', 'mountain']);
