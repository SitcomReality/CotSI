/**
 * botTurnRunner.js — Bot champion decision execution and movement coordination.
 * Orchestrates game/state mutations with UI/render refreshes.
 * References `G` via live binding (circular import, used at runtime only).
 */
import { G, currentChamp, setTurnLock, isTurnLocked } from '../game/state/liveGame.js';
import { refreshAll } from './refreshAll.js';
import { finishTurn } from '../game/state/worldSimulation.js';
import { moveChampion } from '../game/state/championMovement.js';
import { terrainCost } from '../game/rules/movementCosts.js';
import { coordKey } from '../engine/rules/hexGrid.js';
import { getHumanView } from '../game/state/fogOfWar.js';
import { startCombat } from './combat/index.js';
import { resolveCombatSilently } from '../game/state/combat/combatAutoResolve.js';
import { FACTIONS } from '../game/rules/factionData.js';
import { runBotTurn as aiDecide } from '../game/state/championAI.js';
import { getClock } from '../shared/clockScheduler.js';
import { showBotIndicator, hideBotIndicator } from '../ui/panels/botIndicator.js';
import { botTurnDwellMs } from './turnPacing.js';
import { startMeasure, endMeasure, setGameContext, clearGameContext } from '../devtools/performance/index.js';
import { queueOrStart as queueMovement, MOVE_DURATION } from '../render/hexmap3d/units/movementAnimator.js';
import { hexCenter3D } from '../render/hexmap3d/hexWorldSpace.js';
import { hillFloorY } from '../render/hexmap3d/worldObjects/hillFloor.js';
import { CHAMPION_HEIGHT_OFFSET } from '../params/render/animationParams.js';
import { ANIMATION_CUSHION_MS } from '../params/ui/uiParams.js';

/**
 * Execute one bot champion's decision (move, attack, or end).
 *
 * For move decisions the bot now steps one hex at a time with the
 * champion-movement animation between each hex.  Each hex step = one
 * dev-panel bot step.  The function is async so each hex step can
 * `await` the animation duration via the clock.
 *
 * Called by refreshAll via the clock scheduler when the active champion
 * is a bot, and directly by botControl.stepOnce().
 */
export async function runBot() {
  startMeasure('runBot');

  // Re-entry guard — another turn is already in flight
  if (isTurnLocked()) { endMeasure('runBot'); return; }
  setTurnLock(true);

  try {
    const ch = currentChamp();
    if (!ch) {
      setTurnLock(false);
      endMeasure('runBot');
      return;
    }
    const fac = FACTIONS[ch.faction];
    showBotIndicator(ch.name, fac?.color);

    // The human's vision is static for the whole bot turn (humans don't move
    // during bot turns). Bot hops are only animated when BOTH the origin and
    // destination hexes are currently visible to a human — animating across a
    // vision boundary (in either direction) would leak the bot's position or
    // direction of travel through the explored-mist veil or black fog
    // (fog-of-war convention: out-of-sight hexes reveal no occupant
    // information).
    const humanVisible = getHumanView(G).visible;

    // Anti-strobe: hold this bot's turn visible for the minimum dwell before
    // acting. 'animation' group — same reasoning as the move wait below (a
    // 'bot'-group wait would never resolve while the bot group is paused).
    const dwell = botTurnDwellMs();
    if (dwell > 0) {
      await getClock().wait(dwell, 'animation');
    }

    // Set profiler context: bot deciding
    setGameContext({
      phase: 'bot_turn',
      championId: ch.id,
      championName: ch.name,
      controller: 'bot',
      action: 'deciding',
    });

    let decision = aiDecide(G);
    if (!decision) {
      // No valid decision (missing/dead/non-bot champion): finish the turn
      // like 'end' so the turn lock is always released.
      clearGameContext();
      _botFinishTurn();
      endMeasure('runBot');
      return;
    }
    while (decision) {
      if (decision.action === 'end') {
        clearGameContext();
        _botFinishTurn();
        endMeasure('runBot');
        return;
      }

      if (
        decision.action === 'attackChampion' ||
        decision.action === 'attackMob'
      ) {
        // Set profiler context: bot attacking
        setGameContext({
          phase: 'bot_turn',
          championId: ch.id,
          championName: ch.name,
          controller: 'bot',
          action: 'attacking',
        });

        const target = decision.target;
        const bothNonHuman =
          ch.controller !== 'human' &&
          (!target.controller || target.controller !== 'human');

        if (bothNonHuman) {
          resolveCombatSilently(G, ch, target);
          clearGameContext();
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
          clearGameContext();
          _botFinishTurn();
          endMeasure('runBot');
          return;
        }

        // Set profiler context: bot moving
        setGameContext({
          phase: 'bot_turn',
          championId: ch.id,
          championName: ch.name,
          controller: 'bot',
          action: 'moving',
          detail: `pathlen=${path.length}`,
        });

        const fac = FACTIONS[ch.faction];

        // Step one hex at a time, with movement animation between each.
        for (let i = 0; i < path.length; i++) {
          const hex = path[i];
          const key = coordKey(hex);

          // World-space origin before the state mutation
          const fromKey = coordKey(ch.pos);
          const fromTile = G.tiles[fromKey];
          const fromY = fromTile ? hillFloorY(fromTile) + CHAMPION_HEIGHT_OFFSET : CHAMPION_HEIGHT_OFFSET;
          const fromWorld = hexCenter3D(ch.pos.q, ch.pos.r, fromY);

          moveChampion(G, ch, key, terrainCost(ch, G.tiles[key].terrain, G.tiles[key].biomeId));

          // World-space destination after mutation
          const toTile = G.tiles[key];
          const toY = toTile ? hillFloorY(toTile) + CHAMPION_HEIGHT_OFFSET : CHAMPION_HEIGHT_OFFSET;
          const toWorld = hexCenter3D(ch.pos.q, ch.pos.r, toY);

          // Start the animation BEFORE refreshAll so isAnimating is true when
          // buildUnitMeshes runs — the normal mesh skips this champion. Only
          // animate hops fully inside the human's current vision: animating a
          // hop that crosses the vision boundary would reveal the bot's
          // movement through fog the player must not see through.
          if (fac && humanVisible.has(fromKey) && humanVisible.has(key)) {
            queueMovement(ch.id, fromWorld, toWorld, fac, MOVE_DURATION);
          }

          refreshAll();

          // Wait for the animation to complete before stepping to the next hex.
          // +30ms cushion so the champion visibly "lands" before the next lift.
          // 'animation' group: a 'bot'-group wait would never resolve while the
          // bot group is paused, deadlocking the turn lock mid-move.
          await getClock().wait(MOVE_DURATION + ANIMATION_CUSHION_MS, 'animation');
        }

        // The bot may still have AP after arriving (e.g. from a movement-buff
        // feature like the Snowperson). Decide again instead of ending the turn;
        // each move decision consumes at least one hex of AP, so this terminates.
        if (ch.actionPoints > 0) {
          decision = aiDecide(G);
          continue;
        }
        clearGameContext();
        _botFinishTurn();
        endMeasure('runBot');
        return;
      }

      break;
    }

    // Loop exhausted without a handled action (unknown action kind, or a
    // falsy re-decide after a move): finish the turn defensively so the
    // turn lock always releases.
    clearGameContext();
    _botFinishTurn();
    endMeasure('runBot');
  } catch (err) {
    clearGameContext();
    hideBotIndicator();
    setTurnLock(false);
    endMeasure('runBot');
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
  clearGameContext();
  finishTurn(G);
  refreshAll();
  hideBotIndicator();
}
