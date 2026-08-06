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

// Ring-scatter constants mirror TREE_VARIATION.ringJitter / angleJitter in
// geometryParams.js (0.15 × ring width jitter, ±0.7 rad angular scatter).
const RING_JITTER = 0.15;
const RING_ANGLE_JITTER = 0.7;

/**
 * Deterministic item count.
 *   uniform  — roll in [cluster.min, cluster.max] from the tile hash.
 *              Tile hashes can be negative (hex coords), so the roll is
 *              normalized to a non-negative index.
 *   moisture — the clusterTreeRecords rule: count scales with the tile's
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
 * conical (tall) pines, everything else round.
 *
 * When the rule names an id the descriptor does not define, fall back to the
 * hash roll so a partially-migrated descriptor still renders.
 */
function variantFor(descriptor, tile, tileH) {
  const variants = descriptor.variants;
  if (!variants || variants.length === 0) return null;
  const byId = (id) => variants.find((v) => v.id === id) ?? null;
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
    const id = tile.terrain === 'denseForest' ? 'tall' : 'round';
    return byId(id) ?? variants[((tileH % variants.length) + variants.length) % variants.length];
  }
  const len = variants.length;
  return variants[((tileH % len) + len) % len];
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
 * Stretch multiplier for one axis of a part. The part's own `stretch` override
 * wins; `false` pins the axis at 1 (no stretch); otherwise the object-level
 * `variation.stretchY/XZ` applies with the default hash seeds (4 for Y, 5 for
 * XZ), matching treeVariation() in clusterTreeRecords.js.
 */
function stretchForAxis(part, descriptor, axis, tileH, i) {
  const partStretch = part.stretch?.[axis];
  if (partStretch === false) return 1;
  const v = descriptor.variation;
  if (partStretch) {
    return lerp(partStretch.min, partStretch.max, frac(treeHash(tileH, partStretch.seed ?? (axis === 'y' ? 4 : 5))));
  }
  const pair = axis === 'y' ? v.stretchY : v.stretchXZ;
  return lerp(pair[0], pair[1], frac(treeHash(tileH, axis === 'y' ? 4 : 5)));
}

/**
 * Build one item's instance records for the given part.
 * Local offsets (lift / localPos) are pre-scaled by the item scale so the
 * whole item scales rigidly — the same convention addTreeRecords uses when it
 * bakes the tree scale into the canopy lift.
 */
function recordForPart(descriptor, part, tile, worldPos, tileH, i, itemScale, placement, disp) {
  const t = part.transform;
  const scaleMul = disp?.scaleMul ?? 1;
  const jitterScale = placement.scaleMul ?? 1;

  // Per-part non-uniform scale, then the per-axis stretch (part override or
  // the object's variation ranges), then the scatter size jitter.
  const sx = itemScale * scaleMul * jitterScale * t.scaleXZ * stretchForAxis(part, descriptor, 'xz', tileH, i);
  // Mountain-type height rule: scaleY comes from the tile's mountainType tag
  // (peak/slope/normal) instead of the stretch ranges — the mountainMeshes
  // builder's mountainScale(). Item scale stays 1 on XZ.
  const byType = descriptor.size.byMountainType;
  const bucket = byType?.[tile.mountainType];
  const sy = bucket
    ? itemScale * scaleMul * t.scaleY * lerp(bucket.min, bucket.max, frac(treeHash(tileH, i + 3)))
    : itemScale * scaleMul * jitterScale * t.scaleY * stretchForAxis(part, descriptor, 'y', tileH, i);

  const record = {
    partId: part.id,
    x: worldPos.x + placement.dx,
    y: worldPos.y + t.y + (disp?.yOffset ?? 0),
    z: worldPos.z + placement.dz,
    scale: sx,
    scaleY: sy,
  };

  const rotY = t.rotY + (placement.rotY ?? 0);
  if (rotY) record.rotY = rotY;

  if (t.lift) record.lift = t.lift * itemScale * scaleMul * jitterScale;
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
  } else if (placement.tiltAxis && placement.tilt !== undefined) {
    record.tiltAxis = placement.tiltAxis;
    record.tilt = placement.tilt;
  }
  if (part.color !== undefined) {
    record.color = jitteredColor(part.color, descriptor.variation.colorJitter, tileH, i);
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
 * @returns {object[]} instance records tagged with partId ([] when hidden)
 */
export function recordsForDescriptor(descriptor, tile, worldPos, tileH = tileHash(tile), displacement = {}) {
  if (displacement.hidden) return [];
  const count = itemCount(descriptor, tile, tileH);
  if (displacement.displaced && descriptor.emphasis.behavior === 'hidden') return [];

  const variant = variantFor(descriptor, tile, tileH);
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
      records.push(recordForPart(descriptor, part, tile, worldPos, tileH, i, itemScale, placement, disp));
    }
  }
  return records;
}
