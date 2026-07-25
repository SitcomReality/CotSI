/**
 * devCheats.js — Barrel re-export.
 *
 * This file is kept as a thin pass-through for backward compatibility.
 * All implementation now lives in src/dev/cheats/.
 */
export { devState } from './cheats/index.js';
export {
  cheatGold10,
  cheatHp50,
  cheatHpFull,
  cheatRelic1,
  cheatKnot5,
  cheatPotencyAll,
  cheatFillMoves,
  cheatTeleport,
  cheatRevealFog,
  cheatCombatDamage,
  cheatCombatWin,
  teleportToHex,
} from './cheats/index.js';
