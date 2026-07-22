/**
 * headerPanel.js — Champion header bar DOM updates.
 * Step 4 of the UI refactor: view-model + direct DOM updates (no HTML strings).
 *
 * Exports:
 *   refreshHeader(G)    — rebuilds champion pills and world info in-place
 *   bindHeaderEvents()  — delegation-based hover/click (re-exported)
 *
 * Champion pills are built with h() and CSS variables for color.
 * The detail dropdown uses championVM() + h() for all markup.
 */

import { championVM } from '../viewModels/championViewModel.js';
import { h } from '../domBuilder.js';
import { championStates } from './headerStates.js';
import { bindHeaderEvents } from './headerEvents.js';

export { bindHeaderEvents };

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
  const headerWorldEl = document.querySelector('#gameHeader .header-panel__world');
  if (headerWorldEl) {
    headerWorldEl.replaceChildren();
    headerWorldEl.append(
      h('span', { class: 'header-panel__day' }, `Day ${G.day}`),
      h('span', { class: 'header-panel__week' }, `Week ${week}`),
      h('span', { class: 'header-panel__weather' }, G.weather.name)
    );
  }

  // ── Champion turn-order pills ──
  const headerChampsEl = document.querySelector('#gameHeader .header-panel__champions');
  if (!headerChampsEl) return;

  headerChampsEl.replaceChildren();
  const states = championStates(G);

  // 1. Living champions in current order
  for (const id of G.currentOrder) {
    const champ = G.champions.find(c => c.id === id);
    if (!champ) continue;
    const state = states[id];

    const vm = championVM(G, champ);
    const pill = h('div', {
      class: 'header-panel__champion',
      dataState: state,
      dataChampId: champ.id,
      style: { '--faction-color': vm.factionColor },
    },
      h('span', { class: 'header-panel__champion-dot' }),
      h('span', { class: 'header-panel__champion-hp' }, String(vm.hp)),
      h('span', { class: 'header-panel__champion-pot' }, String(vm.totalPot))
    );
    headerChampsEl.append(pill);
  }

  // 2. Dead champions appended at the end (greyed out)
  const deadChamps = G.champions
    .filter(c => !c.alive)
    .sort((a, b) => {
      const ai = G.deathOrder.indexOf(a.id);
      const bi = G.deathOrder.indexOf(b.id);
      return ai - bi; // first death first
    });
  for (const champ of deadChamps) {
    const vm = championVM(G, champ);
    const pill = h('div', {
      class: 'header-panel__champion header-panel__champion--dead',
      dataState: 'dead',
      dataChampId: champ.id,
      style: { '--faction-color': vm.factionColor },
    },
      h('span', { class: 'header-panel__champion-dot' }),
      h('span', { class: 'header-panel__champion-hp' }, '0'),
      h('span', { class: 'header-panel__champion-pot' }, '0')
    );
    headerChampsEl.append(pill);
  }
}
