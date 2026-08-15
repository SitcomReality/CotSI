/**
 * itemPlacement.js — Per-item placement inside the hex.
 *
 * The item-level layout math for a tile-driven descriptor: displacement
 * (emphasis behavior), scatter/ring/jitter placement, and the minimum-distance
 * cluster spread. All decisions derive from the tile hash (tileHash.js) so the
 * same tile always produces the same placements. Pure — no THREE.
 */
import { frac, treeHash, itemHash, lerp, clamp01 } from '../tileHash.js';
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
} from '../../../../params/render/geometryParams.js';

// Ring-scatter constants: 0.15 × ring width jitter, ±0.7 rad angular scatter.
const RING_JITTER = 0.15;
const RING_ANGLE_JITTER = 0.7;

/**
 * Dispersal/sinking result for the whole item set, or null when the items
 * stay in place. Ring dispersal returns per-item offsets indexed by item.
 */
export function resolveDisplacement(descriptor, count, tileH, displaced) {
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
 * exactly like the per-kind builders apply it). `placement` is the item's
 * effective placement — the decor-level placement merged with a per-motif
 * override (absent fields inherit; tileRecords passes the merge).
 *
 * @returns {object} { dx, dz, rotY, scaleMul?, tiltAxis?, tilt? }
 */
function itemPlacement(placement, i, count, tileH, disp, jitter) {
  // Dispersed single item — the shared corner anchor overrides the position,
  // but displaced simple features kept BOTH their scatter rotation and their
  // per-tile size jitter (simpleFeatureMeshes.js multiplied DISPERSED_SCALE
  // onto the already-jittered scale). Jitter-mode solitary trees reset to 0
  // and center objects have no rotation or size jitter.
  if (disp && disp.dx !== undefined) {
    const tilt = placementTilt(placement, disp.dx, disp.dz, tileH, i);
    const scatter = placement.mode === 'scatter';
    const rotY = scatter ? jitter.rotY : 0;
    return {
      dx: disp.dx, dz: disp.dz, rotY,
      ...(scatter ? { scaleMul: jitter.scaleMul } : {}),
      ...(tilt ?? {}),
    };
  }
  if (disp && disp.ring) {
    const { dx, dz } = disp.ring[i];
    const tilt = placementTilt(placement, dx, dz, tileH, i);
    // Dispersed groves kept each tree's ring rotation (treeVariation rotY).
    const rotY = frac(treeHash(tileH, i + 7)) * Math.PI * 2;
    return { dx, dz, rotY, ...(tilt ?? {}) };
  }
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
 * Deterministic minimum-distance relaxation for a cluster: every pair closer
 * than `separation` world units is pushed apart symmetrically along the pair
 * axis, repeated until no pair moves (hard-capped — cluster counts are small).
 * The scheme converges asymptotically, so after the cap pairs can sit a tiny
 * fraction short of the target — well under a thousandth of a world unit (the
 * hex is 1.0), invisible in play. Positions derive only from the tile-hash
 * draws, so the result is stable across rebuilds. Separation 0 (or a lone
 * item) is a no-op, so existing descriptors keep their exact layout.
 */
function spreadCluster(placements, separation, maxPasses = 6) {
  const minSq = separation * separation;
  for (let pass = 0; pass < maxPasses; pass++) {
    let moved = false;
    for (let i = 0; i < placements.length; i++) {
      const a = placements[i];
      for (let j = i + 1; j < placements.length; j++) {
        const b = placements[j];
        const dx = b.dx - a.dx;
        const dz = b.dz - a.dz;
        const distSq = dx * dx + dz * dz;
        if (distSq >= minSq) continue;
        if (distSq === 0) {
          // Coincident draws (rare): separate along +x; later passes unwind
          // any pile-up the fixed direction leaves behind.
          const push = separation / 2;
          a.dx -= push;
          b.dx += push;
        } else {
          const dist = Math.sqrt(distSq);
          const push = (separation - dist) / 2;
          const ux = dx / dist;
          const uz = dz / dist;
          a.dx -= ux * push; a.dz -= uz * push;
          b.dx += ux * push; b.dz += uz * push;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
}

/**
 * The item placements for a cluster, in item order. When the descriptor's
 * `placement.separation` is set (> 0) and the cluster has more than one item,
 * members are pushed apart so no two sit closer than `separation` world units
 * — the spread the offset radii can't give (they move items away from the hex
 * center, not away from each other). Displaced clusters (dispersal ring /
 * corner anchor) keep their authored emphasis layout, which is already spread.
 *
 * `placementFor` optionally supplies a per-item placement OVERRIDE (a motif's
 * own `placement` — decorComposition.md §2.1); each item's effective placement
 * is the decor-level placement merged over it, so absent fields inherit.
 */
export function clusterPlacements(descriptor, tile, count, tileH, disp, placementFor = null) {
  const placements = [];
  for (let i = 0; i < count; i++) {
    const merged = placementFor ? { ...descriptor.placement, ...(placementFor(i) ?? {}) } : descriptor.placement;
    const jitter = merged.mode === 'scatter' ? scatterJitter(tile, merged, tileH, i) : null;
    placements.push(itemPlacement(merged, i, count, tileH, disp, jitter));
  }
  const separation = descriptor.placement.separation ?? 0;
  if (separation > 0 && count > 1 && !disp) spreadCluster(placements, separation);
  return placements;
}
