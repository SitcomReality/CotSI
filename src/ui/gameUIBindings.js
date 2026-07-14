import { refreshZoomDisplay } from './mapView.js';
import { toast } from './hud.js';
import { currentChamp } from '../game/gameOrchestrator.js';
import { onEndTurn } from '../game/turnController.js';
import { getSceneContext } from '../render/hexmap3d/index.js';
import { zoomCamera, resetCamera } from '../render/hexmap3d/camera3d.js';

export function bindGameUI() {
  document.getElementById('btnEndTurn')?.addEventListener('click', onEndTurn);

  document.getElementById('zoomIn')?.addEventListener('click', () => {
    const ctx = getSceneContext();
      zoomCamera(ctx.getCameraState(), 0.8);
      ctx.applyCamera();
      refreshZoomDisplay();
  });
  document.getElementById('zoomOut')?.addEventListener('click', () => {
      const ctx = getSceneContext();
    zoomCamera(ctx.getCameraState(), 1.25);
        ctx.applyCamera();
        refreshZoomDisplay();
  });
  document.getElementById('zoomReset')?.addEventListener('click', () => {
      const ctx = getSceneContext();
    resetCamera(ctx.getCameraState());
    ctx.applyCamera();
    refreshZoomDisplay();
  });
  document.getElementById('centerChampion')?.addEventListener('click', () => {
    const ch = currentChamp();
      const ctx = getSceneContext();
    if (ch) {
      const state = ctx.getCameraState();
      state.targetX = Math.sqrt(3) * 1.0 * (ch.pos.q + ch.pos.r / 2);
      state.targetZ = 1.5 * 1.0 * ch.pos.r;
      ctx.applyCamera();
      refreshZoomDisplay();
      }
  });

  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btnEndTurn') onEndTurn();
    if (e.target && e.target.id === 'btnInspect')
      toast(
        'Click a highlighted hex to move. Adjacent foes to duel. End turn on empty parchment to dig.'
      );
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    // Center on champion (c)
    if (e.key === 'c' || e.key === 'C') {
      const ch = currentChamp();
      const ctx = getSceneContext();
      if (ch) {
        const state = ctx.getCameraState();
        state.targetX = Math.sqrt(3) * 1.0 * (ch.pos.q + ch.pos.r / 2);
        state.targetZ = 1.5 * 1.0 * ch.pos.r;
        ctx.applyCamera();
        refreshZoomDisplay();
      }
    }
    // Reset view (r)
    if (e.key === 'r' || e.key === 'R') {
      const ctx = getSceneContext();
      resetCamera(ctx.getCameraState());
      ctx.applyCamera();
      refreshZoomDisplay();
    }
    // Zoom in (+/=)
    if (e.key === '+' || e.key === '=') {
      const ctx = getSceneContext();
      zoomCamera(ctx.getCameraState(), 0.8);
      ctx.applyCamera();
      refreshZoomDisplay();
    }
    // Zoom out (-/_)
    if (e.key === '-' || e.key === '_') {
      const ctx = getSceneContext();
      zoomCamera(ctx.getCameraState(), 1.25);
      ctx.applyCamera();
      refreshZoomDisplay();
    }
    if (e.key === ' ') {
      e.preventDefault();
      onEndTurn();
    }
  });
}