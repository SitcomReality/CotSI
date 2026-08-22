/**
 * optionsModal.js — Options dialog: graphics effect toggles + game speed.
 *
 * Graphics toggles carry data-action="toggleShadows"/"toggleFogMist"/
 * "toggleSelectionRing"; the handlers live in render/overlays/
 * graphicsSettings.js (ui/ may not import render/), and the current flag
 * state is read back on open via dispatchAction('queryGraphicsFlags').
 *
 * Game speed sets one multiplier across the gameplay clock groups
 * ('bot', 'combat', 'animation') via getClock().setSpeed(); 'ui' and
 * 'default' stay at 1×.
 */

import { registerAction, dispatchAction } from '../../shared/actionBus.js';
import { getClock } from '../../shared/clockScheduler.js';
import { showModal, hideModal } from './modalShell.js';

/** Clock speed groups controlled by the options modal. */
const GAMEPLAY_GROUPS = ['bot', 'combat', 'animation'];

const SPEED_CHOICES = [0.5, 1, 2, 4];

function speedLabel(mult) {
  return mult === 0.5 ? '0.5×' : `${mult}×`;
}

/**
 * Reflect the actual clock speed on the speed buttons (active highlight).
 * Reads the 'bot' group as the source of truth — the modal always keeps
 * the gameplay groups in lockstep.
 */
function refreshSpeedButtons() {
  const row = document.getElementById('optionsSpeedRow');
  if (!row) return;
  const current = getClock().getSpeed('bot');
  for (const btn of row.querySelectorAll('[data-action="setGameSpeed"]')) {
    const active = parseFloat(btn.dataset.speed) === current;
    btn.classList.toggle('options-speed-btn--active', active);
  }
}

/**
 * Populate toggle/speed state from live settings, then show the modal.
 */
export function openOptionsModal() {
  const flags = dispatchAction('queryGraphicsFlags');
  if (flags) {
    const shadowsEl = document.getElementById('optionsShadows');
    const fogEl = document.getElementById('optionsFogMist');
    const ringEl = document.getElementById('optionsSelectionRing');
    if (shadowsEl) shadowsEl.checked = !!flags.shadows;
    if (fogEl) fogEl.checked = !!flags.fogMist;
    if (ringEl) ringEl.checked = !!flags.selectionRing;
  }
  refreshSpeedButtons();
  showModal('optionsModal');
}

registerAction('openOptions', () => openOptionsModal());

registerAction('optionsClose', () => hideModal('optionsModal'));

registerAction('setGameSpeed', (el) => {
  const mult = parseFloat(el?.dataset?.speed);
  if (!SPEED_CHOICES.includes(mult)) return;
  const clock = getClock();
  for (const group of GAMEPLAY_GROUPS) {
    clock.setSpeed(group, mult);
  }
  refreshSpeedButtons();
});
