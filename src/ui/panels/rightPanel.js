import { h } from '../domBuilder.js';
import { buildMainLogContent } from './mainLog.js';
import { buildLogHistoryText } from './logPanel.js';

/**
 * Bind the right-panel log area, showing the main (rich) log by default.
 * Toggling "Log History" replaces the main log with a text-only overflow view.
 * Only one view is shown at a time — opening the history closes the main log.
 */
export function bindRightPanel(G) {
  const container = document.querySelector('.rt-log-entries');
  if (!container) {
    console.warn('[bindRightPanel] .rt-log-entries not found');
    return;
  }

  const logs = G?.logs || [];

  // Build both views
  const mainLogEl = buildMainLogContent(logs);

  const textArea = h('textarea', {
    class: 'log-overflow__text',
    readonly: 'true',
    rows: '12',
    style: { display: 'none' },
  }, buildLogHistoryText(logs));

  let showingHistory = false;

  const toggleBtn = h('button', {
    class: 'log-overflow__toggle',
    onclick: () => {
      showingHistory = !showingHistory;
      mainLogEl.style.display = showingHistory ? 'none' : '';
      textArea.style.display = showingHistory ? '' : 'none';
      toggleBtn.classList.toggle('log-overflow__toggle--open', showingHistory);
    },
  }, h('span', { class: 'log-overflow__chevron' }, '\u25B6'), ' Log History');

  container.replaceChildren(
    mainLogEl,
    h('div', { class: 'log-overflow' },
      toggleBtn,
      textArea,
    ),
  );
}
