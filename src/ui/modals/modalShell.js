/**
 * modalShell.js — Generic modal show/hide helpers.
 * Knows nothing about any specific modal's content. Hiding dispatches
 * 'modalClosed' on the action bus so the runtime can re-enter refreshAll
 * (e.g. to resume bot turns that were suppressed while a modal was open).
 */

import { dispatchAction } from '../../shared/actionBus.js';

export function showModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

export function hideModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'none';
  dispatchAction('modalClosed', el);
}
