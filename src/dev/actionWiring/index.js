/**
 * actionWiring/index.js — Register all devTools data-action handlers.
 *
 * Layer: dev/ — orchestrates across cheats, performance, botControl, and shared.
 */

import { registerAction } from '../../shared/actionBus.js';
import { registerCheatActions } from './cheats.js';
import { registerPerfActions } from './performance.js';
import { registerBotActions } from './bot.js';

/**
 * Register all devTools data-action handlers.
 * @param {object} deps
 * @param {(tabName: string) => void} deps.switchTab - Tab-switching callback
 */
export function registerAllDevActions({ switchTab }) {
  registerCheatActions();
  registerPerfActions();
  registerBotActions();

  registerAction('dev:switchTab', (el) => {
    switchTab(el.dataset.tab);
  });
}
