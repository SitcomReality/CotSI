import { getGameState, getRefreshAll, getToast } from './combatStateManager.js';
import { getChampion } from '../../game/entityQueries.js';
import { addLog } from '../../game/log.js';
import { openArtifactChoiceModal as _openArtifactChoiceModal } from '../modal.js';

export function openRewardModal(champ, rew) {
  const titleEl = document.getElementById('rewardTitle');
  const bodyEl = document.getElementById('rewardBody');
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = rew.title || 'Victory!';

  const bodyHtml = `
    <div style="font-size:14px;color:#5a3a22;margin-bottom:10px">
      ${rew.body || `<strong>${champ.name}</strong> has won the battle!`}
    </div>
    <div style="margin:12px 0;padding:10px;background:#fff7dfaa;border-radius:8px">
      ${rew.rewards ? rew.rewards.map(r => `<div>${r}</div>`).join('') : ''}
    </div>
    <button onclick="closeReward()" style="
      padding:8px 24px;border:none;border-radius:6px;background:#9a5a12;color:#fff;font-weight:700;
      cursor:pointer;margin-top:10px;
    ">Close</button>
  `;
  bodyEl.innerHTML = bodyHtml;
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