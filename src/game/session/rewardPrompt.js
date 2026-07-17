/**
 * rewardPrompt.js — Dispatches pending rewards to the appropriate UI modal.
 *
 * Called by refreshAll() after each turn tick.  Two branches:
 *   - artifact draft (choices, no guaranteed) → openArtifactChoiceModal
 *   - everything else (dig rewards, combat loot, etc.) → setRewardModal
 *
 * Imports from ui/ because these are pure modal-display calls; the modal
 * callbacks will reach back into game state via combatStateManager's
 * getGameState / getRefreshAll.
 */
import { openArtifactChoiceModal } from '../../ui/combat/combatui-index.js';
import { setRewardModal } from '../../ui/modal.js';

/**
 * Show whichever reward modal is pending on `G.reward`, if any.
 * Safe to call even when no reward exists (no-op).
 *
 * Passes a lines array (not innerHTML string) to setRewardModal.
 */
export function showPendingReward(G) {
  // Artifact draft: reward has choices and no guaranteed items.
  if (G.reward && G.reward.choices && !G.reward.guaranteed?.length) {
    openArtifactChoiceModal(G.reward);
    return;
  }

  // Generic reward (dig loot, combat spoils, etc.)
  if (G.reward && !G.reward.choices) {
    const lines = [G.reward.body, ...(G.reward.guaranteed || [])].filter(Boolean);
    setRewardModal(G.reward.title || 'Reward', lines);
  }
}