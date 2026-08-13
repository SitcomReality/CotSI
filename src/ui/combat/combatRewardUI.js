import { fillRewardModal } from '../modals/rewardModal.js';
import { showModal } from '../modals/modalShell.js';

/**
 * Open the reward modal after combat victory.
 * Thin wrapper around fillRewardModal + showModal — no innerHTML, no inline styles,
 * no duplicate close button (the static Accept button in index.html handles dismissal via data-action="closeReward").
 *
 * @param {Object} champ — The victorious champion entity (for possible future use)
 * @param {Object} rew
 * @param {string}   rew.title   — Modal headline (default: 'Victory!')
 * @param {string}   [rew.body]  — Single paragraph of body text
 * @param {string[]} [rew.rewards] — Reward strings shown in a .reward-list
 */
export function openRewardModal(champ, rew) {
  fillRewardModal({
    title: rew.title || 'Victory!',
    bodyLines: rew.body ? [rew.body] : undefined,
    rewards: rew.rewards,
  });
  showModal('rewardModal');
}