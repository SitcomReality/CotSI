/**
 * turnLogic.js — Per-champion turn start/end, artifacts, digging decisions.
 * Depends on entityQueries, movement, vision, and log.
 */
import { FACTIONS, ARTIFACTS } from '../core/factions.js';
import { coordKey, TERRAIN } from '../world/map.js';
import { getChampion, occupiedByMob } from './entityQueries.js';
import { dailyMoves } from './movement.js';
import { refreshVision } from './vision.js';
import { addLog } from './log.js';

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
  if (ch.artifact === 'ledger') ch.gold += 2;
  if (ch.artifact === 'bandage') ch.hp = Math.min(ch.maxHp, ch.hp + 2);
  // Reverie
  if (ch.faction === 1) {
    const roll = Math.floor(state._rng() * 5);
    if (roll === 0) ch.gold += 4;
    else if (roll === 1) ch.moves += 1;
    else if (roll === 2) ch.hp = Math.min(ch.maxHp, ch.hp + 4);
    else if (roll === 4) ch.tokens[Math.floor(state._rng() * 7)] += 1;
    addLog(state, `${ch.name} receives a Reverie dream.`);
  }
  // pending dig
  if (ch.pendingDig) {
    ch.pendingDig = false;
    const roll = state._rng();
    if (roll < 0.075) {
      ch.relics++;
      addLog(state, `${ch.name} digs up a relic!`);
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
        ch.tokens[rf]++;
      }
    } else if (roll < 0.33) {
      const f = Math.floor(state._rng() * 7);
      ch.tokens[f]++;
      addLog(state, `${ch.name} digs up a ${FACTIONS[f].name} token.`);
    } else {
      const gold = 7 + Math.floor(state._rng() * 12) + Math.floor(state.day / 7);
      ch.gold += gold;
      addLog(state, `${ch.name} digs up ${gold} gold.`);
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
}

export function isDigEligible(state, champ) {
  const key = coordKey(champ.pos);
  const tile = state.tiles[key];
  return TERRAIN[tile.terrain].passable && !tile.feature && !occupiedByMob(state, key) && !champ.lastActionCombat;
}