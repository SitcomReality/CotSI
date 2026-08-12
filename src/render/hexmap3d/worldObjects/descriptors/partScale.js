/**
 * partScale.js — Per-part non-uniform scale math for the record builders.
 *
 * `leafScaleXYZ` is the shared per-part X/Y/Z scale (item scale × dispersal ×
 * scatter jitter × transform scale × per-axis stretch × biome factor) used by
 * both the root-leaf record path and the nested-frame matrix path; the
 * mountain-type height rule lives here too. `stretchForAxis` draws one axis's
 * stretch from the part's override or the object's variation ranges. Pure —
 * no THREE.
 */
import { frac, treeHash, lerp } from '../tileHash.js';

/**
 * Stretch multiplier for one axis of a part. The part's own `stretch` override
 * wins; `false` pins the axis at 1 (no stretch); otherwise the object-level
 * `variation.stretchX/Y/Z` applies. Default hash seeds: 4 for Y, 5 for X and Z
 * — X and Z share the legacy stretchXZ seed, so split-axis descriptors draw
 * the same XZ value the old combined axis did; decorrelate with per-part seeds.
 */
const STRETCH_SEEDS = Object.freeze({ x: 5, y: 4, z: 5 });

/** Default seed for a part's `liftRange` draw — the legacy trunk-stretch seed. */
export const LIFT_RANGE_SEED = 6;

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
export const isGroupNode = (part) => Array.isArray(part.children);

/**
 * Per-part non-uniform scale (X/Y/Z) — item scale × dispersal × scatter
 * jitter × transform scale × per-axis stretch (part override or the object's
 * variation ranges) × biome factor. Shared by the root-leaf record path and
 * the nested-frame matrix path so a part renders identically at any depth.
 * X and Z are independent; Y follows the mountain-type rule when the
 * descriptor sizes by mountainType.
 */
export function leafScaleXYZ(descriptor, part, tile, tileH, i, itemScale, scaleMul, jitterScale, biomeFactor) {
  const t = part.transform;
  const sx = itemScale * scaleMul * jitterScale * t.scaleX * stretchForAxis(part, descriptor, 'x', tileH, i) * biomeFactor;
  const sz = itemScale * scaleMul * jitterScale * t.scaleZ * stretchForAxis(part, descriptor, 'z', tileH, i) * biomeFactor;
  // Mountain-type height rule: scaleY comes from the tile's mountainType tag
  // (peak/slope/normal) instead of the stretch ranges — the mountainMeshes
  // builder's mountainScale(). Item scale stays 1 on XZ.
  const byType = descriptor.size.byMountainType;
  // 'isolated' and untagged mountain tiles draw the normal (medium) bucket —
  // the legacy mountainScale() default — so isolated peaks keep per-tile
  // height jitter instead of a fixed scaleY of 1.
  const bucket = byType?.[tile.mountainType] ?? byType?.normal;
  const sy = bucket
    ? itemScale * scaleMul * t.scaleY * lerp(bucket.min, bucket.max, frac(treeHash(tileH, i + 3))) * biomeFactor
    : itemScale * scaleMul * jitterScale * t.scaleY * stretchForAxis(part, descriptor, 'y', tileH, i) * biomeFactor;
  return { sx, sy, sz };
}
