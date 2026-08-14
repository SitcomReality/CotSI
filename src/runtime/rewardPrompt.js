import { openArtifactChoiceModal } from '../ui/modals/artifactChoiceModal.js';
import { fillRewardModal } from '../ui/modals/rewardModal.js';
import { currentChamp } from '../game/state/liveGame.js';
import { applyFeatureChoice } from '../game/state/features/featureRewards.js';
import { refreshAll } from './refreshAll.js';
import { addLogEntry } from '../game/state/world/gameLog.js';
import { LOG_CATEGORY } from '../game/rules/logGrammar.js';
import { buildChampionFactionMap, championSegment } from '../game/rules/logHelpers.js';

/**
 * Show whichever reward modal is pending on `G.reward`, if any.
 * Safe to call even when no reward exists (no-op).
 *
 * Three shapes: map-feature choices (type 'feature' — apply via
 * applyFeatureChoice), artifact drafts (choices, no guaranteed — grant the
 * artifact), and generic rewards (icon + label entries through fillRewardModal).
 */
export function showPendingReward(G) {
  // Map-feature choice: pick 1 of N offers; the tile feature is consumed on apply.
  if (G.reward?.type === 'feature' && G.reward.choices?.length && !G.reward.guaranteed?.length) {
    openArtifactChoiceModal(G.reward, (choice) => {
      const ch = currentChamp();
      if (!ch) return;
      applyFeatureChoice(G, ch, choice, G.reward.tileKey);
      G.reward = null;
      refreshAll();
    });
    return;
  }

  // Artifact draft: reward has choices and no guaranteed items.
  if (G.reward && G.reward.choices && !G.reward.guaranteed?.length) {
    openArtifactChoiceModal(G.reward, (choice) => {
      const ch = currentChamp();
      if (!ch) return;
      ch.artifact = choice.artifactId;
      ch.offeredArtifact = true;
      G.reward = null;
      const factionMap = buildChampionFactionMap(G.champions);
      addLogEntry(G, {
        category: LOG_CATEGORY.SYSTEM,
        subject: championSegment(ch.name, factionMap),
        verb: 'accepts',
        object: { text: choice.label },
        detail: null,
      });
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