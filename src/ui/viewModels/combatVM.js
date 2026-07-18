import { FACTIONS, potencyWithPrimary } from '../../core/factions.js';
import { sideOf } from '../../game/combat/combat-index.js';

/**
 * Pure view-model transformer for combat state.
 * Takes the combat state object (from combatStateManager) and returns a
 * plain data structure suitable for DOM rendering. No DOM, no side-effects.
 *
 * @param {object} combat — combat state (attacker, defender, first, second,
 *   round, phase, exchanges, roundScores, lastReveal, awaitingSide, combatLog)
 * @returns {object|null} combatVM or null if ui is null/undefined
 */
export function getCombatVM(combat) {
  if (!combat) return null;
  const {
    attacker,
    defender,
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
  const isReveal = phase.startsWith('reveal');
  const activeSide = picking ? awaitingSide : null;

  // Determine which side is the initiator (attacker marker)
  const attackerSide = sideOf(combat, attacker);

  return {
    roundLabel: getRoundLabel(phase, round),
    phase,
    picking,
    activeSide,
    first: combatantVM(combat, 'first', first, exchanges, phase, activeSide, lastReveal, attackerSide),
    second: combatantVM(combat, 'second', second, exchanges, phase, activeSide, lastReveal, attackerSide),
    slots: buildSlots(exchanges, lastReveal),
    scores: {
      left: first === attacker ? (roundScores.attacker ?? 0) : (roundScores.defender ?? 0),
      right: second === attacker ? (roundScores.attacker ?? 0) : (roundScores.defender ?? 0),
    },
    log: combatLog,
  };
}

// ─── helpers ───────────────────────────────────────────────────────────────

const PHASE_LABELS = {
  pick1_first:  (r) => `Round ${r} — First chooses 1st power`,
  pick1_second: (r) => `Round ${r} — Second chooses 1st power`,
  reveal1:      (r) => `Round ${r} — Revealing 1st clash`,
  pick2_second: (r) => `Round ${r} — Second chooses 2nd power`,
  pick2_first:  (r) => `Round ${r} — First chooses 2nd power`,
  reveal2:      (r) => `Round ${r} — Revealing final clash`,
  round_end:    (r) => `Round ${r} complete`,
};

function getRoundLabel(phase, round) {
  const fn = PHASE_LABELS[phase];
  return fn ? fn(round) : 'Combat';
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
      glyph: FACTIONS[idx].glyph,
      color: FACTIONS[idx].color,
      used: lockedPicks.has(idx),
      unavailable: val <= 0 || lockedPicks.has(idx),
      pickable: isActivePicker && val > 0 && !lockedPicks.has(idx),
    })),
  };
}

/**
 * Build the four pick-slot view-models from exchanges.
 * @param {Array} exchanges — combat.exchanges
 * @param {object|null} lastReveal
 * @returns {{ a1, a2, b1, b2 }}
 */
function buildSlots(exchanges, lastReveal) {
  const aPicks = [ exchanges[0]?.picks?.first ?? null, exchanges[1]?.picks?.first ?? null ];
  const bPicks = [ exchanges[0]?.picks?.second ?? null, exchanges[1]?.picks?.second ?? null ];

  const slot = (picks, revealKey, index) => {
    const pick = picks[index];
    const revealed = lastReveal != null && lastReveal[revealKey] === pick;
    return {
      text: pick != null
        ? FACTIONS[pick].glyph + ' ' + FACTIONS[pick].name
        : '',
      factionIdx: pick != null ? pick : null,
      revealed,
    };
  };

  return {
    a1: slot(aPicks, 'first', 0),
    a2: slot(aPicks, 'first', 1),
    b1: slot(bPicks, 'second', 0),
    b2: slot(bPicks, 'second', 1),
  };
}