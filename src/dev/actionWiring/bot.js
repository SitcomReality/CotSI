/**
 * actionWiring/bot.js — Register data-action handlers for bot control tab.
 *
 * Layer: dev/ — wires botControl and shared.
 */

import { registerAction } from '../../shared/actionBus.js';
import { toggleStepMode, stepOnce } from '../botControl/stepMode.js';
import { autoPlay, autoStop } from '../botControl/autoPlay.js';

export function registerBotActions() {
  registerAction('dev:bot:stepMode', toggleStepMode);
  registerAction('dev:bot:stepOnce', stepOnce);
  registerAction('dev:bot:autoPlay', autoPlay);
  registerAction('dev:bot:autoStop', autoStop);
}
