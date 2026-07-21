/**
 * worldSimulation.js — End-of-round world simulation and turn advancement.
 * Depends on entityQueries, turnActions, fogOfWar, and victoryChecks.
 */
import { coordKey, parseKey, neighbors, distance } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from '../rules/terrainGeneration.js';
import { weatherForDay } from '../rules/weatherScript.js';
import { getChampion, occupiedByChampion, occupiedByMob } from './entityQueries.js';
import { beginTurn, isDigEligible } from './turnActions.js';
import { interactOnArrival } from './championMovement.js';
import { addLog } from './gameLog.js';
import { recordLedgerEntry } from './dispatchLedger.js';
import { checkVictory } from './victoryChecks.js';

export function finishTurn(state) {
  const champ = getChampion(state, state.activeChampionId);
  if (champ && champ.alive) {
    const tile = state.tiles[coordKey(champ.pos)];
    if (tile?.feature?.kind === 'knot' && !tile.feature.mined) {
      interactOnArrival(state, champ);
    } else if (isDigEligible(state, champ)) {
      champ.pendingDig = true;
      addLog(state, `${champ.name} spends the night digging in blank parchment.`);
    }
  }
  advanceTurn(state);
}

export function advanceTurn(state) {
  if (checkVictory(state)) return;
  const livingOrder = state.currentOrder.filter(id => getChampion(state, id)?.alive);
  const idx = livingOrder.indexOf(state.activeChampionId);
  if (idx >= 0 && idx + 1 < livingOrder.length) {
    state.activeChampionId = livingOrder[idx + 1];
  } else {
    // world turn
    runWorldTurn(state);
    state.day += 1;
    state.weather = weatherForDay(state.day);
    addLog(state, `— Day ${state.day}: ${state.weather.name}. ${state.weather.text}`);
    state.currentOrder = state.globalOrder.filter(id => getChampion(state, id)?.alive);
    state.herald = {
      day: state.day,
      weather: { name: state.weather.name, text: state.weather.text, tint: state.weather.tint },
      order: [...state.currentOrder],
      champions: state.champions,
    };
    state.activeChampionId = state.currentOrder[0] || null;
  }
  if (state.activeChampionId) {
    beginTurn(state, state.activeChampionId);
    // Clear turn lock so the new champion's turn can proceed.
    // The lock is set by runBot/onEndTurn as a re-entry guard, but each
    // fresh champion — human or bot — starts unlocked. runBot sets it
    // again before doing work, and onEndTurn checks it.
    state.turnLock = false;
  }
}

function runWorldTurn(state) {
  // mob harass
  for (const mob of state.mobs.filter(m => m.alive)) {
    const adj = state.champions.find(c => c.alive && c.faction !== 2 && distance(c.pos, mob.pos) === 1);
    if (adj && state._rng() < 0.55) {
      const dmg = 4 + Math.floor(state._rng() * 5);
      adj.hp -= dmg;
      addLog(state, `${mob.name} harasses ${adj.name} for ${dmg} damage.`);
      recordLedgerEntry(adj, `-${dmg} HP — ${mob.name} harassment`, 'loss', 'hp');
      if (adj.hp <= 0) {
        adj.alive = false;
        state.notice = `${adj.name} was erased by marginalia.`;
      }
    } else if (mob.aggressive && state._rng() < 0.45) {
      // wander
      const opts = neighbors(mob.pos)
        .map(coordKey)
        .filter(
          k =>
            state.tiles[k] &&
            TERRAIN[state.tiles[k].terrain].passable &&
            !occupiedByChampion(state, k) &&
            !occupiedByMob(state, k)
        );
      if (opts.length) {
        mob.pos = parseKey(opts[Math.floor(state._rng() * opts.length)]);
      }
    }
  }
  // regrow trees
  for (const t of Object.values(state.tiles)) {
    if (t.feature?.kind === 'tree' && t.feature.nextFruitDay && state.day >= t.feature.nextFruitDay) {
      t.feature.ripe = true;
    }
  }
  // traders move
  for (const tr of state.traders) {
    for (let s = 0; s < tr.movesPerDay; s++) {
      const target = state.tiles[tr.targetBaseKey] || tr.pos;
      const dx = Math.sign(target.q - tr.pos.q);
      const dy = Math.sign(target.r - tr.pos.r);
      let nx = tr.pos.q + dx,
        ny = tr.pos.r + dy;
      const nk = `${nx},${ny}`;
      if (state.tiles[nk] && TERRAIN[state.tiles[nk].terrain].passable && !occupiedByChampion(state, nk)) {
        tr.pos = { q: nx, r: ny };
      }
      if (nk === tr.targetBaseKey) {
        // pick new base
        const bases = Object.entries(state.tiles)
          .filter(([k, v]) => v.feature?.kind === 'base')
          .map(([k]) => k);
        tr.targetBaseKey = bases[Math.floor(state._rng() * bases.length)] || nk;
        break;
      }
    }
  }
}