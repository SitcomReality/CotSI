import { fillRewardModal } from '../modals/rewardModal.js';
import { showModal } from '../modals/modalShell.js';
import { toast } from '../hud.js';

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

/**
 * Show a trader offer via toast (stays as-is, not a modal).
 */
export function openTrader(tr) {
  const label = (i) => {
    if (i.kind === 'equipment') return i.item.name;
    if (i.kind === 'potency') return `${i.qty}× potency`;
    if (i.kind === 'relic') return `${i.qty}× relic`;
    return i.kind;
  };
  const stock = (tr.stock ?? [])
    .map((i) => `${label(i)} (${i.cost?.gold ?? 0}g)`)
    .join(', ');
  toast(`Trader ${tr.name} offers: ${stock}`);
}