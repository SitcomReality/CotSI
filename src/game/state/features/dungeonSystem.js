/**
 * dungeonSystem.js — In-dungeon champion state and dungeon battle logic.
 *
 * A dungeon is a map feature (tile.feature.kind === 'dungeon') that any number
 * of champions may enter at the same time. While inside, the champion is
 * hidden from the map (removed from the spatial index — no occupancy, no
 * harassment, no vision changes) and fights one escalating battle per day for
 * three days:
 *
 *   day 1 — enter the dungeon, fight battle 1, turn ends
 *   day 2 — turn starts inside; immediately fight battle 2, turn ends
 *   day 3 — immediately fight battle 3; win → completion reward + full turn
 *
 * Fleeing at any point ejects the champion (back on the dungeon hex), resets
 * all progress, and locks that dungeon for DUNGEON_REENTRY_DELAY_DAYS days
 * (flee day D → blocked D+1 → re-enter D+2). Completing a dungeon locks it
 * forever for that champion.
 *
 * Per-champion state lives on the champion entity:
 *   champ.dungeon        — active run: { key, day } where `day` is the NEXT
 *                          battle to fight (1 on entry, 2 after battle 1, …).
 *   champ.dungeonMemory  — per-dungeon history: key → { completed } or
 *                          { fleeDay }.
 *
 * Layer: game/state — mutates state; may import engine, game/rules, itself.
 */
import { coordKey } from '../../../engine/rules/hexGrid.js';
import { listArchetypes, getArchetype } from '../../rules/archetypes.js';
import '../../rules/archetypeData/index.js'; // side-effect: populate archetype registry
import { addLogEntry } from '../world/gameLog.js';
import { LOG_CATEGORY } from '../../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment } from '../../rules/logHelpers.js';
import { recordLedgerEntry } from '../world/dispatchLedger.js';
import { dungeonReentryDay } from '../../rules/dungeonRules.js';
import { EQUIPMENT_CATALOG, pickEquipment } from '../../rules/equipment.js';
import { choiceCard, equipmentCard } from './featureRewardTable.js';
import { FACTION_COUNT, MOB_BASE_POTENCY, MOB_OWN_FACTION_POTENCY_BONUS } from '../../../params/game/factionParams.js';
import { MOB_HP_VARIANCE_FRACTION } from '../../../params/game/spawnParams.js';
import {
  DUNGEON_BATTLE_SCALE,
  DUNGEON_COMPLETION_GOLD,
  DUNGEON_COMPLETION_RELIC,
  DUNGEON_COMPLETION_KNOTS,
  DUNGEON_COMPLETION_BONUS_KNOTS,
} from '../../../params/game/dungeonParams.js';

/** The canonical display name for the dungeon feature (archetype registry). */
function dungeonName() {
  return 'Dungeon';
}

/** True while the champion is inside a dungeon (hidden from the map). */
export function isInDungeon(champ) {
  return !!champ?.dungeon;
}

/**
 * Why a champion cannot enter the dungeon on `key`, or null when they can:
 * 'completed' — they conquered it already; 'cooldown' — they fled it within
 * DUNGEON_REENTRY_DELAY_DAYS days.
 */
export function dungeonEntryBlockReason(state, champ, key) {
  const mem = champ.dungeonMemory?.[key];
  if (mem?.completed) return 'completed';
  if (mem?.fleeDay != null && state.day < dungeonReentryDay(mem.fleeDay)) return 'cooldown';
  return null;
}

/**
 * Whether a champion may enter the dungeon on `key` right now: they must not
 * have completed it, and a flee cooldown (if any) must have elapsed.
 */
export function canEnterDungeon(state, champ, key) {
  return dungeonEntryBlockReason(state, champ, key) === null;
}

/**
 * Enter the dungeon under the champion (called on arrival at the hex).
 * Hides the champion (spatial-index removal) and starts run day 1.
 * Only human champions may enter — bots ignore dungeons entirely.
 * Returns true when the champion actually descended.
 */
export function enterDungeon(state, champ) {
  if (champ.controller !== 'human') return false;
  const key = coordKey(champ.pos);
  if (!canEnterDungeon(state, champ, key)) return false;
  if (!champ.dungeonMemory) champ.dungeonMemory = {};

  champ.dungeon = { key, day: 1 };
  state.spatialIndex?.delete(key);

  const factionMap = buildChampionFactionMap(state.champions);
  addLogEntry(state, {
    category: LOG_CATEGORY.SYSTEM,
    subject: championSegment(champ.name, factionMap),
    verb: 'descends into',
    object: { text: `the ${dungeonName()}` },
    detail: null,
  });
  return true;
}

/**
 * Create the next battle's mob for the champion's current dungeon day.
 * The mob is an ephemeral combat entity — never added to state.mobs or the
 * spatial index. Escalation: hp/maxHp and the mob's own faction potency grow
 * with the day (DUNGEON_BATTLE_SCALE); the archetype roll is fresh per battle.
 */
export function createDungeonBattle(state, champ) {
  const day = champ.dungeon?.day || 1;
  const scale = DUNGEON_BATTLE_SCALE[day] ?? DUNGEON_BATTLE_SCALE[1];
  const mobDefs = listArchetypes('mob').map((id) => ({ id, def: getArchetype(id) }));
  const pick = mobDefs[Math.floor(state._rng() * mobDefs.length)] ?? mobDefs[0];
  const def = pick.def;
  const base = def.baseStats;
  const faction = Math.floor(state._rng() * FACTION_COUNT);
  const potencies = Array(FACTION_COUNT)
    .fill(0)
    .map(
      (_, c) =>
        MOB_BASE_POTENCY +
        (c === faction ? MOB_OWN_FACTION_POTENCY_BONUS + scale.potencyBonus : 0) +
        ([1, 2, 4].includes((c - faction + FACTION_COUNT) % FACTION_COUNT) ? 1 : 0)
    );
  const hpRoll = Math.floor(state._rng() * (base.hp * MOB_HP_VARIANCE_FRACTION));
  const goldRoll = Math.floor(state._rng() * (def.lootGold[1] - def.lootGold[0]));
  return {
    id: `dungeon-mob-${champ.id}-day${day}`,
    name: def.name,
    archetypeName: def.archetypeShape,
    archetypeId: pick.id,
    faction,
    pos: { ...champ.pos },
    hp: Math.round(Math.min(base.maxHp, base.hp + hpRoll) * scale.hpMult),
    maxHp: Math.round(base.maxHp * scale.hpMult),
    potencies,
    alive: true,
    tier: base.tier,
    lootGold: def.lootGold[0] + goldRoll,
    aggressive: false,
    visualScale: def.visual.scale,
    actionPoints: 0,
    dungeonBattle: true, // tags the combat for dungeon win/flee hooks
  };
}

/**
 * Resolve a won dungeon battle. Day 1/2 wins advance the run; a day-3 win
 * completes it: grants the completion reward, unhides the champion, and marks
 * the dungeon completed forever. The runtime grants the champion their full
 * move turn after a completion (action points restore — turn-flow concern).
 * @returns {{ completed: boolean, rewards?: { gold: number, relic: number, knots: number } }}
 */
export function resolveDungeonBattleWin(state, champ) {
  const run = champ.dungeon;
  if (!run) return { completed: false };
  const key = run.key;
  const factionMap = buildChampionFactionMap(state.champions);

  if (run.day < 3) {
    run.day += 1;
    return { completed: false };
  }

  // Day 3 — complete the dungeon.
  if (!champ.dungeonMemory) champ.dungeonMemory = {};
  champ.dungeon = null;
  champ.dungeonMemory[key] = { completed: true };
  champ.gold += DUNGEON_COMPLETION_GOLD;
  champ.relics += DUNGEON_COMPLETION_RELIC;
  champ.knot += DUNGEON_COMPLETION_KNOTS;
  recordLedgerEntry(champ, `+${DUNGEON_COMPLETION_GOLD} gold — ${dungeonName()} hoard`, 'gain', 'gold');
  recordLedgerEntry(champ, `+${DUNGEON_COMPLETION_RELIC} relic — ${dungeonName()} hoard`, 'gain', 'relic');
  recordLedgerEntry(champ, `+${DUNGEON_COMPLETION_KNOTS} God's Knot — ${dungeonName()} hoard`, 'gain', 'knot');
  addLogEntry(state, {
    category: LOG_CATEGORY.ECONOMY,
    subject: championSegment(champ.name, factionMap),
    verb: 'claims',
    object: { text: `the ${dungeonName()} hoard` },
    detail: {
      text: `+${DUNGEON_COMPLETION_GOLD}g, +${DUNGEON_COMPLETION_RELIC} relic, +${DUNGEON_COMPLETION_KNOTS} God's Knot`,
      color: 'var(--gold)',
    },
  });

  // Unhide the champion on the dungeon hex.
  state.spatialIndex.set(key, { type: 'champion', entity: champ });

  // Human champions also pick a completion bonus: a random weapon, a random
  // armor, or extra God's Knots. (Bots never enter dungeons.)
  if (champ.controller === 'human' && !state.reward) {
    const weapons = EQUIPMENT_CATALOG.filter((i) => i.slot === 'weapon');
    const armors = EQUIPMENT_CATALOG.filter((i) => i.slot === 'armor');
    state.reward = {
      championId: champ.id,
      type: 'feature',
      title: `${dungeonName()} hoard`,
      body: 'The hoard yields one more prize — choose.',
      tileKey: key,
      guaranteed: [],
      choices: [
        equipmentCard(pickEquipment(state._rng, weapons), `${dungeonName()} hoard`),
        equipmentCard(pickEquipment(state._rng, armors), `${dungeonName()} hoard`),
        choiceCard({
          id: 'knots',
          label: `+${DUNGEON_COMPLETION_BONUS_KNOTS} God's Knots`,
          type: 'knot',
          effects: [{ icon: 'd-knot', label: `+${DUNGEON_COMPLETION_BONUS_KNOTS} God's Knots` }],
          grant: { kind: 'knots', amount: DUNGEON_COMPLETION_BONUS_KNOTS },
          claim: `${DUNGEON_COMPLETION_BONUS_KNOTS} God's Knots from the ${dungeonName()} hoard`,
        }),
      ],
    };
  }

  return {
    completed: true,
    rewards: { gold: DUNGEON_COMPLETION_GOLD, relic: DUNGEON_COMPLETION_RELIC, knots: DUNGEON_COMPLETION_KNOTS },
  };
}

/**
 * Eject a champion from a dungeon after fleeing: reset all progress, hide the
 * run, start the re-entry cooldown, and unhide the champion on the hex.
 * The combat flee path (fleeFromCombat) has already ended their turn.
 */
export function fleeDungeon(state, champ) {
  const run = champ.dungeon;
  if (!run) return;
  const key = run.key;
  champ.dungeon = null;
  champ.dungeonMemory[key] = { fleeDay: state.day };
  state.spatialIndex.set(key, { type: 'champion', entity: champ });

  const factionMap = buildChampionFactionMap(state.champions);
  addLogEntry(state, {
    category: LOG_CATEGORY.COMBAT,
    subject: championSegment(champ.name, factionMap),
    verb: 'fled',
    object: { text: `the ${dungeonName()}` },
    detail: { text: 'all progress lost', color: 'var(--text-muted)' },
  });
}
