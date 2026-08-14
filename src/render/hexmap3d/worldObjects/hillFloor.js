/**
 * hillFloor.js — Floor height for objects standing on hill terrain.
 *
 * A hill tile's mound (descriptors/data/hill.js) is a partial sphere whose rim
 * the record grounds at the tile surface; its peak sits at
 * radius·(1 − cos(thetaLength))·scaleY above the surface. Objects (champions,
 * bases, features) stand on that peak, so this module resolves the per-tile
 * "floor" Y — the peak height — reusing the descriptor record so the value
 * always matches the rendered mound (including its per-tile stretch hash).
 *
 * Pure read — no state, no mutation. Lives in render/ because it depends on
 * the descriptor pipeline.
 */
import { tileSurfaceY } from '../terrain/index.js';
import { normalizeDescriptor } from './descriptors/schema.js';
import { recordsForDescriptor } from './descriptors/recordBuilder.js';
import { HILL_DESCRIPTOR } from './descriptors/data/hill.js';

const normalizedHill = normalizeDescriptor(HILL_DESCRIPTOR);
const moundPart = HILL_DESCRIPTOR.parts[0];
// Peak height above the grounded rim, in radius units: the band spans
// theta ∈ [0, thetaLength], so its top is radius above and its rim is
// radius·cos(thetaLength) above the sphere center.
const PEAK_FRACTION = 1 - Math.cos(moundPart.params.thetaLength ?? 1.4);

/** The hill mound's peak height above the tile surface, or 0 off-hill. */
export function hillPeakHeight(tile) {
  if (!tile || tile.terrain !== 'hill') return 0;
  const records = recordsForDescriptor(normalizedHill, tile, { x: 0, y: 0, z: 0 });
  const mound = records.find((r) => r.partId === moundPart.id);
  if (!mound) return 0;
  return moundPart.params.radius * PEAK_FRACTION * mound.scaleY;
}

/** The Y an object's base should sit at on this tile (peak on hills, else surface). */
export function hillFloorY(tile) {
  return tileSurfaceY(tile) + hillPeakHeight(tile);
}
