import { getCombatUI } from './combatStateManager.js';
import { getCombatVM } from '../viewModels/combatVM.js';
import { FACTIONS } from '../../core/factions.js';
import { setHeptagramHighlight } from '../heptagramWidget.js';
import { h } from '../utils/dom.js';

export function renderCombat() {
  const _combatUI = getCombatUI();
  if (!_combatUI) return;
  const vm = getCombatVM(_combatUI);
  if (!vm) return;

  // Round label
  document.getElementById('combatRoundLabel').textContent = vm.roundLabel;

  // Combatant cards – rebuild from VM
  document.getElementById('leftCombat').replaceChildren(
    combatantCard(vm.attacker, vm.activeSide === 'attacker', vm.phase)
  );
  document.getElementById('rightCombat').replaceChildren(
    combatantCard(vm.defender, vm.activeSide === 'defender', vm.phase)
  );

  // Pick slots
  updatePickSlots(vm.slots);

  // Scores
  document.getElementById('csLeft').textContent = vm.scores.left;
  document.getElementById('csRight').textContent = vm.scores.right;

  // Log (last entry)
  const logEl = document.getElementById('combatLog');
  if (logEl) {
    logEl.textContent = vm.log.length > 0 ? vm.log[vm.log.length - 1] : '';
  }

  // Commit button
  const commitBtn = document.getElementById('commitCombat');
  if (commitBtn) {
    commitBtn.disabled = !vm.commit.enabled;
    commitBtn.textContent = vm.commit.label;
  }
}

// ─── Combatant card builder ──────────────────────────────────────────────

function combatantCard(vm, isActivePicker, phase) {
  return h('div', { class: 'combatant-card' },
    // Name with faction color via custom property
    h('h3', {
      style: {
        '--faction-color': vm.factionColor,
        color: 'var(--faction-color)',
      },
    }, vm.name),

    // HP bar
    h('div', { class: 'hpbar' },
      h('div', { class: 'hpfill', style: { width: vm.hpPct + '%' } }),
    ),

    // HP text
    h('div', { class: 'mini' }, `${vm.hp} / ${vm.maxHp} HP`),

    // Potency grid
    h('div', { class: 'combat-potencys' },
      ...vm.pots.map(pot => buildToken(pot, isActivePicker, phase)),
    ),
  );
}

// ─── Potency token builder ──────────────────────────────────────────────

function buildToken(pot, isActivePicker, phase) {
  const classes = ['ctok'];
  if (pot.used) classes.push('used');
  if (pot.unavailable) classes.push('unavailable');
  if (pot.pickable) classes.push('pickable');

  const isClickable = pot.pickable && phase.startsWith('pick');

  return h('div', {
    class: classes.join(' '),
    dataAction: isClickable ? 'pickCombatPower' : undefined,
    dataF: pot.idx,
    // Cross-highlight on hover
    mouseenter: () => highlightTokens(pot.idx),
    mouseleave: () => highlightTokens(-1),
  },
    h('div', { class: 'ctok__val' }, String(pot.val)),
    h('div', { class: 'ctok__glyph' }, pot.glyph),
  );
}

// ─── Pick-slot updater ──────────────────────────────────────────────────

function updatePickSlots(slots) {
  const slotEntries = [
    ['sA1', slots.a1],
    ['sA2', slots.a2],
    ['sB1', slots.b1],
    ['sB2', slots.b2],
  ];

  for (const [id, slot] of slotEntries) {
    const el = document.getElementById(id);
    if (!el) continue;

    // Clear any dynamic classes/styles that might linger from previous renders
    el.classList.remove('revealed');

    if (slot.text) {
      el.textContent = slot.text;
      if (slot.factionIdx != null) {
        const color = FACTIONS[slot.factionIdx].color;
        el.style.setProperty('--slot-color', color);
        el.style.borderColor = 'var(--slot-color)';
        el.style.background = `${color}22`;
      }
      if (slot.revealed) {
        el.classList.add('revealed');
      }
    } else {
      // Empty slot: show placeholder
      el.textContent = id.startsWith('sB')
        ? '???'
        : (id.endsWith('1') ? 'Pick 1' : 'Pick 2');
      el.style.borderColor = '';
      el.style.background = '';
    }
  }
}

// ─── Cross-token highlight helper ───────────────────────────────────────

function highlightTokens(factionIdx) {
  document.querySelectorAll('.ctok').forEach(el => {
    el.classList.remove('potency-hover');
  });
  if (factionIdx >= 0) {
    document.querySelectorAll(`.ctok[data-f="${factionIdx}"]`).forEach(el => {
      el.classList.add('potency-hover');
    });
  }
  setHeptagramHighlight(factionIdx);
}