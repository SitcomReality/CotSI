/**
 * muteState.js — Global audio mute singleton.
 *
 * Leaf infrastructure (imports nothing project-local) so every future audio
 * consumer — music today, SFX later — shares one mute switch instead of each
 * keeping its own. Pure state + change notifications; applying the mute to
 * actual audio output is the runtime's job.
 */

let muted = false;
const listeners = new Set();

export function isMuted() {
  return muted;
}

/**
 * Set the global mute state and notify subscribers (only on change).
 * @param {boolean} value
 */
export function setMuted(value) {
  const next = Boolean(value);
  if (next === muted) return;
  muted = next;
  for (const fn of listeners) fn(muted);
}

/** Flip the mute state; returns the new value. */
export function toggleMuted() {
  setMuted(!muted);
  return muted;
}

/**
 * Subscribe to mute changes. The listener receives the new boolean value.
 * @param {(muted: boolean) => void} fn
 * @returns {() => void} unsubscribe
 */
export function onMuteChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
