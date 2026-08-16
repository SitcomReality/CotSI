/**
 * main.js — Entry point for the geometry editor page.
 *
 * Wires the controls panel to the preview: object selection, the occupied
 * (displacement) toggle, the ink-outline toggle, the camera reset, and
 * re-rolling the per-tile variation hash. The object browser overlay lives in
 * ./objectBrowser.js, the state→preview bridge (rebuild, biome select,
 * selection overlay) in ./previewSync.js; this module orchestrates startup and
 * binds the header controls.
 */
import { S } from '../state.js';
import { els, cacheDom } from '../domRefs.js';
import { SAMPLE_OBJECTS, MOB_ROWS } from '../sampleObjects.js';
import { createPreview, setFloorVisible, bindViewportCallbacks, resetCamera } from '../preview/index.js';
import { bindEditorPanel, refreshEditorPanel, undoLastEdit } from './editorPanel.js';
import { activeParts } from './variantQuery.js';
import { findNodeById, addLocalDelta } from './partTree/index.js';
import { editingEmptyState, emptyLocalPos, pruneZeroLocalPos } from './partInspector/stateKeyframes.js';
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
      S.previewOptions = new Map();
      S.growth = 1; // a fresh object starts at its full (authored) state
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
    S.previewOptions = new Map(); // ... and no alternatives preview overrides
    S.growth = 1;            // ... and its growth state at full
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

  els.canonicalCheck.addEventListener('change', () => {
    S.canonical = els.canonicalCheck.checked;
    rebuild();
  });

  els.stripCheck.addEventListener('change', () => {
    S.strip = els.stripCheck.checked;
    rebuild();
  });

  els.stripSeed.addEventListener('input', () => {
    S.stripOffset = Number(els.stripSeed.value);
    rebuild();
  });

  els.stateSelect.addEventListener('change', () => {
    S.growth = els.stateSelect.value === '0' ? 0 : 1;
    rebuild();
    refreshEditorPanel(); // the inspector edits the active keyframe's fields
  });

  els.biomeSelect.addEventListener('change', () => {
    S.biomeId = els.biomeSelect.value || null;
    rebuild();
  });

  els.motifSelect.addEventListener('change', () => {
    S.variantId = els.motifSelect.value || null;
    rebuild();
    refreshEditorPanel(); // the parts list + inspector edit the newly selected motif
  });

  els.rerollBtn.addEventListener('click', () => {
    S.tileH = (S.tileH * 17 + 5) % 89;
    rebuild();
  });

  els.floorCheck.addEventListener('change', () => {
    setFloorVisible(els.floorCheck.checked);
  });

  els.outlineCheck.addEventListener('change', () => {
    S.outlines = els.outlineCheck.checked;
    rebuild();
  });

  els.resetCameraBtn.addEventListener('click', () => {
    resetCamera();
  });

  // The preview-tools panel collapses to its title bar — keeps the viewport
  // clear while orbiting. Pure view chrome, so no preview rebuild is needed.
  els.previewToolsToggle.addEventListener('click', () => {
    const collapsed = els.previewTools.classList.toggle('collapsed');
    els.previewToolsToggle.textContent = collapsed ? '▸' : '▾';
    els.previewToolsToggle.title = collapsed ? 'Show the preview controls' : 'Hide the preview controls';
    els.previewToolsToggle.setAttribute('aria-expanded', String(!collapsed));
  });

  els.undoBtn.addEventListener('click', () => {
    undoLastEdit();
  });

  // Collapsible sidebar panels (Object / Motifs / Fields): the head folds the
  // body — session state lives in the DOM (aria-expanded + the body's
  // hidden), so re-renders of the body content never reset the fold.
  for (const head of document.querySelectorAll('.panel-head[data-panel]')) {
    const body = document.getElementById(`${head.dataset.panel}-body`);
    const fold = head.querySelector('.panel-fold');
    const apply = () => {
      const collapsed = head.classList.toggle('collapsed');
      body.hidden = collapsed;
      fold.textContent = collapsed ? '▸' : '▾';
      head.setAttribute('aria-expanded', String(!collapsed));
    };
    head.addEventListener('click', apply);
    head.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apply(); }
    });
  }

  // Ctrl/Cmd+Z undoes the last edit (unless the focus is in a text field).
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      undoLastEdit();
    }
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
