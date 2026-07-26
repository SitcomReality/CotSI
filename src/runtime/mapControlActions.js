/**
 * mapControlActions.js — Registers the map camera [data-action] handlers.
 * Bridges UI action events (zoom/center buttons, keyboard shortcuts) to the
 * 3D camera controls and the zoom readout. Imported for side effects by
 * runtime/bootstrap.js.
 */
import { getSceneContext, zoomCamera, resetCamera, animateCenterOnHex } from '../render/hexmap3d/hexMapRenderer.js';
import { refreshZoomDisplay } from './zoomDisplay.js';
import { currentChamp } from '../game/state/liveGame.js';
import { registerAction } from '../shared/actionBus.js';
import { ZOOM_IN_FACTOR, ZOOM_OUT_FACTOR } from '../params/render/cameraParams.js';

registerAction('zoomIn', () => {
  const ctx = getSceneContext();
  if (!ctx) return;
  zoomCamera(ctx.getCameraState(), ZOOM_IN_FACTOR);
  ctx.applyCamera();
  refreshZoomDisplay();
});

registerAction('zoomOut', () => {
  const ctx = getSceneContext();
  if (!ctx) return;
  zoomCamera(ctx.getCameraState(), ZOOM_OUT_FACTOR);
  ctx.applyCamera();
  refreshZoomDisplay();
});

registerAction('resetCamera', () => {
  const ctx = getSceneContext();
  if (!ctx) return;
  resetCamera(ctx.getCameraState());
  ctx.applyCamera();
  refreshZoomDisplay();
});

registerAction('centerChampion', () => {
  const ch = currentChamp();
  if (!ch) return;
  const ctx = getSceneContext();
  if (!ctx) return;
  animateCenterOnHex(ctx.getCameraState(), ctx.applyCamera, ch.pos.q, ch.pos.r);
  refreshZoomDisplay();
});
