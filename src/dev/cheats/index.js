/**
 * cheats/index.js — Barrel re-export for dev cheat functions.
 *
 * Exposes the same public API that was previously in devCheats.js,
 * now split across focused submodules.
 */
export { devState } from './state.js';
export { cheatGold10, cheatHp50, cheatHpFull, cheatRelic1, cheatKnot5, cheatPotencyAll } from './resources.js';
export { cheatFillMoves, cheatTeleport, teleportToHex } from './movement.js';
export { cheatRevealFog } from './map.js';
export { cheatCombatDamage, cheatCombatWin } from './combat.js';
