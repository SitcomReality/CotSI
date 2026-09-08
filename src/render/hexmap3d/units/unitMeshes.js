import { FACTIONS } from '../../../game/rules/factionData.js';
import { coordKey } from '../../../engine/rules/hexGrid.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { hillFloorY } from '../worldObjects/hillFloor.js';
import { MOB_COLOR_DARKEN } from '../../../params/render/geometryParams.js';
import { isAnimating } from './movementAnimator.js';
import { addOutlines } from '../scene/outline.js';
import { normalizeDescriptor } from '../worldObjects/descriptors/schema.js';
import { recordsForEntity } from '../worldObjects/descriptors/recordBuilder.js';
import { buildDescriptorMeshes } from '../worldObjects/descriptors/meshAssembly.js';
import { CHAMPION_DESCRIPTOR } from '../worldObjects/descriptors/data/champion.js';
import { MOB_DESCRIPTOR } from '../worldObjects/descriptors/data/mob.js';
import { TRADER_DESCRIPTOR } from '../worldObjects/descriptors/data/trader.js';

const normalizedChampion = normalizeDescriptor(CHAMPION_DESCRIPTOR);
const normalizedMob = normalizeDescriptor(MOB_DESCRIPTOR);
const normalizedTrader = normalizeDescriptor(TRADER_DESCRIPTOR);

const hexColor = (hex) => parseInt(hex.slice(1), 16);

/** Darken an integer color channel-wise by `f` — the old piece-body tint was
 *  `hexToRgb(fac.base).map(c => c * MOB_COLOR_DARKEN)`. */
function darkenHex(hex, f) {
  const ch = (shift) => Math.round(((hex >> shift) & 0xff) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Which mob variant a mob's state selects (all mobs render as their
 *  archetype variant — tier-2 variants were removed in the mob rework). */
function mobVariantFor(mob) {
  return mob.archetypeName || 'default';
}

/** Map a champion onto the entity shape recordsForEntity expects. */
function entityForChampion(champion) {
  const fac = FACTIONS[champion.faction];
  if (!fac) return null;
  return {
    faction: fac.short,
    colors: { factionBase: hexColor(fac.base), factionAccent: hexColor(fac.color) },
  };
}

/** Map a mob onto the entity shape recordsForEntity expects. */
function entityForMob(mob) {
  const fac = FACTIONS[mob.faction];
  const fallback = 0x4c3f33; // the old piece-body fallback color [0.3, 0.25, 0.2]
  const base = fac ? hexColor(fac.base) : fallback;
  return {
    archetype: mobVariantFor(mob),
    scale: mob.visualScale ?? 1,
    colors: {
      factionBody: fac ? darkenHex(base, MOB_COLOR_DARKEN) : fallback,
      factionAccent: fac ? hexColor(fac.color) : fallback,
    },
  };
}

/**
 * Collect the descriptor instance records for every visible unit, plus a
 * signature of everything that determines the built meshes.
 *
 * The signature lets the renderer skip the dispose/rebuild when nothing visual
 * changed. It is built in this same loop, right where the render-skip
 * conditions live, so adding a new visual input here forces a signature change
 * instead of silently freezing the meshes.
 *
 * @param {Object} state   - Game state
 * @param {Set}    visible - Set of visible hex keys
 * @param {Set<string>} [animatingIds] - Champion ids currently animating;
 *        omitted → the movement animator is queried directly.
 * @returns {{ championRecords: object[], mobRecords: object[], traderRecords: object[], signature: string }}
 */
export function collectUnitInstances(state, visible, animatingIds = null) {
  const championRecords = [];
  const mobRecords = [];
  const traderRecords = [];
  const tokens = [];
  const animating = (id) => (animatingIds ? animatingIds.has(id) : isAnimating(id));

  for (const key of visible) {
    const tile = state.tiles[key];
    if (!tile) continue;

    const champ = state.champions.find(c => coordKey(c.pos) === key);
    const mob = state.mobs?.find(m => coordKey(m.pos) === key);
    const trader = state.traders?.find(t => coordKey(t.pos) === key);

    if (!champ && !mob && !trader) continue;
    // Champions inside a dungeon are hidden from the map.
    if (champ?.dungeon) continue;

    const surfaceY = hillFloorY(tile);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);

    if (champ) {
      if (animating(champ.id)) continue;

      const entity = entityForChampion(champ);
      if (!entity) continue;
      championRecords.push(...recordsForEntity(normalizedChampion, entity, { x, y: surfaceY, z }));
      tokens.push(`c|${champ.id}|${key}|${surfaceY}|${champ.faction}`);
    } else if (mob) {
      mobRecords.push(...recordsForEntity(normalizedMob, entityForMob(mob), { x, y: surfaceY, z }));
      tokens.push(`m|${mob.id}|${key}|${surfaceY}|${mob.faction}|${mobVariantFor(mob)}|${mob.visualScale ?? 1}`);
    } else if (trader) {
      traderRecords.push(...recordsForEntity(normalizedTrader, { scale: 1 }, { x, y: surfaceY, z }));
      tokens.push(`t|${key}|${surfaceY}`);
    }
  }

  // Sorted so a change in `visible` iteration order alone is not a change.
  return { championRecords, mobRecords, traderRecords, signature: tokens.sort().join(';') };
}

/**
 * Assemble collected unit records into InstancedMeshes with ink outlines.
 * @param {{ championRecords: object[], mobRecords: object[], traderRecords: object[] }} collected
 * @returns {THREE.InstancedMesh[]}
 */
export function assembleUnitMeshes({ championRecords, mobRecords, traderRecords }) {
  const results = [];
  if (championRecords.length > 0) {
    results.push(...buildDescriptorMeshes(normalizedChampion, championRecords, 'champion'));
  }
  if (mobRecords.length > 0) {
    results.push(...buildDescriptorMeshes(normalizedMob, mobRecords, 'mob'));
  }
  if (traderRecords.length > 0) {
    results.push(...buildDescriptorMeshes(normalizedTrader, traderRecords, 'trader'));
  }
  return results.flatMap(addOutlines);
}

/**
 * Build unit meshes for all visible champions, mobs, and traders.
 *
 * All three entity types render through the descriptor pipeline:
 *   - Champions (descriptors/data/champion.js): cylinder body + sphere head
 *     per faction, instanced per part.
 *   - Mobs (descriptors/data/mob.js — one variant per archetype, composed from
 *     the per-mob files in data/mobs/): a 3D body per archetype shape (7
 *     archetypes, no tier-2 variants), instanced per part.
 *   - Traders (descriptors/data/trader.js): a flat coin body in teal.
 *
 * Mobs and traders render as pure 3D geometry — no icon caps.
 *
 * @param {Object} state   - Game state
 * @param {Set}    visible - Set of visible hex keys
 * @returns {THREE.InstancedMesh[]}
 */
export function buildUnitMeshes(state, visible) {
  return assembleUnitMeshes(collectUnitInstances(state, visible));
}
