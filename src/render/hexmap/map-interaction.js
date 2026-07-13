// Orchestrator: wires together viewport controls, hex picking, and tooltips

import { camera, applyCameraTransform } from './camera.js';
import { setupViewportControls } from './viewport-controls.js';
import { createTooltip } from './map-tooltip.js';
import { hexKeyAtPosition } from './hex-picking.js';

/**
 * @param {SVGElement} svgElement  The root <svg> of the hex map
 * @param {Function}   onTileClick  Callback with hex key string
 * @param {Function}   getTooltipContent  (key) => HTML string or falsy to hide
 * @returns {Function}  Cleanup function to detach all listeners
 */
export function setupMapInteraction(svgElement, onTileClick, getTooltipContent) {
  // 1. Set up viewport controls (pan/zoom)
  const { cleanup: cleanupViewport, isPanning } = setupViewportControls(svgElement, camera);

  // 2. Set up tooltip
  const tooltip = createTooltip(getTooltipContent);

  // 3. Hover: show tooltip
  function onMouseMove(e) {
    if (isPanning) return;
    const key = hexKeyAtPosition(e.clientX, e.clientY, svgElement, camera);
    tooltip.show(e.clientX, e.clientY, key);
  }

  function onMouseLeave() {
    tooltip.hide();
  }

  // 4. Click (mouse)
  function onClick(e) {
    if (isPanning) return;
    if (e.button !== 0) return;
    if (e.shiftKey) return;
    const key = hexKeyAtPosition(e.clientX, e.clientY, svgElement, camera);
    if (onTileClick) onTileClick(key);
  }

  // 5. Touch tap (only if not panning)
  function onTouchEnd(e) {
    if (isPanning) return;
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const key = hexKeyAtPosition(touch.clientX, touch.clientY, svgElement, camera);
      if (onTileClick) onTileClick(key);
    }
  }

  // Attach
  svgElement.addEventListener('mousemove', onMouseMove);
  svgElement.addEventListener('mouseleave', onMouseLeave);
  svgElement.addEventListener('click', onClick);
  svgElement.addEventListener('touchend', onTouchEnd);

  // Cleanup function
  return () => {
    cleanupViewport();
    tooltip.destroy();
    svgElement.removeEventListener('mousemove', onMouseMove);
    svgElement.removeEventListener('mouseleave', onMouseLeave);
    svgElement.removeEventListener('click', onClick);
    svgElement.removeEventListener('touchend', onTouchEnd);
  };
}