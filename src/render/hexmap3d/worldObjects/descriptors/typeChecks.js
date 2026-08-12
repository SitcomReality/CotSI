/**
 * typeChecks.js — Value type guards and JSON helpers shared by the descriptor
 * schema modules (validation, normalization, denormalization). Pure — no
 * THREE, no game state. The public schema API lives in schema.js, which
 * re-exports the shape registry, defaults, and functions from these modules.
 */

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function isNonNegativeNumber(v) {
  return isFiniteNumber(v) && v >= 0;
}

function isPositiveNumber(v) {
  return isFiniteNumber(v) && v > 0;
}

function isColorInt(v) {
  return Number.isInteger(v) && v >= 0 && v <= 0xffffff;
}

/**
 * Named-color tokens for entity-driven parts. An entity part's `color` may be
 * a token string instead of an integer; the entity record path
 * (entityRecords.recordsForEntity) resolves it from the entity's `colors` map
 * (e.g. 'factionBase' / 'factionAccent' → the faction's palette entries).
 */
export const COLOR_TOKEN_PATTERN = /^[A-Za-z0-9_]+$/;
const isColorToken = (v) => typeof v === 'string' && COLOR_TOKEN_PATTERN.test(v);

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const cloneJson = (v) => JSON.parse(JSON.stringify(v));

export {
  isPlainObject,
  isFiniteNumber,
  isNonNegativeNumber,
  isPositiveNumber,
  isColorInt,
  isColorToken,
  ID_PATTERN,
  cloneJson,
};
