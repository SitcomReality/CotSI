/**
 * hexMath.js — Hex geometry math for the analysis page renderer.
 *
 * Flat-top hex layout (matching the in-game view): axial coordinates to
 * pixel positions, and hex path drawing.
 *
 * The in-game world uses pointy-top hexes in world space, but the camera
 * yaw (CAMERA_YAW = π/6) rotates the view, so the map and minimap on screen
 * show flat-top hexes (flat top/bottom edges, pointy left/right sides).
 * The flat-top layout below is the pointy-top layout rotated by that same
 * 30°, so the analysis map matches the in-game presentation.
 */

export const SQRT3 = Math.sqrt(3);
export const HEX_SIZE = 8; // base hex size in pixels (before zoom)

/**
 * Convert axial hex coords to pixel position (flat-top layout).
 */
export function hexToPixel(q, r, size) {
  return {
    x: size * (3 / 2 * q),
    y: size * (SQRT3 * (r + q / 2)),
  };
}

/**
 * Draw a single hexagon path on the context.
 * Corners at 0°/60°/... so vertices face left/right (flat-top).
 * Caller is responsible for fill() / stroke().
 */
export function drawHexPath(ctx, cx, cy, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
