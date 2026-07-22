/**
 * headerStates.js — Pure data derivation for champion turn states.
 *
 * Exports:
 *   championStates(G)  — maps champion id → 'current' | 'played' | 'waiting' | 'dead'
 */

/**
 * Map champion id → 'current' | 'played' | 'waiting' | 'dead'.
 * Champions before the active one in currentOrder have already played.
 */
export function championStates(G) {
  const states = {};
  const order = G.currentOrder;
  const activeIdx = order.indexOf(G.activeChampionId);

  for (const c of G.champions) {
    if (!c.alive) {
      states[c.id] = 'dead';
      continue;
    }
    const idx = order.indexOf(c.id);
    if (idx === -1) {
      states[c.id] = 'waiting';
      continue;
    }
    if (idx === activeIdx) states[c.id] = 'current';
    else if (idx < activeIdx) states[c.id] = 'played';
    else states[c.id] = 'waiting';
  }
  return states;
}
