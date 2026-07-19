import { registerAction } from '../../shared/actionBus.js';
import { showModal, hideModal } from './modalShell.js';
import { h } from '../domBuilder.js';

let pendingChoice = null;

export function openArtifactChoiceModal(reward, onChoice) {
  const titleEl = document.getElementById('rewardTitle');
  const bodyEl = document.getElementById('rewardBody');
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = reward.title;
  bodyEl.textContent = reward.body || '';

  // Clear any previous selection visual state
  clearSelection();

  const container = h('div', { class: 'reward-choices' });
  const template = document.getElementById('modalChoiceOption');
  if (!template) return;

  reward.choices.forEach((c, i) => {
    const frag = template.content.cloneNode(true);
    const choiceEl = frag.querySelector('.artifact-choice');
    choiceEl.dataset.idx = i;

    const labelEl = frag.querySelector('.artifact-choice__label');
    const detailEl = frag.querySelector('.artifact-choice__detail');
    if (labelEl) labelEl.textContent = c.label;
    if (detailEl) detailEl.textContent = c.detail;
    container.appendChild(frag);
  });

  bodyEl.appendChild(container);

  pendingChoice = { choices: reward.choices, onChoice };

  // Disable the confirm button on open
  const confirmBtn = document.querySelector('[data-action="confirmReward"]');
  if (confirmBtn) confirmBtn.disabled = true;

  showModal('rewardModal');
}

function clearSelection() {
  pendingChoice = null;
  document.querySelectorAll('.artifact-choice--selected').forEach(el =>
    el.classList.remove('artifact-choice--selected')
  );
  const confirmBtn = document.querySelector('[data-action="confirmReward"]');
  if (confirmBtn) confirmBtn.disabled = true;
}

export function clearPendingChoice() {
  clearSelection();
}

/**
 * chooseArtifact — PURELY visual selection. Never confirms.
 * Highlights the clicked choice, enables the confirm button.
 */
registerAction('chooseArtifact', (actionEl) => {
  if (!pendingChoice) return;  // no pending artifact modal

  const idx = parseInt(actionEl.dataset.idx, 10);
  if (isNaN(idx)) return;

  // Deselect all choices in this modal
  const container = actionEl.closest('.reward-choices');
  if (!container) return;
  container.querySelectorAll('.artifact-choice').forEach(el =>
    el.classList.remove('artifact-choice--selected')
  );

  // Select clicked one
  actionEl.classList.add('artifact-choice--selected');
  pendingChoice.selectedIdx = idx;

  // Enable the confirm button
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
    // Confirm! Invoke the stored callback
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