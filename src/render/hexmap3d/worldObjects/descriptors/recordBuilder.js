/**
 * recordBuilder.js — Pure record generation from a descriptor.
 *
 * Turns a descriptor (see schema.js) + one tile into instance records —
 * the same record format the mesh builders write (see meshBuilder.js), tagged
 * with `partId` so the assembler can group them by part geometry.
 *
 * Determinism: every decision is derived from the tile hash (tileHash.js), so
 * the same tile always produces the same records across chunk rebuilds — the
 * same guarantee the current per-kind builders rely on.
 *
 * Entities (bases, champions, mobs, traders) are different: one entity per
 * hex, placed at the center, with variants and colors driven by the entity's
 * own state (faction, archetype, palette) rather than the tile hash. The
 * `recordsForEntity` export below is that entity-driven record path — the seam
 * the units/base builders use to render entities through the same generic
 * mesh pipeline (meshAssembly.js).
 *
 * This module is pure (no THREE) so the record math — cluster count, size
 * range, placement, and emphasis — is unit-testable in Node.
 *
 * Displacement: the caller decides whether the hex center is claimed by
 * something more important (occupant / feature, per decorEmphasis.js) and
 * passes `displaced` / `hidden`. What the object then *does* is its own
 * `emphasis.behavior`:
 *   dispersed — shrink and step aside: to the shared upper-left corner anchor
 *               for a single item, to a ring near the hex edge for a cluster;
 *   sunk      — shrink and descend below the tile surface (hill mounds);
 *   hidden    — not rendered at all;
 *   none      — stays put (mountains).
 *
 * Grounding: every record bakes the part shape's base offset (shapeBaseOffset
 * in schema.js, scaled by the record's Y scale) into the vertical placement —
 * the root path into the record `y`, the nested path into the leaf's frame
 * matrix — so a part's lowest vertex always lands at worldPos.y + transform.y
 * + lift (+ localPos.y), and a nested leaf's bottom lands exactly at its
 * localPos point in the parent's frame. Stretch and scaleY therefore grow a
 * part upward from its base, never below it. Both the tile path and the entity
 * path apply the same rule. When a root part actually leans (nonzero tilt),
 * the bake moves into the lift slot instead — `y` becomes the bottom height
 * and the tilt rotates about that base (see recordForPart), matching the
 * nested-leaf convention.
 */
import { tileHash, treeHash, itemHash, frac, lerp, clamp01 } from '../tileHash.js';
import {
  DISPERSED_SCALE,
  dispersedSingleOffset,
  dispersedRingOffsets,
  sunkTransform,
} from '../decorEmphasis.js';
import {
  SCATTER_HASH_SEEDS,
  SCATTER_ANGLE_STEP,
  SCATTER_OFFSET_MIN,
  SCATTER_OFFSET_RANGE,
  SCATTER_ROTATION_SEED,
  SCATTER_SCALE_BASE,
  SCATTER_SCALE_RANGE,
  TREE_VARIANT_HASH_SEEDS,
  TREE_FOREST_TALL_THRESHOLD,
  TREE_VARIANT_THRESHOLDS,
} from '../../../../params/render/geometryParams.js';
import { shapeBaseOffset } from './schema.js';
import {
  mat4Identity,
  mat4Translation,
  mat4Scale,
  mat4RotationY,
  mat4RotationAxisAngle,
  mat4Multiply,
  mat4TranslationOf,
} from '../../../../engine/rules/mat4.js';

// Ring-scatter constants mirror TREE_VARIATION.ringJitter / angleJitter in
// geometryParams.js (0.15 × ring width jitter, ±0.7 rad angular scatter).
const RING_JITTER = 0.15;
const RING_ANGLE_JITTER = 0.7;

/**
 * Deterministic item count.
 *   uniform  — roll in [cluster.min, cluster.max] from the tile hash.
 *              Tile hashes can be negative (hex coords), so the roll is
 *              normalized to a non-negative index.
 *   moisture — the legacy cluster-grove rule: count scales with the tile's
 *              moisture between `countsByTerrain[terrain]` min/max, plus a
 *              per-tile hash jitter of ±`jitter`. Replicates the game's
 *              clusterCount() verbatim, including the JS `%` sign quirk on
 *              negative tile hashes, so migrated groves match the old render.
 */
function itemCount(descriptor, tile, tileH) {
  const cluster = descriptor.cluster;
  if (cluster.rule === 'moisture') {
    const m = tile.moisture;
    const [a, b] = cluster.densityRange;
    const density = Number.isFinite(m) ? clamp01((m - a) / (b - a)) : 0.5;
    const [min, max] = cluster.countsByTerrain[tile.terrain] ?? cluster.countsByTerrain.forest;
    const count = Math.round(lerp(min, max, density));
    return Math.min(max, Math.max(min, count + (tileH % (cluster.jitter * 2 + 1)) - cluster.jitter));
  }
  const { min, max } = cluster;
  const span = Math.max(1, max - min + 1);
  const roll = ((tileH % span) + span) % span;
  return min + roll;
}

/**
 * Which variant's parts compose the items.
 *
 * variantRule 'hash' (default) — roll over the variants list from the tile
 * hash; the generic rule for any content with hash-chosen variants (mountains).
 *
 * variantRule 'solitary' — the legacy lone-tree canopy rule (terrain + coord
 * hash → round/tall/wide), matching the solitary-tree descriptor on open ground.
 *
 * variantRule 'cluster' — replicate clusterVariant(): denseForest groves are
 * conical (tall) pines, everything else round. Painforest woods (forest or
 * denseForest) grow the gnarled `painforest` variant instead — the biome
 * override takes precedence over the terrain canopy family.
 *
 * When the rule names an id the descriptor does not define, fall back to the
 * hash roll so a partially-migrated descriptor still renders.
 */
const PAINFOREST_BIOME = 'biome_painforest';

/**
 * @param {string|null} [explicitId] - variant id override (the geometry
 *        editor's variant picker): when the descriptor defines it, that
 *        variant wins over the rule; a stale id falls through to the rule.
 */
function variantFor(descriptor, tile, tileH, explicitId = null) {
  const variants = descriptor.variants;
  if (!variants || variants.length === 0) return null;
  const byId = (id) => variants.find((v) => v.id === id) ?? null;
  if (explicitId) {
    const forced = byId(explicitId);
    if (forced) return forced;
  }
  const rule = descriptor.variantRule;
  if (rule === 'solitary') {
    const hash = ((tile.q * TREE_VARIANT_HASH_SEEDS[0] + tile.r * TREE_VARIANT_HASH_SEEDS[1]) * TREE_VARIANT_HASH_SEEDS[2]) % TREE_VARIANT_HASH_SEEDS[3];
    let id;
    if (tile.terrain === 'forest') {
      id = hash < TREE_FOREST_TALL_THRESHOLD ? 'tall' : 'round';
    } else if (hash < TREE_VARIANT_THRESHOLDS[0]) {
      id = 'round';
    } else if (hash < TREE_VARIANT_THRESHOLDS[1]) {
      id = 'tall';
    } else {
      id = 'wide';
    }
    return byId(id) ?? variants[((tileH % variants.length) + variants.length) % variants.length];
  }
  if (rule === 'cluster') {
    if (tile.biomeId === PAINFOREST_BIOME) {
      return byId('painforest') ?? variants[((tileH % variants.length) + variants.length) % variants.length];
    }
    const id = tile.terrain === 'denseForest' ? 'tall' : 'round';
    return byId(id) ?? variants[((tileH % variants.length) + variants.length) % variants.length];
  }
  const len = variants.length;
  return variants[((tileH % len) + len) % len];
}

/**
 * Which variant's parts compose a single entity (base / champion / mob /
 * trader). Variant ids match the entity attribute that selects them:
 *   variantRule 'faction'    — variant id === entity.faction (e.g. 'CRU')
 *   variantRule 'archetype'  — variant id === entity.archetype (e.g. 'infernalpaca')
 * A missing match (or a rule the entity doesn't satisfy) falls back to the
 * first variant so a partially-migrated descriptor still renders.
 */
function variantForEntity(descriptor, entity) {
  const variants = descriptor.variants;
  if (!variants || variants.length === 0) return null;
  const rule = descriptor.variantRule;
  if (rule === 'faction' && entity.faction) {
    return variants.find((v) => v.id === entity.faction) ?? variants[0];
  }
  if (rule === 'archetype' && entity.archetype) {
    return variants.find((v) => v.id === entity.archetype) ?? variants[0];
  }
  return variants[0];
}

/**
 * Dispersal/sinking result for the whole item set, or null when the items
 * stay in place. Ring dispersal returns per-item offsets indexed by item.
 */
function resolveDisplacement(descriptor, count, tileH, displaced) {
  if (!displaced) return null;
  switch (descriptor.emphasis.behavior) {
    case 'sunk': {
      const { scale, yOffset } = sunkTransform();
      return { scaleMul: scale, yOffset, dx: 0, dz: 0 };
    }
    case 'dispersed':
      if (count > 1) {
        return { scaleMul: DISPERSED_SCALE, ring: dispersedRingOffsets(count, tileH) };
      }
      return { scaleMul: DISPERSED_SCALE, ...dispersedSingleOffset() };
    default:
      return null; // 'none' — ignores displacement
  }
}

/**
 * Per-item scatter placement jitter, derived from the descriptor's own
 * `placement.offsetMin`/`offsetMax` bounds (schema defaults 0.15..0.3) so the
 * scatter spread is authorable per object. Item 0 keeps the legacy roll
 * verbatim — the 30-step bucket and the negative-hash `%` behavior from the
 * old simpleFeatureMeshes.js jitterForTile(), so lone objects stay
 * deterministic and close to their original offsets; only the width of the
 * ring is rescaled to the descriptor's bounds. Cluster members (i > 0) draw
 * their own angle/radius/rotation/scale from itemHash (decorrelated per
 * index — see tileHash.js) so a cluster truly scatters across the hex instead
 * of stacking every member at one point (or every third member at the same
 * point, as the linear treeHash would).
 */
function scatterJitter(tile, placement, tileH, i) {
  const min = placement.offsetMin ?? SCATTER_OFFSET_MIN;
  // Legacy fallback for unnormalized descriptors: max 0.295 (the old
  // `min + (range[0]-1)/range[1]` top bucket).
  const max = placement.offsetMax ?? SCATTER_OFFSET_MIN + (SCATTER_OFFSET_RANGE[0] - 1) / SCATTER_OFFSET_RANGE[1];
  if (i === 0) {
    const hash = ((tile.q * SCATTER_HASH_SEEDS[0] + tile.r * SCATTER_HASH_SEEDS[1]) * SCATTER_HASH_SEEDS[2]) % SCATTER_HASH_SEEDS[3];
    const angle = (hash * SCATTER_ANGLE_STEP) % (Math.PI * 2);
    const f = (hash % SCATTER_OFFSET_RANGE[0]) / (SCATTER_OFFSET_RANGE[0] - 1);
    const dist = min + f * (max - min);
    return {
      dx: Math.cos(angle) * dist,
      dz: Math.sin(angle) * dist,
      rotY: (hash * SCATTER_ROTATION_SEED) % (Math.PI * 2),
      scaleMul: SCATTER_SCALE_BASE + (hash % SCATTER_SCALE_RANGE[0]) / SCATTER_SCALE_RANGE[1],
    };
  }
  const angle = itemHash(tileH, i + 13) * Math.PI * 2;
  const dist = lerp(min, max, itemHash(tileH, i + 17));
  return {
    dx: Math.cos(angle) * dist,
    dz: Math.sin(angle) * dist,
    rotY: itemHash(tileH, i + 19) * Math.PI * 2,
    // Same scale-jitter band as the legacy roll (SCATTER_SCALE_BASE .. BASE
    // + (RANGE[0]-1)/RANGE[1], i.e. 0.8..0.99), drawn smoothly per member.
    scaleMul: SCATTER_SCALE_BASE + itemHash(tileH, i + 23) * (SCATTER_SCALE_RANGE[0] - 1) / SCATTER_SCALE_RANGE[1],
  };
}

/**
 * Per-item lean from the placement mode. Ring items lean outward from the hex
 * center (tilt axis ⊥ the offset direction); jitter items lean on a fixed
 * per-tile axis (solitaryTreeRecords). Returns null when the mode has no lean.
 */
function placementTilt(placement, dx, dz, tileH, i) {
  if (placement.mode === 'ring') {
    const len = Math.hypot(dx, dz) || 1e-6;
    return {
      tiltAxis: { x: dz / len, z: -dx / len },
      tilt: lerp(placement.leanMin, placement.leanMax, frac(treeHash(tileH, i + 8))),
    };
  }
  if (placement.mode === 'jitter') {
    // Item 0 keeps the legacy per-tile lean axis (solitary trees lean the same
    // way as before); cluster members draw a decorrelated one (itemHash) so
    // they don't all lean in the same 3 directions (treeHash's every-third
    // index correlation).
    const dir = i === 0
      ? frac(treeHash(tileH, placement.tiltSeed)) * Math.PI * 2
      : itemHash(tileH, placement.tiltSeed + i) * Math.PI * 2;
    const t = i === 0
      ? frac(treeHash(tileH, placement.tiltSeed + 1))
      : itemHash(tileH, placement.tiltSeed + 1 + i);
    return {
      tiltAxis: { x: Math.sin(dir), z: -Math.cos(dir) },
      tilt: lerp(placement.tiltMin, placement.tiltMax, t),
    };
  }
  return null;
}

/**
 * Per-item placement inside the hex. Dispersed offsets override the object's
 * own placement mode, but the item keeps its lean (dispersed items still tilt
 * exactly like the per-kind builders apply it).
 *
 * @returns {object} { dx, dz, rotY, scaleMul?, tiltAxis?, tilt? }
 */
function itemPlacement(descriptor, i, count, tileH, disp, jitter) {
  // Dispersed single item — the shared corner anchor overrides the position,
  // but displaced simple features kept BOTH their scatter rotation and their
  // per-tile size jitter (simpleFeatureMeshes.js multiplied DISPERSED_SCALE
  // onto the already-jittered scale). Jitter-mode solitary trees reset to 0
  // and center objects have no rotation or size jitter.
  if (disp && disp.dx !== undefined) {
    const tilt = placementTilt(descriptor.placement, disp.dx, disp.dz, tileH, i);
    const scatter = descriptor.placement.mode === 'scatter';
    const rotY = scatter ? jitter.rotY : 0;
    return {
      dx: disp.dx, dz: disp.dz, rotY,
      ...(scatter ? { scaleMul: jitter.scaleMul } : {}),
      ...(tilt ?? {}),
    };
  }
  if (disp && disp.ring) {
    const { dx, dz } = disp.ring[i];
    const tilt = placementTilt(descriptor.placement, dx, dz, tileH, i);
    // Dispersed groves kept each tree's ring rotation (treeVariation rotY).
    const rotY = frac(treeHash(tileH, i + 7)) * Math.PI * 2;
    return { dx, dz, rotY, ...(tilt ?? {}) };
  }
  const placement = descriptor.placement;
  if (placement.mode === 'scatter') {
    return {
      dx: jitter.dx,
      dz: jitter.dz,
      rotY: jitter.rotY,
      scaleMul: jitter.scaleMul,
    };
  }
  if (placement.mode === 'ring') {
    const ringT = clamp01(frac(treeHash(tileH, i + 1)) + (frac(treeHash(tileH, i + 2)) - 0.5) * RING_JITTER * 2);
    const r = lerp(placement.ringMin, placement.ringMax, ringT);
    const angle = (i / count) * Math.PI * 2 + (frac(treeHash(tileH, i + 2)) - 0.5) * RING_ANGLE_JITTER;
    const dx = Math.cos(angle) * r;
    const dz = Math.sin(angle) * r;
    return {
      dx, dz,
      rotY: frac(treeHash(tileH, i + 7)) * Math.PI * 2,
      ...placementTilt(placement, dx, dz, tileH, i),
    };
  }
  if (placement.mode === 'jitter') {
    // Item 0 keeps the legacy anchor — a single point at distance `offset`
    // along the tile's angle — so lone objects are unchanged. Cluster members
    // (i > 0) spread into a loose clump within 0.5..1.5 × offset of the hex
    // center, each with its own facing (drawn from the decorrelated itemHash);
    // the per-item tilt is unchanged.
    if (i === 0) {
      const angle = frac(tileH) * Math.PI * 2;
      const dx = Math.cos(angle) * placement.offset;
      const dz = Math.sin(angle) * placement.offset;
      return {
        dx, dz,
        rotY: angle,
        ...placementTilt(placement, dx, dz, tileH, i),
      };
    }
    const angle = itemHash(tileH, i + 13) * Math.PI * 2;
    const radius = placement.offset * lerp(0.5, 1.5, itemHash(tileH, i + 17));
    const dx = Math.cos(angle) * radius;
    const dz = Math.sin(angle) * radius;
    return {
      dx, dz,
      rotY: itemHash(tileH, i + 19) * Math.PI * 2,
      ...placementTilt(placement, dx, dz, tileH, i),
    };
  }
  return { dx: 0, dz: 0, rotY: 0 };
}

/**
 * Color with a small deterministic brightness jitter, as an integer —
 * mirrors clusterColor() in treeParts.js, but stays THREE-free.
 */
function jitteredColor(base, jitter, tileH, i) {
  if (!jitter) return base;
  const j = (frac(treeHash(tileH, i + 9)) - 0.5) * 2 * jitter;
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = ch(((base >> 16) & 0xff) * (1 + j));
  const g = ch(((base >> 8) & 0xff) * (1 + j));
  const b = ch((base & 0xff) * (1 + j));
  return (r << 16) | (g << 8) | b;
}

/**
 * Mix a default color toward a biome tint tuple (0-1 channels) by `influence`,
 * as an integer — the per-part `biomeColor` rule: influence 0 keeps the default
 * color, 1 fully replaces it with the blended biome color. Per-channel rounding
 * matches jitteredColor.
 */
function mixTowardColor(base, tint, influence) {
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = ch(((base >> 16) & 0xff) * (1 - influence) + tint[0] * 255 * influence);
  const g = ch(((base >> 8) & 0xff) * (1 - influence) + tint[1] * 255 * influence);
  const b = ch((base & 0xff) * (1 - influence) + tint[2] * 255 * influence);
  return (r << 16) | (g << 8) | b;
}

/**
 * Stretch multiplier for one axis of a part. The part's own `stretch` override
 * wins; `false` pins the axis at 1 (no stretch); otherwise the object-level
 * `variation.stretchX/Y/Z` applies. Default hash seeds: 4 for Y, 5 for X and Z
 * — X and Z share the legacy stretchXZ seed, so split-axis descriptors draw
 * the same XZ value the old combined axis did; decorrelate with per-part seeds.
 */
const STRETCH_SEEDS = Object.freeze({ x: 5, y: 4, z: 5 });

function stretchForAxis(part, descriptor, axis, tileH, i) {
  const partStretch = part.stretch?.[axis];
  if (partStretch === false) return 1;
  const v = descriptor.variation;
  if (partStretch) {
    return lerp(partStretch.min, partStretch.max, frac(treeHash(tileH, partStretch.seed ?? STRETCH_SEEDS[axis])));
  }
  const pair = v[`stretch${axis.toUpperCase()}`];
  return lerp(pair[0], pair[1], frac(treeHash(tileH, STRETCH_SEEDS[axis])));
}

/** A group node — a part with a `children` array and no shape of its own. */
const isGroupNode = (part) => Array.isArray(part.children);

/**
 * Per-part non-uniform scale (X/Y/Z) — item scale × dispersal × scatter
 * jitter × transform scale × per-axis stretch (part override or the object's
 * variation ranges) × biome factor. Shared by the root-leaf record path and
 * the nested-frame matrix path so a part renders identically at any depth.
 * X and Z are independent; Y follows the mountain-type rule when the
 * descriptor sizes by mountainType.
 */
function leafScaleXYZ(descriptor, part, tile, tileH, i, itemScale, scaleMul, jitterScale, biomeFactor) {
  const t = part.transform;
  const sx = itemScale * scaleMul * jitterScale * t.scaleX * stretchForAxis(part, descriptor, 'x', tileH, i) * biomeFactor;
  const sz = itemScale * scaleMul * jitterScale * t.scaleZ * stretchForAxis(part, descriptor, 'z', tileH, i) * biomeFactor;
  // Mountain-type height rule: scaleY comes from the tile's mountainType tag
  // (peak/slope/normal) instead of the stretch ranges — the mountainMeshes
  // builder's mountainScale(). Item scale stays 1 on XZ.
  const byType = descriptor.size.byMountainType;
  const bucket = byType?.[tile.mountainType];
  const sy = bucket
    ? itemScale * scaleMul * t.scaleY * lerp(bucket.min, bucket.max, frac(treeHash(tileH, i + 3))) * biomeFactor
    : itemScale * scaleMul * jitterScale * t.scaleY * stretchForAxis(part, descriptor, 'y', tileH, i) * biomeFactor;
  return { sx, sy, sz };
}

/**
 * The instance color for a tile-path part: brightness jitter from the object's
 * colorJitter, then the per-part biome tint. String `color` values are named
 * tokens for the entity record path (recordsForEntity) — the tile path has no
 * entity to resolve them, so they are skipped here rather than fed into the
 * color-jitter bit math. `biomeTint` is null when the tile has no tint
 * (biomeTint.js returns null for Untouched/Painforest tiles and for tiles with
 * no known biome colors), which keeps the default color.
 */
function tileColorForPart(part, descriptor, tileH, i, biomeTint) {
  if (part.color === undefined || typeof part.color === 'string') return undefined;
  let color = jitteredColor(part.color, descriptor.variation.colorJitter, tileH, i);
  if (part.biomeColor && biomeTint) {
    const influence = Math.min(1, Math.max(0, part.biomeColor.influence ?? 0));
    const tint = biomeTint[part.biomeColor.source];
    if (influence > 0 && tint) color = mixTowardColor(color, tint, influence);
  }
  return color;
}

/**
 * Build one item's instance records for the given ROOT part. Local offsets
 * (lift / localPos) are pre-scaled by the item scale so the whole item scales
 * rigidly — the same convention addTreeRecords uses when it bakes the tree
 * scale into the canopy lift.
 */
function recordForPart(descriptor, part, tile, worldPos, tileH, i, itemScale, placement, disp, biomeTint) {
  const t = part.transform;
  const scaleMul = disp?.scaleMul ?? 1;
  const jitterScale = placement.scaleMul ?? 1;
  // Per-biome size factor — stunts (or grows) the part on tiles of specific
  // biomes (part.biomeScale[biomeId], e.g. Tundra's stunted trees).
  const biomeFactor = part.biomeScale?.[tile.biomeId] ?? 1;
  const { sx, sy, sz } = leafScaleXYZ(descriptor, part, tile, tileH, i, itemScale, scaleMul, jitterScale, biomeFactor);

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
  if (basePivot) record.lift = baseLift + (t.lift ? t.lift * rigid : 0);
  else if (t.lift) record.lift = t.lift * itemScale * scaleMul * jitterScale * biomeFactor;
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
  const color = tileColorForPart(part, descriptor, tileH, i, biomeTint);
  if (color !== undefined) record.color = color;

  return record;
}

// ── Nested part groups ──────────────────────────────────────────────────────

/**
 * Pre-scaled localPos of a node. `itemScale` × dispersal × scatter jitter
 * makes the whole item scale rigidly (the same convention as root-leaf
 * localPos/lift — positions move with the geometry); `biomeFactor` keeps
 * per-part biome size changes rigid for nested leaves (groups have no
 * biomeScale — validation rejects it). Roots may use `lift` instead of
 * localPos.y; nested nodes only have localPos.
 */
function frameLocalPos(t, rigidScale, biomeFactor) {
  if (!t.localPos) return { x: 0, y: 0, z: 0 };
  return {
    x: t.localPos.x * rigidScale * biomeFactor,
    y: t.localPos.y * rigidScale * biomeFactor,
    z: t.localPos.z * rigidScale * biomeFactor,
  };
}

/**
 * A group's frame matrix — how a group offsets, orients, and scales its
 * children: T(localPos) · R(localAxis/localAngle) · R_y(rotY) · S(scale).
 * The group's localPos is pre-scaled by the item's full rigid factor
 * (itemScale × dispersal × scatter jitter), the same factor its children's
 * own geometry and localPos carry — so the group's offsets move rigidly with
 * the item. The group's S carries ONLY the group's own authored scale: its
 * children already scale by the rigid factor themselves, and folding it in
 * again would square it (nested geometry = itemScale²).
 */
function groupFrameMatrix(t, itemScale, scaleMul, jitterScale) {
  const { x, y, z } = frameLocalPos(t, itemScale * scaleMul * jitterScale, 1);
  const sx = t.scaleX;
  const sy = t.scaleY;
  const sz = t.scaleZ;
  let m = mat4Scale(sx, sy, sz);
  if (t.localAxis && t.localAngle !== undefined) {
    m = mat4Multiply(mat4RotationAxisAngle(t.localAxis, t.localAngle), m);
  }
  if (t.rotY) m = mat4Multiply(mat4RotationY(t.rotY), m);
  return mat4Multiply(mat4Translation(x, y, z), m);
}

/**
 * A nested leaf's frame matrix — the leaf's own T(localPos) · R(localAxis/
 * localAngle) · R_y(rotY) · S(scale), with the full scale factor set (stretch,
 * scatter jitter, biome factor). The recordBuilder composes it onto the
 * ancestor frames to bake the leaf's world matrix. Bottom-anchored like the
 * root record path: the shape's base offset (scaled by this leaf's full Y
 * scale) is baked into the frame AFTER the rotations but BEFORE the scale, so
 * the lowest vertex cancels exactly to the leaf's localPos point — a nested
 * leaf's localPos.y is its bottom height in the parent's frame, matching what
 * `y` means at the root.
 */
function nestedLeafFrameMatrix(part, descriptor, tile, tileH, i, itemScale, scaleMul, jitterScale, biomeFactor) {
  const t = part.transform;
  const { sx, sy, sz } = leafScaleXYZ(descriptor, part, tile, tileH, i, itemScale, scaleMul, jitterScale, biomeFactor);
  const { x, y, z } = frameLocalPos(t, itemScale * scaleMul * jitterScale, biomeFactor);
  const base = shapeBaseOffset(part.shape, part.params);
  let m = mat4Scale(sx, sy, sz);
  m = mat4Multiply(mat4Translation(0, base * sy, 0), m);
  if (t.localAxis && t.localAngle !== undefined) {
    m = mat4Multiply(mat4RotationAxisAngle(t.localAxis, t.localAngle), m);
  }
  if (t.rotY) m = mat4Multiply(mat4RotationY(t.rotY), m);
  return mat4Multiply(mat4Translation(x, y, z), m);
}

/**
 * The item-level world transform nested leaves sit under — the same slot a
 * root leaf's world rotation occupies: T(placement offset + displacement
 * offset) · R(tilt) · R(rotY), matching meshBuilder's
 * `T · R(rotY) · R(tilt) · …` composition order.
 */
function worldBaseMatrix(worldPos, placement, disp) {
  const px = worldPos.x + placement.dx;
  const py = worldPos.y + (disp?.yOffset ?? 0);
  const pz = worldPos.z + placement.dz;
  // T · R(tilt) · R(rotY) — the translation is the OUTERMOST transform, so
  // rotY/tilt spin the item about its own origin, exactly like the root-leaf
  // record path (meshBuilder's T(x,z) · R(tilt)·R(rotY) · …). Composing
  // R · T instead would rotate the placement offset about the WORLD origin,
  // displacing nested parts (a scatter item's ring offset swung around the
  // hex center by its per-tile rotY).
  let m = mat4Translation(px, py, pz);
  if (placement.tiltAxis && placement.tilt !== undefined) {
    m = mat4Multiply(m, mat4RotationAxisAngle({ x: placement.tiltAxis.x, y: 0, z: placement.tiltAxis.z }, placement.tilt));
  }
  if (placement.rotY) m = mat4Multiply(m, mat4RotationY(placement.rotY));
  return m;
}

/**
 * The rotation-only part of a composed matrix — worldBase × accumulated
 * ancestor frames with the translation zeroed. The editor converts gizmo drag
 * deltas into a node's local frame with the transpose (a rotation's inverse).
 */
function parentRotationMatrix(worldBase, frame) {
  const m = mat4Multiply(worldBase, frame);
  m[12] = 0;
  m[13] = 0;
  m[14] = 0;
  return m;
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
    out.push(recordForPart(descriptor, part, ctx.tile, ctx.worldPos, ctx.tileH, ctx.i, ctx.itemScale, ctx.placement, ctx.disp, ctx.biomeTint));
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

  const biomeFactor = part.biomeScale?.[ctx.tile.biomeId] ?? 1;
  const leaf = nestedLeafFrameMatrix(
    part, descriptor, ctx.tile, ctx.tileH, ctx.i, ctx.itemScale,
    ctx.disp?.scaleMul ?? 1, ctx.placement.scaleMul ?? 1, biomeFactor,
  );
  const matrix = mat4Multiply(ctx.worldBase, mat4Multiply(frame, leaf));
  const record = { partId: part.id, matrix };
  const color = tileColorForPart(part, descriptor, ctx.tileH, ctx.i, ctx.biomeTint);
  if (color !== undefined) record.color = color;
  out.push(record);
  if (nodeFrames) {
    nodeFrames.set(part.id, { origin: mat4TranslationOf(matrix), parentRot: parentRotationMatrix(ctx.worldBase, frame) });
  }
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
 * @returns {object[]} instance records tagged with partId ([] when hidden)
 */
export function recordsForDescriptor(descriptor, tile, worldPos, tileH = tileHash(tile), displacement = {}, biomeTint = null, variantId = null) {
  if (displacement.hidden) return [];
  const count = itemCount(descriptor, tile, tileH);
  if (displacement.displaced && descriptor.emphasis.behavior === 'hidden') return [];

  const variant = variantFor(descriptor, tile, tileH, variantId);
  const parts = (variant ?? descriptor).parts;
  const disp = resolveDisplacement(descriptor, count, tileH, displacement.displaced);

  const records = [];
  for (let i = 0; i < count; i++) {
    const jitter = descriptor.placement.mode === 'scatter' ? scatterJitter(tile, descriptor.placement, tileH, i) : null;
    // Per-item size draw — per-item so cluster members vary (treeVariation's
    // scale uses hash i+3). Item 0 keeps the old item-independent roll, so
    // lone objects are unchanged; members draw the decorrelated itemHash so
    // the every-third-index correlation can't clone member sizes.
    const sizeT = i === 0 ? frac(treeHash(tileH, i + 3)) : itemHash(tileH, i + 3);
    const itemScale = descriptor.scale * lerp(descriptor.size.min, descriptor.size.max, sizeT);
    const placement = itemPlacement(descriptor, i, count, tileH, disp, jitter);
    const ctx = {
      tile, worldPos, tileH, i, itemScale, placement, disp, biomeTint,
      worldBase: worldBaseMatrix(worldPos, placement, disp),
    };
    for (const part of parts) {
      collectPart(descriptor, part, ctx, mat4Identity(), true, records, null);
    }
  }
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
 */
export function nodeWorldFrames(descriptor, tile, worldPos, tileH = tileHash(tile), displacement = {}, biomeTint = null, variantId = null) {
  const frames = new Map();
  if (displacement.hidden) return frames;
  const count = itemCount(descriptor, tile, tileH);
  if (displacement.displaced && descriptor.emphasis.behavior === 'hidden') return frames;

  const variant = variantFor(descriptor, tile, tileH, variantId);
  const parts = (variant ?? descriptor).parts;
  const disp = resolveDisplacement(descriptor, count, tileH, displacement.displaced);

  for (let i = 0; i < count; i++) {
    const jitter = descriptor.placement.mode === 'scatter' ? scatterJitter(tile, descriptor.placement, tileH, i) : null;
    const sizeT = i === 0 ? frac(treeHash(tileH, i + 3)) : itemHash(tileH, i + 3);
    const itemScale = descriptor.scale * lerp(descriptor.size.min, descriptor.size.max, sizeT);
    const placement = itemPlacement(descriptor, i, count, tileH, disp, jitter);
    const ctx = {
      tile, worldPos, tileH, i, itemScale, placement, disp, biomeTint,
      worldBase: worldBaseMatrix(worldPos, placement, disp),
    };
    for (const part of parts) {
      collectPart(descriptor, part, ctx, mat4Identity(), true, [], frames);
    }
  }
  return frames;
}

// ── Entity-driven records ───────────────────────────────────────────────────

/**
 * Per-instance color for an entity part. Precedence:
 *   part.color is a token string → entity.colors[token] (absent → no instance color)
 *   part.color is an integer     → that literal color
 *   part.color is undefined      → entity.color (the entity's default color)
 * Entities are singletons with exact palette colors — no per-tile color jitter.
 */
function entityColorForPart(part, entity) {
  const c = part.color;
  if (typeof c === 'string') return entity.colors?.[c];
  if (c !== undefined) return c;
  return entity.color;
}

/**
 * One instance record for an entity part. Mirrors recordForPart's conventions
 * (scale/lift/localPos scaled by item scale, transforms pass through) but with
 * no tile-hash draws: an entity is a single item at the hex center.
 */
function recordForEntityPart(part, entity, worldPos, itemScale) {
  const t = part.transform;
  // Same bottom-anchored grounding as the tile path (no stretch for entities):
  // the part's lowest vertex lands at worldPos.y + t.y + lift. Tilted parts
  // pivot at that base — `y` becomes the bottom height and the base offset
  // rides inside the rotation as lift (see recordForPart).
  const base = shapeBaseOffset(part.shape, part.params);
  const sy = itemScale * t.scaleY;
  const tilted = t.tiltAxis !== undefined && t.tilt !== undefined && t.tilt !== 0;
  const baseLift = base * sy;
  const record = {
    partId: part.id,
    x: worldPos.x,
    y: tilted ? worldPos.y + t.y : worldPos.y + t.y + baseLift,
    z: worldPos.z,
    scale: itemScale * t.scaleX,
    scaleY: sy,
  };
  if (t.scaleZ !== t.scaleX) record.scaleZ = itemScale * t.scaleZ;

  if (t.rotY) record.rotY = t.rotY;
  if (tilted) record.lift = baseLift + (t.lift ? t.lift * itemScale : 0);
  else if (t.lift) record.lift = t.lift * itemScale;
  if (t.localPos) {
    record.localPos = {
      x: t.localPos.x * itemScale,
      y: t.localPos.y * itemScale,
      z: t.localPos.z * itemScale,
    };
  }
  if (t.localAxis && t.localAngle !== undefined) {
    record.localAxis = t.localAxis;
    record.localAngle = t.localAngle;
  }
  if (t.tiltAxis && t.tilt !== undefined) {
    record.tiltAxis = t.tiltAxis;
    record.tilt = t.tilt;
  }
  const color = entityColorForPart(part, entity);
  if (color !== undefined) record.color = color;

  return record;
}

/**
 * A nested leaf's frame on the entity path — no tile hash draws: scale is
 * itemScale × transform scale only, localPos pre-scaled by itemScale. Same
 * bottom-anchored baking as the tile path (entities have no stretch): the
 * leaf's lowest vertex lands exactly at its localPos point.
 */
function entityLeafFrameMatrix(part, itemScale) {
  const t = part.transform;
  const { x, y, z } = frameLocalPos(t, itemScale, 1);
  const sy = itemScale * t.scaleY;
  const base = shapeBaseOffset(part.shape, part.params);
  let m = mat4Scale(itemScale * t.scaleX, sy, itemScale * t.scaleZ);
  m = mat4Multiply(mat4Translation(0, base * sy, 0), m);
  if (t.localAxis && t.localAngle !== undefined) {
    m = mat4Multiply(mat4RotationAxisAngle(t.localAxis, t.localAngle), m);
  }
  if (t.rotY) m = mat4Multiply(mat4RotationY(t.rotY), m);
  return mat4Multiply(mat4Translation(x, y, z), m);
}

/**
 * Recursively emit records for one node on the entity path (the tile-path
 * collectPart, without a tile hash: no stretch, no scatter, no biome). Root
 * shape leaves go through recordForEntityPart unchanged; groups compose a
 * frame; nested leaves get a baked world `matrix` record.
 */
function collectEntityPart(descriptor, part, entity, worldPos, itemScale, frame, isRoot, out, nodeFrames) {
  const worldBase = mat4Translation(worldPos.x, worldPos.y, worldPos.z);
  if (isGroupNode(part)) {
    const g = groupFrameMatrix(part.transform, itemScale, 1, 1);
    const nextFrame = mat4Multiply(frame, g);
    if (nodeFrames) {
      const { x, y, z } = frameLocalPos(part.transform, itemScale, 1);
      const originM = mat4Multiply(worldBase, mat4Multiply(frame, mat4Translation(x, y, z)));
      nodeFrames.set(part.id, { origin: mat4TranslationOf(originM), parentRot: parentRotationMatrix(worldBase, frame) });
    }
    for (const child of part.children) {
      collectEntityPart(descriptor, child, entity, worldPos, itemScale, nextFrame, false, out, nodeFrames);
    }
    return;
  }

  if (isRoot) {
    out.push(recordForEntityPart(part, entity, worldPos, itemScale));
    if (nodeFrames) {
      const r = out[out.length - 1];
      // Same as the tile path: the origin rides the lift/localPos.y vertical
      // slot so the gizmo sits at the part, not on the ground.
      const ly = (r.localPos?.y ?? 0) + (r.lift ?? 0);
      nodeFrames.set(part.id, { origin: { x: r.x, y: r.y + ly, z: r.z }, parentRot: parentRotationMatrix(worldBase, mat4Identity()) });
    }
    return;
  }

  const matrix = mat4Multiply(worldBase, mat4Multiply(frame, entityLeafFrameMatrix(part, itemScale)));
  const record = { partId: part.id, matrix };
  const color = entityColorForPart(part, entity);
  if (color !== undefined) record.color = color;
  out.push(record);
  if (nodeFrames) {
    nodeFrames.set(part.id, { origin: mat4TranslationOf(matrix), parentRot: parentRotationMatrix(worldBase, frame) });
  }
}

/**
 * Generate instance records for one entity (base / champion / mob / trader)
 * from a (normalized) descriptor — the entity-driven record path.
 *
 * An entity is a single item at the hex center: count is always 1, placement
 * is center, and every decision (variant, color) comes from the entity's state
 * rather than the tile hash. Callers pass world space position; the records
 * flow through the same meshAssembly.buildDescriptorMeshes pipeline as tile
 * records, so entities render as InstancedMeshes grouped per part.
 *
 * @param {object} descriptor - normalized descriptor
 * @param {object} entity     - { faction?, archetype?, scale?, color?, colors? }
 *                              where `colors` maps named-color tokens
 *                              (part.color strings) to color integers
 * @param {object} worldPos   - { x, y, z } hex center in world space (y = tile surface)
 * @param {object} [displacement] - { hidden? } — entities are occupants, not
 *                              displaced decor; only `hidden` applies today
 * @returns {object[]} instance records tagged with partId ([] when hidden)
 */
export function recordsForEntity(descriptor, entity, worldPos, displacement = {}) {
  if (displacement.hidden) return [];
  const variant = variantForEntity(descriptor, entity);
  const parts = (variant ?? descriptor).parts;
  const itemScale = (entity.scale ?? 1) * descriptor.scale;
  const records = [];
  for (const part of parts) {
    collectEntityPart(descriptor, part, entity, worldPos, itemScale, mat4Identity(), true, records, null);
  }
  return records;
}

/**
 * World frames for every node (leaves AND groups) on the entity path — the
 * entity-path counterpart of nodeWorldFrames, for the editor's gizmo.
 */
export function nodeWorldFramesForEntity(descriptor, entity, worldPos, displacement = {}) {
  const frames = new Map();
  if (displacement.hidden) return frames;
  const variant = variantForEntity(descriptor, entity);
  const parts = (variant ?? descriptor).parts;
  const itemScale = (entity.scale ?? 1) * descriptor.scale;
  for (const part of parts) {
    collectEntityPart(descriptor, part, entity, worldPos, itemScale, mat4Identity(), true, [], frames);
  }
  return frames;
}
