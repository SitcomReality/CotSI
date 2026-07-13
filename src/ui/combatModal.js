import { FACTIONS, beats } from '../core/factions.js';
import { setPaleyHighlight } from './paleyWidget.js';
import {
  createCombatState,
  getActiveCombatant,
  isPickingPhase,
  isRevealPhase,
  recordCombatPick,
  advanceCombatPhase,
  processReveal,
  resolveRoundDamage,
  nextCombatRound,
  botCombatPick,
  getAvailablePicks,
  finalizeCombat,
  applyFinalBonuses,
} from '../game/combat.js';
import { getChampion, addLog } from '../game/state.js';
import { openArtifactChoiceModal as _openArtifactChoiceModal } from './modal.js';

// --- Internal state ---
let _G = null;
let _combatUI = null;
let _refreshAll = null;
let _toast = null;

/**
 * Update the game state reference (called when a new game begins).
 */
export function setGameState(g) {
  _G = g;
}

/**
 * Wire the combat modal to app callbacks.
 */
export function initCombatModal(deps) {
  _refreshAll = deps.refreshAll;
  _toast = deps.toast;
}

// --- Public API ---

export function startCombat(attacker, defender) {
  _combatUI = createCombatState(attacker, defender);
  openCombatModal();
}

export function openCombatModal() {
  document.getElementById('combatModal').style.display = 'flex';
  renderCombat();
}

export function closeCombat() {
  document.getElementById('combatModal').style.display = 'none';
  _combatUI = null;
}

// --- Bidirectional Paley sync: paleyWidget → combat tokens ---
// Called by paleyWidget when user hovers a node; calls onCombatTokenHover.
window._onPaleyHover = function (factionIdx) {
  if (_combatUI) {
    onCombatTokenHover(factionIdx);
  }
};

// --- Rendering ---

function renderCombat() {
  if (!_combatUI) return;
  const {
    attacker,
    defender,
    round,
    phase,
    roundPicks,
    roundScores,
    lastReveal,
    awaitingPick,
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

  document.getElementById('leftCombat').innerHTML = combatantCard(
    attacker,
    true,
    roundPicks.attacker,
    phase,
    awaitingPick === 'attacker' && isPickingPhase(_combatUI)
  );
  document.getElementById('rightCombat').innerHTML = combatantCard(
    defender,
    false,
    roundPicks.defender,
    phase,
    awaitingPick === 'defender' && isPickingPhase(_combatUI)
  );

  updatePickSlots(roundPicks, lastReveal);

  if (isRevealPhase(_combatUI)) {
    document.querySelectorAll('.combat-tokens .ctok').forEach((el) => {
      el.style.pointerEvents = 'none';
    });
    setTimeout(() => processRevealPhase(), 600);
    return;
  }
  document
    .querySelectorAll('.combat-tokens .ctok')
    .forEach((el) => (el.style.pointerEvents = ''));

  if (phase === 'round_end') {
    document.querySelectorAll('.combat-tokens .ctok').forEach((el) => {
      el.style.pointerEvents = 'none';
    });
    setTimeout(() => handleRoundEnd(), 800);
    return;
  }

  const commitBtn = document.getElementById('commitCombat');
  if (commitBtn) {
    const active = getActiveCombatant(_combatUI);
    const isHuman = active.controller === 'human';
    const currentPicks = roundPicks[awaitingPick];
    commitBtn.disabled = !isHuman || currentPicks.length >= 1;
    commitBtn.textContent = isHuman ? 'Commit Power' : 'Waiting...';
    commitBtn.style.opacity = isHuman ? '1' : '0.6';
  }

  if (isPickingPhase(_combatUI)) {
    wireCombatTokenHover();
    const active = getActiveCombatant(_combatUI);
    if (active.controller === 'bot') {
      setTimeout(() => makeBotPick(), 500);
    }
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
    if (lastReveal && lastReveal.pickA === pick) {
      el.style.boxShadow = '0 0 8px #5fbf7a';
    } else {
      el.style.boxShadow = '';
    }
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
    if (lastReveal && lastReveal.pickB === pick) {
      el.style.boxShadow = '0 0 8px #5fbf7a';
    } else {
      el.style.boxShadow = '';
    }
  });
}

function processRevealPhase() {
  if (!_combatUI || !isRevealPhase(_combatUI)) return;
  const reveal = processReveal(_G, _combatUI);
  if (reveal) {
    document.getElementById('csLeft').textContent =
      _combatUI.roundScores.attacker;
    document.getElementById('csRight').textContent =
      _combatUI.roundScores.defender;
    document.getElementById('combatLog').textContent =
      reveal.logA + '  vs  ' + reveal.logB;
    animateReveal(reveal);
  }
  setTimeout(() => {
    advanceCombatPhase(_combatUI);
    renderCombat();
  }, 1200);
}

function animateReveal(reveal) {
  const leftSlots = document.querySelectorAll('#leftCombat .ctok');
  const rightSlots = document.querySelectorAll('#rightCombat .ctok');
  leftSlots.forEach((el) => {
    if (+el.dataset.f === reveal.pickA) el.style.transform = 'scale(1.15)';
  });
  rightSlots.forEach((el) => {
    if (+el.dataset.f === reveal.pickB) el.style.transform = 'scale(1.15)';
  });
  setTimeout(() => {
    leftSlots.forEach((el) => (el.style.transform = ''));
    rightSlots.forEach((el) => (el.style.transform = ''));
  }, 1000);
}

function handleRoundEnd() {
  if (!_combatUI || _combatUI.phase !== 'round_end') return;

  const { attacker, defender, roundScores } = _combatUI;
  const { scoreA, scoreB } = applyFinalBonuses(
    _G,
    attacker,
    defender,
    roundScores.attacker,
    roundScores.defender
  );
  _combatUI.roundScores.attacker = scoreA;
  _combatUI.roundScores.defender = scoreB;

  document.getElementById('csLeft').textContent = scoreA;
  document.getElementById('csRight').textContent = scoreB;

  const dmgResult = resolveRoundDamage(_G, _combatUI);
  document.getElementById('combatLog').textContent =
    `Round ${_combatUI.round} damage: ${
      dmgResult.to === 'attacker' ? attacker.name : defender.name
    } takes ${dmgResult.damage}`;

  if (dmgResult.defenderDead) {
    const rew = finalizeCombat(_G, attacker, defender, true);
    closeCombat();
    openRewardModal(attacker, rew);
    _refreshAll();
    return;
  }
  if (dmgResult.attackerDead) {
    closeCombat();
    _refreshAll();
    _toast('You were defeated.', true);
    return;
  }

  setTimeout(() => {
    nextCombatRound(_combatUI);
    renderCombat();
  }, 1500);
}

function makeBotPick() {
  if (!_combatUI || !isPickingPhase(_combatUI)) return;
  const active = getActiveCombatant(_combatUI);
  if (active.controller !== 'bot') return;

  const available = getAvailablePicks(active);
  const opponent =
    _combatUI.awaitingPick === 'attacker'
      ? _combatUI.defender
      : _combatUI.attacker;
  const opponentPicks =
    _combatUI.roundPicks[
      _combatUI.awaitingPick === 'attacker' ? 'defender' : 'attacker'
    ];
  const pick = botCombatPick(active, opponentPicks, available);

  recordCombatPick(_combatUI, pick);
  advanceCombatPhase(_combatUI);
  renderCombat();
}

// --- Globals for HTML onclick handlers ---

window.commitCombat = function () {
  if (!_combatUI || !isPickingPhase(_combatUI)) return;
  const active = getActiveCombatant(_combatUI);
  if (active.controller !== 'human') return;

  const selectedEls = document.querySelectorAll(
    '#leftCombat .ctok.sel, #rightCombat .ctok.sel'
  );
  if (selectedEls.length === 0) {
    _toast('Select a power first!');
    return;
  }
  const pick = +selectedEls[0].dataset.f;

  recordCombatPick(_combatUI, pick);
  advanceCombatPhase(_combatUI);
  renderCombat();
};

window.closeReward = function () {
  document.getElementById('rewardModal').style.display = 'none';
};

// --- Combatant card ---

function combatantCard(ent, isLeft, roundPicks, phase, isActivePicker) {
  const isChamp = !!ent.tokens;
  const pots = isChamp
    ? (() => {
        const t = ent.tokens.slice();
        t[ent.faction] += ent.relics || 0;
        let weakest = Math.min(
          ...t.filter((_, i) => i !== ent.faction)
        );
        if (!isFinite(weakest)) weakest = 0;
        t[ent.faction] += weakest;
        return t;
      })()
    : ent.potencies;

  const lockedPicks = new Set(roundPicks);

  return `<h3 style="color:${FACTIONS[ent.faction || 0].color}">${
    ent.name || FACTIONS[ent.faction].name + ' Champion'
  }</h3>
  <div class="hpbar"><div class="hpfill" style="width:${Math.round(
    (ent.hp / ent.maxHp) * 100
  )}%"></div></div>
  <div class="mini">${ent.hp} / ${ent.maxHp} HP</div>
  <div class="combat-tokens">${pots
    .map(
      (v, i) =>
        `<div class="ctok ${lockedPicks.has(i) ? 'used' : ''} ${
          isLeft && isActivePicker && !lockedPicks.has(i)
            ? 'pickable'
            : ''
        }" data-f="${i}" style="border-color:${FACTIONS[i]
          .color}66; opacity:${lockedPicks.has(i) ? '0.5' : '1'}"><div style="font-weight:800">${v}</div><div style="font-size:9px;color:${FACTIONS[i].color}">${FACTIONS[i].glyph}</div></div>`
    )
    .join('')}</div>`;
}

// --- Token hover / pick interaction ---

function wireCombatTokenHover() {
  document.querySelectorAll('.combat-tokens .ctok:not(.used)').forEach((el) => {
    // Remove old listeners by replacing with clone
    const newEl = el.cloneNode(true);
    el.parentNode.replaceChild(newEl, el);
    newEl.addEventListener('mouseenter', () =>
      onCombatTokenHover(+newEl.dataset.f)
    );
    newEl.addEventListener('mouseleave', () => onCombatTokenHover(-1));
    newEl.addEventListener('click', () => {
      if (newEl.classList.contains('pickable')) {
        document
          .querySelectorAll('.combat-tokens .ctok')
          .forEach((e) => e.classList.remove('sel'));
        newEl.classList.add('sel');
      }
    });
  });
}

function onCombatTokenHover(factionIdx) {
  document.querySelectorAll('.combat-tokens .ctok').forEach((el) => {
    const f = +el.dataset.f;
    if (factionIdx === -1) {
      el.style.boxShadow = '';
      el.style.transform = '';
      el.style.zIndex = '';
      el.style.opacity = '';
    } else if (f === factionIdx) {
      el.style.boxShadow = '0 0 12px #5fbf7a, 0 0 24px #5fbf7a88';
      el.style.transform = 'scale(1.12)';
      el.style.zIndex = '10';
    } else if (beats(factionIdx, f)) {
      el.style.boxShadow = '0 0 8px #5fbf7a88';
      el.style.opacity = '0.9';
    } else if (beats(f, factionIdx)) {
      el.style.boxShadow = '0 0 8px #c44';
      el.style.opacity = '0.7';
    } else {
      el.style.opacity = '0.4';
    }
  });
  setPaleyHighlight(factionIdx);
}

// --- Reward & artifact modals ---

function openRewardModal(champ, rew) {
  if (champ.controller !== 'human' || !rew) return;
  document.getElementById('rewardTitle').textContent = 'Combat Victory';
  document.getElementById('rewardBody').textContent = `Relic secured. +${rew.gold} gold.`;
  document.getElementById('rewardModal').style.display = 'flex';
}

export function openArtifactChoiceModal(reward) {
  _openArtifactChoiceModal(reward, (choice) => {
    const ch = getChampion(_G, reward.championId);
    if (ch) {
      ch.artifact = choice.artifactId;
      ch.offeredArtifact = true;
      addLog(_G, `${ch.name} claims the ${choice.label}.`);
      _G.reward = null;
      _refreshAll();
    }
  });
}

export function openTrader(tr) {
  _toast('Trader: Moonberry 14g • Token 22g • Weapon 34g');
}