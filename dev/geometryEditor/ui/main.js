/**
 * main.js — Entry point for the geometry editor page.
 *
 * Wires the controls panel to the preview: object selection, the occupied
 * (displacement) toggle, and re-rolling the per-tile variation hash. The
 * object browser overlay lives in ./objectBrowser.js, the state→preview
 * bridge (rebuild, biome select, selection overlay) in ./previewSync.js;
 * this module orchestrates startup and binds the header controls.
 */
import { S } from '../state.js';
import { els, cacheDom } from '../domRefs.js';
import { SAMPLE_OBJECTS, MOB_ROWS } from '../sampleObjects.js';
import { createPreview, setFloorVisible, bindViewportCallbacks } from '../preview/index.js';
import { bindEditorPanel, refreshEditorPanel } from './editorPanel.js';
import { activeParts } from './variantQuery.js';
import { findNodeById, addLocalDelta } from './partTree/index.js';
import { ENTITY_KINDS } from '../entityView.js';
import { renderObjectList, populateObjects, bindOverlays, syncChromeHeight } from './objectBrowser.js';
import { populateBiomeSelect, rebuild, refreshSelectionOverlay, updateEntityMode } from './previewSync.js';

function bindControls() {
  els.objectList.addEventListener('click', (e) => {
    const item = e.target.closest('.dobj-item');
    if (!item) return;
    if (item.dataset.mob) {
      const row = MOB_ROWS.find((r) => r.variantId === item.dataset.mob);
      const mob = SAMPLE_OBJECTS.find((d) => d.id === 'mob');
      if (!row || !mob) return;
      // Deep copy — the shared mob descriptor must not carry edits across rows.
      S.descriptor = JSON.parse(JSON.stringify(mob));
      S.descriptor.displayName = row.displayName;
      S.selectedPartId = null;
      S.variantId = null;
      S.entity.archetype = row.variantId;
      updateEntityMode();
      refreshEditorPanel();
      rebuild();
      renderObjectList(els.objectFilter.value);
      return;
    }
    if (item.dataset.value === '') return; // custom row is already active
    const next = SAMPLE_OBJECTS.find((d) => d.id === item.dataset.value);
    if (!next) return;
    S.descriptor = next;
    S.selectedPartId = null; // the new object's parts start unselected
    S.variantId = null;      // the new object's variant starts at the first
    // Keep the archetype selection valid for the new object (stale values fall
    // back to the first variant in the record path, but the browser should show
    // what the preview actually renders).
    if (ENTITY_KINDS.has(S.descriptor.kind)) {
      const ids = (S.descriptor.variants ?? []).map((v) => v.id);
      if (!ids.includes(S.entity.archetype)) S.entity.archetype = ids[0] ?? null;
    }
    updateEntityMode();
    refreshEditorPanel();
    rebuild();
    renderObjectList(els.objectFilter.value);
  });

  els.occupiedCheck.addEventListener('change', () => {
    S.displaced = els.occupiedCheck.checked;
    rebuild();
  });

  els.biomeSelect.addEventListener('change', () => {
    S.biomeId = els.biomeSelect.value || null;
    rebuild();
  });

  els.rerollBtn.addEventListener('click', () => {
    S.tileH = (S.tileH * 17 + 5) % 89;
    rebuild();
  });

  els.floorCheck.addEventListener('change', () => {
    setFloorVisible(els.floorCheck.checked);
  });
}

function init() {
  cacheDom();
  syncChromeHeight();
  populateBiomeSelect();
  populateObjects();
  bindControls();
  bindOverlays();
  window.addEventListener('resize', syncChromeHeight);
  window.addEventListener('load', syncChromeHeight); // fonts can shift the bar
  S.descriptor = SAMPLE_OBJECTS[0];
  renderObjectList();
  updateEntityMode();
  createPreview(els.canvas);
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
    // so the preview, the wireframe and the inspector stay in lockstep.
    onMutateLocalPos: (partId, delta) => {
      const entry = findNodeById(activeParts(), partId);
      if (!entry) return;
      panelCtx.mutate(() => {
        const t = entry.node.transform ?? (entry.node.transform = {});
        addLocalDelta(t, delta.x, delta.y, delta.z);
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
