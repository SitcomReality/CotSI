// src/render/overlays/fogDrawing.js
// Low-level canvas 2D drawing helpers for fog mask hex polygons.

/**
 * Draw a single filled white hex polygon onto a 2D context.
 */
export function drawHexPoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}
