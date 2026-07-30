/**
 * artifactChoiceModal.js — Artifact draft choice selection UI.
 *
 * Manages the artifact choice selection flow within the reward modal:
 * choice card rendering, visual selection state, and cleanup.
 *
 * Relies on rewardModal.js for shared rendering helpers (TYPE_META,
 * _renderEffectRow, _clearSections) and the confirmReward action
 * handler which checks the pending choice state set here.
 */
import { registerAction } from '../../shared/actionBus.js';
import { showModal } from './modalShell.js';
import { h } from '../domBuilder.js';
import { svgIcon } from '../svgIcon.js';
import { REWARD_CHOICE_ICON_SIZE } from '../../params/ui/uiParams.js';
import { setPendingChoice, setPendingSelectedIdx, TYPE_META, _renderEffectRow, _clearSections } from './rewardModal.js';

// ── Module-level state ───────────────────────────────────────────────────────

let _selectionCleanup = null;

// ── Public API ───────────────────────────────────────────────────────────────

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
    svgIcon(meta.icon, REWARD_CHOICE_ICON_SIZE, { ariaHidden: true }),
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

  // Store pending state in rewardModal.js
  setPendingChoice({ choices: reward.choices, onChoice });

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
    svgIcon(meta.icon, REWARD_CHOICE_ICON_SIZE, { ariaHidden: true }),
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
 * Clear pending selection state + de-highlight all choice cards.
 */
function _clearSelection() {
  setPendingChoice(null);
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

  // Update selectedIdx on the pending choice state in rewardModal.js
  setPendingSelectedIdx(idx);

  const confirmBtn = document.querySelector('[data-action="confirmReward"]');
  if (confirmBtn) confirmBtn.disabled = false;
});
