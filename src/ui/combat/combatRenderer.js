import { getCombatUI } from './combatStateManager.js';
import { getCombatVM, getHumanSide } from '../viewModels/combatVM.js';
import { FACTIONS } from '../../core/factions.js';
import { setHeptagramHighlight } from '../heptagramWidget.js';
import { h } from '../utils/dom.js';

// ─── Order-pulse state ────────────────────────────────────────────────────
let _previousOrderKey = null;

export function renderCombat() {
  initOrderPulse();
  const _combatUI = getCombatUI();
  if (!_combatUI) return;
  const _humanSide = getHumanSide(_combatUI);
  const vm = getCombatVM(_combatUI, { humanSide: _humanSide });
  if (!vm) return;

  // Round label
  document.getElementById('combatRoundLabel').textContent = vm.roundLabel;

  // Combatant cards – rebuild from VM
  document.getElementById('leftCombat').replaceChildren(
    combatantCard(vm.first, vm.activeSide === 'first', vm.phase)
  );
  document.getElementById('rightCombat').replaceChildren(
    combatantCard(vm.second, vm.activeSide === 'second', vm.phase)
  );

  // Pick slots
  updatePickSlots(vm.slots);

  // Scores
  document.getElementById('csLeft').textContent = vm.scores.left;
  document.getElementById('csRight').textContent = vm.scores.right;

  // Awaiting prompt
  const promptEl = document.getElementById('awaitingPrompt');
  if (promptEl) {
    promptEl.textContent = vm.awaitingPrompt || '';
  }

  // Order text with pulse animation
  const orderEl = document.getElementById('combatOrder');
  if (orderEl) {
    orderEl.textContent = vm.order.text;
    if (_previousOrderKey && _previousOrderKey !== vm.order.key) {
      orderEl.classList.remove('order-pulse');
      void orderEl.offsetWidth;          // force reflow
      orderEl.classList.add('order-pulse');
    }
    _previousOrderKey = vm.order.key;
  }

  // Log (last entry)
  const logEl = document.getElementById('combatLog');
  if (logEl) {
    logEl.textContent = vm.log.length > 0 ? vm.log[vm.log.length - 1] : '';
  }
}

// ─── Order-pulse lazy init ────────────────────────────────────────────────────
let _orderPulseInited = false;

function initOrderPulse() {
  if (_orderPulseInited) return;
  const orderEl = document.getElementById('combatOrder');
  if (!orderEl) return;
  orderEl.addEventListener('animationend', () => {
    orderEl.classList.remove('order-pulse');
  });
  _orderPulseInited = true;
}

// ─── Combatant card builder ──────────────────────────────────────────────

function combatantCard(vm, isActivePicker, phase) {
  const classes = ['combatant-card'];
  if (isActivePicker) classes.push('is-active');

  return h('div', { class: classes.join(' '), dataSide: vm.side },
    // Name with faction color via custom property
    h('h3', {
      style: {
        '--faction-color': vm.factionColor,
        color: 'var(--faction-color)',
      },
    }, vm.name),

    // Badges row: role (First/Second) and optional Attacker marker
    h('div', { class: 'combatant-badges' },
      h('span', { class: 'badge badge-order' }, vm.roleLabel),
      vm.isAttacker
        ? h('span', { class: 'badge badge-attacker' }, 'Attacker')
        : null
    ),

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
  const classes = ['ctok', 'paley-item', 'paley-item--f' + pot.idx];
  if (pot.used) classes.push('used');
  if (pot.unavailable) classes.push('unavailable');
  if (pot.pickable) classes.push('pickable');

  const isClickable = pot.pickable && phase.startsWith('pick');

  const props = {
    class: classes.join(' '),
    dataFaction: pot.idx,
    // Cross-highlight via heptagram widget (CSS :has(). outlines handle inline highlight)
    mouseenter: () => setHeptagramHighlight(pot.idx),
    mouseleave: () => setHeptagramHighlight(-1),
  };
  if (isClickable) {
    props.dataAction = 'combatPick';
  }

  return h('div', props,
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
    el.replaceWith(buildSlotEl(id, slot));
  }
}

function buildSlotEl(id, slot) {
  const classes = ['play-slot'];
  if (slot.hidden) classes.push('hidden-pick');
  if (slot.revealed) classes.push('revealed');

  const props = { id, class: classes.join(' ') };
  if (slot.factionIdx != null && !slot.hidden) {
    props.style = { '--slot-color': FACTIONS[slot.factionIdx].color };
  }

  if (!slot.isPlaceholder) {
    return h('div', props, slot.label);
  }

  // Empty slot — show placeholder text
  const placeholder = id.startsWith('sB')
    ? '???'
    : (id.endsWith('1') ? 'Pick 1' : 'Pick 2');
  return h('div', { id, class: 'play-slot' }, placeholder);
}