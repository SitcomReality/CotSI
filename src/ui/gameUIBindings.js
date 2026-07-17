import { refreshZoomDisplay } from './mapView.js';
import { toast } from './hud.js';
import { registerAction } from './actionBus.js';
import { currentChamp } from '../game/session/liveGame.js';
import { onEndTurn } from '../game/turnController.js';
import { getSceneContext } from '../render/hexmap3d/hexmap3d-index.js';
import { zoomCamera, resetCamera } from '../render/hexmap3d/hexmap3d-index.js';

const INSPECT_HINT =
  'Click a highlighted hex to move. Adjacent foes to duel. End turn on empty parchment to dig.';

// Action-bus registrations for panel/header buttons.
// Note: Space→endTurn is owned by the actionBus keyboard map; do NOT
// bind Space anywhere else or end turn will fire twice per keypress.
registerAction('endTurn', () => onEndTurn());
registerAction('inspect', () => toast(INSPECT_HINT));

export function bindGameUI() {
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

  // Log bar toggle (delegated — the .log-bar__chevron lives inside #logMount)
  document.addEventListener('click', (e) => {
    const chevron = e.target.closest('.log-bar__chevron');
    if (chevron) {
      e.preventDefault();
      const mount = document.getElementById('logMount');
      const bar = mount?.querySelector('.log-bar');
      if (bar) {
        bar.classList.toggle('log-bar--open');
        const isOpen = bar.classList.contains('log-bar--open');
        const icon = chevron.querySelector('use');
        if (icon) {
          icon.setAttribute('href', `assets/icons/sprite.svg#${isOpen ? 'i-chevron-down' : 'i-chevron-up'}`);
        }
      }
    }
  });

  // Keyboard shortcuts.
  // Owns c/r/+/- only. Space is handled by actionBus.js ('endTurn').
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
  });
}
