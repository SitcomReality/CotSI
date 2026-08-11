/**
 * progressBar.js — Reusable progress bar DOM component.
 *
 * Wraps an existing DOM container with show/update/hide lifecycle.
 * No imports from game code. Works with any container element.
 */

/**
 * @typedef {object} ProgressBar
 * @property {(label?: string) => void} show  - Reveal the bar with optional initial text
 * @property {(current: number, total: number, detail?: string) => void} update
 * @property {() => void} hide
 */

/**
 * Create a progress bar controller bound to an existing container.
 *
 * The container must have this structure:
 *   <div class="progress-bar">
 *     <div class="progress-fill"></div>
 *   </div>
 *   <div class="progress-text"></div>
 *
 * @param {HTMLElement} fillEl   - Inner bar element (.progress-fill)
 * @param {HTMLElement} textEl   - Status text element (.progress-text)
 * @param {HTMLElement} containerEl - Outer wrapper (for hide/show)
 * @returns {ProgressBar}
 */
export function createProgressBar(fillEl, textEl, containerEl) {
  let lastPct = -1;

  function show(label) {
    containerEl.classList.remove('hidden');
    fillEl.style.width = '0%';
    textEl.textContent = label || '';
    lastPct = -1;
  }

  function update(current, total, detail) {
    const pct = Math.min(100, Math.round((current / total) * 100));
    // Avoid unnecessary DOM writes for the same percentage
    if (pct !== lastPct) {
      fillEl.style.width = pct + '%';
      lastPct = pct;
    }
    const pctText = pct + '%';
    textEl.textContent = detail
      ? `${current} / ${total}  (${pctText})  —  ${detail}`
      : `${current} / ${total}  (${pctText})`;
  }

  function hide() {
    containerEl.classList.add('hidden');
    textEl.textContent = '';
    lastPct = -1;
  }

  return { show, update, hide };
}
