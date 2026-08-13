/**
 * determinism.test.js — Full-game RNG determinism guard.
 *
 * Every random draw in the game must derive from the seed: createGame builds
 * a single seeded RNG (`state._rng = makeRng(seed)`) and all simulation draws
 * (spawns, turn order, bot decisions, combat loot, digs, mob harassment,
 * trader movement/stock, artifact drafts) go through it. No Math.random is
 * allowed in src/game, src/engine, or src/runtime.
 *
 * These tests play out real 7-bot games through the same decision loop the
 * browser botTurnRunner uses (aiDecide → move/attack → finishTurn) and assert
 * that the same seed yields the exact same game, end to end. This pins the
 * "test games on the same seed reproduce" contract and catches any future
 * draw-order instability or unseeded randomness the moment it lands.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../../../src/game/state/gameFactory.js';
import { runBotTurn as aiDecide } from '../../../../src/game/state/championAI.js';
import { finishTurn } from '../../../../src/game/state/worldSimulation.js';
import { resolveCombatSilently } from '../../../../src/game/state/combat/combatAutoResolve.js';
import { moveChampion } from '../../../../src/game/state/championMovement.js';
import { getChampion } from '../../../../src/game/state/entityQueries.js';
import { coordKey } from '../../../../src/engine/rules/hexGrid.js';
import { terrainCost } from '../../../../src/game/rules/movementCosts.js';

const SEVEN_BOTS = Array.from({ length: 7 }, (_, faction) => ({ faction, controller: 'bot' }));
const OBJECTIVES = { relicRace: true, relicTarget: 7, lastStanding: true };
const MAX_DAYS = 25;
const MAX_TURNS = 20000;

/** FNV-1a hash of a string → compact hex signature. */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/**
 * Play a full 7-bot game headlessly, mirroring botTurnRunner's decision loop
 * minus the animation/pacing layers (which never affect state).
 * Returns { winner, day, sig } where sig hashes every turn's observable
 * champion state, so any divergence in any seeded draw changes it.
 */
function playOut(seed) {
  const G = createGame({ seed, radius: 4, champions: SEVEN_BOTS, objectives: OBJECTIVES });
  const events = [];
  let turns = 0;
  while (G.day <= MAX_DAYS && !G.winnerId && turns++ < MAX_TURNS) {
    const ch = getChampion(G, G.activeChampionId);
    if (!ch || !ch.alive) {
      finishTurn(G);
      continue;
    }
    let decision = aiDecide(G);
    let steps = 0;
    while (decision && steps++ < 50) {
      if (decision.action === 'end') break;
      if (decision.action === 'attackChampion' || decision.action === 'attackMob') {
        resolveCombatSilently(G, ch, decision.target);
        decision = null;
        break;
      }
      if (decision.action === 'move') {
        for (const hex of decision.path) {
          const key = coordKey(hex);
          moveChampion(G, ch, key, terrainCost(ch, G.tiles[key].terrain));
        }
        // Bot may still have AP after arriving (movement-buff features) —
        // decide again, exactly like botTurnRunner.
        decision = ch.actionPoints > 0 ? aiDecide(G) : null;
        continue;
      }
      break;
    }
    if (G.winnerId) break;
    events.push(`${G.day}:${ch.id}:${coordKey(ch.pos)}:${ch.hp}:${ch.gold}:${ch.artifact ?? '-'}`);
    finishTurn(G);
  }
  return { winner: G.winnerId, day: G.day, sig: hash(events.join('|')), turns };
}

test('same seed: two full 7-bot games play out identically', () => {
  const a = playOut('determinism-17');
  const b = playOut('determinism-17');

  assert.equal(a.winner, b.winner, 'same seed must produce the same winner');
  assert.equal(a.day, b.day, 'same seed must end on the same day');
  assert.equal(a.sig, b.sig, 'same seed must produce identical turn-by-turn state');
  assert.equal(a.turns, b.turns);
});

test('different seed: the game diverges', () => {
  const a = playOut('determinism-17');
  const c = playOut('determinism-42');

  assert.notEqual(a.sig, c.sig, 'a different seed must produce a different game');
});
