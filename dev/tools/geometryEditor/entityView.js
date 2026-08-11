/**
 * entityView.js — Entity selection → record-path entity for the editor.
 *
 * Entity-driven descriptors (base / champion / mob / trader) resolve their
 * variants and colors from an entity object (recordsForEntity), not a tile
 * hash. The editor keeps a lightweight selection — faction short + archetype
 * shape — and this module turns that into the entity object the record path
 * expects, resolving the faction palette for every named-color token the
 * descriptor parts can use ('factionBase', 'factionAccent', 'factionBody').
 *
 * The mob body token is the faction base darkened by MOB_COLOR_DARKEN — the
 * same tint unitMeshes.js applies in the game (old hexToRgb × 0.7 piece tint).
 */
import { FACTIONS } from '../../../src/game/rules/factionData.js';
import { MOB_COLOR_DARKEN } from '../../../src/params/render/geometryParams.js';

/** Content kinds that are entity-driven (see schema.js OBJECT_KINDS). */
export const ENTITY_KINDS = new Set(['base', 'champion', 'mob', 'trader']);

export const hexColor = (hex) => parseInt(hex.slice(1), 16);

/** Darken an integer color channel-wise by `f`. */
export function darkenHex(hex, f) {
  const ch = (shift) => Math.round(((hex >> shift) & 0xff) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/**
 * Build the entity object recordsForEntity expects from the editor's
 * faction/archetype selection. Unknown factions fall back to the first.
 *
 * @param {string} faction   - faction short ('CRU'…'HOL')
 * @param {string} archetype - archetype shape key ('infernalpaca', …) or null
 * @returns {object} entity — { faction, archetype, scale, colors }
 */
export function entityForSelection(faction, archetype) {
  const fac = FACTIONS.find((f) => f.short === faction) ?? FACTIONS[0];
  const base = hexColor(fac.base);
  return {
    faction: fac.short,
    archetype,
    scale: 1,
    colors: {
      factionBase: base,
      factionAccent: hexColor(fac.color),
      factionBody: darkenHex(base, MOB_COLOR_DARKEN),
    },
  };
}
