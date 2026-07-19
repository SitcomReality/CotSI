import { buildLogEntries } from './logPanel.js';

export function bindRightPanel(G) {
  const container = document.querySelector('.rt-log-entries');
  if (!container) return;

  container.replaceChildren(...buildLogEntries(G?.logs || []));
}