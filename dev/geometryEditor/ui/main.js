/**
 * main.js — Entry point for the geometry editor page.
 *
 * Wires the controls panel to the preview: object selection, the occupied
 * (displacement) toggle, and re-rolling the per-tile variation hash.
 */
import { S } from '../state.js';
import { els, cacheDom } from '../domRefs.js';
import { SAMPLE_OBJECTS, OBJECT_CATEGORIES, categoryOf } from '../sampleObjects.js';
import { createPreview, showRecords, setFloorVisible } from '../preview.js';
import { bindEditorPanel, refreshEditorPanel, activeVariant } from './editorPanel.js';
import { recordsForDescriptor, recordsForEntity } from '../../../src/render/hexmap3d/features/descriptors/recordBuilder.js';
import { ENTITY_KINDS, entityForSelection } from '../entityView.js';

/** The tile the preview renders on — a stable hex with a hash. */
const PREVIEW_TILE = { q: 1, r: 0, terrain: 'forest' };
const ORIGIN = { x: 0, y: 0, z: 0 };

/** Categories the user collapsed; browser re-renders preserve the choice. */
const collapsedCategories = new Set();

/** True while the loaded descriptor came from JSON, not a built-in sample. */
function isCustomDescriptor() {
  return !!S.descriptor && !SAMPLE_OBJECTS.some((d) => d.id === S.descriptor.id);
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
  const variant = activeVariant();
  const active = variant ?? d;
  const parts = active.parts.length;
  const items = parts > 0 ? records.length / parts : 0;

  if (ENTITY_KINDS.has(d.kind)) {
    els.info.textContent =
      `${d.displayName}\n` +
      `${items} × ${parts} part(s) = ${records.length} record(s)\n` +
      `variant ${variant ? variant.id : '—'} · faction ${S.entity.faction}` +
      (d.variantRule === 'archetype' ? ` · archetype ${S.entity.archetype}` : '');
  } else {
    els.info.textContent =
      `${d.displayName}\n` +
      `${items} item(s) × ${parts} part(s) = ${records.length} instance record(s)\n` +
      `hash ${S.tileH} · ${S.displaced ? 'occupied (displaced)' : 'normal'}` +
      (variant ? ` · variant ${variant.id}` : '');
  }
}

/** Hide the tile-hash controls (occupied / re-roll) for entity-driven objects. */
function updateEntityMode() {
  const entity = ENTITY_KINDS.has(S.descriptor?.kind);
  els.occupiedRow.style.display = entity ? 'none' : '';
  els.rerollRow.style.display = entity ? 'none' : '';
}

// ── Object browser ──────────────────────────────────────────────────────────

/** One row in the object list. `descriptor` only needs id + displayName. */
function objectItem(descriptor, selected) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dobj-item' + (selected ? ' selected' : '');
  btn.dataset.value = descriptor.id;
  btn.textContent = descriptor.displayName;
  return btn;
}

/**
 * A collapsible category group. Collapse state is tracked in
 * `collapsedCategories` so re-renders (filter, selection) preserve it;
 * searching forces every group open so matches are never hidden.
 */
function categoryGroup(category, members, selectedId, query) {
  const group = document.createElement('details');
  group.className = 'category';
  if (query) {
    collapsedCategories.delete(category.id);
    group.open = true;
  } else {
    group.open = !collapsedCategories.has(category.id);
  }
  group.addEventListener('toggle', () => {
    if (group.open) collapsedCategories.delete(category.id);
    else collapsedCategories.add(category.id);
  });

  const head = document.createElement('summary');
  head.textContent = category.label;
  const count = document.createElement('span');
  count.className = 'category-count';
  count.textContent = String(members.length);
  head.append(count);
  group.append(head);

  for (const d of members) group.append(objectItem(d, d.id === selectedId));
  return group;
}

/**
 * Rebuild the object browser from SAMPLE_OBJECTS, grouped by category
 * (Features / Terrain Decor / Faction / Creatures) and filtered by the search
 * input. The custom (loaded) item is pinned on top while the current descriptor
 * is not one of the samples.
 */
function renderObjectList(filterText = '') {
  const query = filterText.trim().toLowerCase();
  els.objectList.textContent = '';

  if (isCustomDescriptor()) {
    const custom = objectItem({ id: '', displayName: 'Custom (loaded)' }, true);
    custom.classList.add('custom');
    els.objectList.append(custom);
  }

  const selectedId = S.descriptor?.id ?? null;
  let matched = 0;
  for (const category of OBJECT_CATEGORIES) {
    const members = SAMPLE_OBJECTS
      .filter((d) => categoryOf(d) === category)
      .filter((d) => !query || d.displayName.toLowerCase().includes(query) || d.id.toLowerCase().includes(query))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    if (members.length === 0) continue;
    matched += members.length;
    els.objectList.append(categoryGroup(category, members, selectedId, query));
  }

  els.objectFilterCount.textContent = query
    ? `${matched} of ${SAMPLE_OBJECTS.length}`
    : `${SAMPLE_OBJECTS.length} objects`;
}

function populateObjects() {
  renderObjectList();
  els.objectFilter.addEventListener('input', () => {
    renderObjectList(els.objectFilter.value);
  });
}

function bindControls() {
  els.objectList.addEventListener('click', (e) => {
    const item = e.target.closest('.dobj-item');
    if (!item || item.dataset.value === '') return; // custom row is already active
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
  populateObjects();
  bindControls();
  S.descriptor = SAMPLE_OBJECTS[0];
  renderObjectList();
  updateEntityMode();
  createPreview(els.canvas);
  bindEditorPanel(els, rebuild, () => renderObjectList(els.objectFilter.value));
  rebuild();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
