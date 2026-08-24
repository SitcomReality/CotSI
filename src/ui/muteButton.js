/**
 * muteButton.js — Header audio-mute toggle.
 *
 * Registers the 'toggleMute' [data-action] and keeps the button glyph in
 * sync with the shared mute state (muteState.js). Actual silencing is done
 * by the runtime audio consumers subscribed to that state.
 */
import { registerAction, dispatchAction } from '../shared/actionBus.js';
import { isMuted, toggleMuted, onMuteChange } from '../shared/muteState.js';

const GLYPH = { muted: '🔇', audible: '🔊' };

function labelFor(muted) {
  return muted ? 'Unmute audio' : 'Mute audio';
}

function paintButton() {
  const btn = document.getElementById('muteBtn');
  if (!btn) return;
  const muted = isMuted();
  btn.textContent = muted ? GLYPH.muted : GLYPH.audible;
  btn.title = labelFor(muted);
  btn.setAttribute('aria-pressed', String(muted));
}

registerAction('toggleMute', () => {
  toggleMuted();
  dispatchAction('persistSettings');
});

onMuteChange(paintButton);

/**
 * Paint the button glyph from live state. Called by bootstrap after the
 * game layout template (which contains #muteBtn) has been injected, so a
 * persisted muted=true restores the right icon.
 */
export function initMuteButton() {
  paintButton();
}
