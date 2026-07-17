import { getCombatUI } from './combatStateManager.js';
import { getActiveCombatant, isRevealPhase } from '../../game/combat/combat-index.js';
import { FACTIONS } from '../../core/factions.js';

export function onCombatPotencyHover(factionIdx) {
  // Clear all hover first
  document.querySelectorAll('.ctok').forEach(el => {
    el.classList.remove('potency-hover');
    el.style.transform = '';
  });
  // Highlight matching Potencys on both sides
  if (factionIdx >= 0) {
    const els = document.querySelectorAll('#leftCombat .ctok[data-f="' + factionIdx + '"], #rightCombat .ctok[data-f="' + factionIdx + '"]');
    els.forEach(el => {
      el.classList.add('potency-hover');
      el.style.transform = 'scale(1.15)';
    });
  }
  setPaleyHighlight(factionIdx);
}

const _onPotencyEnter = function (e) {
  const factionIdx = parseInt(e.currentTarget.dataset.f);
  onCombatPotencyHover(factionIdx);
};

const _onPotencyLeave = function () {
  onCombatPotencyHover(-1);
};

export function wireCombatPotencyHover() {
  document.querySelectorAll('.ctok').forEach(el => {
    el.removeEventListener('mouseenter', _onPotencyEnter);
    el.removeEventListener('mouseleave', _onPotencyLeave);
    el.addEventListener('mouseenter', _onPotencyEnter);
    el.addEventListener('mouseleave', _onPotencyLeave);
  });
}

export function renderCombat() {
  const _combatUI = getCombatUI();
  if (!_combatUI) return;
  const {
    attacker, defender, round, phase, roundPicks, roundScores, lastReveal, awaitingPick,
  } = _combatUI;

  const phaseLabels = {
    pick1_attacker: 'Round ' + round + ' — Attacker chooses 1st power',
    pick1_defender: 'Round ' + round + ' — Defender chooses 1st power',
    reveal1: 'Round ' + round + ' — Revealing 1st clash',
    pick2_defender: 'Round ' + round + ' — Defender chooses 2nd power',
    pick2_attacker: 'Round ' + round + ' — Attacker chooses 2nd power',
    reveal2: 'Round ' + round + ' — Revealing final clash',
    round_end: 'Round ' + round + ' complete',
  };
  document.getElementById('combatRoundLabel').textContent =
    phaseLabels[phase] || 'Combat';

  const isPicking = phase.startsWith('pick');
  document.getElementById('leftCombat').innerHTML = combatantCard(
    attacker, true, roundPicks.attacker, phase,
    awaitingPick === 'attacker' && isPicking
  );
  document.getElementById('rightCombat').innerHTML = combatantCard(
    defender, false, roundPicks.defender, phase,
    awaitingPick === 'defender' && isPicking
  );

  updatePickSlots(roundPicks, lastReveal);

  if (isRevealPhase(_combatUI)) {
    document.querySelectorAll('.combat-potencys .ctok').forEach(el => el.style.pointerEvents = 'none');
  } else if (phase === 'round_end') {
    document.querySelectorAll('.combat-potencys .ctok').forEach(el => el.style.pointerEvents = 'none');
  } else {
    document.querySelectorAll('.combat-potencys .ctok').forEach(el => el.style.pointerEvents = '');
  }

  // Commit button
  const commitBtn = document.getElementById('commitCombat');
  if (commitBtn) {
    const active = getActiveCombatant(_combatUI);
    const isHuman = active && active.controller === 'human';
    const currentPicks = roundPicks[awaitingPick];
    const isSecondPick = phase === 'pick2_attacker' || phase === 'pick2_defender';
    const threshold = isSecondPick ? 2 : 1;
    commitBtn.disabled = !isHuman || (currentPicks && currentPicks.length >= threshold);
    commitBtn.textContent = isHuman ? 'Commit Power' : 'Waiting...';
    commitBtn.style.opacity = isHuman ? '1' : '0.6';
  }

  // Wire Potency hover only when picking
  if (isPicking) {
    wireCombatPotencyHover();
  }
}

function updatePickSlots(roundPicks, lastReveal) {
  ['sA1', 'sA2'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    const pick = roundPicks.attacker[i];
    if (pick != null) {
      const fac = FACTIONS[pick];
      el.textContent = fac.glyph + ' ' + fac.name;
      el.style.borderColor = fac.color;
      el.style.background = fac.color + '22';
    } else {
      el.textContent = i === 0 ? 'Pick 1' : 'Pick 2';
      el.style.borderColor = '';
      el.style.background = '';
    }
    if (lastReveal && lastReveal.pickA === pick) el.style.boxShadow = '0 0 8px #5fbf7a';
    else el.style.boxShadow = '';
  });
  ['sB1', 'sB2'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    const pick = roundPicks.defender[i];
    if (pick != null) {
      const fac = FACTIONS[pick];
      el.textContent = fac.glyph + ' ' + fac.name;
      el.style.borderColor = fac.color;
      el.style.background = fac.color + '22';
    } else {
      el.textContent = '???';
      el.style.borderColor = '';
      el.style.background = '';
    }
    if (lastReveal && lastReveal.pickB === pick) el.style.boxShadow = '0 0 8px #5fbf7a';
    else el.style.boxShadow = '';
  });
}

function combatantCard(ent, isLeft, roundPicks, phase, isActivePicker) {
  const isChamp = !!ent.Potencys;
  const pots = isChamp
    ? (() => {
        const t = ent.Potencys.slice();
        t[ent.faction] += ent.relics || 0;
        let weakest = Math.min(...t.filter((_, i) => i !== ent.faction));
        if (!isFinite(weakest)) weakest = 0;
        t[ent.faction] += weakest;
        return t;
      })()
    : ent.potencies;

  const lockedPicks = new Set(roundPicks);
  // Bug fix A: isActivePicker is already correct for defender
  const pickableClass = isActivePicker ? 'pickable' : '';

  return `<h3 style="color:${FACTIONS[ent.faction || 0].color}">${
    ent.name || FACTIONS[ent.faction].name + ' Champion'
  }</h3>
  <div class="hpbar"><div class="hpfill" style="width:${Math.round(
    (ent.hp / ent.maxHp) * 100
  )}%"></div></div>
  <div class="mini">${ent.hp} / ${ent.maxHp} HP</div>
  <div class="combat-potencys">${pots
    .map(
      (v, i) =>
        `<div class="ctok ${lockedPicks.has(i) ? 'used' : ''} ${lockedPicks.has(i) ? '' : pickableClass}" data-f="${i}" style="border-color:${FACTIONS[i].color}66; opacity:${lockedPicks.has(i) ? '0.5' : '1'}"><div style="font-weight:800">${v}</div><div style="font-size:9px;color:${FACTIONS[i].color}">${FACTIONS[i].glyph}</div></div>`
    )
    .join('')}</div>`;
}