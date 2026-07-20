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

const REVEAL_MS = 650;

// ── Weather display (adapted from dispatchModal.js) ────────────────────

function weatherDisplayEl(weather) {
  const fogSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  fogSvg.setAttribute('class', 'herald-modal__weather-fog');
  fogSvg.setAttribute('viewBox', '0 0 84 84');
  fogSvg.setAttribute('preserveAspectRatio', 'none');
  const fogDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  fogDefs.innerHTML =
    '<pattern id="fog-clouds-herald" width="84" height="84" patternUnits="userSpaceOnUse">' +
    '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5">' +
    '<path d="M6 30 q10 -12 22 -4 q10 -10 22 0 q12 -6 18 6"/>' +
    '<path d="M-4 60 q12 -12 24 -2 q12 -10 24 2 q10 -6 18 4"/>' +
    '<path d="M40 12 q8 -8 16 0"/>' +
    '<circle cx="64" cy="44" r="2.4" fill="currentColor" stroke="none"/>' +
    '</g></pattern>';
  fogSvg.append(fogDefs);
  const fogRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  fogRect.setAttribute('width', '100%');
  fogRect.setAttribute('height', '100%');
  fogRect.setAttribute('fill', 'url(#fog-clouds-herald)');
  fogSvg.append(fogRect);

  const name = h('div', { class: 'herald-modal__weather-name' }, weather.name);

  const cornerTL = svgIcon('d-corner', 36, { class: 'herald-modal__wc herald-modal__wc--tl' });
  const cornerTR = svgIcon('d-corner', 36, { class: 'herald-modal__wc herald-modal__wc--tr' });
  const cornerBL = svgIcon('d-corner', 36, { class: 'herald-modal__wc herald-modal__wc--bl' });
  const cornerBR = svgIcon('d-corner', 36, { class: 'herald-modal__wc herald-modal__wc--br' });

  return h('div', {
    class: 'herald-modal__weather-display',
    style: { '--weather-tint': weather.tint },
  }, fogSvg, cornerTL, cornerTR, cornerBL, cornerBR, name);
}

// ── Turn-order list ────────────────────────────────────────────────────

function turnOrderEl(order, champions) {
  const items = order.map((champId, idx) => {
    const champ = champions.find(c => c.id === champId);
    if (!champ) return null;
    const isFirst = idx === 0;
    return h(
      'div',
      {
        class: 'herald-modal__turn-item' + (isFirst ? ' herald-modal__turn-item--active' : ''),
        style: { '--faction-color': `` }, // faction color handled by CSS class below
      },
      h('span', { class: `herald-modal__turn-num herald-modal__turn-f${champ.faction}` }, String(idx + 1)),
      h('span', { class: 'herald-modal__turn-name' }, champ.name),
      isFirst ? h('span', { class: 'herald-modal__turn-badge' }, 'First') : null
    );
  }).filter(Boolean);

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
  weatherEl.replaceChildren(weatherDisplayEl(report.weather));

  // ── Weather caption ──
  captionEl.textContent = `${report.weather.name} — ${report.weather.text}`;

  // ── Turn order ──
  const orderEl = turnOrderEl(report.order, report.champions);

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
