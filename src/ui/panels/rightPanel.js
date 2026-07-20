import { buildLogEntries } from './logPanel.js';

export function bindRightPanel(G) {
  const container = document.querySelector('.rt-log-entries');
  if (!container) {
    console.warn('[bindRightPanel] .rt-log-entries not found');
    return;
  }

  container.replaceChildren(...buildLogEntries(G?.logs || []));
}