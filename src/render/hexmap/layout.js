// Layout: project tiles to screen, compute viewport, sort for depth, fog polys

import { coordKey } from '../../world/map.js';
import { HEX_WIDTH, HEX_HEIGHT, HEX_SIZE } from './constants.js';
import { hexPoints } from './geometry.js';
import { FOG_FILL, FOG_OPACITY } from './theme.js';

/** Project a tile to pixel coordinates (before camera transform) */
export function projectTile(tile) {
  const x = HEX_WIDTH * (tile.q + tile.r / 2);
  const y = HEX_HEIGHT * tile.r;
  return { tile, x, y, q: tile.q, r: tile.r, key: coordKey(tile) };
}

/** Sort projected tiles for depth rendering: southern hexes on top */
export function sortByDepth(projected) {
  projected.sort((a, b) => (a.r - b.r) || (a.q - b.q));
}

/** Compute viewport dimensions and offsets from a set of projected tiles */
export function computeViewport(projected, margin = 80) {
  const xs = projected.map(p => p.x);
  const ys = projected.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    width:  maxX - minX + margin * 2,
    height: maxY - minY + margin * 2,
    offsetX: -minX + margin,
    offsetY: -minY + margin,
    margin,
  };
}

/** Generate fog-of-war overlay polygons for explored-but-not-visible hexes */
export function fogOverlays(projected, humanView, offsetX, offsetY) {
  const polys = [];
  for (const p of projected) {
    const key = p.key;
    if (humanView.explored.has(key) && !humanView.visible.has(key)) {
      const cx = p.x + offsetX;
      const cy = p.y + offsetY;
      polys.push(
        `<polygon points="${hexPoints(cx, cy)}" fill="${FOG_FILL}" opacity="${FOG_OPACITY}" class="fog-layer" data-key="${key}"/>`
      );
    }
  }
  return polys;
}