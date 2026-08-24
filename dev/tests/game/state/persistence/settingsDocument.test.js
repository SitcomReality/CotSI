/**
 * settingsDocument.test.js — Settings serializer + validator.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SETTINGS_FORMAT_VERSION,
  serializeSettings,
  mergeSettings,
} from '../../../../../src/game/state/persistence/settingsDocument.js';

const DEFAULTS = {
  effects: { water: true, particles: true },
  speeds: { bot: 1 },
  audio: { muted: false },
};

test('serializeSettings builds a versioned document', () => {
  const doc = serializeSettings({ effects: { water: false }, speeds: { bot: 2 }, audio: { muted: true } });
  assert.deepEqual(doc, {
    format: 'cotsi-settings',
    version: SETTINGS_FORMAT_VERSION,
    effects: { water: false },
    speeds: { bot: 2 },
    audio: { muted: true },
  });
});

test('mergeSettings keeps valid stored values and drops unknown keys', () => {
  const doc = {
    format: 'cotsi-settings',
    version: 1,
    effects: { water: false, bogusToggle: true },
    speeds: { bot: 4 },
    audio: { muted: true, bogusSwitch: 'no' },
    legacyField: 'gone',
  };
  const merged = mergeSettings(doc, DEFAULTS);
  assert.deepEqual(merged, {
    effects: { water: false, particles: true },
    speeds: { bot: 4 },
    audio: { muted: true },
  });
});

test('mergeSettings falls back to defaults on missing/garbage values', () => {
  assert.deepEqual(mergeSettings(null, DEFAULTS), DEFAULTS);
  assert.deepEqual(mergeSettings(undefined, DEFAULTS), DEFAULTS);
  assert.deepEqual(mergeSettings('nonsense', DEFAULTS), DEFAULTS);
  assert.deepEqual(
    mergeSettings({ effects: { water: 'yes' }, speeds: { bot: null } }, DEFAULTS),
    DEFAULTS,
  );
  assert.deepEqual(
    mergeSettings({ speeds: { bot: 3 } }, DEFAULTS),
    { effects: { water: true, particles: true }, speeds: { bot: 3 }, audio: { muted: false } },
  );
});

test('mergeSettings does not mutate its inputs', () => {
  const doc = { effects: { water: false }, speeds: {} };
  const defaultsCopy = structuredClone(DEFAULTS);
  mergeSettings(doc, DEFAULTS);
  assert.deepEqual(DEFAULTS, defaultsCopy);
});
