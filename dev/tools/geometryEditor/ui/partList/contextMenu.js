/**
 * contextMenu.js — The parts tree's right-click menu (Phase 6): a custom
 * fixed-positioned menu at the cursor with the row verbs (duplicate / move /
 * delete) plus a jump to the restructure dock. One menu at a time, mounted on
 * document.body; closes on any outside click, Escape, scroll, or resize.
 */
import { el } from '../formControls/index.js';

let openMenu = null;

/** Close the currently open context menu, if any. */
export function closeContextMenu() {
  openMenu?.remove();
  openMenu = null;
}

/**
 * Open the context menu at viewport coords.
 * @param {number} x - clientX
 * @param {number} y - clientY
 * @param {Array<{label: string, act: Function, disabled?: boolean}>} items
 */
export function openContextMenu(x, y, items) {
  closeContextMenu();
  const menu = el('div', 'context-menu');
  for (const item of items) {
    const btn = el('button', null, item.label);
    btn.type = 'button';
    btn.disabled = Boolean(item.disabled);
    btn.addEventListener('click', () => {
      closeContextMenu();
      item.act();
    });
    menu.append(btn);
  }
  // Mount first so the size is measurable, then clamp to the viewport.
  document.body.append(menu);
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(x, window.innerWidth - rect.width - 6)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - rect.height - 6)}px`;

  const close = () => closeContextMenu();
  setTimeout(() => { // next tick — the opening right-click must not close it
    document.addEventListener('click', close, { once: true });
    document.addEventListener('contextmenu', close, { once: true });
    window.addEventListener('blur', close, { once: true });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeContextMenu();
  }, { once: true });

  openMenu = menu;
}
