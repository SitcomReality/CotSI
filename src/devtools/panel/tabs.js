/**
 * panel/tabs.js — Dev tools panel tab switching.
 *
 * Layer: dev/ — pure DOM manipulation, no game state.
 */

export function switchTab(tabName) {
  document.querySelectorAll('.devtools__tab').forEach(t =>
    t.classList.toggle('is-active', t.dataset.tab === tabName)
  );
  document.querySelectorAll('.devtools__body').forEach(b => {
    const targetId = 'devBody' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    b.classList.toggle('is-active', b.id === targetId);
  });
}
