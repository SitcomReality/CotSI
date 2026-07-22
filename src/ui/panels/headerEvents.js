/**
 * headerEvents.js — Delegated hover/click event binding for the champion header.
 *
 * Exports:
 *   bindHeaderEvents()  — wire up all events (safe to call repeatedly)
 */

import { getClock } from '../../shared/clockScheduler.js';
import { championVM } from '../viewModels/championViewModel.js';
import { buildDetailCard, positionDetail } from './headerDetailCard.js';

/** Guard: prevent duplicate event listener registration on repeated __beginGame calls. */
let wired = false;

/**
 * bindHeaderEvents()
 * Delegation-based hover/click on .header-panel__champions.
 * Fills #championDetail using championVM() + h() for all markup.
 * Call once after DOM is ready (from bootstrapUI or __beginGame).
 */
export function bindHeaderEvents() {
  // Prevent duplicate listener registration on repeated __beginGame calls
  if (wired) return;
  wired = true;

  const champsEl = document.querySelector('#gameHeader .header-panel__champions');
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
    positionDetail(headerEl, detailEl, slot);
    detailEl.classList.add('is-open');
    openId = champId;
  }

  // ── Hover → show (delegated) ──
  champsEl.addEventListener('mouseover', (e) => {
    const slot = e.target.closest('.header-panel__champion');
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
    const slot = e.target.closest('.header-panel__champion');
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
      !e.target.closest('.header-panel__champion') &&
      !e.target.closest('#championDetail')
    ) {
      closeDetail();
    }
  });
}
