/**
 * portraitCatalog.js — Enumerate every portrait/icon entry for the atlas.
 *
 * The icon atlas is pre-rendered (in the geometry editor, at save time) so the
 * game loads a single spritesheet instead of rendering each piece at runtime.
 * This module lists the entries that atlas contains, keyed by a stable string:
 *
 *   item:<id>            — equipment/gear icons (kind 'item')
 *   trader               — the wandering trader
 *   base:<SHORT>         — each faction's base
 *   champion:<SHORT>     — each faction's champion
 *   mob:<SHORT>:<arch>   — each faction × mob archetype
 *
 * Each entry carries its normalized descriptor + a `shape`
 * ({ faction, archetype }) that recordsForPortrait() resolves through the
 * entity path. `portraitKeyFor` is the single source of key spelling, shared
 * with the runtime atlas loader so lookups never drift.
 *
 * Layer: render/ — imports the descriptor pipeline + the read-only faction
 * data (tolerated rules-data).
 */
import { FACTIONS } from '../../../game/rules/factionData.js';
import { normalizeDescriptor } from '../worldObjects/descriptors/schema.js';
import { ALL_DESCRIPTORS } from '../worldObjects/descriptors/data/index.js';
import { CHAMPION_DESCRIPTOR } from '../worldObjects/descriptors/data/champion.js';
import { MOB_DESCRIPTOR } from '../worldObjects/descriptors/data/mob.js';
import { TRADER_DESCRIPTOR } from '../worldObjects/descriptors/data/trader.js';
import { BASE_DESCRIPTOR } from '../worldObjects/descriptors/data/base.js';

const normalizedChampion = normalizeDescriptor(CHAMPION_DESCRIPTOR);
const normalizedMob = normalizeDescriptor(MOB_DESCRIPTOR);
const normalizedTrader = normalizeDescriptor(TRADER_DESCRIPTOR);
const normalizedBase = normalizeDescriptor(BASE_DESCRIPTOR);

/** Faction short → numeric index (FACTIONS is an array of { short, ... }). */
function factionIndex(short) {
  const i = FACTIONS.findIndex((f) => f.short === short);
  return i >= 0 ? i : 0;
}

const factionShorts = FACTIONS.map((f) => f.short);
const mobArchetypes = (normalizedMob.variants ?? []).map((v) => v.id);

/**
 * The stable key for a portrait/icon entry. `opts` depends on `kind`:
 *   item → { id } · trader → {} · base/champion → { faction } (short) ·
 *   mob → { faction } (short), { archetype }.
 */
export function portraitKeyFor(kind, opts = {}) {
  if (kind === 'item') return `item:${opts.id}`;
  if (kind === 'trader') return 'trader';
  if (kind === 'base' || kind === 'champion') return `${kind}:${opts.faction}`;
  if (kind === 'mob') return `mob:${opts.faction}:${opts.archetype}`;
  return `${kind}:${opts.id ?? opts.faction ?? '?'}`;
}

/** Every atlas entry, in a stable order (items, trader, bases, champions, mobs). */
export function listPortraitEntries() {
  const entries = [];

  for (const descriptor of ALL_DESCRIPTORS) {
    if (descriptor.kind !== 'item') continue;
    entries.push({
      key: portraitKeyFor('item', { id: descriptor.id }),
      descriptor: normalizeDescriptor(descriptor),
      shape: {},
    });
  }

  entries.push({ key: portraitKeyFor('trader'), descriptor: normalizedTrader, shape: {} });

  for (const short of factionShorts) {
    entries.push({
      key: portraitKeyFor('base', { faction: short }),
      descriptor: normalizedBase,
      shape: { faction: factionIndex(short) },
    });
  }
  for (const short of factionShorts) {
    entries.push({
      key: portraitKeyFor('champion', { faction: short }),
      descriptor: normalizedChampion,
      shape: { faction: factionIndex(short) },
    });
  }
  for (const short of factionShorts) {
    for (const archetype of mobArchetypes) {
      entries.push({
        key: portraitKeyFor('mob', { faction: short, archetype }),
        descriptor: normalizedMob,
        shape: { faction: factionIndex(short), archetype },
      });
    }
  }

  return entries;
}
