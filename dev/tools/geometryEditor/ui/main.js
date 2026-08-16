/**
 * main.js — Entry point for the geometry editor page.
 *
 * Wires the controls panel to the preview: object selection, the occupied
 * (displacement) toggle, the ink-outline toggle, the camera reset, and
 * re-rolling the per-tile variation hash. The chrome control bindings live in
 * ./chromeControls.js, the object browser overlay in ./objectBrowser/, the
 * state→preview bridge (rebuild, biome select, selection overlay) in
 * ./previewSync/; this module orchestrates startup and the viewport + panel
 * bindings that need all of them.
 */
import { S } from '../state.js';
import { els, cacheDom } from '../domRefs.js';
import { SAMPLE_OBJECTS } from '../sampleObjects.js';
import { createPreview, bindViewportCallbacks, setFloorVisible } from '../preview/index.js';
import { bindEditorPanel, refreshEditorPanel } from './editorPanel.js';
import { activeParts } from './variantQuery.js';
import { findNodeById, addLocalDelta } from './partTree/index.js';
import { editingEmptyState, emptyLocalPos, pruneZeroLocalPos } from './partInspector/stateKeyframes.js';
import { renderObjectList, populateObjects, bindOverlays, syncChromeHeight } from './objectBrowser/index.js';
import { populateBiomeSelect, rebuild, refreshSelectionOverlay, updateEntityMode } from './previewSync/index.js';
import { bindChromeControls } from './chromeControls.js';

function init() {
  cacheDom();
  syncChromeHeight();
  populateBiomeSelect();
  populateObjects();
  bindChromeControls({ rebuild, refreshEditorPanel, renderObjectList, updateEntityMode });
  bindOverlays();
  window.addEventListener('resize', syncChromeHeight);
  window.addEventListener('load', syncChromeHeight); // fonts can shift the bar
  S.descriptor = SAMPLE_OBJECTS[0];
  renderObjectList();
  updateEntityMode();
  createPreview(els.canvas);
  // The floor toggle is a checkbox like the others — its restored state must
  // apply to the (now created) floor scene, or the checkbox lies about the
  // preview on reload.
  setFloorVisible(els.floorCheck.checked);
  const panelCtx = bindEditorPanel(els, rebuild, () => {
    renderObjectList(els.objectFilter.value);
    updateEntityMode(); // a loaded entity JSON must hide the tile-preview controls
  });
  bindViewportCallbacks({
    // Click-to-select from the viewport: same selection slot as the parts list.
    onSelect: (partId) => {
      S.selectedPartId = partId;
      refreshEditorPanel();
      refreshSelectionOverlay();
    },
    // Gizmo drags commit through the panel's mutate flow (rebuild + re-render),
    // so the preview, the wireframe and the inspector stay in lockstep. In the
    // empty growth state the drag edits the `states.empty` localPos keyframe.
    onMutateLocalPos: (partId, delta) => {
      const entry = findNodeById(activeParts(), partId);
      if (!entry) return;
      panelCtx.mutate(() => {
        const t = entry.node.transform ?? (entry.node.transform = {});
        if (editingEmptyState()) {
          const lp = emptyLocalPos(entry.node);
          addLocalDelta(lp, delta.x, delta.y, delta.z);
          pruneZeroLocalPos(entry.node);
        } else {
          addLocalDelta(t, delta.x, delta.y, delta.z);
        }
      });
    },
  });
  rebuild();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
