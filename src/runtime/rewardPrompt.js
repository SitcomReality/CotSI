import { openArtifactChoiceModal } from '../ui/combat/combatModal.js';
import { fillRewardModal } from '../ui/modals/rewardModal.js';
import { currentChamp } from '../game/state/liveGame.js';
import { refreshAll } from './refreshAll.js';
import { addLogEntry } from '../game/state/gameLog.js';
import { buildChampionFactionMap, championSegment } from '../game/rules/logHelpers.js';

/**
 * Show whichever reward modal is pending on `G.reward`, if any.
 * Safe to call even when no reward exists (no-op).
 *
 * For generic rewards, passes structured entries (icon + label) through
 * to fillRewardModal. For artifact drafts, delegates to openArtifactChoiceModal.
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
      const factionMap = buildChampionFactionMap(G.champions);
      addLogEntry(
        G,
        `${ch.name} accepts ${choice.label}.`,
        [championSegment(ch.name, factionMap), ` accepts ${choice.label}.`],
        'system'
      );
      refreshAll();
    });
    return;
  }

  // Generic reward (dig loot, combat spoils, etc.)
  if (G.reward && !G.reward.choices) {
    fillRewardModal({
      title: G.reward.title || 'Reward',
      type: G.reward.type,
      bodyLines: G.reward.body ? [G.reward.body] : undefined,
      rewards: G.reward.guaranteed,
    });
  }
}