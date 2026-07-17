import { getGameState, getRefreshAll, getToast } from './combatStateManager.js';
import { getChampion } from '../../game/entityQueries.js';
import { addLog } from '../../game/log.js';
import { openArtifactChoiceModal as _openArtifactChoiceModal } from '../modal.js';

const DECORATED_REWARD = true;

export function openRewardModal(champ, rew) {
  const titleEl = document.getElementById('rewardTitle');
  const bodyEl = document.getElementById('rewardBody');
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = rew.title || 'Victory!';

  // Build body from template-like DOM (no innerHTML)
  bodyEl.textContent = '';

  // Body text
  const bodyText = rew.body || `<strong>${champ.name}</strong> has won the battle!`;
  const bodyPara = document.createElement('div');
  bodyPara.style.fontSize = '14px';
  bodyPara.style.color = '#5a3a22';
  bodyPara.style.marginBottom = '10px';
  bodyPara.innerHTML = bodyText;
  bodyEl.appendChild(bodyPara);

  // Rewards list
  if (rew.rewards && rew.rewards.length) {
    const rewardsBox = document.createElement('div');
    rewardsBox.className = 'reward-list';
    rew.rewards.forEach(r => {
      const row = document.createElement('div');
      row.textContent = r;
      rewardsBox.appendChild(row);
    });
    bodyEl.appendChild(rewardsBox);
  }

  // Close button with data-action
  const closeBtn = document.createElement('button');
  closeBtn.className = 'reward-btn-close';
  closeBtn.dataset.action = 'closeReward';
  closeBtn.textContent = 'Close';
  bodyEl.appendChild(closeBtn);

  document.getElementById('rewardModal').style.display = 'flex';

  if (rew.artifactChoice) {
    _openArtifactChoiceModal(rew.artifactChoice, (choice) => {
      const state = getGameState();
      const ch = state.champions.find(c => c.id === state.reward?.championId);
      if (ch) {
        ch.artifact = choice.artifactId;
        ch.offeredArtifact = true;
      }
      state.reward = null;
      addLog(state, `Picked artifact: ${choice.label}`);
      const refresh = getRefreshAll();
      if (refresh) refresh();
    });
  }
}

export function openArtifactChoiceModal(reward) {
  _openArtifactChoiceModal(reward, (choice) => {
    const state = getGameState();
    const ch = state.champions.find(c => c.id === state.reward?.championId);
    if (ch) {
      ch.artifact = choice.artifactId;
      ch.offeredArtifact = true;
    }
    state.reward = null;
    addLog(state, `Picked artifact: ${choice.label}`);
    const refresh = getRefreshAll();
    if (refresh) refresh();
  });
}

export function openTrader(tr) {
  const toast = getToast();
  if (toast) toast(`Trader ${tr.name} offers: ${tr.offer}`);
}