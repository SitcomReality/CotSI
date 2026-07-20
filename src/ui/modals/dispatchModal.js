/**
 * dispatchModal.js — Augur's Dispatch modal content.
 * Renders the report built by buildDispatchReport (game/rules/dispatchReport.js)
 * via h() — no innerHTML. Owns the staggered reveal; the Acknowledge wiring
 * lives in runtime/dispatchPrompt.js (cross-layer orchestration).
 *
 * Layout: big weather graphic → stat cards → effects → ledger → acknowledge.
 * Uses icons heavily so the report is readable at a glance.
 */
import { h } from '../domBuilder.js';
import { svgIcon } from '../svgIcon.js';
import { showModal } from './modalShell.js';
import { getClock } from '../../shared/clockScheduler.js';

/**
 * Total reveal window (ms). The Acknowledge button unlocks after this, so the
 * dispatch can't be dismissed mid-animation by a misclick. Sections stagger in
 * via CSS: transition-delay = calc(var(--i) * 90ms), each ≤ --dur (250ms).
 */
const REVEAL_MS = 650;

// ── Icon lookups ────────────────────────────────────────────────────────────

/** Map effect category → icon id */
const EFFECT_ICONS = {
  potency: 'i-potency',
  score: 'i-score',
  artifact: 'i-artifact',
  faction: null, // uses champion's faction glyphId
  terrain: 'i-grove',
  equipment: 'i-weapon',
};

/** Map ledger entry type → icon id */
const LEDGER_ICONS = {
  gold: 'i-gold',
  hp: 'i-heal',
  relic: 'i-relic',
  potency: 'i-potency',
  move: 'i-move',
  knot: 'd-knot',
  info: null,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function weatherDisplayEl(weather, glyphId) {
  // Big visual weather area: tint background, fog pattern overlay,
  // weather name in large display text, decorative corners.
  //
  // The fog pattern is rendered as an inline SVG rect so it can reference
  // the <pattern> defined in the sprite — CSS url(#fragment) can't reach
  // cross-document SVG patterns.
  // Build fog-pattern SVG inline (the sprite's <pattern> def is in an external
  // file and can't be referenced via url(#...) from the main document).
  const fogSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  fogSvg.setAttribute('class', 'dispatch-modal__weather-fog');
  fogSvg.setAttribute('viewBox', '0 0 84 84');
  fogSvg.setAttribute('preserveAspectRatio', 'none');
  const fogDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  fogDefs.innerHTML =
    '<pattern id="fog-clouds-dispatch" width="84" height="84" patternUnits="userSpaceOnUse">' +
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
  fogRect.setAttribute('fill', 'url(#fog-clouds-dispatch)');
  fogSvg.append(fogRect);

  const name = h('div', { class: 'dispatch-modal__weather-name' }, weather.name);

  // Decorative corner SVGs
  const cornerTL = svgIcon('d-corner', 36, { class: 'dispatch-modal__wc dispatch-modal__wc--tl' });
  const cornerTR = svgIcon('d-corner', 36, { class: 'dispatch-modal__wc dispatch-modal__wc--tr' });
  const cornerBL = svgIcon('d-corner', 36, { class: 'dispatch-modal__wc dispatch-modal__wc--bl' });
  const cornerBR = svgIcon('d-corner', 36, { class: 'dispatch-modal__wc dispatch-modal__wc--br' });

  const el = h('div', {
    class: 'dispatch-modal__weather-display',
    style: { '--weather-tint': weather.tint },
  }, fogSvg, cornerTL, cornerTR, cornerBL, cornerBR, name);
  return el;
}

function statGridEl(report) {
  // Build stat cards from the report's movement and weather effects
  const cards = [];

  // Movement card
  cards.push(statCardEl('i-move', String(report.movement.total), 'Movement', null));

  // Weather potency/score effects
  for (const eff of report.effects) {
    if (eff.category === 'potency' && eff.value !== undefined) {
      cards.push(statCardEl('i-potency', signed(eff.value), 'Potency', eff.value > 0 ? 'gain' : 'loss'));
    }
    if (eff.category === 'score' && eff.value !== undefined) {
      cards.push(statCardEl('i-score', signed(eff.value), 'Score', eff.value > 0 ? 'gain' : 'loss'));
    }
  }

  if (!cards.length) return null;
  return h('div', { class: 'dispatch-modal__stat-grid' }, ...cards);
}

function statCardEl(iconId, value, label, tone) {
  const cls = tone ? `dispatch-modal__stat-card dispatch-modal__stat-card--${tone}` : 'dispatch-modal__stat-card';
  return h(
    'div',
    { class: cls },
    svgIcon(iconId, 20, { class: 'dispatch-modal__stat-card-icon' }),
    h('div', { class: 'dispatch-modal__stat-card-value' }, value),
    h('div', { class: 'dispatch-modal__stat-card-label' }, label)
  );
}

function signed(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

function effectLineEl(effect, factionGlyphId) {
  // Pick icon: faction uses the champion's glyph, others from EFFECT_ICONS
  let iconEl = null;
  if (effect.category === 'faction') {
    iconEl = svgIcon(factionGlyphId, 16, { class: 'dispatch-modal__line-icon' });
  } else if (EFFECT_ICONS[effect.category]) {
    iconEl = svgIcon(EFFECT_ICONS[effect.category], 16, { class: 'dispatch-modal__line-icon' });
  }

  const children = [];
  if (iconEl) children.push(iconEl);
  children.push(h('span', { class: 'dispatch-modal__line-text' }, effect.text));

  return h(
    'div',
    { class: `dispatch-modal__line dispatch-modal__line--${effect.tone}` },
    ...children
  );
}

function ledgerLineEl(entry) {
  const iconId = LEDGER_ICONS[entry.type] || null;
  const children = [];
  if (iconId) {
    children.push(svgIcon(iconId, 16, { class: 'dispatch-modal__line-icon' }));
  }
  children.push(h('span', { class: 'dispatch-modal__line-text' }, entry.text));

  return h(
    'div',
    { class: `dispatch-modal__line dispatch-modal__line--${entry.sign}` },
    ...children
  );
}

function sectionEl(index, label, lines) {
  if (!lines.length) return null;
  return h(
    'section',
    { class: 'dispatch-modal__section', style: { '--i': index } },
    h('div', { class: 'dispatch-modal__section-label' }, label),
    ...lines
  );
}

// ── Open ────────────────────────────────────────────────────────────────────

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
  const weatherEl = document.querySelector('[data-ref="weatherDisplay"]');
  const captionEl = document.querySelector('[data-ref="weatherCaption"]');
  if (!card || !headerEl || !bodyEl || !ackBtn || !weatherEl || !captionEl) return;

  // Faction accent: genuinely dynamic per champion (two-layer rule: chrome
  // stays neutral, the miniature's colour appears as glyph/name/left rule).
  card.style.setProperty('--faction-color', report.color);

  // ── Header ──
  headerEl.replaceChildren(
    h('div', { class: 'dispatch-modal__glyph' }, svgIcon(report.glyphId, 22)),
    h(
      'div',
      { class: 'dispatch-modal__titleblock' },
      h('div', { class: 'dispatch-modal__kicker' }, `Augur's Dispatch — Day ${report.day} · Week ${report.week}`),
      h('div', { class: 'dispatch-modal__name' }, report.name),
    )
  );

  // ── Weather display ──
  weatherEl.replaceChildren(weatherDisplayEl(report.weather, report.glyphId));

  // ── Weather caption ──
  captionEl.textContent = `${report.weather.name} — ${report.weather.text}`;

  // ── Stat grid ──
  const statGrid = statGridEl(report);

  // ── Effects section ──
  const effectLines = report.effects
    .filter((e) => e.category !== 'potency' && e.category !== 'score') // already shown in stat cards
    .map((e) => effectLineEl(e, report.glyphId));
  const effectsSection = sectionEl(1, 'Effects', effectLines);

  // ── Ledger section ──
  const ledgerLines = report.ledger.length
    ? report.ledger.map((entry) => ledgerLineEl(entry))
    : [h('div', { class: 'dispatch-modal__line dispatch-modal__line--neutral' }, '— the page is blank —')];
  const ledgerSection = sectionEl(2, 'Ledger', ledgerLines);

  // Build body content
  const bodyParts = [];
  if (statGrid) bodyParts.push(statGrid);
  if (effectsSection) bodyParts.push(effectsSection);
  if (ledgerSection) bodyParts.push(ledgerSection);
  bodyEl.replaceChildren(...bodyParts);

  // ── Reveal: veil → un-veil across two clock ticks so the CSS transitions ──
  // The veiled class must paint first; removing it on the next frame triggers
  // the transition from the correct initial state.
  card.classList.add('dispatch-modal-card--veiled');
  ackBtn.disabled = true;
  const unveil1 = getClock().onTick(() => {
    unveil1();
    const unveil2 = getClock().onTick(() => {
      unveil2();
      card.classList.remove('dispatch-modal-card--veiled');
    });
  });
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  getClock().setTimeout(() => {
    ackBtn.disabled = false;
  }, reduced ? 0 : REVEAL_MS, 'ui');

  showModal('dispatchModal');
}
