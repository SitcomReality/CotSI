/**
 * iconPaths.js — Maps each icon ID to its category sprite file path.
 *
 * Because icons share the `i-` prefix across multiple categories (actions,
 * equipment, terrain, resources), a simple prefix-based lookup doesn't work.
 * This module provides the canonical mapping so any code that builds
 * <use href="..."> references can resolve the correct sprite file.
 *
 * Usage:
 *   import { iconSpritePath, ICON_TO_SPRITE } from './iconPaths.js';
 *   const path = iconSpritePath('g-crucible');   // "assets/icons/factions.svg"
 *   const path2 = iconSpritePath('i-move');       // "assets/icons/actions.svg"
 */

/** @type {Object<string, string>} */
const ICON_TO_SPRITE = {
  // ── Factions ──────────────────────────────────────────────────────
  'g-crucible': 'assets/icons/factions.svg',
  'g-reverie':  'assets/icons/factions.svg',
  'g-verdant':  'assets/icons/factions.svg',
  'g-archive':  'assets/icons/factions.svg',
  'g-hearth':   'assets/icons/factions.svg',
  'g-masque':   'assets/icons/factions.svg',
  'g-hollow':   'assets/icons/factions.svg',

  // ── Actions ───────────────────────────────────────────────────────
  'i-move':     'assets/icons/actions.svg',
  'i-attack':   'assets/icons/actions.svg',
  'i-glance':   'assets/icons/actions.svg',
  'i-collect':  'assets/icons/actions.svg',
  'i-trade':    'assets/icons/actions.svg',
  'i-endturn':  'assets/icons/actions.svg',
  'i-flee':     'assets/icons/actions.svg',
  'i-zoomin':   'assets/icons/actions.svg',
  'i-zoomout':  'assets/icons/actions.svg',
  'i-center':   'assets/icons/actions.svg',
  'i-wait':     'assets/icons/actions.svg',
  'i-cancel':   'assets/icons/actions.svg',
  'i-confirm':  'assets/icons/actions.svg',
  'i-heal':     'assets/icons/actions.svg',
  'i-recruit':  'assets/icons/actions.svg',
  'i-dismiss':  'assets/icons/actions.svg',
  'i-waypoint': 'assets/icons/actions.svg',
  'i-patrol':   'assets/icons/actions.svg',

  // ── Equipment ─────────────────────────────────────────────────────
  'i-weapon':   'assets/icons/equip.svg',
  'i-armor':    'assets/icons/equip.svg',
  'i-helmet':   'assets/icons/equip.svg',
  'i-boots':    'assets/icons/equip.svg',
  'i-ring':     'assets/icons/equip.svg',
  'i-amulet':   'assets/icons/equip.svg',
  'i-artifact': 'assets/icons/equip.svg',

  // ── Terrain / Features ────────────────────────────────────────────
  'i-ruins':    'assets/icons/terrain.svg',
  'i-grove':    'assets/icons/terrain.svg',
  'i-shrine':   'assets/icons/terrain.svg',
  'i-well':     'assets/icons/terrain.svg',
  'i-camp':     'assets/icons/terrain.svg',
  'i-tower':    'assets/icons/terrain.svg',
  'i-mine':     'assets/icons/terrain.svg',

  // ── Resources / Stats ─────────────────────────────────────────────
  'i-gold':     'assets/icons/resource.svg',
  'i-relic':    'assets/icons/resource.svg',
  'i-potency':  'assets/icons/resource.svg',
  'i-score':    'assets/icons/resource.svg',
  'i-treasure': 'assets/icons/resource.svg',

  // ── Decor / FX ────────────────────────────────────────────────────
  'd-knot':     'assets/icons/decor.svg',
  'd-mandorla': 'assets/icons/decor.svg',
  'd-seal':     'assets/icons/decor.svg',
  'd-corner':   'assets/icons/decor.svg',

  // ── Mob Pieces ────────────────────────────────────────────────────
  'p-bear':     'assets/icons/pieces.svg',
  'p-leopard':  'assets/icons/pieces.svg',
  'p-snail':    'assets/icons/pieces.svg',
  'p-tapir':    'assets/icons/pieces.svg',
  'p-mushroom': 'assets/icons/pieces.svg',
  'p-goose':    'assets/icons/pieces.svg',
  'p-scorpion': 'assets/icons/pieces.svg',
};

/**
 * Return the sprite file path for a given icon ID.
 *
 * @param {string} iconId — e.g. 'g-crucible', 'i-move'
 * @returns {string} sprite path, e.g. 'assets/icons/factions.svg'
 * @throws {Error} if the icon ID is not recognised
 */
function iconSpritePath(iconId) {
  const path = ICON_TO_SPRITE[iconId];
  if (!path) {
    throw new Error(`iconPaths: unknown icon id "${iconId}"`);
  }
  return path;
}

export { ICON_TO_SPRITE, iconSpritePath };
