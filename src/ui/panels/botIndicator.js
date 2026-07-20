/**
 * botIndicator.js — Bot turn visibility indicator.
 * Shows a small pill in the game header when a bot is taking its turn,
 * letting the human player know the game hasn't frozen.
 */

/**
 * Show the bot-turn indicator with the given champion name.
 * @param {string} champName — e.g. "Gaia's Wail Champion"
 * @param {string} factionColor — hex color for the left border accent
 */
export function showBotIndicator(champName, factionColor) {
  const el = document.getElementById('botIndicator');
  if (!el) return;
  el.textContent = `Bot: ${champName}…`;
  if (factionColor) {
    el.style.setProperty('--indicator-color', factionColor);
  }
  el.classList.add('is-visible');
}

/**
 * Hide the bot-turn indicator.
 */
export function hideBotIndicator() {
  const el = document.getElementById('botIndicator');
  if (!el) return;
  el.classList.remove('is-visible');
}
