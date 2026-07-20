/**
 * headerPanel.js — Pure DOM binding for the champion header bar.
 * Step 4 of the UI refactor: view-model + direct DOM updates (no HTML strings).
 *
 * Exports:
 *   refreshHeader(G)    — rebuilds champion pills and world info in-place
 *   bindHeaderEvents()  — delegation-based hover/click for the detail dropdown
 *
 * Champion pills are built with h() and CSS variables for color.
 * The detail dropdown uses championVM() + h() for all markup.
 */

import { championVM } from '../viewModels/championViewModel.js';
import { h } from '../domBuilder.js';
import { FACTIONS } from '../../game/rules/factionData.js';
import { getClock } from '../../shared/clockScheduler.js';

/** Guard: prevent duplicate event listener registration on repeated __beginGame calls. */
let wired = false;

// ── Helpers ──────────────────────────────────────────────

/**
 * Map champion id → 'current' | 'played' | 'waiting' | 'dead'.
 * Champions before the active one in currentOrder have already played.
 */
function championStates(G) {
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

/**
 * Build the detail dropdown DOM fragment using championVM() + h().
 * No inline styles except dynamic --faction-color on the header dot.
 */
function buildDetailCard(vm, champ) {
  const fac = FACTIONS[champ.faction];

  // Potency rows: one per faction with a non-zero value
  const potRows = [];
  for (let i = 0; i < vm.pots.length; i++) {
    const val = vm.pots[i];
    if (val <= 0) continue;
    potRows.push(
      h('div', { class: 'detail__pot-row paley-item paley-item--f' + i },
        h('span', { class: 'detail__pot-dot', style: { background: FACTIONS[i].color } }),
        h('span', { class: 'detail__pot-name' }, FACTIONS[i].short),
        h('span', { class: 'detail__pot-val' }, String(val))
      )
    );
  }

  return h('div', { class: 'champion-detail__inner' },
    h('div', { class: 'detail__header' },
      h('span', { class: 'detail__faction-dot', style: { background: fac.color } }),
      h('span', { class: 'detail__name', style: { color: fac.color } }, champ.name)
    ),
    h('div', { class: 'detail__stat' },
      h('span', { class: 'detail__stat-val' }, `${vm.hp} / ${vm.maxHp}`)
    ),
    h('div', { class: 'detail__resources' },
      h('span', { class: 'detail__gold' }, String(vm.gold)),
      ' ',
      h('span', { class: 'detail__knot' }, `${vm.knot} knot${vm.knot !== 1 ? 's' : ''}`)
    ),
    h('div', { class: 'detail__potency' },
      h('div', { class: 'detail__section-label' }, 'Potency'),
      ...(potRows.length > 0 ? potRows : [h('div', { class: 'detail__empty' }, '— none —')])
    )
  );
}

// ── Exports ──────────────────────────────────────────────

/**
 * refreshHeader(G)
 * Directly updates the header DOM from game state.
 * Champion pills are created with h() + data-champ-id; CSS variables handle colors.
 * World info (day, week, weather) uses simple text nodes.
 */
export function refreshHeader(G) {
  if (!G) return;

  // ── World info (day, week, weather) ──
  const week = Math.floor((G.day - 1) / 7) + 1;
  const headerWorldEl = document.querySelector('#gameHeader .header__world');
  if (headerWorldEl) {
    headerWorldEl.replaceChildren();
    headerWorldEl.append(
      h('span', { class: 'header__day' }, `Day ${G.day}`),
      h('span', { class: 'header__week' }, `Week ${week}`),
      h('span', { class: 'header__weather' }, G.weather.name)
    );
  }

  // ── Champion turn-order pills ──
  const headerChampsEl = document.querySelector('#gameHeader .header__champions');
  if (!headerChampsEl) return;

  headerChampsEl.replaceChildren();
  const states = championStates(G);

  for (const id of G.currentOrder) {
    const champ = G.champions.find(c => c.id === id);
    if (!champ) continue;
    const state = states[id];
    if (state === 'dead') continue; // dead champions are hidden

    const vm = championVM(G, champ);
    const pill = h('div', {
      class: 'header__champion paley-item paley-item--f' + champ.faction,
      dataState: state,
      dataChampId: champ.id,
      // --faction-color is genuinely dynamic (per-champion)
      style: { '--faction-color': vm.factionColor },
    },
      h('span', { class: 'header__champion-dot' }),
      h('span', { class: 'header__champion-hp' }, String(vm.hp)),
      h('span', { class: 'header__champion-pot' }, String(vm.totalPot))
    );
    headerChampsEl.append(pill);
  }
}

/**
 * bindHeaderEvents()
 * Delegation-based hover/click on .header__champions.
 * Fills #championDetail using championVM() + h() for all markup.
 * Call once after DOM is ready (from bootstrapUI or __beginGame).
 */
export function bindHeaderEvents() {
  // Prevent duplicate listener registration on repeated __beginGame calls
  if (wired) return;
  wired = true;

  const champsEl = document.querySelector('#gameHeader .header__champions');
  const detailEl = document.getElementById('championDetail');
  const headerEl = document.getElementById('gameHeader');
  if (!champsEl || !detailEl || !headerEl) return;

  let openId = null;
  let closeTimerId = null;

  function clearCloseTimer() {
    if (closeTimerId !== null) {
      getClock().clearTimeout(closeTimerId);
      closeTimerId = null;
    }
  }

  function positionDetail(slot) {
    const sr = slot.getBoundingClientRect();
    const hr = headerEl.getBoundingClientRect();
    let left = sr.left - hr.left;
    if (left + 180 > hr.width) left = hr.width - 180;
    if (left < 0) left = 0;
    detailEl.style.left = left + 'px';
    detailEl.style.top = hr.height + 'px';
  }

  function closeDetail() {
    detailEl.classList.remove('is-open');
    detailEl.replaceChildren();
    openId = null;
  }

  function openFor(champId, slot) {
    const G = window.__gameState;
    if (!G) return;
    const champ = G.champions.find(c => c.id === champId);
    if (!champ) return;

    const vm = championVM(G, champ);
    detailEl.append(buildDetailCard(vm, champ));
    positionDetail(slot);
    detailEl.classList.add('is-open');
    openId = champId;
  }

  // ── Hover → show (delegated) ──
  champsEl.addEventListener('mouseover', (e) => {
    const slot = e.target.closest('.header__champion');
    if (!slot) return;
    const id = slot.dataset.champId;
    if (!id) return;

    // Already open for this champion → just keep it open
    if (openId === id && detailEl.classList.contains('is-open')) {
      clearCloseTimer();
      return;
    }

    // Different champion → close previous, open new one
    if (openId && openId !== id) {
      closeDetail();
    }
    openFor(id, slot);
  });

  // ── Delayed close on leave ──
  function scheduleClose() {
    clearCloseTimer();
    closeTimerId = getClock().setTimeout(() => {
      if (
        !champsEl.matches(':hover') &&
        !detailEl.matches(':hover')
      ) {
        closeDetail();
      }
    }, 150, 'ui');
  }

  champsEl.addEventListener('mouseleave', scheduleClose);
  detailEl.addEventListener('mouseleave', scheduleClose);

  // Cancel close when re-entering from detail → champ bar
  champsEl.addEventListener('mouseenter', clearCloseTimer);
  detailEl.addEventListener('mouseenter', clearCloseTimer);

  // ── Click → toggle (touch-friendly) ──
  champsEl.addEventListener('click', (e) => {
    const slot = e.target.closest('.header__champion');
    if (!slot) return;
    const id = slot.dataset.champId;
    if (!id) return;
    if (openId === id && detailEl.classList.contains('is-open')) {
      closeDetail();
    } else {
      openFor(id, slot);
    }
  });

  // ── Outside click → close ──
  document.addEventListener('click', (e) => {
    if (
      !e.target.closest('.header__champion') &&
      !e.target.closest('#championDetail')
    ) {
      closeDetail();
    }
  });
}