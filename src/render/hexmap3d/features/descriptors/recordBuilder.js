/**
 * recordBuilder.js — Pure record generation from a descriptor.
 *
 * Turns a descriptor (see schema.js) + one tile into instance records —
 * the same record format the mesh builders write (see meshBuilder.js), tagged
 * with `partId` so the assembler can group them by part geometry.
 *
 * Determinism: every decision is derived from the tile hash (treeHash.js), so
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
 * in schema.js, scaled by the record's Y scale) into `y`, so a part's lowest
 * vertex always lands at worldPos.y + transform.y + lift (+ localPos.y) — the
 * bottom-anchored convention where y = 0 / lift = 0 sits flush on the surface.
 * Stretch and scaleY therefore grow a part upward from its base, never below
 * it. Both the tile path and the entity path apply the same rule.
 */
import { tileHash, treeHash, frac, lerp, clamp01 } from '../trees/treeHash.js';
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
 * variantRule 'solitary' — replicate treeVariant() (treeVariants.js): canopy
 * shape by terrain + coord hash, matching lone trees on open ground.
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
 *   variantRule 'archetype'  — variant id === entity.archetype (e.g. 'bear')
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
 * Legacy simple-feature scatter jitter — replicates jitterForTile() in
 * simpleFeatureMeshes.js verbatim, including the negative-hash `%` behavior,
 * so migrated feature descriptors land on exactly the same offsets and sizes
 * as the hard-coded builder. Computed once per tile (the game does not vary it
 * per item) and reused for every item in the cluster.
 */
function scatterJitter(tile) {
  const hash = ((tile.q * SCATTER_HASH_SEEDS[0] + tile.r * SCATTER_HASH_SEEDS[1]) * SCATTER_HASH_SEEDS[2]) % SCATTER_HASH_SEEDS[3];
  const angle = (hash * SCATTER_ANGLE_STEP) % (Math.PI * 2);
  const dist = SCATTER_OFFSET_MIN + (hash % SCATTER_OFFSET_RANGE[0]) / SCATTER_OFFSET_RANGE[1];
  return {
    dx: Math.cos(angle) * dist,
    dz: Math.sin(angle) * dist,
    rotY: (hash * SCATTER_ROTATION_SEED) % (Math.PI * 2),
    scaleMul: SCATTER_SCALE_BASE + (hash % SCATTER_SCALE_RANGE[0]) / SCATTER_SCALE_RANGE[1],
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
    const dir = frac(treeHash(tileH, placement.tiltSeed + i)) * Math.PI * 2;
    return {
      tiltAxis: { x: Math.sin(dir), z: -Math.cos(dir) },
      tilt: lerp(placement.tiltMin, placement.tiltMax, frac(treeHash(tileH, placement.tiltSeed + 1 + i))),
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
    const angle = frac(tileH) * Math.PI * 2;
    const dx = Math.cos(angle) * placement.offset;
    const dz = Math.sin(angle) * placement.offset;
    return {
      dx, dz,
      rotY: angle,
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

/**
 * Build one item's instance records for the given part.
 * Local offsets (lift / localPos) are pre-scaled by the item scale so the
 * whole item scales rigidly — the same convention addTreeRecords uses when it
 * bakes the tree scale into the canopy lift.
 */
function recordForPart(descriptor, part, tile, worldPos, tileH, i, itemScale, placement, disp, biomeTint) {
  const t = part.transform;
  const scaleMul = disp?.scaleMul ?? 1;
  const jitterScale = placement.scaleMul ?? 1;
  // Per-biome size factor — stunts (or grows) the part on tiles of specific
  // biomes (part.biomeScale[biomeId], e.g. Tundra's stunted trees).
  const biomeFactor = part.biomeScale?.[tile.biomeId] ?? 1;

  // Per-part non-uniform scale, then the per-axis stretch (part override or
  // the object's variation ranges), then the scatter size jitter. X and Z are
  // independent; symmetric parts emit no scaleZ (meshBuilder falls back to
  // `scale`), so existing records are unchanged.
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

  // Bottom-anchored grounding: bake the shape's base offset (scaled by the
  // record's Y scale) into the pivot, so the part's lowest vertex lands at
  // worldPos.y + t.y + lift regardless of scaleY/stretch — y = 0 / lift = 0
  // sits flush on the surface, and stretch grows the part upward from there.
  const base = shapeBaseOffset(part.shape, part.params);
  const record = {
    partId: part.id,
    x: worldPos.x + placement.dx,
    y: worldPos.y + t.y + base * sy + (disp?.yOffset ?? 0),
    z: worldPos.z + placement.dz,
    scale: sx,
    scaleY: sy,
  };
  if (sz !== sx) record.scaleZ = sz;

  const rotY = t.rotY + (placement.rotY ?? 0);
  if (rotY) record.rotY = rotY;

  if (t.lift) record.lift = t.lift * itemScale * scaleMul * jitterScale * biomeFactor;
  if (t.localPos) {
    record.localPos = {
      x: t.localPos.x * itemScale * biomeFactor,
      y: t.localPos.y * itemScale * biomeFactor,
      z: t.localPos.z * itemScale * biomeFactor,
    };
  }
  if (t.localAxis && t.localAngle !== undefined) {
    record.localAxis = t.localAxis;
    record.localAngle = t.localAngle;
  }
  if (t.tiltAxis && t.tilt !== undefined) {
    record.tiltAxis = t.tiltAxis;
    record.tilt = t.tilt;
  } else if (placement.tiltAxis && placement.tilt !== undefined) {
    record.tiltAxis = placement.tiltAxis;
    record.tilt = placement.tilt;
  }
  if (part.color !== undefined && typeof part.color !== 'string') {
    record.color = jitteredColor(part.color, descriptor.variation.colorJitter, tileH, i);
  }
  // String `color` values are named tokens for the entity record path
  // (recordsForEntity) — the tile path has no entity to resolve them, so they
  // are skipped here rather than fed into the color-jitter bit math.

  // Per-part biome tint: pull the (already jittered) default toward the tile's
  // blended biome color by `biomeColor.influence` (0 = default, 1 = full tint).
  // `biomeTint` is null when the tile has no tint (biomeTint.js returns null
  // for Untouched/Painforest tiles and for tiles with no known biome colors),
  // which keeps the default color.
  if (part.biomeColor && biomeTint && record.color !== undefined) {
    const influence = Math.min(1, Math.max(0, part.biomeColor.influence ?? 0));
    const tint = biomeTint[part.biomeColor.source];
    if (influence > 0 && tint) {
      record.color = mixTowardColor(record.color, tint, influence);
    }
  }

  return record;
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
  const jitter = descriptor.placement.mode === 'scatter' ? scatterJitter(tile) : null;
  const disp = resolveDisplacement(descriptor, count, tileH, displacement.displaced);

  const records = [];
  for (let i = 0; i < count; i++) {
    // Per-item size draw — per-item so cluster members vary (treeVariation's
    // scale uses hash i+3). For a single item (i=0) this is the same draw as
    // the old item-independent roll, so lone objects are unchanged.
    const itemScale = descriptor.scale * lerp(descriptor.size.min, descriptor.size.max, frac(treeHash(tileH, i + 3)));
    const placement = itemPlacement(descriptor, i, count, tileH, disp, jitter);
    for (const part of parts) {
      records.push(recordForPart(descriptor, part, tile, worldPos, tileH, i, itemScale, placement, disp, biomeTint));
    }
  }
  return records;
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
  // the part's lowest vertex lands at worldPos.y + t.y + lift.
  const base = shapeBaseOffset(part.shape, part.params);
  const record = {
    partId: part.id,
    x: worldPos.x,
    y: worldPos.y + t.y + base * (itemScale * t.scaleY),
    z: worldPos.z,
    scale: itemScale * t.scaleX,
    scaleY: itemScale * t.scaleY,
  };
  if (t.scaleZ !== t.scaleX) record.scaleZ = itemScale * t.scaleZ;

  if (t.rotY) record.rotY = t.rotY;
  if (t.lift) record.lift = t.lift * itemScale;
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
  return parts.map((part) => recordForEntityPart(part, entity, worldPos, itemScale));
}
