import { beats } from '../game/rules/factionData.js';

/**
 * Precomputed balanced triples for 3P mode: index = (a*7 + b) → c[]
 * A triple (a,b,c) is balanced when each has exactly 1 win / 1 loss
 * against the other two.
 */
export const BALANCED_3P = (() => {
  const map = {};
  for (let a = 0; a < 7; a++) {
    for (let b = 0; b < 7; b++) {
      if (b === a) continue;
      const key = a < b ? a * 7 + b : b * 7 + a;
      if (map[key] !== undefined) continue;
      const valid = [];
      for (let c = 0; c < 7; c++) {
        if (c === a || c === b) continue;
        const winsA = (beats(a, b) ? 1 : 0) + (beats(a, c) ? 1 : 0);
        const winsB = (beats(b, a) ? 1 : 0) + (beats(b, c) ? 1 : 0);
        const winsC = (beats(c, a) ? 1 : 0) + (beats(c, b) ? 1 : 0);
        if (winsA === 1 && winsB === 1 && winsC === 1) {
          valid.push(c);
        }
      }
      map[key] = valid;
    }
  }
  return map;
})();

/** Trait icon map — each faction's trait gets a representative icon */
export const TRAIT_ICONS = {
  0: 'i-armor',       // CRU: Scarshield → shield
  1: 'i-potency',     // REV: Another's Dream → star/potency
  2: 'i-move',        // VER: Gaia's Wail → move
  3: 'i-relic',       // ARC: Everknown → relic
  4: 'i-gold',        // HRT: Compersion → gold
  5: 'd-seal',        // MSK: Silent Ovation → seal/mask
  6: 'i-heal',        // HOL: Vaunted Nothing → heal (HP scaling)
};

/** Trait descriptions with icons — indexed by faction id */
export const TRAIT_DESCS = [
  { icon: 'i-armor',   text: 'Reduce enemy score' },
  { icon: 'i-potency', text: 'Random dawn boon' },
  { icon: 'i-move',    text: '+1 move, pacify mobs' },
  { icon: 'i-relic',   text: 'Relic → random potency' },
  { icon: 'i-gold',    text: 'Trade -20% cost' },
  { icon: 'd-seal',    text: 'Combat bonus each week' },
  { icon: 'i-heal',    text: 'HP scaling bonus' },
];
