/**
 * editorPanel.js — Orchestrator for the geometry editor's left sidebar.
 *
 * Splits the editing UI across focused modules and stitches them together:
 * the parts list (partList.js) renders into `#parts-edit`, and the contextual
 * inspector — objectControls.js when no part is selected, partInspector.js
 * when one is — into `#inspector-body`. Owns the panel session (DOM refs, the
 * preview rebuild hook) and the `ctx` object passed to every renderer, which
 * keeps the dependency graph acyclic.
 */
import { S } from '../state.js';
import { activeParts } from './variantQuery.js';
import { renderPartsList } from './partList.js';
import { renderObjectHeader, renderObjectControls } from './objectControls.js';
import { renderPartInspector } from './partInspector.js';
import { bindProjectControls } from './projectControls.js';

let els = null;
let onEdit = () => {};
let onLoaded = () => {};

// ── Mutation flow ───────────────────────────────────────────────────────────

/** Apply a descriptor mutation, rebuild the preview, then re-render. */
function mutate(fn) {
  fn();
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

  const part = activeParts().find((p) => p.id === S.selectedPartId);
  if (part) {
    renderPartInspector(container, part, ctx);
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
 */
export function bindEditorPanel(elsRef, onEditFn, onLoadedFn = () => {}) {
  els = elsRef;
  onEdit = onEditFn;
  onLoaded = onLoadedFn;
  bindProjectControls(els, ctx);
  renderAll();
}

/** Re-render the panel (e.g. after selecting a different sample object). */
export function refreshEditorPanel() {
  renderAll();
}
