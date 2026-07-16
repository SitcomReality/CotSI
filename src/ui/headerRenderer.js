/**
 * headerRenderer.js — Top-bar HUD renderer.
 * Step 4 of the layout overhaul: champion bar + detail dropdown.
 *
 * Exports:
 *   renderHeader(G)           → { world, champions } HTML strings
 *   renderChampionDetail(ch)  → HTML string for the detail dropdown card
 *   bindHeaderEvents()        → delegation-based hover/click listeners
 */

import { FACTIONS, potencyWithPrimary } from '../core/factions.js';

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

/** Single compact champion pill (~80–100 px wide via CSS). */
function championSlot(champ, state, faction) {
  const totalPot = potencyWithPrimary(champ).reduce((a, b) => a + b, 0);
  return `
    <div class="header__champion"
         data-state="${state}"
         data-champ-id="${champ.id}"
         style="--faction-color:${faction.color}">
      <span class="header__champion-dot" style="background:${faction.color}"></span>
      <span class="header__champion-hp">${champ.hp}</span>
      <span class="header__champion-pot">${totalPot}</span>
    </div>`;
}

// ── Exports ──────────────────────────────────────────────

/**
 * renderHeader(G)
 * Returns { world, champions } — HTML strings for the two dynamic header slots.
 * Caller injects into .header__world and .header__champions respectively.
 */
export function renderHeader(G) {
  if (!G) return { world: '', champions: '' };

  const week = Math.floor((G.day - 1) / 7) + 1;
  const world = `
    <span class="header__day">Day ${G.day}</span>
    <span class="header__week">Week ${week}</span>
    <span class="header__weather">${G.weather.name}</span>`;

  const states = championStates(G);
  const champions = G.currentOrder
    .map(id => G.champions.find(c => c.id === id))
    .filter(c => c && c.alive && states[c.id] !== 'dead')
    .map(c => championSlot(c, states[c.id], FACTIONS[c.faction]))
    .join('');

  return { world, champions };
}

/**
 * renderChampionDetail(champion)
 * Returns HTML string for the dropdown card (max 180 px wide, zero gold).
 * Shows HP x/y, potency breakdown, gold, and God's Knot count.
 */
export function renderChampionDetail(champion) {
  if (!champion) return '';

  const fac = FACTIONS[champion.faction];
  const pots = potencyWithPrimary(champion);

  const potRows = FACTIONS
    .map((f, i) => {
      if (pots[i] <= 0) return '';
      return `
        <div class="detail__pot-row">
          <span class="detail__pot-dot" style="background:${f.color}"></span>
          <span class="detail__pot-name">${f.short}</span>
          <span class="detail__pot-val">${pots[i]}</span>
        </div>`;
    })
    .filter(Boolean)
    .join('');

  return `
    <div class="detail__header">
      <span class="detail__faction-dot" style="background:${fac.color}"></span>
      <span class="detail__name" style="color:${fac.color}">${champion.name}</span>
    </div>
    <div class="detail__stat">
      <span>HP</span>
      <span class="detail__stat-val">${champion.hp} / ${champion.maxHp}</span>
    </div>
    <div class="detail__resources">
      <span class="detail__gold">${champion.gold} gold</span>
      <span class="detail__knot">${champion.knot} knot${champion.knot !== 1 ? 's' : ''}</span>
    </div>
    <div class="detail__potency">
      <div class="detail__section-label">Potency</div>
      ${potRows || '<div class="detail__empty">— none —</div>'}
    </div>`;
}

/**
 * bindHeaderEvents()
 * Delegation-based hover/click on .header__champions.
 * Opens #championDetail below the hovered slot; closes on leave / outside click.
 * Call once after DOM is ready.
 */
export function bindHeaderEvents() {
  const champsEl = document.querySelector('#gameHeader .header__champions');
  const detailEl = document.getElementById('championDetail');
  const headerEl = document.getElementById('gameHeader');
  if (!champsEl || !detailEl || !headerEl) return;

  let openId = null;

  function positionDetail(slot) {
    const sr = slot.getBoundingClientRect();
    const hr = headerEl.getBoundingClientRect();
    let left = sr.left - hr.left;
    // Clamp within header bounds so detail never overflows
    if (left + 180 > hr.width) left = hr.width - 180;
    if (left < 0) left = 0;
    detailEl.style.left = left + 'px';
  }

  function closeDetail() {
    detailEl.classList.remove('is-open');
    detailEl.innerHTML = '';
    openId = null;
  }

  function openFor(champId, slot) {
    const G = window.__gameState;
    if (!G) return;
    const champ = G.champions.find(c => c.id === champId);
    if (!champ) return;
    detailEl.innerHTML = renderChampionDetail(champ);
    positionDetail(slot);
    detailEl.classList.add('is-open');
    openId = champId;
  }

  // ── Hover → show ──
  champsEl.addEventListener('mouseenter', (e) => {
    const slot = e.target.closest('.header__champion');
    if (!slot) return;
    const id = slot.dataset.champId;
    if (!id || openId === id) return;
    openFor(id, slot);
  }, { passive: true });

  // ── Delayed close (allows mouse to enter the detail card) ──
  function delayedClose() {
    setTimeout(() => {
      if (
        !champsEl.querySelector('.header__champion:hover') &&
        !detailEl.matches(':hover')
      )
        closeDetail();
    }, 100);
  }

  champsEl.addEventListener('mouseleave', delayedClose, { passive: true });
  detailEl.addEventListener('mouseleave', delayedClose, { passive: true });

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
    )
      closeDetail();
  });
}