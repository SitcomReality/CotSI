import { FACTIONS, potencyWithPrimary } from '../../game/rules/factionData.js';
import { sideOf, entityFor } from '../../game/state/combat/index.js';

/**
 * Pure view-model transformer for combat state.
 * Takes the combat state object (from combatUiState) and returns a
 * plain data structure suitable for DOM rendering. No DOM, no side-effects.
 *
 * @param {object} combat — combat state (attacker, defender, first, second,
 *   round, phase, exchanges, roundScores, lastReveal, awaitingSide, combatLog)
 * @param {object} [options]
 * @param {string|null} [options.humanSide] — 'first', 'second', or null if
 *   no local human participant (mob-vs-mob or observer)
 * @returns {object|null} combatVM or null if ui is null/undefined
 */
export function getCombatVM(combat, { humanSide } = {}) {
  if (!combat) return null;
  const {
    attacker,
    first,
    second,
    round = 1,
    phase = '',
    exchanges = [{ picks: { first: null, second: null } }, { picks: { first: null, second: null } }],
    roundScores = { attacker: 0, defender: 0 },
    lastReveal = null,
    awaitingSide = null,
    combatLog = [],
  } = combat;

  const picking = phase.startsWith('pick');
  const activeSide = picking ? awaitingSide : null;

  // Determine which side is the initiator (attacker marker)
  const attackerSide = sideOf(combat, attacker);

  const firstVM = combatantVM(combat, 'first', first, exchanges, phase, activeSide, lastReveal, attackerSide);
  const secondVM = combatantVM(combat, 'second', second, exchanges, phase, activeSide, lastReveal, attackerSide);

  return {
    roundLabel: getRoundLabel(phase, round),
    phase,
    picking,
    activeSide,
    awaitingSide,
    awaitingPrompt: buildAwaitingPrompt(combat, humanSide),
    canFlee: round > 1,
    first: firstVM,
    second: secondVM,
    slots: buildSlots(exchanges, lastReveal, phase, humanSide),
    scores: buildScores(roundScores, attackerSide, first, second),
    order: buildOrder(first, second),
    exchangeScores: buildExchangeScores(lastReveal),
    log: combatLog,
  };
}

// ─── helpers ───────────────────────────────────────────────────────────────

const PHASE_LABELS = {
  pick1:    (r) => `Round ${r} — Exchange 1, choose in secret`,
  reveal1:  (r) => `Round ${r} — Revealing first clash`,
  pick2:    (r) => `Round ${r} — Exchange 2, choose in secret`,
  reveal2:  (r) => `Round ${r} — Revealing final clash`,
  roundEnd: (r) => `Round ${r} complete`,
};

function getRoundLabel(phase, round) {
  const fn = PHASE_LABELS[phase];
  return fn ? fn(round) : 'Combat';
}

/**
 * Build the awaiting-prompt text shown below the VS cell.
 * Returns empty string when not in a pick phase, or when awaitingSide is null.
 */
function buildAwaitingPrompt(combat, humanSide) {
  const phase = combat.phase;
  if (phase !== 'pick1' && phase !== 'pick2') return '';
  const side = combat.awaitingSide;
  if (!side) return '';
  if (side === humanSide) {
    const entity = entityFor(combat, side);
    return entity ? `${entity.name} — choose in secret` : 'Choose in secret';
  }
  return 'Opponent is choosing…';
}

/**
 * Build a combatant view-model from an entity.
 * @param {object} combat — combat state (for sideOf)
 * @param {'first'|'second'} side
 * @param {object|null} ent       — creature/champion entity
 * @param {Array} exchanges       — combat.exchanges
 * @param {string} phase          — current combat phase
 * @param {string|null} activeSide — which side is currently picking, or null
 * @param {object|null} lastReveal
 * @param {string|null} attackerSide — which side is the attacker ('first'|'second'|null)
 * @returns {object} combatantVM or a placeholder if ent is null
 */
function combatantVM(combat, side, ent, exchanges, phase, activeSide, lastReveal, attackerSide) {
  if (!ent) {
    return {
      side,
      entity: null,
      name: '???',
      factionColor: '#888',
      hp: 0,
      maxHp: 1,
      hpPct: 0,
      pots: [],
      roleLabel: side === 'first' ? 'First' : 'Second',
      isAttacker: side === attackerSide,
    };
  }

  const fac = FACTIONS[ent.faction];
  const pots = potencyWithPrimary(ent);

  // Gather this combatant's picks from both exchanges
  const allPicks = [];
  for (const exchange of exchanges) {
    const pick = exchange.picks[side];
    if (pick != null) allPicks.push(pick);
  }
  const lockedPicks = new Set(allPicks);

  const isActivePicker = side === activeSide && phase.startsWith('pick');

  return {
    side,
    entity: ent,
    name: ent.name || fac.name + ' Champion',
    factionColor: fac.color,
    hp: ent.hp,
    maxHp: ent.maxHp,
    hpPct: Math.min(100, Math.max(0, Math.round((ent.hp / ent.maxHp) * 100))),
    roleLabel: side === 'first' ? 'First' : 'Second',
    isAttacker: side === attackerSide,
    pots: pots.map((val, idx) => ({
      idx,
      val,
      glyphId: FACTIONS[idx].glyphId,
      glyph: FACTIONS[idx].textGlyph,
      color: FACTIONS[idx].color,
      used: lockedPicks.has(idx),
      unavailable: val <= 0 || lockedPicks.has(idx),
      pickable: isActivePicker && val > 0 && !lockedPicks.has(idx),
    })),
  };
}

// ─── Exchange reveal helpers ─────────────────────────────────────────────

/**
 * Determine whether a given exchange's picks have been revealed to both sides.
 *
 * @param {string} phase — combat.phase
 * @param {number} exchangeIndex — 0 (first exchange) or 1 (second exchange)
 * @returns {boolean}
 */
function isExchangeRevealed(phase, exchangeIndex) {
  if (exchangeIndex === 0) {
    return (
      phase === 'reveal1' ||
      phase === 'pick2' ||
      phase === 'reveal2' ||
      phase === 'roundEnd'
    );
  }
  if (exchangeIndex === 1) {
    return phase === 'reveal2' || phase === 'roundEnd';
  }
  return false;
}

function formatPick(factionIdx) {
  if (factionIdx == null) return '';
  return FACTIONS[factionIdx].textGlyph + ' ' + FACTIONS[factionIdx].name;
}

/**
 * Build the four pick-slot view-models from exchanges.
 * Implements hidden-slot logic: own picks visible immediately, opponent picks
 * hidden until their exchange's reveal phase.
 *
 * @param {Array} exchanges       — combat.exchanges
 * @param {object|null} lastReveal
 * @param {string} phase          — current combat phase
 * @param {string|null} humanSide — 'first', 'second', or null (no local human)
 * @returns {{ a1, a2, b1, b2 }} Each slot has { f, hidden, revealed, label, text, factionIdx, exchange, side, isPlaceholder }
 */
function buildSlots(exchanges, lastReveal, phase, humanSide) {
  const aPicks = [exchanges[0]?.picks?.first ?? null, exchanges[1]?.picks?.first ?? null];
  const bPicks = [exchanges[0]?.picks?.second ?? null, exchanges[1]?.picks?.second ?? null];

  const slot = (side, exchangeIndex) => {
    const pick = side === 'first' ? aPicks[exchangeIndex] : bPicks[exchangeIndex];
    const revealed = isExchangeRevealed(phase, exchangeIndex);
    const isOwnSide = side === humanSide;
    const hasPick = pick != null;
    const hidden = hasPick && !isOwnSide && !revealed;

    const label = hidden ? '???' : (hasPick ? formatPick(pick) : '');
    const isPlaceholder = !hasPick;

    return {
      f: pick,
      hidden,
      revealed,
      label,
      text: label, // legacy alias for renderer compatibility
      factionIdx: hasPick ? pick : null,
      exchange: exchangeIndex + 1,
      side,
      isPlaceholder,
    };
  };

  return {
    a1: slot('first', 0),
    a2: slot('first', 1),
    b1: slot('second', 0),
    b2: slot('second', 1),
  };
}

// ─── Scores ──────────────────────────────────────────────────────────────

/**
 * Map roundScores (keyed by attacker/defender) to left/right display.
 * left = first's score, right = second's score.
 */
function buildScores(roundScores, attackerSide, first, second) {
  if (attackerSide === 'first') {
    return {
      left: roundScores.attacker ?? 0,
      right: roundScores.defender ?? 0,
    };
  }
  // Attacker is second (or unknown) → swap
  return {
    left: roundScores.defender ?? 0,
    right: roundScores.attacker ?? 0,
  };
}

// ─── Order data ──────────────────────────────────────────────────────────

function buildOrder(first, second) {
  return {
    firstName: first?.name || '???',
    secondName: second?.name || '???',
    text: `${first?.name || '???'} acts first · ${second?.name || '???'} second`,
    key: `${first?.id || '?'}:${second?.id || '?'}`,
  };
}

// ─── Determines which side is human ──────────────────────────────────────

/**
 * Determine which side ('first' | 'second' | null) has `controller === 'human'`.
 * Used by the renderer to pass as humanSide to getCombatVM.
 *
 * @param {object} combat — combat state object
 * @returns {string|null}
 */
export function getHumanSide(combat) {
  if (!combat) return null;
  if (combat.first?.controller === 'human') return 'first';
  if (combat.second?.controller === 'human') return 'second';
  return null;
}

// ─── Exchange scores (prep for FX count-up) ──────────────────────────────

function buildExchangeScores(lastReveal) {
  if (!lastReveal) return null;

  const running = lastReveal.runningTotals;
  if (!running) return null;

  // lastReveal contains the most recent exchange's individual scores
  // and running totals. Exchange 2's data will populate after reveal2
  // processes. For now, shape the structure; exchange 2 may be null
  // until its reveal data arrives.
  return {
    1: {
      firstDelta: lastReveal.first?.score ?? 0,
      secondDelta: lastReveal.second?.score ?? 0,
      firstRunningTotal: running.attacker ?? 0,
      secondRunningTotal: running.defender ?? 0,
    },
    2: null,
  };
}
