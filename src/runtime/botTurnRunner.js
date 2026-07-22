/**
 * botTurnRunner.js — Bot champion decision execution and movement coordination.
 * Orchestrates game/state mutations with UI/render refreshes.
 * References `G` via live binding (circular import, used at runtime only).
 */
import { G, currentChamp, setTurnLock, isTurnLocked } from '../game/state/liveGame.js';
import { refreshAll } from './refreshAll.js';
import { finishTurn } from '../game/state/worldSimulation.js';
import { moveChampion } from '../game/state/championMovement.js';
import { coordKey } from '../engine/rules/hexGrid.js';
import { startCombat } from '../ui/combat/combatModal.js';
import { resolveCombatSilently } from '../game/state/combat/combatAutoResolve.js';
import { FACTIONS } from '../game/rules/factionData.js';
import { runBotTurn as aiDecide } from '../game/state/championAI.js';
import { getClock } from '../shared/clockScheduler.js';
import { showBotIndicator, hideBotIndicator } from '../ui/panels/botIndicator.js';
import { startMeasure, endMeasure } from '../dev/devPerformance.js';
import { queueOrStart as queueMovement, MOVE_DURATION } from '../render/hexmap3d/units/movementAnimator.js';
import { hexCenter3D } from '../render/hexmap3d/hexWorldSpace.js';
import { tileTopY } from '../render/hexmap3d/hexMapRenderer.js';

/**
 * Execute one bot champion's decision (move, attack, or end).
 *
 * For move decisions the bot now steps one hex at a time with the
 * champion-movement animation between each hex.  Each hex step = one
 * dev-panel bot step.  The function is async so each hex step can
 * `await` the animation duration via the clock.
 *
 * Called by refreshAll via the clock scheduler when the active champion
 * is a bot, and directly by devBotControl.stepOnce().
 */
export async function runBot() {
  startMeasure('runBot');

  // Re-entry guard — another turn is already in flight
  if (isTurnLocked()) { endMeasure('runBot'); return; }
  setTurnLock(true);

  try {
    const ch = currentChamp();
    if (ch) {
      const fac = FACTIONS[ch.faction];
      showBotIndicator(ch.name, fac?.color);
    }

    const decision = aiDecide(G);
    if (!decision || decision.action === 'end') {
      _botFinishTurn();
      endMeasure('runBot');
      return;
    }

    if (
      decision.action === 'attackChampion' ||
      decision.action === 'attackMob'
    ) {
      const target = decision.target;
      const bothNonHuman =
        ch.controller !== 'human' &&
        (!target.controller || target.controller !== 'human');

      if (bothNonHuman) {
        resolveCombatSilently(G, ch, target);
        _botFinishTurn();
      } else {
        startCombat(ch, target);
        // hideBotIndicator is called in the combat flow's completion refresh
      }
      endMeasure('runBot');
      return;
    }

    if (decision.action === 'move') {
      const path = decision.path;
      if (!path || !path.length) {
        _botFinishTurn();
        endMeasure('runBot');
        return;
      }

      const fac = FACTIONS[ch.faction];

      // Step one hex at a time, with movement animation between each.
      for (let i = 0; i < path.length; i++) {
        const hex = path[i];
        const key = coordKey(hex);

        // World-space origin before the state mutation
        const fromTile = G.tiles[coordKey(ch.pos)];
        const fromY = fromTile ? tileTopY(fromTile.terrain) + 0.15 : 0.15;
        const fromWorld = hexCenter3D(ch.pos.q, ch.pos.r, fromY);

        moveChampion(G, ch, key, 1);

        // World-space destination after mutation
        const toTile = G.tiles[key];
        const toY = toTile ? tileTopY(toTile.terrain) + 0.15 : 0.15;
        const toWorld = hexCenter3D(ch.pos.q, ch.pos.r, toY);

        // Start the animation BEFORE refreshAll so isAnimating is true when
        // buildUnitMeshes runs — the normal mesh skips this champion.
        if (fac) {
          queueMovement(ch.id, fromWorld, toWorld, fac.base, MOVE_DURATION);
        }

        refreshAll();

        // Wait for the animation to complete before stepping to the next hex.
        // +30ms cushion so the champion visibly "lands" before the next lift.
        await getClock().wait(MOVE_DURATION + 30, 'bot');
      }

      _botFinishTurn();
    }

    endMeasure('runBot');
  } catch (err) {
    setTurnLock(false);
    throw err;
  }
}

/**
 * Internal: finish the current bot's turn and clean up.
 * `finishTurn` → `advanceTurn` clears the turn lock and begins the next
 * champion's turn; the subsequent `refreshAll` schedules the next bot
 * if the next champion is also a bot.
 */
function _botFinishTurn() {
  finishTurn(G);
  refreshAll();
  hideBotIndicator();
}
