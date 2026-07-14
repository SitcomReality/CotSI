import { pickHex } from './picking.js';
import { panCamera, zoomCamera } from './camera3d.js';

// Tooltip DOM element (reused, shared singleton)
let tooltipEl = null;

function getTooltipEl() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'hexTooltip3d';
    tooltipEl.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 1000;
      background: rgba(0,0,0,0.75);
      color: #f0e0c0;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.4;
      display: none;
      white-space: nowrap;
    `;
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function showTooltip(x, y, html) {
  const el = getTooltipEl();
  el.innerHTML = html;
  el.style.display = 'block';
  // Offset so cursor isn't covering text
  el.style.left = (x + 12) + 'px';
  el.style.top  = (y + 12) + 'px';
}

function hideTooltip() {
  const el = getTooltipEl();
  el.style.display = 'none';
}

/**
 * Wire up 3D canvas events for:
 * - Pan (shift + drag)
 * - Zoom (wheel + pinch)
 * - Hex hover (tooltip)
 * - Hex click (move)
 *
 * Returns a cleanup function.
 */
export function setupMapInteraction3D(
  canvas,
  applyCamera,
  getCameraState,
  getTerrainMesh,
  onHexClick,
  getTooltipContent
) {
  if (!canvas) return () => {};

  // ─── State ───────────────────────────────────────
  let isPanning = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let hoveredKey = null;
  let lastTouchDist = 0;

  // ─── Pan handlers (shift + drag) ────────────────
  function onPointerDown(e) {
    if (e.shiftKey || e.button === 1) { // shift+click or middle button
      isPanning = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      e.preventDefault();
      canvas.style.cursor = 'grabbing';
    }
  }

  function onPointerMove(e) {
    const state = getCameraState();
    if (!state) return;

    if (isPanning) {
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;

      // Scale delta by frustum size to get world units
      const worldPerPixel = state.frustumSize / canvas.clientHeight;
      panCamera(state, -dx * worldPerPixel, dy * worldPerPixel);
      applyCamera();
      hideTooltip();
      hoveredKey = null;
      return;
    }

    // ── Hover tooltip ──
    if (getTerrainMesh && getTooltipContent) {
      const terrain = getTerrainMesh();
      const camera = canvas.__camera;
      const key = terrain && camera ? pickHex(e.clientX, e.clientY, camera, terrain, canvas) : null;
      if (key !== hoveredKey) {
        hoveredKey = key;
        if (key !== null) {
          const html = getTooltipContent(key);
          if (html) {
            showTooltip(e.clientX, e.clientY, html);
          } else {
            hideTooltip();
          }
        } else {
          hideTooltip();
        }
      } else if (key !== null && hoveredKey === key) {
        // Update tooltip position as mouse moves over same hex
        const html = getTooltipContent(key);
        if (html) showTooltip(e.clientX, e.clientY, html);
      }
    }
  }

  function onPointerUp(e) {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = '';
      e.preventDefault();
    }
  }

  // ─── Zoom (wheel) ───────────────────────────────
  function onWheel(e) {
    e.preventDefault();
    const state = getCameraState();
    if (!state) return;
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    zoomCamera(state, factor);
    applyCamera();
  }

  // ─── Touch support (pinch zoom + drag pan) ──────
  let touchStartDist = 0;
  let touchStartCenter = null;

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      // Single touch = potential pan; record start
      lastPointerX = e.touches[0].clientX;
      lastPointerY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      // Two touches = pinch zoom or two-finger pan
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      touchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      touchStartCenter = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };
      lastTouchDist = touchStartDist;
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    const state = getCameraState();
    if (!state) return;

    if (e.touches.length === 1 && !isPanning) {
      // Single finger pan
      const dx = e.touches[0].clientX - lastPointerX;
      const dy = e.touches[0].clientY - lastPointerY;
      lastPointerX = e.touches[0].clientX;
      lastPointerY = e.touches[0].clientY;
      const worldPerPixel = state.frustumSize / canvas.clientHeight;
      panCamera(state, -dx * worldPerPixel, dy * worldPerPixel);
      applyCamera();
    } else if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);

      // Pinch zoom
      if (lastTouchDist > 0) {
        const factor = dist / lastTouchDist;
        zoomCamera(state, 1 / factor);
        applyCamera();
      }
      lastTouchDist = dist;

      // Two-finger pan
      if (touchStartCenter) {
        const cx = (t0.clientX + t1.clientX) / 2;
        const cy = (t0.clientY + t1.clientY) / 2;
        const dx = cx - touchStartCenter.x;
        const dy = cy - touchStartCenter.y;
        touchStartCenter.x = cx;
        touchStartCenter.y = cy;
        const worldPerPixel = state.frustumSize / canvas.clientHeight;
        panCamera(state, -dx * worldPerPixel, dy * worldPerPixel);
        applyCamera();
      }
    }
  }

  function onTouchEnd(e) {
    if (e.touches.length < 2) {
      lastTouchDist = 0;
      touchStartCenter = null;
    }
  }

  // ─── Click handler ───────────────────────────────
  function onClick(e) {
    if (isPanning) return; // was a pan, ignore click
    if (!getTerrainMesh || !onHexClick) return;
    const terrain = getTerrainMesh();
    const camera = canvas.__camera;
    const key = terrain && camera ? pickHex(e.clientX, e.clientY, camera, terrain, canvas) : null;
    if (key !== null) {
      onHexClick(key);
    }
  }

  // ─── Register events ─────────────────────────────
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('click', onClick);

  // ─── Return cleanup ──────────────────────────────
  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointerleave', onPointerUp);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas.removeEventListener('click', onClick);
    hideTooltip();
  };
}