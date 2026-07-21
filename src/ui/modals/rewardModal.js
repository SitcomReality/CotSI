/**
 * rewardModal.js — Reward and artifact-choice modal content.
 * Icon-driven card rendering with type badges, effect rows, and
 * selectable choice cards for artifact drafts.
 *
 * Uses `h()` for DOM construction and `svgIcon()` for sprite icons.
 */
import { registerAction, clearGameReward } from '../../shared/actionBus.js';
import { showModal, hideModal } from './modalShell.js';
import { h } from '../domBuilder.js';
import { svgIcon } from '../svgIcon.js';

let pendingChoice = null;
let _selectionCleanup = null;

// ── Type badge config ────────────────────────────────────────────────────────
// Maps reward type keys to display label and icon id.
const TYPE_META = {
  artifact: { label: 'Artifact', icon: 'i-artifact' },
  treasure: { label: 'Treasure', icon: 'i-treasure' },
  spoils:   { label: 'Spoils',   icon: 'i-treasure' },
  weapon:   { label: 'Weapon',   icon: 'i-weapon' },
  armor:    { label: 'Armor',    icon: 'i-armor' },
  knot:     { label: "God's Knot", icon: 'd-knot' },
};

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
      svgIcon(meta.icon, 14, { ariaHidden: true }),
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

/**
 * openArtifactChoiceModal — Show artifact draft with selectable choice cards.
 *
 * @param {Object} reward   — { title, body, choices: [{ id, label, detail, type, effects }] }
 * @param {Function} onChoice — Callback invoked with the chosen artifact object
 */
export function openArtifactChoiceModal(reward, onChoice) {
  const titleEl = document.getElementById('rewardTitle');
  const bodyEl = document.getElementById('rewardBody');
  const badgeEl = document.getElementById('rewardTypeBadge');
  const effectsEl = document.getElementById('rewardEffects');
  const choicesEl = document.getElementById('rewardChoices');
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = reward.title;
  _clearSections(bodyEl, badgeEl, effectsEl, choicesEl);

  // Type badge (generic artifact badge if reward has no explicit type)
  const rt = reward.type || 'artifact';
  const meta = TYPE_META[rt] || TYPE_META.artifact;
  badgeEl.appendChild(h('span', { class: 'reward-type-badge' },
    svgIcon(meta.icon, 14, { ariaHidden: true }),
    meta.label
  ));

  // Body text (narrative flavour)
  if (reward.body) {
    bodyEl.appendChild(h('p', { class: 'reward-line' }, reward.body));
  }

  // Choice cards
  reward.choices.forEach((c, i) => {
    choicesEl.appendChild(_buildChoiceCard(c, i));
  });

  // Store pending state
  pendingChoice = { choices: reward.choices, onChoice };

  // Disable confirm until a choice is selected
  const confirmBtn = document.querySelector('[data-action="confirmReward"]');
  if (confirmBtn) confirmBtn.disabled = true;

  showModal('rewardModal');
}

/** Clear pending artifact choice state (used externally by combat modal teardown). */
export function clearPendingChoice() {
  _clearSelection();
  if (_selectionCleanup) {
    _selectionCleanup();
    _selectionCleanup = null;
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Render a single effect row: [icon] label
 */
function _renderEffectRow(effect) {
  if (typeof effect === 'string') {
    // Backward compat: plain string → no icon
    return h('div', { class: 'reward-effect' }, effect);
  }
  return h('div', { class: 'reward-effect' },
    svgIcon(effect.icon, 18, { ariaHidden: true }),
    h('span', { class: 'reward-effect__label' }, effect.label)
  );
}

/**
 * Build a clickable choice card for artifact drafts.
 */
function _buildChoiceCard(choice, idx) {
  const card = h('div', {
    class: 'reward-choice-card',
    dataAction: 'chooseArtifact',
    dataIdx: String(idx),
  });

  // Type badge (from choice.type, fallback to 'artifact')
  const rt = choice.type || 'artifact';
  const meta = TYPE_META[rt] || TYPE_META.artifact;
  card.appendChild(h('span', { class: 'reward-choice-type' },
    svgIcon(meta.icon, 12, { ariaHidden: true }),
    meta.label
  ));

  // Artifact name
  card.appendChild(h('div', { class: 'reward-choice-name' }, choice.label));

  // Effect rows
  if (choice.effects && choice.effects.length > 0) {
    const effectsWrapper = h('div', { class: 'reward-choice-effects' });
    choice.effects.forEach(eff => {
      effectsWrapper.appendChild(_renderEffectRow(eff));
    });
    card.appendChild(effectsWrapper);
  } else if (choice.detail) {
    // Fallback: show detail text if no structured effects
    card.appendChild(h('div', { class: 'reward-choice-effects' },
      h('div', { class: 'reward-effect' },
        h('span', { class: 'reward-effect__label reward-effect__label--detail' }, choice.detail)
      )
    ));
  }

  return card;
}

/**
 * Clear all dynamic content sections in one pass.
 */
function _clearSections(...elements) {
  elements.forEach(el => {
    if (el) el.innerHTML = '';
  });
}

/**
 * Clear pending selection state + de-highlight all choice cards.
 */
function _clearSelection() {
  pendingChoice = null;
  document.querySelectorAll('.reward-choice-card--selected').forEach(el =>
    el.classList.remove('reward-choice-card--selected')
  );
  const confirmBtn = document.querySelector('[data-action="confirmReward"]');
  if (confirmBtn) confirmBtn.disabled = true;
}

// ── Action bus handlers ──────────────────────────────────────────────────────

/**
 * chooseArtifact — PURELY visual selection. Highlights the clicked card and
 * enables the confirm button.
 */
registerAction('chooseArtifact', (actionEl) => {
  if (!pendingChoice) return;

  const idx = parseInt(actionEl.dataset.idx, 10);
  if (isNaN(idx)) return;

  // Deselect all choice cards in the choices container
  const container = actionEl.closest('#rewardChoices');
  if (!container) return;
  container.querySelectorAll('.reward-choice-card').forEach(el =>
    el.classList.remove('reward-choice-card--selected')
  );

  // Select clicked card
  actionEl.classList.add('reward-choice-card--selected');
  pendingChoice.selectedIdx = idx;

  // Enable confirm
  const confirmBtn = document.querySelector('[data-action="confirmReward"]');
  if (confirmBtn) confirmBtn.disabled = false;
});

/**
 * confirmReward — Dual path:
 *   - If pending artifact choice with selection → confirm with callback
 *   - Otherwise → plain dismiss (generic reward)
 */
registerAction('confirmReward', () => {
  if (pendingChoice && pendingChoice.selectedIdx !== undefined && pendingChoice.selectedIdx !== null) {
    const choice = pendingChoice.choices[pendingChoice.selectedIdx];
    const cb = pendingChoice.onChoice;
    pendingChoice = null;
    hideModal('rewardModal');
    if (cb && choice) cb(choice);
    return;
  }

  // Plain dismiss
  pendingChoice = null;
  hideModal('rewardModal');
  clearGameReward();
});
