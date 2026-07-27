/**
 * hexMath.js — Hex geometry math for the analysis page renderer.
 *
 * Pointy-top hex layout: axial coordinates to pixel positions,
 * and hex path drawing.
 */

export const SQRT3 = Math.sqrt(3);
export const HEX_SIZE = 8; // base hex size in pixels (before zoom)

/**
 * Convert axial hex coords to pixel position (pointy-top layout).
 */
export function hexToPixel(q, r, size) {
  return {
    x: size * (SQRT3 * q + SQRT3 / 2 * r),
    y: size * (3 / 2 * r),
  };
}

/**
 * Draw a single hexagon path on the context.
 * Caller is responsible for fill() / stroke().
 */
export function drawHexPath(ctx, cx, cy, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
