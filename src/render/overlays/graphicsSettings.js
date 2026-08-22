// src/render/overlays/graphicsSettings.js
// Singleton graphics effect flags + actionBus wiring for the Options modal.
//
// ui/ may not import render/, so the flags are exposed to the options modal
// through a query action (dispatchAction returns the handler result) and the
// toggles flip their own flags here, next to the state they own.
import { registerAction } from '../../shared/actionBus.js';

export const graphicsSettings = {
  effects: {
    shadows: true,
    fogMist: true,
    selectionRing: true,
    glows: false,        // future
    particles: false,    // future
    damageNumbers: false, // future
  }
};

registerAction('toggleShadows', () => {
  graphicsSettings.effects.shadows = !graphicsSettings.effects.shadows;
});

registerAction('toggleFogMist', () => {
  graphicsSettings.effects.fogMist = !graphicsSettings.effects.fogMist;
});

registerAction('toggleSelectionRing', () => {
  graphicsSettings.effects.selectionRing = !graphicsSettings.effects.selectionRing;
});

// Read-only access for ui/ (options modal checkbox population on open).
registerAction('queryGraphicsFlags', () => graphicsSettings.effects);
