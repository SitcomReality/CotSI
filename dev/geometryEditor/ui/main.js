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
import { recordsForDescriptor, recordsForEntity } from '../../../src/render/hexmap3d/features/descriptors/recordBuilder.js';
import { ENTITY_KINDS, entityForSelection } from '../entityView.js';

/** The tile the preview renders on — a stable hex with a hash. */
const PREVIEW_TILE = { q: 1, r: 0, terrain: 'forest' };
const ORIGIN = { x: 0, y: 0, z: 0 };

/** The variant currently shown in the preview — entity kinds pick by selection. */
function activeVariant() {
  const d = S.descriptor;
  if (!d.variants || d.variants.length === 0) return null;
  if (ENTITY_KINDS.has(d.kind)) {
    const key = d.variantRule === 'faction' ? S.entity.faction : S.entity.archetype;
    return d.variants.find((v) => v.id === key) ?? d.variants[0];
  }
  return d.variants[0];
}

/** Rebuild the preview from the current state (descriptor, entity/hash, displacement). */
function rebuild() {
  if (!S.descriptor) return;
  const d = S.descriptor;
  const records = ENTITY_KINDS.has(d.kind)
    ? recordsForEntity(d, entityForSelection(S.entity.faction, S.entity.archetype), ORIGIN)
    : recordsForDescriptor(d, PREVIEW_TILE, ORIGIN, S.tileH, { displaced: S.displaced });
  showRecords(d, records);

  // Items = records / parts-of-the-active-variant (variant objects have more
  // parts than the fallback `parts` list).
  const active = activeVariant() ?? d;
  const parts = active.parts.length;
  const items = parts > 0 ? records.length / parts : 0;

  if (ENTITY_KINDS.has(d.kind)) {
    const variant = activeVariant();
    els.info.textContent =
      `${d.displayName}\n` +
      `${items} × ${parts} part(s) = ${records.length} record(s)\n` +
      `variant ${variant ? variant.id : '—'} · faction ${S.entity.faction}` +
      (d.variantRule === 'archetype' ? ` · archetype ${S.entity.archetype}` : '');
  } else {
    els.info.textContent =
      `${d.displayName}\n` +
      `${items} item(s) × ${parts} part(s) = ${records.length} instance record(s)\n` +
      `hash ${S.tileH} · ${S.displaced ? 'occupied (displaced)' : 'normal'}`;
  }
}

/** Hide the tile-hash controls (occupied / re-roll) for entity-driven objects. */
function updateEntityMode() {
  const entity = ENTITY_KINDS.has(S.descriptor?.kind);
  els.occupiedRow.style.display = entity ? 'none' : '';
  els.rerollRow.style.display = entity ? 'none' : '';
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
    // Keep the archetype selection valid for the new object (stale values fall
    // back to the first variant in the record path, but the select should show
    // what the preview actually renders).
    if (ENTITY_KINDS.has(S.descriptor.kind)) {
      const ids = (S.descriptor.variants ?? []).map((v) => v.id);
      if (!ids.includes(S.entity.archetype)) S.entity.archetype = ids[0] ?? null;
    }
    updateEntityMode();
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
  updateEntityMode();
  createPreview(els.canvas);
  bindEditorPanel(els, rebuild);
  rebuild();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
