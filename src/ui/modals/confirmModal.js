/**
 * confirmModal.js — Reusable yes/no confirmation dialog.
 * Replaces browser confirm() with an in-game modal.
 *
 * Usage:
 *   import { openConfirmModal } from '../ui/modals/confirmModal.js';
 *
 *   openConfirmModal({
 *     title: 'End turn?',
 *     message: 'End turn with moves remaining?',
 *     confirmText: 'Yes',
 *     cancelText: 'No',
 *   }).then(confirmed => {
 *     if (confirmed) { ~ do the thing ~ }
 *   });
 *
 * The function returns a Promise<boolean> that resolves with `true` when
 * the user clicks the confirm button and `false` when they click cancel
 * or dismiss via a registered cancellable action.
 *
 * The confirm button always carries data-action="confirmYes" and the
 * cancel button always carries data-action="confirmNo". Handlers are
 * registered here via actionBus and cleaned up after each invocation.
 */

import { showModal, hideModal } from './modalShell.js';

let _pendingResolver = null;

/**
 * Open the confirm modal with the given options.
 *
 * @param {Object} opts
 * @param {string} [opts.title='Confirm']  — Modal headline
 * @param {string} [opts.message='—']      — Body text
 * @param {string} [opts.confirmText='Yes'] — Confirm button label
 * @param {string} [opts.cancelText='No']  — Cancel button label
 * @returns {Promise<boolean>}
 */
export function openConfirmModal({
  title = 'Confirm',
  message = '—',
  confirmText = 'Yes',
  cancelText = 'No',
} = {}) {
  return new Promise((resolve) => {
    // If a previous modal is pending, resolve it as cancelled first
    if (_pendingResolver) {
      _pendingResolver(false);
      _pendingResolver = null;
    }

    _pendingResolver = resolve;

    // Populate the modal DOM
    const titleEl = document.getElementById('confirmTitle');
    const bodyEl = document.getElementById('confirmBody');
    const yesBtn = document.getElementById('confirmYesBtn');
    const noBtn = document.querySelector('#confirmModal [data-action="confirmNo"]');

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.textContent = message;
    if (yesBtn) yesBtn.textContent = confirmText;
    if (noBtn) noBtn.textContent = cancelText;

    showModal('confirmModal');
  });
}

/**
 * Internal: resolve the pending promise and close the modal.
 */
function _resolve(value) {
  if (_pendingResolver) {
    _pendingResolver(value);
    _pendingResolver = null;
  }
  hideModal('confirmModal');
}

/**
 * Register confirm/cancel action handlers.
 * These are registered once and reuse _pendingResolver.
 */
import { registerAction } from '../../shared/actionBus.js';

registerAction('confirmYes', () => {
  _resolve(true);
});

registerAction('confirmNo', () => {
  _resolve(false);
});
