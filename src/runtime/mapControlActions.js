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

registerAction('zoomIn', () => {
  const ctx = getSceneContext();
  if (!ctx) return;
  zoomCamera(ctx.getCameraState(), 0.8);
  ctx.applyCamera();
  refreshZoomDisplay();
});

registerAction('zoomOut', () => {
  const ctx = getSceneContext();
  if (!ctx) return;
  zoomCamera(ctx.getCameraState(), 1.25);
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
