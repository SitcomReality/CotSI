/**
 * logHelpers.js — Pure helpers for building structured log entry segments.
 *
 * Provides champion name → faction color mapping so log entries can
 * color champion names by their faction accent color at render time.
 *
 * Layer: game/rules/ — pure, no state mutation.
 */

/**
 * Build a champion name → faction index lookup map.
 * Call once per refresh and pass to segment builders.
 *
 * @param {Array} champions — G.champions array
 * @returns {Object} map of championName -> factionIndex
 */
export function buildChampionFactionMap(champions) {
  const map = {};
  if (!champions) return map;
  for (const ch of champions) {
    map[ch.name] = ch.faction;
  }
  return map;
}

/**
 * Return the CSS custom property for a faction's accent color.
 * Uses the legacy fN-pale alias which maps to --f-N-accent.
 *
 * @param {number} factionIdx — 0-6
 * @returns {string} CSS var() expression
 */
export function factionAccentVar(factionIdx) {
  return `var(--f${factionIdx}-pale)`;
}

/**
 * Create a colored segment for a champion name.
 *
 * @param {string} name        — champion name
 * @param {Object} factionMap  — from buildChampionFactionMap()
 * @returns {Object} { text, color }
 */
export function championSegment(name, factionMap) {
  const fid = factionMap[name];
  return {
    text: name,
    color: fid != null ? factionAccentVar(fid) : undefined,
  };
}
