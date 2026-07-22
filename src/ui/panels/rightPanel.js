import { h } from '../domBuilder.js';
import { buildMainLogContent } from './mainLog.js';
import { buildLogHistoryText } from './logPanel.js';

/**
 * Bind the right-panel log area, showing the rich log by default.
 * Toggling "Log View" swaps between the rich table view and the
 * text-only history view.
 *
 * The toggle button stays pinned at the top so it's always reachable
 * regardless of log length.
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
  const mainLogScroll = h('div', { class: 'main-log-scroll' }, mainLogEl);

  const textArea = h('textarea', {
    class: 'log-overflow__text',
    readonly: 'true',
    rows: '12',
    style: { display: 'none' },
  }, buildLogHistoryText(logs));

  let showingText = false;

  const toggleBtn = h('button', {
    class: 'log-view-toggle',
    onclick: () => {
      showingText = !showingText;
      mainLogScroll.style.display = showingText ? 'none' : '';
      textArea.style.display = showingText ? '' : 'none';
      toggleBtn.textContent = showingText ? 'Rich View' : 'Text View';
    },
  }, 'Text View');

  container.replaceChildren(
    toggleBtn,
    mainLogScroll,
    textArea,
  );
}
