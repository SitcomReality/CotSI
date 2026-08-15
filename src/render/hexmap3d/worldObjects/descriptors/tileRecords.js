/**
 * tileRecords.js — Tile-driven instance records from a descriptor.
 *
 * The tile record path (recordsForDescriptor): item count and variant from the
 * tile hash, per-item placement, then per-part records — root shape leaves via
 * recordForPart (the flat record fields), nested leaves and groups via baked
 * frame matrices. nodeWorldFrames is the same walk emitting per-node world
 * frames for the geometry editor's gizmo. Pure — no THREE.
 */
import { tileHash, treeHash, itemHash, frac, lerp } from '../tileHash.js';
import {
  mat4Identity,
  mat4Translation,
  mat4Multiply,
  mat4TranslationOf,
} from '../../../../engine/rules/mat4.js';
import { shapeBaseOffset } from './shapeTypes.js';
import { leafScaleXYZ, isGroupNode, LIFT_RANGE_SEED } from './partScale.js';
import { tileColorForPart } from './partColor.js';
import { stateTransform } from './partStates.js';
import {
  frameLocalPos,
  groupFrameMatrix,
  nestedLeafFrameMatrix,
  worldBaseMatrix,
  parentRotationMatrix,
} from './partFrames.js';
import { itemCount } from './clusterCount.js';
import { variantFor } from './variantSelection.js';
import { resolveDisplacement, clusterPlacements } from './itemPlacement.js';

/** Hash seed offset for optional-group presence rolls (treeHash channel). */
const OPTIONAL_GROUP_SEED = 53;

/**
 * Build one item's instance records for the given ROOT part. Local offsets
 * (lift / localPos) are pre-scaled by the item scale so the whole item scales
 * rigidly — the same convention addTreeRecords uses when it bakes the tree
 * scale into the canopy lift.
 */
function recordForPart(descriptor, part, tile, worldPos, tileH, i, itemScale, placement, disp, biomeTint, canonical = false, growth) {
  const t = stateTransform(part, growth);
  const scaleMul = disp?.scaleMul ?? 1;
  const jitterScale = placement.scaleMul ?? 1;
  // Per-biome size factor — stunts (or grows) the part on tiles of specific
  // biomes (part.biomeScale[biomeId], e.g. Tundra's stunted trees).
  const biomeFactor = canonical ? 1 : (part.biomeScale?.[tile.biomeId] ?? 1);
  const { sx, sy, sz } = leafScaleXYZ(descriptor, part, tile, tileH, i, itemScale, scaleMul, jitterScale, biomeFactor, canonical, growth);

  // Bottom-anchored grounding: the shape's base offset (scaled by the record's
  // Y scale) normally bakes into the pivot `y`, so the part's lowest vertex
  // lands at worldPos.y + t.y + lift — y = 0 / lift = 0 sits flush on the
  // surface, and stretch grows the part upward from there. When the part
  // actually leans (nonzero tilt), the pivot moves DOWN to the part's base:
  // `y` becomes the bottom height and the base offset rides inside the
  // rotation as lift, so the tilt spins the part about its ground contact
  // instead of its geometry center (meshBuilder's T · R(tilt) · T(lift) …).
  const base = shapeBaseOffset(part.shape, part.params);
  const rigid = itemScale * scaleMul * jitterScale * biomeFactor;
  const groundedY = worldPos.y + t.y + (disp?.yOffset ?? 0);
  let tiltAxis;
  let tilt;
  if (t.tiltAxis && t.tilt !== undefined) {
    tiltAxis = t.tiltAxis;
    tilt = t.tilt;
  } else if (placement.tiltAxis && placement.tilt !== undefined) {
    tiltAxis = placement.tiltAxis;
    tilt = placement.tilt;
  }
  const basePivot = tilt !== undefined && tilt !== 0;
  const baseLift = base * sy;
  const record = {
    partId: part.id,
    x: worldPos.x + placement.dx,
    y: basePivot ? groundedY : groundedY + baseLift,
    z: worldPos.z + placement.dz,
    scale: sx,
    scaleY: sy,
  };
  if (sz !== sx) record.scaleZ = sz;

  const rotY = t.rotY + (placement.rotY ?? 0);
  if (rotY) record.rotY = rotY;

  // Tilted parts carry the base offset in the lift slot (the pivot). Untilted
  // parts emit lift only when the part is authored with one (keeping the exact
  // legacy multiplication order so untilted records stay byte-identical).
  // `liftRange` draws the lift from [min, max] by the seeded hash instead of a
  // fixed value — author it with the seed of the part this lift tracks (the
  // trunk's stretch seed) so the canopy bottom follows the per-tree trunk
  // stretch (legacy canopyLift = canopyY·trunkStretch − halfHeight).
  const lift = t.liftRange
    ? lerp(t.liftRange.min, t.liftRange.max, frac(treeHash(tileH, t.liftRange.seed ?? LIFT_RANGE_SEED)))
    : (t.lift ?? 0);
  if (basePivot) record.lift = baseLift + lift * rigid;
  else if (lift) record.lift = lift * itemScale * scaleMul * jitterScale * biomeFactor;
  if (t.localPos) {
    // Pre-scaled by the same rigid factor as lift and the geometry: when a
    // scatter tile (or displacement) shrinks the item, the localPos offset
    // shrinks with it so sub-parts stay attached to the shrunk item.
    record.localPos = {
      x: t.localPos.x * itemScale * scaleMul * jitterScale * biomeFactor,
      y: t.localPos.y * itemScale * scaleMul * jitterScale * biomeFactor,
      z: t.localPos.z * itemScale * scaleMul * jitterScale * biomeFactor,
    };
  }
  if (t.localAxis && t.localAngle !== undefined) {
    record.localAxis = t.localAxis;
    record.localAngle = t.localAngle;
  }
  if (tilt !== undefined) {
    record.tiltAxis = tiltAxis;
    record.tilt = tilt;
  }
  const color = tileColorForPart(part, descriptor, tileH, i, biomeTint, canonical, growth);
  if (color !== undefined) record.color = color;

  return record;
}

/**
 * Recursively emit records for one node of a parts tree and (optionally)
 * collect every node's world frame for the editor.
 *
 * - Root shape leaves go through recordForPart — byte-identical to the flat
 *   model.
 * - Groups compose a frame onto the accumulated ancestor frames and recurse.
 * - Nested shape leaves get a fully baked world `matrix` record — the flat
 *   record fields can't express rotation about a group origin, so the matrix
 *   carries the whole composed transform.
 *
 * @param {object} ctx - { tile, worldPos, tileH, i, itemScale, placement, disp,
 *        biomeTint, worldBase }
 * @param {number[]} frame - accumulated ancestor group frames (identity at root)
 * @param {boolean} isRoot - node is at the top of the parts tree (grounded)
 * @param {object[]} out - record accumulator
 * @param {Map|null} nodeFrames - when set, per-node { origin, parentRot } for
 *        every leaf and group (see nodeWorldFrames)
 */
function collectPart(descriptor, part, ctx, frame, isRoot, out, nodeFrames) {
  if (isGroupNode(part)) {
    const t = part.transform;
    const scaleMul = ctx.disp?.scaleMul ?? 1;
    const g = groupFrameMatrix(t, ctx.itemScale, scaleMul, ctx.placement.scaleMul ?? 1);
    const nextFrame = mat4Multiply(frame, g);
    if (nodeFrames) {
      const jitterScale = ctx.placement.scaleMul ?? 1;
      // Same pre-scale as groupFrameMatrix — the gizmo sits at the group's
      // origin as the item rigidly shrinks/grows under scatter/dispersal.
      const { x, y, z } = frameLocalPos(t, ctx.itemScale * scaleMul * jitterScale, 1);
      const originM = mat4Multiply(ctx.worldBase, mat4Multiply(frame, mat4Translation(x, y, z)));
      nodeFrames.set(part.id, { origin: mat4TranslationOf(originM), parentRot: parentRotationMatrix(ctx.worldBase, frame) });
    }
    for (const child of part.children) {
      collectPart(descriptor, child, ctx, nextFrame, false, out, nodeFrames);
    }
    return;
  }

  if (isRoot) {
    out.push(recordForPart(descriptor, part, ctx.tile, ctx.worldPos, ctx.tileH, ctx.i, ctx.itemScale, ctx.placement, ctx.disp, ctx.biomeTint, ctx.canonical, ctx.growth));
    if (nodeFrames) {
      const r = out[out.length - 1];
      // The root origin is the shape's local-origin height — record y (which
      // already bakes the shape base) PLUS the lift/localPos.y vertical slot,
      // the same stack the render composes. Without the offset the gizmo
      // would sit at the ground for every lifted or localPos-raised part.
      const ly = (r.localPos?.y ?? 0) + (r.lift ?? 0);
      nodeFrames.set(part.id, { origin: { x: r.x, y: r.y + ly, z: r.z }, parentRot: parentRotationMatrix(ctx.worldBase, mat4Identity()) });
    }
    return;
  }

  const biomeFactor = ctx.canonical ? 1 : (part.biomeScale?.[ctx.tile.biomeId] ?? 1);
  const leaf = nestedLeafFrameMatrix(
    part, descriptor, ctx.tile, ctx.tileH, ctx.i, ctx.itemScale,
    ctx.disp?.scaleMul ?? 1, ctx.placement.scaleMul ?? 1, biomeFactor, ctx.canonical, ctx.growth,
  );
  const matrix = mat4Multiply(ctx.worldBase, mat4Multiply(frame, leaf));
  const record = { partId: part.id, matrix };
  const color = tileColorForPart(part, descriptor, ctx.tileH, ctx.i, ctx.biomeTint, ctx.canonical, ctx.growth);
  if (color !== undefined) record.color = color;
  out.push(record);
  if (nodeFrames) {
    nodeFrames.set(part.id, { origin: mat4TranslationOf(matrix), parentRot: parentRotationMatrix(ctx.worldBase, frame) });
  }
}

/**
 * The one tile item walk — shared by recordsForDescriptor (records sink) and
 * nodeWorldFrames (frame sink). Computes the item list (variant or motifs,
 * cluster count, optional groups, displacement, placements) and walks every
 * item's parts through collectPart once, feeding BOTH sinks: `records` (the
 * instance-record accumulator) and `nodeFrames` (the editor's per-node world
 * frame map). Either may be null to skip that sink. This is the single source
 * of truth for the tile path — the two public entry points differ only in
 * which sink they pass, so selection frames match rendered records by
 * construction (including optional groups, which both now emit).
 *
 * @param {object} descriptor - normalized descriptor
 * @param {object} tile       - tile ({ q, r, terrain, moisture?, ... })
 * @param {object} worldPos   - { x, y, z } hex center in world space (y = tile surface)
 * @param {number} tileH      - precomputed tile hash
 * @param {object} displacement - { displaced?: boolean, hidden?: boolean }
 * @param {object} biomeTint  - { primary, accent } blended biome color tuples or null
 * @param {string|null} variantId - variant id override (editor variant picker)
 * @param {boolean} canonical - canonical preview: base parts, one item,
 *        authored scale, centered, no stretch/color jitter (geometry editor).
 * @param {number} [growth] - continuous 0..1 feature growth (see below)
 * @param {object[]|null} records - instance-record accumulator (may be null)
 * @param {Map|null} nodeFrames - per-node { origin, parentRot } map (may be null)
 */
function walkTileItems(descriptor, tile, worldPos, tileH, displacement, biomeTint, variantId, canonical, growth, records, nodeFrames) {
  if (canonical) {
    const ctx = {
      tile, worldPos, tileH, i: 0,
      itemScale: descriptor.scale,
      placement: { dx: 0, dz: 0 },
      disp: {},
      biomeTint: null,
      canonical: true,
      growth,
      worldBase: worldBaseMatrix(worldPos, { dx: 0, dz: 0 }, {}),
    };
    for (const part of descriptor.parts) {
      collectPart(descriptor, part, ctx, mat4Identity(), true, records, nodeFrames);
    }
    return;
  }
  if (displacement.hidden) return;
  const count = itemCount(descriptor, tile, tileH);
  if (displacement.displaced && descriptor.emphasis.behavior === 'hidden') return;

  const variant = variantFor(descriptor, tile, tileH, variantId);
  const parts = (variant ?? descriptor).parts;

  // Optional groups — independent per-tile include/exclude of sub-objects
  // (e.g. desert cactus AND/OR a scraggly dead tree). Each present group emits
  // one extra item, so the cluster count grows by the number that spawn.
  const presentGroups = (descriptor.optionalGroups ?? []).filter((group, g) => {
    const chance = group.chance ?? 0.5;
    return frac(treeHash(tileH, OPTIONAL_GROUP_SEED + g)) < chance;
  });

  const totalCount = count + presentGroups.length;
  const disp = resolveDisplacement(descriptor, totalCount, tileH, displacement.displaced);

  const placements = clusterPlacements(descriptor, tile, totalCount, tileH, disp);
  const emitItem = (itemParts, i) => {
    // Per-item size draw — per-item so cluster members vary (treeVariation's
    // scale uses hash i+3). Item 0 keeps the old item-independent roll, so
    // lone objects are unchanged; members draw the decorrelated itemHash so
    // the every-third-index correlation can't clone member sizes.
    const sizeT = i === 0 ? frac(treeHash(tileH, i + 3)) : itemHash(tileH, i + 3);
    const itemScale = descriptor.scale * lerp(descriptor.size.min, descriptor.size.max, sizeT);
    const placement = placements[i];
    const ctx = {
      tile, worldPos, tileH, i, itemScale, placement, disp, biomeTint,
      growth,
      worldBase: worldBaseMatrix(worldPos, placement, disp),
    };
    for (const part of itemParts) {
      collectPart(descriptor, part, ctx, mat4Identity(), true, records, nodeFrames);
    }
  };

  for (let i = 0; i < count; i++) emitItem(parts, i);
  presentGroups.forEach((group, g) => emitItem(group.parts, count + g));
}

/**
 * Generate instance records for one tile from a (normalized) descriptor.
 *
 * @param {object} descriptor - normalized descriptor
 * @param {object} tile       - tile ({ q, r, terrain, moisture?, ... })
 * @param {object} worldPos   - { x, y, z } hex center in world space (y = tile surface)
 * @param {number} [tileH]    - precomputed tile hash (defaults to tileHash(tile))
 * @param {object} [displacement] - { displaced?: boolean, hidden?: boolean }
 * @param {object} [biomeTint] - { primary, accent } blended biome color tuples
 *        (biomeTint.js); parts with a `biomeColor` influence mix toward it.
 *        null/undefined keeps every part's default color.
 * @param {string|null} [variantId] - variant id override (the geometry
 *        editor's variant picker); null lets the variantRule decide.
 * @param {boolean} [canonical] - canonical preview: base parts, one item,
 *        authored scale, centered, no stretch/color jitter (geometry editor).
 * @param {number} [growth] - continuous 0..1 feature growth: parts with a
 *        `states.empty` keyframe lerp scale/position/color from the empty
 *        keyframe (growth 0) to their authored base (growth 1). 1 or
 *        undefined renders the authored (full) values.
 * @returns {object[]} instance records tagged with partId ([] when hidden)
 */
export function recordsForDescriptor(descriptor, tile, worldPos, tileH = tileHash(tile), displacement = {}, biomeTint = null, variantId = null, canonical = false, growth) {
  const records = [];
  walkTileItems(descriptor, tile, worldPos, tileH, displacement, biomeTint, variantId, canonical, growth, records, null);
  return records;
}

/**
 * World frames for every node (shape leaves AND groups) of the tile path:
 * per partId, the node's world-space origin and the rotation-only matrix of
 * its parent chain (`worldBase × ancestor frames`, translation zeroed). The
 * editor uses these to place the translation gizmo at a selected node's origin
 * and to convert world-space drag deltas into the node's local frame — a
 * rotation's inverse is its transpose, so `deltaLocal = R_parentᵀ · deltaWorld`.
 * For clusters every item's nodes land in the same map; later items overwrite
 * earlier ones (the gizmo drags the shared localPos of the last item's frame).
 *
 * This shares the one tile item walk with recordsForDescriptor — the frames
 * come from the same items, placements, and (now) optional groups, so the
 * gizmo always matches the rendered records by construction.
 */
export function nodeWorldFrames(descriptor, tile, worldPos, tileH = tileHash(tile), displacement = {}, biomeTint = null, variantId = null, canonical = false, growth) {
  const frames = new Map();
  walkTileItems(descriptor, tile, worldPos, tileH, displacement, biomeTint, variantId, canonical, growth, [], frames);
  return frames;
}
