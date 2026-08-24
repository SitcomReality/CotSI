// src/render/overlays/graphicsSettings.js
// Singleton graphics effect flags + actionBus wiring for the Options modal.
//
// ui/ may not import render/, so the flags are exposed to the options modal
// through a query action (dispatchAction returns the handler result) and the
// toggles flip their own flags here, next to the state they own.
import { registerAction, dispatchAction } from '../../shared/actionBus.js';

// 'persistSettings' is registered in runtime/settingsStore.js (runtime may
// import render/; render/ may not import runtime/). Dispatching keeps the
// dependency direction legal while still saving after every toggle.

export const graphicsSettings = {
  effects: {
    shadows: true,
    fogMist: true,
    selectionRing: true,
    glows: true,       // charged Blessed Font glow (featureFx.js)
    particles: true,   // feature sparkles + collect bursts (featureFx.js)
    damageNumbers: false, // future
  },
};

registerAction('toggleShadows', () => {
  graphicsSettings.effects.shadows = !graphicsSettings.effects.shadows;
  dispatchAction('persistSettings');
});

registerAction('toggleFogMist', () => {
  graphicsSettings.effects.fogMist = !graphicsSettings.effects.fogMist;
  dispatchAction('persistSettings');
});

registerAction('toggleSelectionRing', () => {
  graphicsSettings.effects.selectionRing = !graphicsSettings.effects.selectionRing;
  dispatchAction('persistSettings');
});

registerAction('toggleParticles', () => {
  graphicsSettings.effects.particles = !graphicsSettings.effects.particles;
  dispatchAction('persistSettings');
});

registerAction('toggleGlows', () => {
  graphicsSettings.effects.glows = !graphicsSettings.effects.glows;
  dispatchAction('persistSettings');
});

// Read-only access for ui/ (options modal checkbox population on open).
registerAction('queryGraphicsFlags', () => graphicsSettings.effects);
