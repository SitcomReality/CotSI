import { FACTIONS, potencyWithPrimary } from '../../core/factions.js';

/**
 * Pure view-model transformer for combat state.
 * Takes a combat UI state object (from combatStateManager) and returns a
 * plain data structure suitable for DOM rendering. No DOM, no side-effects.
 *
 * @param {object} ui — combat UI state (attacker, defender, round, phase,
 *   roundPicks, roundScores, lastReveal, awaitingPick, combatLog)
 * @returns {object|null} combatVM or null if ui is null/undefined
 */
export function getCombatVM(ui) {
  if (!ui) return null;
  const {
    attacker,
    defender,
    round = 1,
    phase = '',
    roundPicks = { attacker: [], defender: [] },
    roundScores = { attacker: 0, defender: 0 },
    lastReveal = null,
    awaitingPick = 'attacker',
    combatLog = [],
  } = ui;

  const picking = phase.startsWith('pick');
  const isReveal = phase.startsWith('reveal');
  const activeSide = picking ? awaitingPick : null;

  return {
    roundLabel: getRoundLabel(phase, round),
    phase,
    picking,
    activeSide,
    attacker: combatantVM('attacker', attacker, roundPicks.attacker, phase, activeSide, lastReveal),
    defender: combatantVM('defender', defender, roundPicks.defender, phase, activeSide, lastReveal),
    slots: buildSlots(roundPicks, lastReveal),
    scores: {
      left: roundScores.attacker ?? 0,
      right: roundScores.defender ?? 0,
    },
    log: combatLog,
    commit: {
      enabled: isReveal,
      label: isReveal ? 'Reveal Clash' : 'Waiting\u2026',
    },
  };
}

// ─── helpers ───────────────────────────────────────────────────────────────

const PHASE_LABELS = {
  pick1_attacker: (r) => `Round ${r} — Attacker chooses 1st power`,
  pick1_defender: (r) => `Round ${r} — Defender chooses 1st power`,
  reveal1:        (r) => `Round ${r} — Revealing 1st clash`,
  pick2_defender: (r) => `Round ${r} — Defender chooses 2nd power`,
  pick2_attacker: (r) => `Round ${r} — Attacker chooses 2nd power`,
  reveal2:        (r) => `Round ${r} — Revealing final clash`,
  round_end:      (r) => `Round ${r} complete`,
};

function getRoundLabel(phase, round) {
  const fn = PHASE_LABELS[phase];
  return fn ? fn(round) : 'Combat';
}

/**
 * Build a combatant view-model from an entity.
 * @param {'attacker'|'defender'} side
 * @param {object|null} ent       — creature/champion entity
 * @param {number[]} roundPicks   — picks this combatant has made this round
 * @param {string} phase          — current combat phase
 * @param {string|null} activeSide — which side is currently picking, or null
 * @param {object|null} lastReveal
 * @returns {object} combatantVM or a placeholder if ent is null
 */
function combatantVM(side, ent, roundPicks, phase, activeSide, lastReveal) {
  if (!ent) {
    return {
      name: '???',
      factionColor: '#888',
      hp: 0,
      maxHp: 1,
      hpPct: 0,
      pots: [],
    };
  }

  const fac = FACTIONS[ent.faction];
  const pots = potencyWithPrimary(ent);
  const lockedPicks = new Set(roundPicks || []);
  const isActivePicker = side === activeSide && phase.startsWith('pick');

  return {
    name: ent.name || fac.name + ' Champion',
    factionColor: fac.color,
    hp: ent.hp,
    maxHp: ent.maxHp,
    hpPct: Math.min(100, Math.max(0, Math.round((ent.hp / ent.maxHp) * 100))),
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
 * Build the four pick-slot view-models.
 * @param {{ attacker: number[], defender: number[] }} roundPicks
 * @param {object|null} lastReveal
 * @returns {{ a1, a2, b1, b2 }}
 */
function buildSlots(roundPicks, lastReveal) {
  const aPicks = roundPicks.attacker || [];
  const bPicks = roundPicks.defender || [];

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
    a1: slot(aPicks, 'pickA', 0),
    a2: slot(aPicks, 'pickA', 1),
    b1: slot(bPicks, 'pickB', 0),
    b2: slot(bPicks, 'pickB', 1),
  };
}