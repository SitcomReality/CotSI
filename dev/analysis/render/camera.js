/**
 * camera.js — Camera model for the analysis page hex map.
 *
 * Provides zoom, pan, and coordinate transforms between
 * screen space and world space.
 */
import { hexToPixel, SQRT3, HEX_SIZE } from './hexMath.js';

export function createCamera() {
  return { x: 0, y: 0, zoom: 1 };
}

export function screenToWorld(camera, sx, sy, canvasWidth, canvasHeight) {
  return {
    x: (sx - canvasWidth / 2) / camera.zoom - camera.x,
    y: (sy - canvasHeight / 2) / camera.zoom - camera.y,
  };
}

export function worldToScreen(camera, wx, wy, canvasWidth, canvasHeight) {
  return {
    x: (wx + camera.x) * camera.zoom + canvasWidth / 2,
    y: (wy + camera.y) * camera.zoom + canvasHeight / 2,
  };
}

/**
 * Fit the camera to show all hexes within the given radius,
 * centered at origin, with a small padding.
 */
export function fitCameraToRadius(camera, radius, canvasWidth, canvasHeight) {
  const corner = hexToPixel(radius, radius, HEX_SIZE);
  const mapWidth = Math.abs(corner.x) * 2 + HEX_SIZE * SQRT3;
  const mapHeight = Math.abs(corner.y) * 2 + HEX_SIZE * 1.5;

  const pad = 24;
  const availW = canvasWidth - pad * 2;
  const availH = canvasHeight - pad * 2;

  const zoomX = availW / mapWidth;
  const zoomY = availH / mapHeight;
  camera.zoom = Math.min(zoomX, zoomY, 4); // cap zoom at 4x
  camera.x = 0;
  camera.y = 0;
}
