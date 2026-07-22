import { h } from '../domBuilder.js';
import { iconSpritePath } from '../iconPaths.js';

/**
 * Build a <div class="main-log"> containing the 5 most recent log entries.
 * Returns the DOM element without mounting it anywhere.
 *
 * @param {Array} logs — G.logs array (most-recent-first)
 * @returns {HTMLElement}
 */
export function buildMainLogContent(logs) {
  const recent = (logs || []).slice(0, 5).map(normalizeEntry);

  return h('div', { class: 'main-log' },
    recent.length === 0
      ? h('div', { class: 'main-log__empty', style: { color: 'var(--ink-faint)', fontStyle: 'italic' } },
          'Awaiting events...'
        )
      : recent.map(entry =>
          entry.isDayMarker ? buildDayMarker(entry) : buildLogEntry(entry)
        )
  );
}

/**
 * Bind the main log bar by rebuilding #logMount contents from G.logs.
 * Kept for backward compatibility; new code should call buildMainLogContent
 * and mount the result directly.
 *
 * @param {Object} G — live game state (G.logs is an array, most-recent-first)
 */
export function bindMainLog(G) {
  const mount = document.getElementById('logMount');
  if (!mount) {
    console.warn('[bindMainLog] #logMount not found');
    return;
  }

  mount.replaceChildren(buildMainLogContent(G?.logs));
}

/**
 * Coerce a legacy plain-string entry into structured format.
 * Safety net for any log entries that were added before the migration
 * or via an untracked addLog call.
 */
function normalizeEntry(entry) {
  if (typeof entry === 'string') {
    return {
      plainText: entry,
      segments: [{ text: entry }],
      type: 'standard',
      isDeath: false,
      isDayMarker: false,
    };
  }
  // Also handle partially-formed objects missing segments
  if (!entry.segments) {
    entry.segments = [{ text: entry.plainText || '' }];
  }
  return entry;
}

/* ── Day marker ── */

/**
 * Render a day-change entry as a full-width horizontal divider with a
 * centered label. Uses the CSS --day class ::before/::after pseudo-elements
 * to draw the horizontal lines on either side of the text.
 */
function buildDayMarker(entry) {
  return h('div', { class: 'main-log__entry main-log__entry--day' },
    entry.plainText
  );
}

/* ── Standard / combat / heal / death / system entry ── */

function buildLogEntry(entry) {
  const row = h('div', { class: entryClass(entry) });

  // Prepend icon for death, combat, heal types
  if (entry.isDeath) {
    row.appendChild(logIcon('i-attack'));
    row.style.setProperty('padding-left', 'var(--log-icon-gap, 1.2em)');
    row.style.setProperty('border-left', '3px solid var(--crimson)');
  } else if (entry.type === 'combat') {
    row.appendChild(logIcon('i-attack'));
  } else if (entry.type === 'heal') {
    row.appendChild(logIcon('i-heal'));
  }

  // Append segment spans
  for (const seg of entry.segments) {
    const props = {};
    if (seg.color) {
      props.style = { '--seg-color': seg.color };
    }
    const span = h('span', { class: 'main-log__segment', ...props }, seg.text);
    if (seg.color) {
      span.style.setProperty('color', 'var(--seg-color)');
    }
    row.appendChild(span);
  }

  return row;
}

/**
 * Build the CSS class string for an entry row based on its type and flags.
 */
function entryClass(entry) {
  const base = 'main-log__entry';
  if (entry.isDeath) return `${base} ${base}--death`;
  if (entry.type === 'combat') return `${base} ${base}--combat`;
  if (entry.type === 'heal') return `${base} ${base}--heal`;
  if (entry.type === 'system') return `${base} ${base}--system`;
  return base;
}

/* ── SVG icon helper ── */

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
