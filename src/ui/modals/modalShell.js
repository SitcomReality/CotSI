/**
 * modalShell.js — Generic modal show/hide helpers.
 * Knows nothing about any specific modal's content.
 */

export function showModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

export function hideModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
