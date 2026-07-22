/**
 * heraldModal.js — Herald's Prognosis modal content.
 * Shown at the start of each day before any champion's Augur's Dispatch.
 * Displays the weather prominently and lists the day's turn order.
 *
 * Uses h() — no innerHTML. The acknowledge wiring lives in
 * runtime/heraldPrompt.js.
 */
import { h } from '../domBuilder.js';
import { svgIcon } from '../svgIcon.js';
import { showModal } from './modalShell.js';
import { getClock } from '../../shared/clockScheduler.js';
import { weatherDisplayEl } from '../weatherDisplay.js';

const REVEAL_MS = 650;

/** Ordinal suffix for a positive integer (1 → "st", 2 → "nd", 3 → "rd", else "th"). */
function ordinalSuffix(n) {
  if (n >= 11 && n <= 13) return 'th';
  const mod = n % 10;
  if (mod === 1) return 'st';
  if (mod === 2) return 'nd';
  if (mod === 3) return 'rd';
  return 'th';
}

// ── Turn-order list ────────────────────────────────────────────────────

function turnOrderEl(order, champions, deathOrder) {
  const totalChamps = champions.length;
  const items = order.map((champId, idx) => {
    const champ = champions.find(c => c.id === champId);
    if (!champ) return null;
    const isFirst = idx === 0;
    return h(
      'div',
      {
        class: 'herald-modal__turn-item' + (isFirst ? ' herald-modal__turn-item--active' : ''),
        style: { '--faction-color': `` },
      },
      h('span', { class: `herald-modal__turn-num herald-modal__turn-f${champ.faction}` }, String(idx + 1)),
      h('span', { class: 'herald-modal__turn-name' }, champ.name),
      isFirst ? h('span', { class: 'herald-modal__turn-badge' }, 'First') : null
    );
  }).filter(Boolean);

  // Dead champions: appended at the end, greyed out, with placement badge
  if (deathOrder && deathOrder.length > 0) {
    const deadChamps = deathOrder
      .map((id, deathIdx) => {
        const champ = champions.find(c => c.id === id);
        if (!champ || champ.alive) return null;
        const place = totalChamps - deathIdx; // 7, 6, 5, ...
        return h(
          'div',
          {
            class: 'herald-modal__turn-item herald-modal__turn-item--dead',
            style: { '--faction-color': `` },
          },
          h('span', { class: `herald-modal__turn-num herald-modal__turn-f${champ.faction} herald-modal__turn-num--dead` }, ''),
          h('span', { class: 'herald-modal__turn-name herald-modal__turn-name--dead' }, champ.name),
          h('span', { class: 'herald-modal__turn-badge herald-modal__turn-badge--dead' }, `${place}${ordinalSuffix(place)} Place`)
        );
      })
      .filter(Boolean);
    items.push(...deadChamps);
  }

  return h('div', { class: 'herald-modal__turn-order' }, ...items);
}

// ── Open ────────────────────────────────────────────────────────────────

/**
 * Fill and show the Herald's Prognosis modal.
 *
 * @param {Object} report — { day, weather: { name, text, tint }, order: string[], champions: object[] }
 */
export function openHeraldModal(report) {
  const card = document.getElementById('heraldCard');
  const dayEl = document.getElementById('heraldDay');
  const bodyEl = document.getElementById('heraldBody');
  const ackBtn = document.getElementById('heraldAck');
  const weatherEl = document.querySelector('#heraldModal [data-ref="weatherDisplay"]');
  const captionEl = document.querySelector('#heraldModal [data-ref="weatherCaption"]');
  if (!card || !dayEl || !bodyEl || !ackBtn || !weatherEl || !captionEl) return;

  // ── Day header ──
  dayEl.textContent = `Day ${report.day}`;

  // ── Weather display ──
  weatherEl.replaceChildren(weatherDisplayEl(report.weather, { classPrefix: 'herald-modal', patternId: 'fog-clouds-herald' }));

  // ── Weather caption ──
  captionEl.textContent = `${report.weather.name} — ${report.weather.text}`;

  // ── Turn order ──
  const orderEl = turnOrderEl(report.order, report.champions, report.deathOrder);

  // ── Body ──
  bodyEl.replaceChildren(orderEl);

  // ── Reveal ──
  card.classList.add('herald-modal-card--veiled');
  ackBtn.disabled = true;
  const unveil1 = getClock().onTick(() => {
    unveil1();
    const unveil2 = getClock().onTick(() => {
      unveil2();
      card.classList.remove('herald-modal-card--veiled');
    });
  });
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  getClock().setTimeout(() => {
    ackBtn.disabled = false;
  }, reduced ? 0 : REVEAL_MS, 'ui');

  showModal('heraldModal');
}
