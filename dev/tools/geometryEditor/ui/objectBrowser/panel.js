/**
 * panel.js — The floating object-browser panel choreography: the header
 * toggle opens/closes it, outside clicks and Escape dismiss it, and focusing
 * the search opens it. Owns the open flag; the list content lives in list.js.
 */
import { els } from '../../domRefs.js';
import { renderObjectList } from './list.js';

/** Keep --chrome-h in sync so the floating panels anchor exactly under the bar. */
export function syncChromeHeight() {
  document.documentElement.style.setProperty('--chrome-h', `${els.chrome.offsetHeight}px`);
}

/** Whether the floating object browser is currently shown. */
let browserOpen = false;

/** Show or hide the floating browser panel and sync the header toggle. */
function setBrowserOpen(open) {
  browserOpen = open;
  if (open) syncChromeHeight(); // the anchor may have drifted since last time
  els.browser.classList.toggle('open', open);
  els.browserToggle.classList.toggle('open', open);
  els.browserToggle.textContent = open ? '▾' : '▸';
  els.browserToggle.title = open ? 'Hide object browser' : 'Show object browser';
  els.browserToggle.setAttribute('aria-expanded', String(open));
}

export function populateObjects() {
  renderObjectList();
  els.objectFilter.addEventListener('input', () => {
    renderObjectList(els.objectFilter.value);
  });
  // The header toggle is the whole-panel switch; per-category collapse is
  // still preserved by the details rows inside the list itself.
  els.browserToggle.addEventListener('click', () => setBrowserOpen(!browserOpen));
  // Focusing the search (tab or click) opens the browser — the filter is only
  // useful while the list is visible.
  els.objectFilter.addEventListener('focus', () => {
    if (!browserOpen) setBrowserOpen(true);
  });
}

/**
 * Global overlay choreography. The browser closes on outside clicks and Escape,
 * but clicks on its own controls (toggle, filter) are never treated as
 * "outside". The parts list is no longer an overlay — it lives in the sidebar.
 */
export function bindOverlays() {
  document.addEventListener('pointerdown', (e) => {
    if (!browserOpen) return;
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (t.closest('#browser')) return;
    if (t.closest('#browser-toggle') || t.closest('#object-filter')) return;
    setBrowserOpen(false);
  });

  // Escape dismisses the object browser.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    setBrowserOpen(false);
  });
}
