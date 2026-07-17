// Generic modal helpers
import { registerAction, clearGameReward } from './actionBus.js';
import { h } from './utils/dom.js';

export function showModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

export function hideModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

/**
 * Set the reward modal body using a lines array — no innerHTML.
 * Each line becomes a <div class="reward-line"> text node via h().
 */
export function setRewardModal(title, lines = []) {
  const titleEl = document.getElementById('rewardTitle');
  const bodyEl = document.getElementById('rewardBody');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) {
    const nodes = lines.map(line => h('div', { class: 'reward-line' }, line));
    bodyEl.replaceChildren(...nodes);
  }
  showModal('rewardModal');
}

/**
 * Pending artifact choice, kept module-local so the callback travels via
 * closure rather than as a property on the DOM node.
 * Shape: { choices: Array, onChoice: (choice) => void } | null
 */
let pendingChoice = null;

export function clearPendingChoice() {
  pendingChoice = null;
}

export function openArtifactChoiceModal(reward, onChoice) {
  const titleEl = document.getElementById('rewardTitle');
  const bodyEl = document.getElementById('rewardBody');
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = reward.title;

  // Clear body text, remove previous choices
  bodyEl.textContent = reward.body || '';

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

  showModal('rewardModal');
}

/**
 * Action-bus handler for [data-action="closeReward"].
 * Hides modal, clears pending choice, and clears game-state reward.
 */
registerAction('closeReward', () => {
  hideModal('rewardModal');
  clearPendingChoice();
  clearGameReward();
});

/**
 * Action-bus handler for [data-action="chooseArtifact"].
 * Resolves the clicked index to its choice object and invokes the stored callback.
 */
registerAction('chooseArtifact', (actionEl) => {
  if (!pendingChoice) {
    hideModal('rewardModal');
    return;
  }
  const idx = parseInt(actionEl.dataset.idx, 10);
  const choice = pendingChoice.choices[idx];
  const cb = pendingChoice.onChoice;
  pendingChoice = null;
  hideModal('rewardModal');
  if (cb && choice) cb(choice);
});
