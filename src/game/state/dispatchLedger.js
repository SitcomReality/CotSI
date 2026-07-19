/**
 * dispatchLedger.js — Per-champion record of resource changes for the Augur's Dispatch.
 * Entries accumulate between a champion's turns and are drained into the
 * dispatch report at beginTurn. Each entry is { text, sign } with
 * sign: 'gain' | 'loss' | 'neutral' (used for ledger line tones).
 */

/**
 * Append a ledger entry for a champion. No-op for bots — their ledgers
 * are never displayed, so they never fill.
 *
 * @param {Object} champ
 * @param {string} text — display-ready line, e.g. '+9 gold — night dig'
 * @param {'gain'|'loss'|'neutral'} [sign='neutral']
 */
export function recordLedgerEntry(champ, text, sign = 'neutral') {
  if (!champ || champ.controller !== 'human') return;
  if (!champ.dispatchLedger) champ.dispatchLedger = [];
  champ.dispatchLedger.push({ text, sign });
}

/**
 * Return all accumulated ledger entries for a champion and clear the list.
 *
 * @param {Object} champ
 * @returns {Array<{text: string, sign: string}>}
 */
export function drainLedger(champ) {
  if (!champ) return [];
  const entries = champ.dispatchLedger || [];
  champ.dispatchLedger = [];
  return entries;
}
