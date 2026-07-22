/**
 * zoomDisplay.js — Updates the HUD zoom percentage.
 *
 * Bridges render state (camera context) to the DOM element (#hudZoom).
 * Belongs in runtime/ because it crosses layers: reads camera state
 * from render/ and writes to a DOM element. UI layer code should not
 * import from render/ directly.
 */
import { getSceneContext } from '../render/hexmap3d/hexMapRenderer.js';

/**
 * Update the zoom percentage display in the HUD.
 * Percentage is map-relative: 100% = full-map view (referenceFrustum).
 * Falls back to the legacy hardcoded 40 when no reference is available.
 */
export function refreshZoomDisplay() {
  const zoomEl = document.getElementById('hudZoom');
  if (!zoomEl) return;

  const ctx3d = getSceneContext();
  const cs = ctx3d?.getCameraState();
  const pct = cs?.referenceFrustum
    ? Math.round(100 * cs.referenceFrustum / cs.frustumSize)
    : cs
      ? Math.round(100 * 40 / cs.frustumSize)
      : 100;
  zoomEl.textContent = pct + '%';
}
