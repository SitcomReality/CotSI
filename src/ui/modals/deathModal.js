/**
 * deathModal.js — Death Announcement modal content.
 * Shown when a champion dies, before any other UI updates.
 * Displays the fallen champion's name, cause of death, and final stats.
 *
 * Uses h() — no innerHTML. The acknowledge wiring lives in
 * runtime/deathAnnouncement.js.
 */
import { h } from '../domBuilder.js';
import { showModal } from './modalShell.js';
import { championVM } from '../viewModels/championViewModel.js';

/**
 * Fill and show the Death Announcement modal.
 *
 * Returns true if the modal was shown, false if it was skipped
 * (e.g. no valid champion entries found).
 *
 * @param {Object} deathEvent  — { deadChamps: [{ championId, cause }] }
 * @param {Object[]} champions — Full champions array from state
 * @param {Object} state       — Live game state (for championVM)
 * @returns {boolean}
 */
export function openDeathModal(deathEvent, champions, state) {
  const card = document.getElementById('deathCard');
  const titleEl = document.getElementById('deathTitle');
  const bodyEl = document.getElementById('deathBody');
  const ackBtn = document.getElementById('deathAck');
  if (!card || !titleEl || !bodyEl || !ackBtn) return false;

  const dead = deathEvent.deadChamps || [];
  if (!dead.length) return false;

  // ── Title ──
  if (dead.length === 1) {
    const champ = champions.find(c => c.id === dead[0].championId);
    titleEl.textContent = champ ? champ.name : 'A Champion Has Fallen';
  } else {
    titleEl.textContent = 'Champions Have Fallen';
  }

  // ── Body: one entry per dead champion ──
  const entries = [];
  for (const { championId, cause } of dead) {
    const champ = champions.find(c => c.id === championId);
    if (!champ) {
      console.warn('[deathModal] deadChamps entry not found in champions array:', championId);
      continue;
    }
    const vm = championVM(state, champ);
    if (!vm) continue;

    entries.push(
      h('div', { class: 'death-modal__entry' },
        h('div', { class: 'death-modal__entry-name' }, vm.name),
        h('div', { class: 'death-modal__cause' }, cause),
        h('div', { class: 'death-modal__stats' },
          h('div', { class: 'death-modal__stat' },
            h('span', { class: 'death-modal__stat-label' }, 'Gold'),
            h('span', { class: 'death-modal__stat-value' }, String(vm.gold)),
          ),
          h('div', { class: 'death-modal__stat' },
            h('span', { class: 'death-modal__stat-label' }, 'Relics'),
            h('span', { class: 'death-modal__stat-value' }, String(vm.relics)),
          ),
        ),
      )
    );
  }

  // Don't show the modal if no entries could be built
  if (!entries.length) {
    console.warn('[deathModal] No valid entries from deadChamps — bailing', deathEvent);
    return false;
  }

  const body = h('div', { class: 'death-modal__body-content' }, ...entries);
  bodyEl.replaceChildren(body);

  showModal('deathModal');
  return true;
}
