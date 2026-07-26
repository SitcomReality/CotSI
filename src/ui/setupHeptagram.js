import { FACTIONS } from '../game/rules/factionData.js';
import { h } from './domBuilder.js';
import { svgIcon } from './svgIcon.js';
import { BALANCED_3P, TRAIT_DESCS } from './setupConstants.js';
import { gameMode, roster } from './setupScreen.js';
import { FACTION_COUNT } from '../params/game/factionParams.js';
import { TRAIT_ICON_SIZE, CTRL_BADGE_ICON_SIZE, ROSTER_GLYPH_SIZE, LOCK_OVERLAY_ICON_SIZE } from '../params/ui/uiParams.js';

// ─── Cross-highlight (lazy import to avoid circular deps) ───

let _crossHighlightFn = null;

function setCrossHighlight(idx) {
  if (!_crossHighlightFn) {
    import('./heptagramWidget.js').then(m => {
      _crossHighlightFn = m.setCrossHighlight;
      _crossHighlightFn(idx);
    });
    return;
  }
  _crossHighlightFn(idx);
}

// ─── Roster card builder ───

/**
 * Create a single roster card DOM element.
 * @param {number} idx  Faction index (0-6)
 * @returns {HTMLElement}
 */
function createCard(idx) {
  const r = roster[idx];
  const isSelected = r.enabled;

  // Pre-compute active count and balance info for lock checks in 3P mode
  const activeIds = roster.filter(f => f.enabled).map(f => f.id);
  const activeCount = activeIds.length;

  const validThirds = (gameMode === 3 && activeCount === 2)
    ? (() => {
        const [a, b] = activeIds;
        const key = a < b ? a * FACTION_COUNT + b : b * FACTION_COUNT + a;
        return BALANCED_3P[key] || [];
      })()
    : null;

  const isLocked = validThirds !== null && !r.enabled && !validThirds.includes(idx);

  const classes = ['setup-roster-card'];
  if (isSelected) classes.push('on');
  if (isLocked) classes.push('locked');

  // Trait description
  const traitDesc = TRAIT_DESCS[idx];
  const traitEl = h('div', { class: 'roster-trait' },
    svgIcon(traitDesc.icon, TRAIT_ICON_SIZE),
    traitDesc.text
  );

  // Controller badge
  const isHuman = r.human;
  const ctrlClasses = ['roster-ctrl'];
  if (isHuman) ctrlClasses.push('is-human');
  else ctrlClasses.push('is-bot');

  const ctrlBadge = h('button', {
    class: ctrlClasses.join(' '),
    dataAction: 'toggleController',
    dataIdx: idx,
    title: isHuman ? 'Switch to Bot' : 'Switch to Human',
  },
    svgIcon(isHuman ? 'i-confirm' : 'd-seal', CTRL_BADGE_ICON_SIZE, { ariaHidden: true }),
    isHuman ? 'Human' : 'Bot'
  );

  // Card body — clickable for toggleFaction
  const cardBody = h('div', {
    class: 'roster-card-body',
    dataAction: 'toggleFaction',
    dataIdx: idx,
    style: { '--faction-color': r.color, '--faction-base': r.base },
  },
    // Glyph
    h('div', { class: 'roster-glyph' },
      svgIcon(r.glyphId, ROSTER_GLYPH_SIZE)
    ),
    // Info column
    h('div', { class: 'roster-info' },
      h('div', { class: 'roster-name' }, r.name),
      traitEl
    )
  );

  // Full card
  const card = h('div', {
    class: classes.join(' '),
    dataIdx: idx,
    style: { '--faction-color': r.color, '--faction-base': r.base },
    mouseenter: () => setCrossHighlight(idx),
    mouseleave: () => setCrossHighlight(-1),
  },
    cardBody,
    ctrlBadge,
    // Lock overlay for 3P mode
    isLocked
      ? h('div', { class: 'roster-lock-overlay' },
          svgIcon('i-cancel', LOCK_OVERLAY_ICON_SIZE)
        )
      : null
  );

  return card;
}

// ─── Build ───

/**
 * Build the roster grid from the current roster state.
 */
export function buildRoster() {
  const container = document.getElementById('setupRoster');
  if (!container) return;
  container.replaceChildren();
  FACTIONS.forEach((_, idx) => {
    container.appendChild(createCard(idx));
  });
}

// ─── Refresh ───

/**
 * Refresh roster cards after roster or mode changes.
 */
export function refreshSetup() {
  buildRoster();
}

// ─── Balance algorithm (kept from original) ───

/**
 * Get the third faction for a balanced 3P triple.
 * Returns the faction ID, or -1 if not determined yet / invalid.
 */
export function getBalancedThird(a, b) {
  const key = a < b ? a * FACTION_COUNT + b : b * FACTION_COUNT + a;
  const valid = BALANCED_3P[key];
  if (!valid || valid.length === 0) return -1;
  return valid[0];
}
