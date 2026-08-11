/**
 * panel/keyboard.js — Dev tools keyboard shortcut handler.
 *
 * Layer: dev/ — imports cheats/state for teleport escape.
 */

import { devState } from '../cheats/state.js';

let _toggleCallback = null;

/**
 * Register the keyboard handler for dev tools.
 * @param {() => void} toggleFn — function to call on backtick press
 */
export function registerKeyboard(toggleFn) {
  _toggleCallback = toggleFn;
  window.addEventListener('keydown', _onKeyDown);
}

export function unregisterKeyboard() {
  window.removeEventListener('keydown', _onKeyDown);
  _toggleCallback = null;
}

function _onKeyDown(e) {
  // Backtick/grave key to toggle
  if (e.key === '`' || e.key === '~') {
    e.preventDefault();
    _toggleCallback?.();
    return;
  }
  // Escape exits teleport mode if active
  if (e.key === 'Escape' && devState.teleportMode) {
    devState.teleportMode = false;
    const btn = document.getElementById('devTeleportBtn');
    if (btn) {
      btn.textContent = 'Teleport Mode: OFF';
      btn.classList.remove('is-active');
    }
  }
}
