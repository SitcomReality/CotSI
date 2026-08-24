/**
 * muteState.test.js — Global audio mute singleton (src/shared/muteState.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMuted, setMuted, toggleMuted, onMuteChange } from '../../../src/shared/muteState.js';

test('starts unmuted', () => {
  setMuted(false);
  assert.equal(isMuted(), false);
});

test('setMuted updates state and notifies listeners only on change', () => {
  setMuted(false);
  const seen = [];
  const off = onMuteChange((m) => seen.push(m));
  setMuted(true);
  setMuted(true); // no change — no notification
  assert.deepEqual(seen, [true]);
  off();
  setMuted(false);
  assert.deepEqual(seen, [true]); // unsubscribed listener not called
});

test('toggleMuted flips state and returns the new value', () => {
  setMuted(false);
  assert.equal(toggleMuted(), true);
  assert.equal(toggleMuted(), false);
});

test('non-boolean values coerce through Boolean()', () => {
  setMuted(1);
  assert.equal(isMuted(), true);
  setMuted(0);
  assert.equal(isMuted(), false);
});
