import { h } from '../domBuilder.js';
import { iconSpritePath } from '../iconPaths.js';

/** @type {number} How many log entries we rendered on the previous call. */
let _prevLogLength = 0;

/**
 * Build a <table class="main-log"> containing the 20 most recent log entries
 * in a column-aligned table layout.
 *
 * Grammar entries (with entry.grammar) render into subject/verb/object/detail
 * columns.  Legacy entries without grammar fall back to a single-cell row
 * showing plainText until they age out of the log.
 *
 * Day markers span all columns.
 *
 * Death-entry animations only fire for entries that are genuinely new since
 * the previous render, so a trivial action (e.g. moving one hex) doesn't
 * cause every death row to re-animate.
 *
 * @param {Array} logs — G.logs array (most-recent-first)
 * @returns {HTMLTableElement}
 */
export function buildMainLogContent(logs) {
  const all = logs || [];
  const recent = all.slice(0, 20);

  if (recent.length === 0) {
    _prevLogLength = 0;
    return h('table', { class: 'main-log' },
      h('tr', { class: 'main-log__row' },
        h('td', { class: 'main-log__empty', colspan: '5' }, 'Awaiting events...'),
      ),
    );
  }

  const currentLength = all.length;
  // Entries at indices [0 .. cutoff) are newer than what we last rendered
  const newCount = Math.max(0, currentLength - _prevLogLength);
  _prevLogLength = currentLength;

  const rows = recent.map((entry, i) => buildRow(entry, i < newCount));
  return h('table', { class: 'main-log' }, ...rows);
}

/* ── Row builder ── */

/**
 * @param {Object} entry
 * @param {boolean} isNew — true if this entry is newer than the previous render
 * @returns {HTMLTableRowElement}
 */
function buildRow(entry, isNew) {
  // Day markers — full-width
  if (entry.isDayMarker || (entry.grammar && entry.category === 'marker')) {
    return h('tr', { class: 'main-log__row main-log__row--marker' },
      h('td', { class: 'main-log__marker', colspan: '5' }, entry.plainText),
    );
  }

  // Grammar entries — column-aligned
  if (entry.grammar) {
    return buildGrammarRow(entry, isNew);
  }

  // Legacy entries — plain text fallback until they age out
  return h('tr', { class: 'main-log__row main-log__row--system' },
    h('td', { colspan: '5', style: { color: 'var(--ink-mid)' } }, entry.plainText || ''),
  );
}

/* ── Grammar row ── */

/**
 * @param {Object} entry
 * @param {boolean} isNew — if false, skip entry animation (avoid re-triggering
 *                          on every refresh)
 * @returns {HTMLTableRowElement}
 */
function buildGrammarRow(entry, isNew) {
  const { category } = entry;
  const g = entry.grammar || {};

  let rowClass = `main-log__row main-log__row--${category}`;
  // Only newly-added entries get the death slide-in animation
  if (category === 'death' && !isNew) {
    rowClass += ' main-log__row--death-noanim';
  }

  return h('tr', { class: rowClass },
    // Icon cell
    h('td', { class: 'main-log__icon' },
      categoryIcon(category),
    ),
    // Subject
    h('td', { class: 'main-log__subject' },
      h('span', segmentStyle(g.subject), g.subject.text),
    ),
    // Verb
    h('td', { class: 'main-log__verb' }, g.verb),
    // Object
    h('td', { class: 'main-log__object' },
      g.object
        ? h('span', segmentStyle(g.object), g.object.text)
        : '',
    ),
    // Detail
    h('td', { class: 'main-log__detail' },
      g.detail
        ? h('span', segmentStyle(g.detail), g.detail.text)
        : '',
    ),
  );
}

function segmentStyle(seg) {
  if (!seg || !seg.color) return {};
  return { style: { color: seg.color } };
}

/* ── Icon ── */

const CATEGORY_ICON = {
  combat: 'i-attack',
  heal:   'i-heal',
  death:  'i-attack',
};

function categoryIcon(category) {
  const iconId = CATEGORY_ICON[category];
  if (!iconId) return '';
  return logIcon(iconId);
}

/**
 * Create an inline SVG <use> element pointing into the icon sprite.
 *
 * @param {string} iconId — e.g. 'i-attack' or 'i-heal'
 * @returns {SVGSVGElement}
 */
function logIcon(iconId) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', `${iconSpritePath(iconId)}#${iconId}`);
  svg.appendChild(use);
  return svg;
}
