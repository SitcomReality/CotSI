/**
 * partColor.js — Instance colors for record parts.
 *
 * Tile path: brightness jitter from the object's `colorJitter`, then the
 * per-part biome tint (`tileColorForPart`). Entity path: token/entity palette
 * resolution (`entityColorForPart`). Pure — no THREE.
 */
import { frac, treeHash } from '../tileHash.js';

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
 * The instance color for a tile-path part: brightness jitter from the object's
 * colorJitter, then the per-part biome tint. String `color` values are named
 * tokens for the entity record path (recordsForEntity) — the tile path has no
 * entity to resolve them, so they are skipped here rather than fed into the
 * color-jitter bit math. `biomeTint` is null when the tile has no tint
 * (biomeTint.js returns null for Untouched/Painforest tiles and for tiles with
 * no known biome colors), which keeps the default color.
 */
export function tileColorForPart(part, descriptor, tileH, i, biomeTint, canonical = false) {
  if (part.color === undefined || typeof part.color === 'string') return undefined;
  if (canonical) return part.color;
  let color = jitteredColor(part.color, descriptor.variation.colorJitter, tileH, i);
  if (part.biomeColor && biomeTint) {
    const influence = Math.min(1, Math.max(0, part.biomeColor.influence ?? 0));
    const tint = biomeTint[part.biomeColor.source];
    if (influence > 0 && tint) color = mixTowardColor(color, tint, influence);
  }
  return color;
}

/**
 * Per-instance color for an entity part. Precedence:
 *   part.color is a token string → entity.colors[token] (absent → no instance color)
 *   part.color is an integer     → that literal color
 *   part.color is undefined      → entity.color (the entity's default color)
 * Entities are singletons with exact palette colors — no per-tile color jitter.
 */
export function entityColorForPart(part, entity) {
  const c = part.color;
  if (typeof c === 'string') return entity.colors?.[c];
  if (c !== undefined) return c;
  return entity.color;
}
