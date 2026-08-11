/**
 * canvas.js — Canvas zoom, pan, and drag interaction for the analysis page.
 *
 * Binds mouse events to the map canvas area for panning (click-drag)
 * and zooming (scroll wheel toward cursor).
 */
import { S } from '../state.js';
import { els } from '../domRefs.js';
import { resizeCanvas, render } from '../render/orchestrate.js';
import { screenToWorld } from '../render/camera.js';

/**
 * Set up zoom (wheel) and pan (drag) interaction on the map canvas area.
 * Also handles window resize to keep the canvas fill.
 */
export function setupCanvasInteraction() {
  // ── Zoom ────────────────────────────────────────────────────────────────
  els.mapArea.addEventListener('wheel', (e) => {
    e.preventDefault();
    const { w, h } = resizeCanvas();
    const worldBefore = screenToWorld(S.camera, e.offsetX, e.offsetY, w, h);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    S.camera.zoom = Math.max(0.1, Math.min(10, S.camera.zoom * factor));
    // Zoom toward cursor: hold the world point under the cursor fixed.
    // Camera must move by (worldAfter - worldBefore); the opposite sign
    // pushes the map away from the cursor when zooming.
    const worldAfter = screenToWorld(S.camera, e.offsetX, e.offsetY, w, h);
    S.camera.x += worldAfter.x - worldBefore.x;
    S.camera.y += worldAfter.y - worldBefore.y;
    render();
  }, { passive: false });

  // ── Pan start ───────────────────────────────────────────────────────────
  els.mapArea.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    S.isDragging = true;
    S.dragStart = { x: e.clientX, y: e.clientY };
    S.dragCameraStart = { x: S.camera.x, y: S.camera.y };
    e.preventDefault();
  });

  // ── Pan move ────────────────────────────────────────────────────────────
  window.addEventListener('mousemove', (e) => {
    if (!S.isDragging) return;
    const dx = (e.clientX - S.dragStart.x) / S.camera.zoom;
    const dy = (e.clientY - S.dragStart.y) / S.camera.zoom;
    S.camera.x = S.dragCameraStart.x + dx;
    S.camera.y = S.dragCameraStart.y + dy;
    render();
  });

  // ── Pan end ─────────────────────────────────────────────────────────────
  window.addEventListener('mouseup', () => {
    S.isDragging = false;
  });

  // ── Window resize ───────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    render();
  });
}
