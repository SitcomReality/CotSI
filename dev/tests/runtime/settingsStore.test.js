/**
 * settingsStore.test.js — Capture/apply round trip against the real
 * graphicsSettings singleton and clock, headless (both import clean).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { graphicsSettings } from '../../../src/render/overlays/graphicsSettings.js';
import { getClock } from '../../../src/shared/clockScheduler.js';
import {
  SETTINGS_STORAGE_KEY,
  captureCurrentSettings,
  applySettings,
} from '../../../src/runtime/settingsStore.js';
import { isMuted, setMuted } from '../../../src/shared/muteState.js';

/** Restore the singletons to their defaults after each test. */
function resetDefaults() {
  Object.assign(graphicsSettings.effects, { shadows: true, fogMist: true, selectionRing: true });
  for (const group of ['bot', 'combat', 'animation']) getClock().setSpeed(group, 1);
  setMuted(false);
}

test('captured document carries the settings storage key shape', () => {
  resetDefaults();
  const doc = captureCurrentSettings();
  assert.equal(doc.format, 'cotsi-settings');
  assert.deepEqual(Object.keys(doc).sort(), ['audio', 'effects', 'format', 'speeds', 'version']);
});

test('apply → capture round trips flags and speeds', () => {
  resetDefaults();
  applySettings({
    effects: { shadows: false, fogMist: true, selectionRing: false },
    speeds: { bot: 2, combat: 2, animation: 2 },
  });
  assert.equal(graphicsSettings.effects.shadows, false);
  assert.equal(graphicsSettings.effects.selectionRing, false);
  assert.equal(getClock().getSpeed('bot'), 2);
  assert.equal(getClock().getSpeed('combat'), 2);

  const captured = captureCurrentSettings();
  assert.deepEqual(captured.effects, graphicsSettings.effects);
  assert.equal(captured.speeds.bot, 2);

  // A fresh apply of the capture reproduces the same live state.
  resetDefaults();
  applySettings(captured);
  assert.equal(graphicsSettings.effects.shadows, false);
  assert.equal(getClock().getSpeed('bot'), 2);
  assert.equal(getClock().getSpeed('animation'), 2);
  resetDefaults();
});

test('partial and corrupt documents fall back to defaults', () => {
  resetDefaults();
  getClock().setSpeed('bot', 4);
  applySettings({ effects: { shadows: false } });
  // Missing keys fall back to defaults via mergeSettings.
  assert.equal(graphicsSettings.effects.shadows, false);
  assert.equal(graphicsSettings.effects.fogMist, true);

  applySettings(null);
  assert.equal(graphicsSettings.effects.shadows, true);
  assert.equal(getClock().getSpeed('bot'), 1);
  resetDefaults();
});

test('audio mute round trips through apply → capture → apply', () => {
  resetDefaults();
  setMuted(true);
  const captured = captureCurrentSettings();
  assert.deepEqual(captured.audio, { muted: true });

  setMuted(false);
  applySettings(captured);
  assert.equal(isMuted(), true);
  resetDefaults();
});
