/**
 * actionWiring/cheats.js — Register data-action handlers for cheat buttons.
 *
 * Layer: dev/ — wires cheats, runtime, and shared.
 */

import { CHEAT_COMBAT_DAMAGE_DEFAULT } from '../../params/devtools/cheatParams.js';
import { registerAction } from '../../shared/actionBus.js';
import { cheatGold10, cheatHp50, cheatHpFull, cheatRelic1, cheatKnot5, cheatPotencyAll } from '../cheats/resources.js';
import { cheatFillMoves, cheatTeleport, cheatToggleMoveMode } from '../cheats/movement.js';
import { cheatRevealFog } from '../cheats/map.js';
import { cheatCombatDamage, cheatCombatWin } from '../cheats/combat.js';
import { refreshAll } from '../../runtime/refreshAll.js';

export function registerCheatActions() {
  registerAction('dev:cheat:gold10', cheatGold10);
  registerAction('dev:cheat:hp50', cheatHp50);
  registerAction('dev:cheat:hpFull', cheatHpFull);
  registerAction('dev:cheat:relic1', cheatRelic1);
  registerAction('dev:cheat:knot5', cheatKnot5);
  registerAction('dev:cheat:potencyAll', cheatPotencyAll);
  registerAction('dev:cheat:fillMoves', cheatFillMoves);
  registerAction('dev:cheat:teleport', cheatTeleport);
  registerAction('dev:cheat:moveMode', cheatToggleMoveMode);

  registerAction('dev:cheat:revealFog', () => {
    cheatRevealFog();
    refreshAll();
  });

  registerAction('dev:cheat:combatDamage', () => {
    const input = document.getElementById('devCombatDmgInput');
    const amount = input ? parseInt(input.value, 10) : CHEAT_COMBAT_DAMAGE_DEFAULT;
    cheatCombatDamage(amount);
  });

  registerAction('dev:cheat:combatWin', cheatCombatWin);
}
