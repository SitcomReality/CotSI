/**
 * rewardModal.js — Reward modal content (generic rewards).
 *
 * Handles the generic reward display path. Artifact draft choice
 * flow has been extracted to artifactChoiceModal.js.
 *
 * Uses `h()` for DOM construction and `svgIcon()` for sprite icons.
 */
import { registerAction, clearGameReward } from '../../shared/actionBus.js';
import { hideModal } from './modalShell.js';
import { h } from '../domBuilder.js';
import { svgIcon } from '../svgIcon.js';
import { REWARD_BADGE_ICON_SIZE, REWARD_EFFECT_ICON_SIZE } from '../../params/ui/uiParams.js';

// ── Type badge config ────────────────────────────────────────────────────────
export const TYPE_META = {
  artifact: { label: 'Artifact', icon: 'i-artifact' },
  treasure: { label: 'Treasure', icon: 'i-treasure' },
  spoils:   { label: 'Spoils',   icon: 'i-treasure' },
  weapon:   { label: 'Weapon',   icon: 'i-weapon' },
  armor:    { label: 'Armor',    icon: 'i-armor' },
  knot:     { label: "God's Knot", icon: 'd-knot' },
};

/**
 * Set by artifactChoiceModal.js when an artifact choice is active.
 * The confirmReward handler checks this before deciding the action.
 * @type {{ choices: Array, onChoice: Function, selectedIdx?: number }|null}
 */
let _pendingChoice = null;

/**
 * Set the pending artifact choice state (called by artifactChoiceModal.js).
 * @param {{ choices: Array, onChoice: Function }|null} choice
 */
export function setPendingChoice(choice) {
  _pendingChoice = choice;
}

/**
 * Set the selected index on the pending artifact choice (called by artifactChoiceModal.js).
 * @param {number} idx
 */
export function setPendingSelectedIdx(idx) {
  if (_pendingChoice) {
    _pendingChoice.selectedIdx = idx;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * fillRewardModal — Populate and show the reward modal with icon-driven content.
 *
 * @param {Object} opts
 * @param {string}  [opts.title]      — Modal headline (default: 'Victory')
 * @param {string}  [opts.type]       — Reward type key for the type badge
 * @param {string[]} [opts.bodyLines]  — Optional narrative paragraphs
 * @param {Array<{icon:string,label:string}>} [opts.rewards] — Structured effect entries
 */
export function fillRewardModal({ title, type, bodyLines, rewards }) {
  const titleEl = document.getElementById('rewardTitle');
  const bodyEl = document.getElementById('rewardBody');
  const badgeEl = document.getElementById('rewardTypeBadge');
  const effectsEl = document.getElementById('rewardEffects');
  const choicesEl = document.getElementById('rewardChoices');
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = title || 'Victory';

  // Clear all dynamic content
  _clearSections(bodyEl, badgeEl, effectsEl, choicesEl);

  // Type badge
  if (type && TYPE_META[type]) {
    const meta = TYPE_META[type];
    badgeEl.appendChild(h('span', { class: 'reward-type-badge' },
      svgIcon(meta.icon, REWARD_BADGE_ICON_SIZE, { ariaHidden: true }),
      meta.label
    ));
  }

  // Body paragraphs (narrative fallback)
  if (bodyLines && bodyLines.length > 0) {
    bodyLines.forEach(line => {
      bodyEl.appendChild(h('p', { class: 'reward-line' }, line));
    });
  }

  // Structured effect rows
  if (rewards && rewards.length > 0) {
    rewards.forEach(r => {
      effectsEl.appendChild(_renderEffectRow(r));
    });
  }

  // Ensure confirm button is enabled for generic rewards
  const confirmBtn = document.querySelector('[data-action="confirmReward"]');
  if (confirmBtn) confirmBtn.disabled = false;
}

/**
 * setRewardModal — Positional-arg wrapper for fillRewardModal.
 * Satisfies legacy callers that pass (title, lines).
 *
 * @param {string} [title='']
 * @param {string[]} [lines=[]]
 */
export function setRewardModal(title = '', lines = []) {
  fillRewardModal({ title, bodyLines: lines });
}

// ── Internal helpers (also used by artifactChoiceModal.js) ───────────────────

/**
 * Render a single effect row: [icon] label
 */
export function _renderEffectRow(effect) {
  if (typeof effect === 'string') {
    // Backward compat: plain string → no icon
    return h('div', { class: 'reward-effect' }, effect);
  }
  return h('div', { class: 'reward-effect' },
    svgIcon(effect.icon, REWARD_EFFECT_ICON_SIZE, { ariaHidden: true }),
    h('span', { class: 'reward-effect__label' }, effect.label)
  );
}

/**
 * Clear all dynamic content sections in one pass.
 */
export function _clearSections(...elements) {
  elements.forEach(el => {
    if (el) el.innerHTML = '';
  });
}

// ── Action bus handlers ──────────────────────────────────────────────────────

/**
 * confirmReward — Dual path:
 *   - If pending artifact choice with selection → confirm with callback
 *   - Otherwise → plain dismiss (generic reward)
 */
registerAction('confirmReward', () => {
  if (_pendingChoice && _pendingChoice.selectedIdx !== undefined && _pendingChoice.selectedIdx !== null) {
    const choice = _pendingChoice.choices[_pendingChoice.selectedIdx];
    const cb = _pendingChoice.onChoice;
    _pendingChoice = null;
    hideModal('rewardModal');
    if (cb && choice) cb(choice);
    return;
  }

  // Plain dismiss
  _pendingChoice = null;
  hideModal('rewardModal');
  clearGameReward();
});
