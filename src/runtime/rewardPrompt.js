import { openArtifactChoiceModal } from '../ui/combat/combatModal.js';
import { setRewardModal } from '../ui/modals/rewardModal.js';
import { currentChamp } from '../game/state/liveGame.js';
import { refreshAll } from './refreshAll.js';
import { addLog } from '../game/state/gameLog.js';

/**
 * Show whichever reward modal is pending on `G.reward`, if any.
 * Safe to call even when no reward exists (no-op).
 *
 * Passes a lines array (not innerHTML string) to setRewardModal.
 */
export function showPendingReward(G) {
  // Artifact draft: reward has choices and no guaranteed items.
  if (G.reward && G.reward.choices && !G.reward.guaranteed?.length) {
    openArtifactChoiceModal(G.reward, (choice) => {
      const ch = currentChamp();
      if (!ch) return;
      ch.artifact = choice.artifactId;
      ch.offeredArtifact = true;
      G.reward = null;
      addLog(G, `${ch.name} accepts ${choice.label}.`);
      refreshAll();
    });
    return;
  }

  // Generic reward (dig loot, combat spoils, etc.)
  if (G.reward && !G.reward.choices) {
    const lines = [G.reward.body, ...(G.reward.guaranteed || [])].filter(Boolean);
    setRewardModal(G.reward.title || 'Reward', lines);
  }
}