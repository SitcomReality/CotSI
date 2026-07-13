// Pan & zoom controls for the hex map (mouse wheel, drag, touch pinch)

import { applyCameraTransform } from './camera.js';

/**
 * Attach pan/zoom event listeners to the SVG element.
 * Returns an object with:
 *   - cleanup: function to remove listeners (no arguments)
 *   - isPanning: getter function returning true while a drag is active
 */
export function setupViewportControls(svg, camera) {
  let isPanning = false;
  let startX = 0, startY = 0;
  let startTx = 0, startTy = 0;

  // ── Mouse wheel zoom ──
  function onWheel(e) {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = e.deltaY > 0 ? 0.85 : 1.18;
    const newScale = Math.max(0.35, Math.min(3.5, camera.scale * zoomFactor));
    camera.tx = mouseX - (mouseX - camera.tx) * (newScale / camera.scale);
    camera.ty = mouseY - (mouseY - camera.ty) * (newScale / camera.scale);
    camera.scale = newScale;
    applyCameraTransform(svg);
  }

  // ── Mouse drag pan ──
  function onMouseDown(e) {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      isPanning = true;
      startX = e.clientX;
      startY = e.clientY;
      startTx = camera.tx;
      startTy = camera.ty;
      svg.style.cursor = 'grabbing';
    }
  }

  function onMouseMove(e) {
    if (!isPanning) return;
    camera.tx = startTx + (e.clientX - startX);
    camera.ty = startTy + (e.clientY - startY);
    applyCameraTransform(svg);
  }

  function onMouseUp(e) {
    // Only respond to the mouse button that started the drag (if tracked)
    // but for simplicity we clear on any mouseup when panning
    if (isPanning) {
      isPanning = false;
      svg.style.cursor = '';
    }
  }

  // ── Touch support ──
  let lastTouchDist = 0;
  let lastTouchCenter = { x: 0, y: 0 };
  let touchPanStartTx = 0, touchPanStartTy = 0;

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchPanStartTx = camera.tx;
      touchPanStartTy = camera.ty;
      startX = touch.clientX;
      startY = touch.clientY;
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0], t2 = e.touches[1];
      lastTouchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      lastTouchCenter = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
    }
  }

  function onTouchMove(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isPanning = true;
        camera.tx = touchPanStartTx + dx;
        camera.ty = touchPanStartTy + dy;
        applyCameraTransform(svg);
      }
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0], t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (lastTouchDist > 0) {
        const zoomFactor = dist / lastTouchDist;
        const newScale = Math.max(0.35, Math.min(3.5, camera.scale * zoomFactor));
        const rect = svg.getBoundingClientRect();
        const centerX = lastTouchCenter.x - rect.left;
        const centerY = lastTouchCenter.y - rect.top;
        camera.tx = centerX - (centerX - camera.tx) * (newScale / camera.scale);
        camera.ty = centerY - (centerY - camera.ty) * (newScale / camera.scale);
        camera.scale = newScale;
        applyCameraTransform(svg);
      }
      lastTouchDist = dist;
      lastTouchCenter = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
    }
  }

  function onTouchEnd(e) {
    // If only one finger lifted and we weren't panning, let the coordinator handle click
    // But we don't reset isPanning here, the coordinator checks it before click
    if (e.changedTouches.length === 1 && !isPanning) {
      // Don't handle click – the coordinator will via touchend
    }
    // If two fingers were used, pinching ends
    if (e.touches.length < 2) {
      lastTouchDist = 0;
    }
    if (e.touches.length === 0) {
      isPanning = false;
    }
  }

  // ── Attach listeners ──
  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  svg.addEventListener('touchstart', onTouchStart, { passive: false });
  svg.addEventListener('touchmove', onTouchMove, { passive: false });
  svg.addEventListener('touchend', onTouchEnd);

  function cleanup() {
    svg.removeEventListener('wheel', onWheel);
    svg.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    svg.removeEventListener('touchstart', onTouchStart);
    svg.removeEventListener('touchmove', onTouchMove);
    svg.removeEventListener('touchend', onTouchEnd);
    svg.style.cursor = '';
  }

  return {
    cleanup,
    get isPanning() { return isPanning; }
  };
}