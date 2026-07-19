/**
 * dispatchModal.js — Augur's Dispatch modal content.
 * Renders the report built by buildDispatchReport (game/rules/dispatchReport.js)
 * via h() — no innerHTML. Owns the staggered reveal; the Acknowledge wiring
 * lives in runtime/dispatchPrompt.js (cross-layer orchestration).
 */
import { h } from '../domBuilder.js';
import { showModal } from './modalShell.js';

/**
 * Total reveal window (ms). The Acknowledge button unlocks after this, so the
 * dispatch can't be dismissed mid-animation by a misclick. Sections stagger in
 * via CSS: transition-delay = calc(var(--i) * 90ms), each ≤ --dur (250ms).
 */
const REVEAL_MS = 650;

function sectionEl(index, label, lines) {
  return h(
    'section',
    { class: 'dispatch-modal__section', style: { '--i': index } },
    h('div', { class: 'dispatch-modal__section-label' }, label),
    ...lines
  );
}

function taggedLine(tag, text, tone) {
  return h(
    'div',
    { class: `dispatch-modal__line dispatch-modal__line--${tone}` },
    h('span', { class: 'dispatch-modal__tag' }, tag),
    h('span', { class: 'dispatch-modal__text' }, text)
  );
}

/**
 * Fill and show the Augur's Dispatch modal.
 *
 * @param {Object} report — built by buildDispatchReport (see dispatchReport.js)
 */
export function openDispatchModal(report) {
  const card = document.getElementById('dispatchCard');
  const headerEl = document.getElementById('dispatchHeader');
  const bodyEl = document.getElementById('dispatchBody');
  const ackBtn = document.getElementById('dispatchAck');
  if (!card || !headerEl || !bodyEl || !ackBtn) return;

  // Faction accent: genuinely dynamic per champion (two-layer rule: chrome
  // stays neutral, the miniature's colour appears as glyph/name/left rule).
  card.style.setProperty('--faction-color', report.color);

  headerEl.replaceChildren(
    h('div', { class: 'dispatch-modal__glyph' }, report.glyph),
    h(
      'div',
      { class: 'dispatch-modal__titleblock' },
      h('div', { class: 'dispatch-modal__kicker' }, `Augur's Dispatch — Day ${report.day} · Week ${report.week}`),
      h('div', { class: 'dispatch-modal__name' }, report.name),
      h('div', { class: 'dispatch-modal__weather' }, `${report.weather.name} — ${report.weather.text}`)
    )
  );

  const auguryLines = [
    taggedLine('Movement', `${report.movement.parts.join(' ')} → ${report.movement.total}`, 'moves'),
    ...report.effects.map((e) => taggedLine(e.source, e.text, e.tone)),
  ];

  const ledgerLines = report.ledger.length
    ? report.ledger.map((entry) => h('div', { class: `dispatch-modal__line dispatch-modal__line--${entry.sign}` }, entry.text))
    : [h('div', { class: 'dispatch-modal__line dispatch-modal__line--neutral' }, '— the page is blank —')];

  bodyEl.replaceChildren(sectionEl(1, 'Auguries', auguryLines), sectionEl(2, 'Ledger', ledgerLines));

  // Reveal: veil → un-veil on the next frame so the CSS transitions run.
  card.classList.add('dispatch-modal-card--veiled');
  ackBtn.disabled = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => card.classList.remove('dispatch-modal-card--veiled'));
  });
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  setTimeout(() => {
    ackBtn.disabled = false;
  }, reduced ? 0 : REVEAL_MS);

  showModal('dispatchModal');
}
