/**
 * settingsStore.js — Persist and restore user options (graphics + speed).
 *
 * Bridges the live singletons (graphicsSettings flags, clock speed groups)
 * to storage via the pure settingsDocument serializer. ui/ and render/ stay
 * clean: mutation sites dispatch the 'persistSettings' action, which is
 * registered here next to the persistence logic it triggers.
 */
import { registerAction } from '../shared/actionBus.js';
import { getClock } from '../shared/clockScheduler.js';
import { graphicsSettings } from '../render/overlays/graphicsSettings.js';
import { serializeSettings, mergeSettings } from '../game/state/persistence/settingsDocument.js';
import { readStoredJson, writeStoredJson } from './storageIo.js';

export const SETTINGS_STORAGE_KEY = 'cotsi-settings-v1';

/** Clock speed groups controlled by the options modal. */
const GAMEPLAY_GROUPS = ['bot', 'combat', 'animation'];

const DEFAULT_SETTINGS = {
  effects: {
    shadows: true,
    fogMist: true,
    selectionRing: true,
  },
  speeds: {
    bot: 1,
    combat: 1,
    animation: 1,
  },
};

/**
 * Snapshot the live graphics flags + gameplay clock speeds into a
 * JSON-safe settings document.
 */
export function captureCurrentSettings() {
  const speeds = {};
  for (const group of GAMEPLAY_GROUPS) speeds[group] = getClock().getSpeed(group);
  return serializeSettings({ effects: { ...graphicsSettings.effects }, speeds });
}

/**
 * Apply a (possibly partial/corrupt) settings document to the live
 * singletons. Unknown keys are dropped; missing or bad-typed values fall
 * back to defaults via mergeSettings.
 */
export function applySettings(saved) {
  const merged = mergeSettings(saved, DEFAULT_SETTINGS);
  for (const [key, value] of Object.entries(merged.effects)) {
    if (key in graphicsSettings.effects) graphicsSettings.effects[key] = value;
  }
  for (const [group, mult] of Object.entries(merged.speeds)) {
    if (GAMEPLAY_GROUPS.includes(group)) getClock().setSpeed(group, mult);
  }
}

/** Capture the current settings and write them to storage. */
export function saveSettingsNow() {
  return writeStoredJson(SETTINGS_STORAGE_KEY, captureCurrentSettings());
}

/** Read settings from storage and apply them; silently ignores absence. */
export function restoreSavedSettings() {
  const doc = readStoredJson(SETTINGS_STORAGE_KEY);
  if (doc == null) return false;
  applySettings(doc);
  return true;
}

registerAction('persistSettings', () => saveSettingsNow());
