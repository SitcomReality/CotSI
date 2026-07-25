/**
 * cheats/resources.js — Resource cheat functions.
 *
 * Layer: dev/ — imports game/state.
 */

import { currentChamp } from '../../game/state/liveGame.js';
import { toast } from '../../ui/hud.js';

export function cheatGold10() {
  const ch = currentChamp();
  if (!ch) { console.warn('[devCheats] no active champion'); return; }
  ch.gold += 10;
  toast('+10 gold');
}

export function cheatHp50() {
  const ch = currentChamp();
  if (!ch) return;
  ch.hp = Math.min(ch.maxHp, ch.hp + 50);
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
  ch.relics += 1;
  toast('+1 relic');
}

export function cheatKnot5() {
  const ch = currentChamp();
  if (!ch) return;
  ch.knot += 5;
  toast("+5 God's Knot");
}

export function cheatPotencyAll() {
  const ch = currentChamp();
  if (!ch) return;
  for (let i = 0; i < ch.potencies.length; i++) {
    ch.potencies[i] += 3;
  }
  toast('+3 all potency');
}
