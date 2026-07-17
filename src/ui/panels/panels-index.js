/**
 * Panels barrel export
 *
 * Re-exports all panel rendering functions so that orchestrators
 * can import from a single entry point.
 *
 * Note: logBar.js has been replaced by logView.js (pure view layer)
 * — the right panel now composes the log view internally.
 */
export { renderLeftPanel } from './leftPanel.js';
export { renderRightPanel } from './rightPanel.js';
export { renderLogEntries } from './logView.js';
