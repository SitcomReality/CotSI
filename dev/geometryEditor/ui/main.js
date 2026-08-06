/**
 * main.js — Entry point for the geometry editor page.
 *
 * Wires the controls panel to the preview: object selection, the occupied
 * (displacement) toggle, and re-rolling the per-tile variation hash.
 */
import { S } from '../state.js';
import { els, cacheDom } from '../domRefs.js';
import { SAMPLE_OBJECTS } from '../sampleObjects.js';
import { createPreview, showRecords } from '../preview.js';
import { bindEditorPanel, refreshEditorPanel } from './editorPanel.js';
import { recordsForDescriptor } from '../../../src/render/hexmap3d/features/descriptors/recordBuilder.js';

/** The tile the preview renders on — a stable hex with a hash. */
const PREVIEW_TILE = { q: 1, r: 0, terrain: 'forest' };
const ORIGIN = { x: 0, y: 0, z: 0 };

/** Rebuild the preview from the current state (descriptor, hash, displacement). */
function rebuild() {
  if (!S.descriptor) return;
  const records = recordsForDescriptor(S.descriptor, PREVIEW_TILE, ORIGIN, S.tileH, {
    displaced: S.displaced,
  });
  showRecords(S.descriptor, records);

  // Items = records / parts-of-the-active-variant (variant objects have more
  // parts than the fallback `parts` list).
  const active = S.descriptor.variants && S.descriptor.variants.length > 0
    ? S.descriptor.variants[0]
    : S.descriptor;
  const parts = active.parts.length;
  const items = parts > 0 ? records.length / parts : 0;
  els.info.textContent =
    `${S.descriptor.displayName}\n` +
    `${items} item(s) × ${parts} part(s) = ${records.length} instance record(s)\n` +
    `hash ${S.tileH} · ${S.displaced ? 'occupied (displaced)' : 'normal'}`;
}

function populateObjects() {
  const custom = document.createElement('option');
  custom.value = '';
  custom.textContent = '— custom (loaded) —';
  els.objectSelect.appendChild(custom);

  for (const descriptor of SAMPLE_OBJECTS) {
    const opt = document.createElement('option');
    opt.value = descriptor.id;
    opt.textContent = descriptor.displayName;
    els.objectSelect.appendChild(opt);
  }
}

function bindControls() {
  els.objectSelect.addEventListener('change', () => {
    S.descriptor = SAMPLE_OBJECTS.find((d) => d.id === els.objectSelect.value) ?? SAMPLE_OBJECTS[0];
    refreshEditorPanel();
    rebuild();
  });

  els.occupiedCheck.addEventListener('change', () => {
    S.displaced = els.occupiedCheck.checked;
    rebuild();
  });

  els.rerollBtn.addEventListener('click', () => {
    S.tileH = (S.tileH * 17 + 5) % 89;
    rebuild();
  });
}

function init() {
  cacheDom();
  populateObjects();
  bindControls();
  S.descriptor = SAMPLE_OBJECTS[0];
  els.objectSelect.value = S.descriptor.id;
  createPreview(els.canvas);
  bindEditorPanel(els, rebuild);
  rebuild();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
