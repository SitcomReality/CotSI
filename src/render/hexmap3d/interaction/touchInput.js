import { panCamera } from '../scene/cameraPanMath.js';
import { zoomCamera } from '../scene/cameraZoomMath.js';
import { screenToWorldPan } from './panMath.js';

/**
 * Create touch event handlers for a given map interaction context.
 *
 * @param {object} ctx - shared mutable state with fields:
 *   - canvas: HTMLCanvasElement
 *   - getCameraState: () => CameraState
 *   - applyCamera: () => void
 *   - lastPointerX, lastPointerY (number)
 *   - lastTouchDist (number)
 *   - isPanning (boolean)
 * @returns {{ onTouchStart, onTouchMove, onTouchEnd }}
 */
export function createTouchHandlers(ctx) {
  let touchStartDist = 0;
  let touchStartCenter = null;

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      ctx.lastPointerX = e.touches[0].clientX;
      ctx.lastPointerY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      touchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      touchStartCenter = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };
      ctx.lastTouchDist = touchStartDist;
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    const state = ctx.getCameraState();
    if (!state) return;

    if (e.touches.length === 1 && !ctx.isPanning) {
      const dx = e.touches[0].clientX - ctx.lastPointerX;
      const dy = e.touches[0].clientY - ctx.lastPointerY;
      ctx.lastPointerX = e.touches[0].clientX;
      ctx.lastPointerY = e.touches[0].clientY;
      const worldPerPixel = state.frustumSize / ctx.canvas.clientHeight;
      const camera = ctx.canvas.__camera;
      if (!camera) return;
      const worldDelta = screenToWorldPan(dx, dy, camera);
      panCamera(state, worldDelta.x * worldPerPixel, worldDelta.z * worldPerPixel);
      ctx.applyCamera();
    } else if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);

      if (ctx.lastTouchDist > 0) {
        const factor = dist / ctx.lastTouchDist;
        zoomCamera(state, 1 / factor);
        ctx.applyCamera();
      }
      ctx.lastTouchDist = dist;

      if (touchStartCenter) {
        const cx = (t0.clientX + t1.clientX) / 2;
        const cy = (t0.clientY + t1.clientY) / 2;
        const dx = cx - touchStartCenter.x;
        const dy = cy - touchStartCenter.y;
        touchStartCenter.x = cx;
        touchStartCenter.y = cy;
        const worldPerPixel = state.frustumSize / ctx.canvas.clientHeight;
        const camera = ctx.canvas.__camera;
        if (!camera) return;
        const worldDelta = screenToWorldPan(dx, dy, camera);
        panCamera(state, worldDelta.x * worldPerPixel, worldDelta.z * worldPerPixel);
        ctx.applyCamera();
      }
    }
  }

  function onTouchEnd(e) {
    if (e.touches.length < 2) {
      ctx.lastTouchDist = 0;
      touchStartCenter = null;
    }
  }

  return { onTouchStart, onTouchMove, onTouchEnd };
}