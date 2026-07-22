/**
 * worldSimulation.js — End-of-round world simulation and turn advancement.
 * Depends on entityQueries, turnActions, fogOfWar, and victoryChecks.
 */
import { coordKey, parseKey, neighbors, distance } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from '../rules/terrainTypes.js';
import { weatherForDay } from '../rules/weatherScript.js';
import { getChampion, occupiedByChampion, occupiedByMob } from './entityQueries.js';
import { beginTurn, isDigEligible } from './turnActions.js';
import { interactOnArrival } from './arrivalInteractions.js';
import { addLogEntry } from './gameLog.js';
import { LOG_CATEGORY } from '../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment } from '../rules/logHelpers.js';
import { recordLedgerEntry } from './dispatchLedger.js';
import { checkVictory } from './victoryChecks.js';
import { recordDeath } from './deathTracker.js';

export function finishTurn(state) {
  const champ = getChampion(state, state.activeChampionId);
  if (champ && champ.alive) {
    const tile = state.tiles[coordKey(champ.pos)];
    if (tile?.feature?.kind === 'knot' && !tile.feature.mined) {
      interactOnArrival(state, champ);
    } else if (isDigEligible(state, champ)) {
      champ.pendingDig = true;
      const factionMap = buildChampionFactionMap(state.champions);
      addLogEntry(state, {
        category: LOG_CATEGORY.ECONOMY,
        subject: championSegment(champ.name, factionMap),
        verb: 'spends the night digging in blank parchment',
        object: null,
        detail: null,
      });
    }
  }
  advanceTurn(state);
}

export function advanceTurn(state) {
  if (checkVictory(state)) return;
  const livingOrder = state.currentOrder.filter(id => getChampion(state, id)?.alive);
  const idx = livingOrder.indexOf(state.activeChampionId);

  if (idx >= 0 && idx + 1 < livingOrder.length) {
    // Normal case: advance to the next champion in the living order
    state.activeChampionId = livingOrder[idx + 1];
  } else if (idx >= 0) {
    // All living champions have played — world turn + next day
    _runWorldTurn(state);
  } else {
    // Active champion died during their own turn (e.g. bot lost combat).
    // Find the next living champion after the dead one's position in currentOrder.
    const deadPos = state.currentOrder.indexOf(state.activeChampionId);
    const nextAlive = state.currentOrder
      .slice(deadPos + 1)
      .find(id => getChampion(state, id)?.alive);
    if (nextAlive) {
      state.activeChampionId = nextAlive;
    } else {
      // No living champions remain after this position — world turn
      _runWorldTurn(state);
    }
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

/** World-turn logic extracted to avoid duplication. */
function _runWorldTurn(state) {
  runWorldTurn(state);
  state.day += 1;
  state.weather = weatherForDay(state.day);
  addLogEntry(state, {
    category: LOG_CATEGORY.MARKER,
    subject: { text: `Day ${state.day}: ${state.weather.name} — ${state.weather.text}`, color: 'var(--ink-mid)' },
    verb: '',
    object: null,
    detail: null,
  });
  state.currentOrder = state.globalOrder.filter(id => getChampion(state, id)?.alive);
  state.herald = {
    day: state.day,
    weather: { name: state.weather.name, text: state.weather.text, tint: state.weather.tint },
    order: [...state.currentOrder],
    champions: state.champions,
    deathOrder: [...state.deathOrder],
  };
  state.activeChampionId = state.currentOrder[0] || null;
}

function runWorldTurn(state) {
  const _factionMap = buildChampionFactionMap(state.champions);
  // mob harass
  for (const mob of state.mobs.filter(m => m.alive)) {
    const adj = state.champions.find(c => c.alive && c.faction !== 2 && distance(c.pos, mob.pos) === 1);
    if (adj && state._rng() < 0.55) {
      const dmg = 4 + Math.floor(state._rng() * 5);
      adj.hp -= dmg;
      addLogEntry(state, {
        category: LOG_CATEGORY.COMBAT,
        subject: { text: mob.name },
        verb: 'harasses',
        object: championSegment(adj.name, _factionMap),
        detail: { text: `for ${dmg} damage`, color: 'var(--crimson)' },
      });
      recordLedgerEntry(adj, `-${dmg} HP — ${mob.name} harassment`, 'loss', 'hp');
      if (adj.hp <= 0) {
        adj.alive = false;
        recordDeath(state, adj, 'was erased by marginalia');
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