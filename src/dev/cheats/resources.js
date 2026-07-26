/**
 * cheats/resources.js — Resource cheat functions.
 *
 * Layer: dev/ — imports game/state.
 */

import { CHEAT_GOLD_AMOUNT, CHEAT_HP_HEAL_AMOUNT, CHEAT_RELIC_AMOUNT, CHEAT_KNOT_AMOUNT, CHEAT_POTENCY_AMOUNT } from '../../params/dev/cheatParams.js';
import { currentChamp } from '../../game/state/liveGame.js';
import { toast } from '../../ui/hud.js';

export function cheatGold10() {
  const ch = currentChamp();
  if (!ch) { console.warn('[devCheats] no active champion'); return; }
  ch.gold += CHEAT_GOLD_AMOUNT;
  toast('+10 gold');
}

export function cheatHp50() {
  const ch = currentChamp();
  if (!ch) return;
  ch.hp = Math.min(ch.maxHp, ch.hp + CHEAT_HP_HEAL_AMOUNT);
  toast('+50 HP');
}

export function cheatHpFull() {
  const ch = currentChamp();
  if (!ch) return;
  ch.hp = ch.maxHp;
  toast('HP fully restored');
}

export function cheatRelic1() {
  const ch = currentChamp();
  if (!ch) return;
  ch.relics += CHEAT_RELIC_AMOUNT;
  toast('+1 relic');
}

export function cheatKnot5() {
  const ch = currentChamp();
  if (!ch) return;
  ch.knot += CHEAT_KNOT_AMOUNT;
  toast("+5 God's Knot");
}

export function cheatPotencyAll() {
  const ch = currentChamp();
  if (!ch) return;
  for (let i = 0; i < ch.potencies.length; i++) {
    ch.potencies[i] += CHEAT_POTENCY_AMOUNT;
  }
  toast('+3 all potency');
}
