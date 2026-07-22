// src/render/overlays/fogProjection.js
// Projects world-space hex corners to screen coordinates and culls hexes
// that are behind the camera or off-screen.

import { worldToScreen } from './screenProjection.js';

/**
 * Project a world-space corner array to screen points, filtering out nulls
 * (points behind the camera). Returns null if the polygon would be degenerate.
 */
export function projectCorners(corners, camera, canvas) {
  const pts = [];
  for (const c of corners) {
    const sp = worldToScreen(c.x, c.y, c.z, camera, canvas);
    if (!sp) return null; // any point behind camera → skip whole hex
    pts.push(sp);
  }
  return pts.length >= 3 ? pts : null;
}

/**
 * Quick axis-aligned bounding-box test: returns true if all points are
 * outside the canvas CSS-pixel rect (far off-screen).
 * Canvas width/height are in physical pixels, so we divide by dpr to get
 * CSS-pixel bounds for comparison against screen coords from worldToScreen.
 */
export function isOffScreen(pts, cssW, cssH) {
  // Use generous margin so that hexes just outside the viewport are still
  // drawn (avoids pop-in during panning). Blur will bleed anyway.
  const margin = 100;
  let allLeft = true, allRight = true, allTop = true, allBottom = true;
  for (const p of pts) {
    if (p.x > -margin) allLeft = false;
    if (p.x < cssW + margin) allRight = false;
    if (p.y > -margin) allTop = false;
    if (p.y < cssH + margin) allBottom = false;
    if (!allLeft && !allRight && !allTop && !allBottom) return false;
  }
  return true;
}
