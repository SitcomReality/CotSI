/**
 * portraitResolver.js — Resolve a UI portrait from the atlas, falling back to
 * the dynamic renderer.
 *
 * The icon atlas is the committed, save-time-rendered spritesheet (ui/iconAtlas.js).
 * It is loaded lazily and asynchronously; until it is ready (or when a key is
 * absent — e.g. an atlas generated before a new mob archetype existed), every
 * portrait falls back to the dynamic renderer (portraitThumbnail.js), which
 * produces the identical painted piece. So the two sources are interchangeable
 * and the atlas is a progressive cache, never a hard dependency.
 *
 * Layer: runtime/ — imports render/ + ui/ by design.
 */
import { FACTIONS } from '../game/rules/factionData.js';
import { portraitKeyFor } from '../render/hexmap3d/portrait/portraitCatalog.js';
import {
  getCombatantPortrait,
  getTraderPortrait,
  getBasePortrait,
  getItemPortrait,
} from '../render/hexmap3d/portrait/portraitThumbnail.js';
import { atlasPortraitUrl, loadIconAtlas } from '../ui/iconAtlas.js';

let atlasStarted = false;

/** Kick off the (idempotent) atlas load on first portrait resolution. */
function ensureAtlas() {
  if (!atlasStarted) {
    atlasStarted = true;
    loadIconAtlas();
  }
}

/** The atlas key for a combatant, or null when it isn't portraitable. */
function combatantKey(entity) {
  if (!entity) return null;
  const isChampion = entity.controller !== undefined;
  const isMob = entity.archetypeName !== undefined;
  if (!isChampion && !isMob) return null;
  const short = FACTIONS[entity.faction]?.short;
  if (isChampion) return portraitKeyFor('champion', { faction: short });
  return portraitKeyFor('mob', { faction: short, archetype: entity.archetypeName });
}

/** Cached combatant portrait (champion or mob) — atlas first, dynamic fallback. */
export function portraitForCombatant(entity) {
  ensureAtlas();
  const key = combatantKey(entity);
  return (key && atlasPortraitUrl(key)) ?? getCombatantPortrait(entity);
}

/** Cached wandering-trader portrait — atlas first, dynamic fallback. */
export function traderPortrait() {
  ensureAtlas();
  return atlasPortraitUrl(portraitKeyFor('trader')) ?? getTraderPortrait();
}

/** Cached faction-base portrait — atlas first, dynamic fallback. */
export function basePortrait(faction) {
  ensureAtlas();
  const short = FACTIONS[faction]?.short;
  const key = short ? portraitKeyFor('base', { faction: short }) : null;
  return (key && atlasPortraitUrl(key)) ?? getBasePortrait(faction);
}

/** Cached equipment-item icon — atlas first, dynamic fallback. */
export function itemPortrait(itemId) {
  ensureAtlas();
  return atlasPortraitUrl(portraitKeyFor('item', { id: itemId })) ?? getItemPortrait(itemId);
}
