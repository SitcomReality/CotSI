/**
 * persistence/settingsDocument.js — Settings serializer and validator.
 *
 * Pure helpers only: the browser-side read/write adapter (localStorage etc.)
 * lives elsewhere. Documents are plain JSON-safe objects so they can round-
 * trip through any storage backend unchanged.
 */

export const SETTINGS_FORMAT_VERSION = 1;

/**
 * Build a settings document from live option values.
 * @param {object} options
 * @param {object} options.effects - graphics effect toggles (e.g. { water: true })
 * @param {object} options.speeds  - game-speed control values (e.g. { bot: 1 })
 * @param {object} [options.audio] - audio switches (e.g. { muted: false })
 * @returns {object} plain JSON-safe settings document
 */
export function serializeSettings({ effects = {}, speeds = {}, audio = {} } = {}) {
  return {
    format: 'cotsi-settings',
    version: SETTINGS_FORMAT_VERSION,
    effects: { ...effects },
    speeds: { ...speeds },
    audio: { ...audio },
  };
}

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validate a stored settings document against defaults: unknown keys are
 * dropped, missing or bad-typed values fall back to the default. Returns a
 * fresh plain object — the defaults input is never mutated.
 * @param {object|null} doc      - stored document (any shape)
 * @param {object}      defaults - e.g. { effects: {...}, speeds: {...} }
 * @returns {{ effects: object, speeds: object, audio: object }}
 */
export function mergeSettings(doc, defaults) {
  const mergeGroup = (stored, defs) => {
    const out = {};
    for (const key of Object.keys(defs)) {
      const fallback = defs[key];
      const value = isPlainObject(stored) ? stored[key] : undefined;
      out[key] = typeof value === typeof fallback ? value : fallback;
    }
    return out;
  };
  return {
    effects: mergeGroup(isPlainObject(doc) ? doc.effects : undefined, defaults.effects ?? {}),
    speeds: mergeGroup(isPlainObject(doc) ? doc.speeds : undefined, defaults.speeds ?? {}),
    audio: mergeGroup(isPlainObject(doc) ? doc.audio : undefined, defaults.audio ?? {}),
  };
}
