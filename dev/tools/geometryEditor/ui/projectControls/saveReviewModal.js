/**
 * saveReviewModal.js — The save-review modal: a before/after side-by-side
 * diff of the data file on disk vs what this save would write. Replaces the
 * bare window.confirm so the author sees the real content change before
 * proceeding. The overlay shell reuses the object browser's .floating pattern.
 * Lazily built on first use; resolves true/false with the user's choice.
 */
import { el } from '../formControls/index.js';
import { diffLines } from '../lineDiff.js';

let modal = null; // lazily-built DOM, null until the first save
let modalResolver = null;

function ensureModal() {
  if (modal) return modal;
  const panel = el('div', 'floating diff-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'save-diff-title');

  const fileEl = el('span', 'diff-file');
  const head = el('div', 'diff-head');
  head.append(el('h2', null, 'Review Save'), fileEl);
  const hint = el('div', 'diff-hint', 'Left: the data file on disk · Right: what this save writes. Save only proceeds on your confirmation.');
  const body = el('div', 'diff-body');
  const cancelBtn = el('button', null, 'Cancel');
  cancelBtn.type = 'button';
  const confirmBtn = el('button', 'create-btn', 'Save');
  confirmBtn.type = 'button';
  const actions = el('div', 'diff-actions');
  actions.append(cancelBtn, confirmBtn);
  panel.append(head, hint, body, actions);
  document.body.append(panel);

  const close = (result) => {
    panel.classList.remove('open');
    body.textContent = '';
    const resolve = modalResolver;
    modalResolver = null;
    if (resolve) resolve(result);
  };
  cancelBtn.addEventListener('click', () => close(false));
  confirmBtn.addEventListener('click', () => close(true));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) close(false);
  });

  modal = { panel, fileEl, body, close };
  return modal;
}

/**
 * Open the diff modal and resolve true/false with the user's choice.
 * @param {{ file: string, before: string, after: string }} opts
 * @returns {Promise<boolean>}
 */
export function openDiffModal({ file, before, after }) {
  const m = ensureModal();
  const rows = diffLines(before, after);
  const changed = rows.filter((r) => r.type !== 'same').length;
  m.fileEl.textContent = `data/${file} · ${changed} line${changed === 1 ? '' : 's'} changed`;
  m.body.textContent = '';
  for (const row of rows) {
    const div = el('div', `diff-row ${row.type}`);
    div.append(el('pre', null, row.left ?? ''), el('pre', null, row.right ?? ''));
    m.body.append(div);
  }
  m.panel.classList.add('open');
  return new Promise((resolve) => { modalResolver = resolve; });
}
