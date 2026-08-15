/**
 * editorPanel.js — Orchestrator for the geometry editor's left sidebar.
 *
 * Splits the editing UI across focused modules and stitches them together:
 * the parts list (partList.js) renders into `#parts-edit`, and the contextual
 * inspector — objectInspector/ when no part is selected, partInspector/
 * when one is — into `#inspector-body`. Owns the panel session (DOM refs, the
 * preview rebuild hook) and the `ctx` object passed to every renderer, which
 * keeps the dependency graph acyclic.
 */
import { S } from '../state.js';
import { activeParts } from './variantQuery.js';
import { pushUndo, popUndo, restoreUndo } from '../history.js';
import { findNodeById } from './partTree/index.js';
import { renderPartsList } from './partList.js';
import { renderObjectHeader, renderObjectControls } from './objectInspector/index.js';
import { renderPartInspector } from './partInspector/index.js';
import { bindProjectControls } from './projectControls.js';

let els = null;
let onEdit = () => {};
let onLoaded = () => {};

// ── Mutation flow ───────────────────────────────────────────────────────────

/** Apply a descriptor mutation, rebuild the preview, then re-render. The
 *  pre-edit state is snapshotted first so the change is undoable. */
function mutate(fn) {
  pushUndo();
  fn();
  onEdit();
  renderAll();
}

/** Restore the most recent pre-edit snapshot and re-render (undo button). */
export function undoLastEdit() {
  const snap = popUndo();
  if (!snap) return;
  restoreUndo(snap);
  onEdit();
  renderAll();
}

/**
 * Panel hooks handed to the renderers (mutate for descriptor changes, renderAll
 * for pure re-renders, onEdit/onLoaded as live lookups so re-binding works).
 */
const ctx = {
  mutate,
  renderAll,
  onEdit: () => onEdit(),
  onLoaded: () => onLoaded(),
};

// ── Rendering ───────────────────────────────────────────────────────────────

/**
 * Render the contextual inspector: the selected part's fields when one is
 * selected, otherwise the object-level design controls. The parts list above
 * (#parts-edit) renders separately.
 */
function renderInspector(container) {
  container.textContent = '';
  const d = S.descriptor;
  if (!d) return;

  const entry = findNodeById(activeParts(), S.selectedPartId);
  if (entry) {
    renderPartInspector(container, entry, ctx);
    return;
  }

  renderObjectHeader(container);
  renderObjectControls(container, ctx);
}

function renderAll() {
  renderPartsList(els.partsEdit, ctx);
  renderInspector(els.inspectorBody);
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Bind the editing panel to its DOM containers and the preview rebuild hook.
 * @param {object} elsRef - the editor's DOM refs (partsEdit, inspectorBody, downloadBtn, loadFile, loadError)
 * @param {Function} onEditFn - () => void; rebuilds the preview from S.descriptor
 * @param {Function} onLoadedFn - () => void; called after a JSON load succeeds (re-renders the object browser)
 * @returns {object} the panel ctx ({ mutate, renderAll, onEdit, onLoaded }) — the single mutation path
 */
export function bindEditorPanel(elsRef, onEditFn, onLoadedFn = () => {}) {
  els = elsRef;
  onEdit = onEditFn;
  onLoaded = onLoadedFn;
  bindProjectControls(els, ctx);
  renderAll();
  return ctx;
}

/** Re-render the panel (e.g. after selecting a different sample object). */
export function refreshEditorPanel() {
  renderAll();
}
