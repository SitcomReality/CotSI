import { hexKeyAtPosition3D } from './picking.js';
import { applyCameraState, panCamera, zoomCamera } from './camera3d.js';
import { createTooltip } from '../hexmap/map-tooltip.js'; // reuse existing tooltip DOM

/**
 * Attach pan/zoom/click/hover listeners to the canvas.
 * Replaces SVG-based setupMapInteraction from the old system.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Function} applyCamera - fn() to sync camera state → Three.js camera
 * @param {Function} getCameraState - fn() → camera state object
 * @param {Function} getTerrainMesh - fn() → current terrain THREE.Mesh (may be replaced)
 * @param {Function} onTileClick - callback(hexKey)
 * @param {Function} getTooltipContent - callback(hexKey) → HTML string
 * @returns {Function} cleanup
 */
export function setupMapInteraction3D(
  canvas, applyCamera, getCameraState, getTerrainMesh,
  onTileClick, getTooltipContent
) {
  let isPanning = false;
  let panStartX = 0, panStartY = 0;
  let panStartTargetX = 0, panStartTargetZ = 0;

  const tooltip = createTooltip(getTooltipContent);

  // --- Pan: mouse drag (left button + shift, or middle button) ---
  function onMouseDown(e) {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      const state = getCameraState();
      panStartTargetX = state.targetX;
      panStartTargetZ = state.targetZ;
      canvas.style.cursor = 'grabbing';
    }
  }

  function onMouseMove(e) {
    if (isPanning) {
      const state = getCameraState();
      // Convert pixel delta to world-space delta (approximate)
      const scale = state.frustumSize / canvas.clientHeight;
      const dx = -(e.clientX - panStartX) * scale;
      const dz = -(e.clientY - panStartY) * scale;
      state.targetX = panStartTargetX + dx;
      state.targetZ = panStartTargetZ + dz;
      applyCamera();
      return;
    }

    // Hover: show tooltip
    const terrain = getTerrainMesh();
    if (!terrain) return;
    const key = hexKeyAtPosition3D(
      e.clientX, e.clientY, canvas,
      canvas.__camera, terrain
    );
    tooltip.show(e.clientX, e.clientY, key);
  }

  function onMouseUp(e) {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = '';
    }
  }

  function onMouseLeave() {
    tooltip.hide();
  }

  // --- Click ---
  function onClick(e) {
    if (isPanning) return;
    if (e.button !== 0) return;
    if (e.shiftKey) return;

    const terrain = getTerrainMesh();
    if (!terrain) return;
    const key = hexKeyAtPosition3D(
      e.clientX, e.clientY, canvas,
      canvas.__camera, terrain
    );
    if (onTileClick) onTileClick(key);
  }

  // --- Scroll zoom ---
  function onWheel(e) {
    e.preventDefault();
    const state = getCameraState();
    const factor = e.deltaY > 0 ? 1.15 : 0.87;
    zoomCamera(state, factor);
    applyCamera();
  }

  // --- Touch support ---
  let lastTouchDist = 0;
  let lastTouchCenter = { x: 0, y: 0 };
  let touchPanStartTargetX = 0, touchPanStartTargetZ = 0;

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      panStartX = touch.clientX;
      panStartY = touch.clientY;
      const state = getCameraState();
      touchPanStartTargetX = state.targetX;
      touchPanStartTargetZ = state.targetZ;
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1];
      lastTouchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      lastTouchCenter = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
    }
  }

  function onTouchMove(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - panStartX;
      const dy = touch.clientY - panStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        isPanning = true;
        const state = getCameraState();
        const scale = state.frustumSize / canvas.clientHeight;
        state.targetX = touchPanStartTargetX - dx * scale;
        state.targetZ = touchPanStartTargetZ - dy * scale;
        applyCamera();
      }
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0], t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (lastTouchDist > 0) {
        const state = getCameraState();
        const factor = lastTouchDist / dist;
        zoomCamera(state, factor);
        applyCamera();
      }
      lastTouchDist = dist;
      lastTouchCenter = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
    }
  }

  function onTouchEnd(e) {
    if (e.touches.length === 0) {
      isPanning = false;
    }
    if (e.touches.length < 2) {
      lastTouchDist = 0;
    }
  }

  // --- Attach ---
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);

  function cleanup() {
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('mouseleave', onMouseLeave);
    canvas.removeEventListener('click', onClick);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    tooltip.destroy();
    canvas.style.cursor = '';
  }

  return cleanup;
}