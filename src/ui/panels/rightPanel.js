/**
 * rightPanel.js — Right sidebar: Heptagram card + Event Log
 *
 * Now accepts state (for log data) and composes both panels.
 *
 * Styleguide compliance:
 * - All panels: var(--parchment) + var(--shadow-stack)
 * - Log entries use semantic color classes from logView.js
 */

import { paleySVG } from '../../render/heptagramSVG.js';
import { renderLogEntries } from './logView.js';

export function renderRightPanel(state) {
  const logEntriesHTML = renderLogEntries(state?.logs || []);

  return `
    <div class="panel rt-heptagram-card">
      <h4>Paley Heptagram</h4>
      <div id="paleyMount" class="rt-heptagram-svg">${paleySVG(-1)}</div>
      <div class="rt-heptagram-hint">i → i+1, i+2, i+4</div>
    </div>

    <div class="panel rt-log-panel">
      <h4>Event Log</h4>
      <div class="rt-log-entries">
        ${logEntriesHTML}
      </div>
    </div>
  `;
}