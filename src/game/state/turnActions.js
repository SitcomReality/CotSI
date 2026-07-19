/**
 * turnActions.js — Per-champion turn start/end, artifacts, digging decisions.
 * Depends on entityQueries, championMovement, fogOfWar, gameLog, the dispatch
 * ledger, and the dispatch report builder.
 * For human champions, beginTurn ends by setting `state.dispatch` — the
 * Augur's Dispatch report, which the runtime shows before anything else.
 */
import { FACTIONS, ARTIFACTS } from '../rules/factionData.js';
import { coordKey } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from '../rules/terrainGeneration.js';
import { buildDispatchReport } from '../rules/dispatchReport.js';
import { getChampion, occupiedByMob } from './entityQueries.js';
import { dailyMoves } from './championMovement.js';
import { refreshVision } from './fogOfWar.js';
import { addLog } from './gameLog.js';
import { recordLedgerEntry, drainLedger } from './dispatchLedger.js';

export function artifactChoices(state) {
  const pool = [...ARTIFACTS];
  const r = state._rng;
  const a = pool.splice(Math.floor(r() * pool.length), 1)[0];
  const b = pool.splice(Math.floor(r() * pool.length), 1)[0];
  return [a, b].map(x => ({
    id: x.id,
    label: x.name,
    detail: x.detail,
    artifactId: x.id,
  }));
}

export function beginTurn(state, champId) {
  const ch = getChampion(state, champId);
  if (!ch || !ch.alive) return;
  ch.moves = dailyMoves(state, ch);
  ch.lastActionCombat = false;
  if (ch.artifact === 'ledger') {
    ch.gold += 2;
    recordLedgerEntry(ch, "+2 gold — Beggar-Saint's Ledger", 'gain');
  }
  if (ch.artifact === 'bandage') {
    const healed = Math.min(ch.maxHp, ch.hp + 2) - ch.hp;
    ch.hp += healed;
    if (healed > 0) recordLedgerEntry(ch, `+${healed} HP — Patient Bandage`, 'gain');
  }
  // Reverie
  if (ch.faction === 1) {
    const roll = Math.floor(state._rng() * 5);
    if (roll === 0) {
      ch.gold += 4;
      recordLedgerEntry(ch, "+4 gold — Another's Dream", 'gain');
    } else if (roll === 1) {
      ch.moves += 1;
      recordLedgerEntry(ch, "+1 move — Another's Dream", 'gain');
    } else if (roll === 2) {
      const healed = Math.min(ch.maxHp, ch.hp + 4) - ch.hp;
      ch.hp += healed;
      if (healed > 0) recordLedgerEntry(ch, `+${healed} HP — Another's Dream`, 'gain');
    } else if (roll === 4) {
      const f = Math.floor(state._rng() * 7);
      ch.potencies[f] += 1;
      recordLedgerEntry(ch, `+1 ${FACTIONS[f].name} potency — Another's Dream`, 'gain');
    } else {
      recordLedgerEntry(ch, "The dream was silent — Another's Dream", 'neutral');
    }
    addLog(state, `${ch.name} receives a Reverie dream.`);
  }
  // pending dig
  if (ch.pendingDig) {
    ch.pendingDig = false;
    const roll = state._rng();
    if (roll < 0.075) {
      ch.relics++;
      addLog(state, `${ch.name} digs up a relic!`);
      recordLedgerEntry(ch, '+1 relic — night dig', 'gain');
      if (ch.controller === 'human') {
        state.reward = {
          championId: ch.id,
          title: 'A relic under the dust',
          body: 'Divine shard, still warm.',
          guaranteed: ['+1 relic', `+1 ${FACTIONS[ch.faction].name} potency`],
          choices: null,
        };
      }
      // Archive racial
      if (ch.faction === 3) {
        const rf = Math.floor(state._rng() * 7);

        ch.potencies[rf]++;
        recordLedgerEntry(ch, `+1 ${FACTIONS[rf].name} potency — Everknown`, 'gain');
      }
    } else if (roll < 0.33) {
      const f = Math.floor(state._rng() * 7);

      ch.potencies[f]++;
      addLog(state, `${ch.name} digs up a ${FACTIONS[f].name} potency.`);
      recordLedgerEntry(ch, `+1 ${FACTIONS[f].name} potency — night dig`, 'gain');
    } else {
      const gold = 7 + Math.floor(state._rng() * 12) + Math.floor(state.day / 7);
      ch.gold += gold;
      addLog(state, `${ch.name} digs up ${gold} gold.`);
      recordLedgerEntry(ch, `+${gold} gold — night dig`, 'gain');
    }
  }
  // artifact draft first turn
  if (!ch.offeredArtifact) {
    if (ch.controller === 'human') {
      state.reward = {
        championId: ch.id,
        title: 'First illumination',
        body: 'Two artifacts shine from the margin. Choose one permanent blessing.',
        guaranteed: [],
        choices: artifactChoices(state),
      };
    } else {
      const picks = artifactChoices(state);
      ch.artifact = picks[0].artifactId;
      ch.offeredArtifact = true;
      addLog(state, `${ch.name} accepts ${picks[0].label}.`);
    }
  }
  refreshVision(state);
  // Augur's Dispatch: snapshot the report for human champions. The runtime
  // shows it before any other prompt (including the artifact draft above).
  if (ch.controller === 'human') {
    state.dispatch = {
      championId: ch.id,
      report: buildDispatchReport(state, ch, drainLedger(ch)),
    };
  }
}

export function isDigEligible(state, champ) {
  const key = coordKey(champ.pos);
  const tile = state.tiles[key];
  return TERRAIN[tile.terrain].passable && !tile.feature && !occupiedByMob(state, key) && !champ.lastActionCombat;
}