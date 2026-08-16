/**
 * chromeControls.js — Chrome control wiring for the geometry editor: the
 * object-browser selection, the preview-tools toggles (occupied / canonical /
 * strip / floor / outline / biome / state / motif / re-roll / seed scrub),
 * the camera reset, the preview-tools collapse, undo (button + Ctrl/Cmd+Z),
 * and the collapsible inspector panel heads. Pure wiring — `rebuild`,
 * `refreshEditorPanel`, `renderObjectList` and `updateEntityMode` arrive from
 * the caller (main.js) so this module stays acyclic.
 */
import { S } from '../state.js';
import { els } from '../domRefs.js';
import { SAMPLE_OBJECTS, MOB_ROWS } from '../sampleObjects.js';
import { ENTITY_KINDS } from '../entityView.js';
import { undoLastEdit } from './editorPanel.js';
import { setFloorVisible, resetCamera } from '../preview/index.js';

/**
 * Apply the browser-restored form-control state to S before binding the change
 * listeners. Checkboxes and range inputs survive a reload with their last
 * values, but nothing pushes them into S until a change event fires — so a
 * checked #outline-check would sit visually on while the preview rendered
 * without outlines. Reading the restored DOM once at startup closes that gap;
 * the controls below are never re-initialized from S later (their init code
 * either leaves them alone or resets them to match S), so the DOM stays the
 * session source of truth. The floor toggle needs the preview scene, so main.js
 * applies it right after createPreview.
 */
function applyRestoredControls() {
  S.displaced = els.occupiedCheck.checked;
  S.canonical = els.canonicalCheck.checked;
  S.strip = els.stripCheck.checked;
  S.stripOffset = Number(els.stripSeed.value);
  S.growth = els.stateSelect.value === '0' ? 0 : 1;
  S.biomeId = els.biomeSelect.value || null;
  S.variantId = els.motifSelect.value || null;
  S.outlines = els.outlineCheck.checked;
}

/**
 * Bind every chrome control. `hooks` supplies the state→UI reactions:
 * rebuild() (preview), refreshEditorPanel() (inspector re-render),
 * renderObjectList(filter) (browser list), updateEntityMode() (tile-control
 * visibility for entity kinds).
 */
export function bindChromeControls({ rebuild, refreshEditorPanel, renderObjectList, updateEntityMode }) {
  applyRestoredControls();
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

  // The floating selection panel (Object / Parts / Motifs) collapses the same
  // way — artists can clear the view while orbiting.
  els.selectPanelToggle.addEventListener('click', () => {
    const collapsed = els.selectPanel.classList.toggle('collapsed');
    els.selectPanelToggle.textContent = collapsed ? '▸' : '▾';
    els.selectPanelToggle.title = collapsed ? 'Show the object / parts / motifs panel' : 'Hide the object / parts / motifs panel';
    els.selectPanelToggle.setAttribute('aria-expanded', String(!collapsed));
  });

  els.undoBtn.addEventListener('click', () => {
    undoLastEdit();
  });

  // Collapsible panel heads (Object / Motifs / Fields): the head folds the
  // body — session state lives in the DOM (aria-expanded + the body's
  // hidden), so re-renders of the body content never reset the fold. The
  // fields panel is the whole sidebar, so folding it collapses the sidebar to
  // a slim rail; #sidebar-expand-btn brings it back.
  const fieldsHead = document.querySelector('.panel-head[data-panel="fields"]');
  const expandSidebar = () => {
    els.inspector.classList.remove('sidebar-collapsed');
    fieldsHead.classList.remove('collapsed');
    els.fieldsBody.hidden = false;
    fieldsHead.querySelector('.panel-fold').textContent = '▾';
    fieldsHead.setAttribute('aria-expanded', 'true');
    els.sidebarExpandBtn.setAttribute('aria-expanded', 'false');
  };
  els.sidebarExpandBtn.addEventListener('click', expandSidebar);
  for (const head of document.querySelectorAll('.panel-head[data-panel]')) {
    const body = document.getElementById(`${head.dataset.panel}-body`);
    const fold = head.querySelector('.panel-fold');
    const apply = () => {
      const collapsed = head.classList.toggle('collapsed');
      body.hidden = collapsed;
      fold.textContent = collapsed ? '▸' : '▾';
      head.setAttribute('aria-expanded', String(!collapsed));
      if (head === fieldsHead) {
        els.inspector.classList.toggle('sidebar-collapsed', collapsed);
        els.sidebarExpandBtn.setAttribute('aria-expanded', String(!collapsed));
        // The folded head (and its panel) is display:none now — hand focus to
        // the rail button so keyboard users aren't dropped on the body.
        if (collapsed) els.sidebarExpandBtn.focus();
      }
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
