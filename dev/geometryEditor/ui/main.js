/**
 * main.js — Entry point for the geometry editor page.
 *
 * Wires the controls panel to the preview: object selection, the occupied
 * (displacement) toggle, and re-rolling the per-tile variation hash. Also owns
 * the floating object browser overlay (open/close, outside-click, Escape) and
 * keeps the --chrome-h anchor used by the floating panels in sync.
 */
import { S } from '../state.js';
import { els, cacheDom } from '../domRefs.js';
import { SAMPLE_OBJECTS, OBJECT_CATEGORIES, categoryOf, MOB_ROWS, BROWSABLE_TOTAL } from '../sampleObjects.js';
import { createPreview, showRecords, setFloorVisible } from '../preview.js';
import { bindEditorPanel, refreshEditorPanel, activeVariant, closePartsPopover } from './editorPanel.js';
import { recordsForDescriptor, recordsForEntity } from '../../../src/render/hexmap3d/features/descriptors/recordBuilder.js';
import { biomeTintForTile } from '../../../src/render/hexmap3d/features/biomeTint.js';
import { listArchetypes, getArchetype } from '../../../src/game/rules/archetypes.js';
import { ENTITY_KINDS, entityForSelection } from '../entityView.js';

/** The tile the preview renders on — a stable hex with a hash. */
const PREVIEW_TILE = { q: 1, r: 0, terrain: 'forest' };
const ORIGIN = { x: 0, y: 0, z: 0 };

/**
 * The preview tile, with the editor's selected biome applied (S.biomeId).
 * A null biome keeps a plain tile — default part colors and full sizes.
 */
function previewTile() {
  return S.biomeId ? { ...PREVIEW_TILE, biomeId: S.biomeId } : PREVIEW_TILE;
}

/** Biome signature colors (biome id → { primary, accent }), for the preview
 *  tint. The single preview tile has no neighbors, so the tint is the biome's
 *  own colors — no blending to show here. */
const biomeColors = new Map(
  listArchetypes('biome')
    .map((id) => [id, getArchetype(id)?.colors])
    .filter(([, colors]) => colors?.primary && colors?.accent),
);

/** The biome tint for the preview tile, or null (default colors). */
function previewTint(tile) {
  if (!S.biomeId) return null;
  return biomeTintForTile(tile, new Map([['1,0', tile]]), biomeColors, null);
}

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
  const tile = previewTile();
  const records = ENTITY_KINDS.has(d.kind)
    ? recordsForEntity(d, entityForSelection(S.entity.faction, S.entity.archetype), ORIGIN)
    : recordsForDescriptor(d, tile, ORIGIN, S.tileH, { displaced: S.displaced }, previewTint(tile), S.variantId);
  showRecords(d, records);

  // Items = records / parts-of-the-active-variant (variant objects have more
  // parts than the fallback `parts` list).
  const variant = activeVariant();
  const active = variant ?? d;
  const parts = active.parts.length;
  const items = parts > 0 ? records.length / parts : 0;
  const biome = S.biomeId ? getArchetype(S.biomeId)?.name : null;

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
      (variant ? ` · variant ${variant.id}` : '') +
      (biome ? ` · biome ${biome}` : '');
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

/** One mob row — labelled with the friendly name, carries the descriptor-side
 *  variant id so the click handler can load the generic mob descriptor with
 *  that archetype selected. */
function mobObjectItem(row, selected) {
  const btn = objectItem({ id: 'mob', displayName: row.displayName }, selected);
  btn.dataset.mob = row.variantId;
  return btn;
}

/**
 * A collapsible shell (details/summary + count). Collapse state is tracked in
 * `collapsedCategories` so re-renders (filter, selection) preserve it;
 * searching forces every group open so matches are never hidden.
 */
function collapsibleShell(category, count, query) {
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
  const countEl = document.createElement('span');
  countEl.className = 'category-count';
  countEl.textContent = String(count);
  head.append(countEl);
  group.append(head);
  return group;
}

function categoryGroup(category, members, selectedId, query) {
  const group = collapsibleShell(category, members.length, query);
  for (const d of members) group.append(objectItem(d, d.id === selectedId));
  return group;
}

/**
 * Rebuild the object browser, grouped by category (Features / Terrain Decor /
 * Mobs / Faction / Creatures) and filtered by the search input. The Mobs
 * category renders one row per type from MOB_ROWS instead of the single generic
 * mob descriptor. The custom (loaded) item is pinned on top while the current
 * descriptor is not one of the samples.
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
    if (category.id === 'mob') {
      const rows = MOB_ROWS.filter(
        (r) => !query || r.displayName.toLowerCase().includes(query) || r.id.toLowerCase().includes(query),
      );
      if (rows.length === 0) continue;
      matched += rows.length;
      const group = collapsibleShell(category, rows.length, query);
      const mobSelected = S.descriptor?.id === 'mob' && S.entity.archetype != null;
      for (const row of rows) {
        group.append(mobObjectItem(row, mobSelected && S.entity.archetype === row.variantId));
      }
      els.objectList.append(group);
      continue;
    }

    const members = SAMPLE_OBJECTS
      .filter((d) => categoryOf(d) === category)
      .filter((d) => !query || d.displayName.toLowerCase().includes(query) || d.id.toLowerCase().includes(query))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    if (members.length === 0) continue;
    matched += members.length;
    els.objectList.append(categoryGroup(category, members, selectedId, query));
  }

  els.objectFilterCount.textContent = query
    ? `${matched} of ${BROWSABLE_TOTAL}`
    : `${BROWSABLE_TOTAL} objects`;
}

// ── Floating object browser ─────────────────────────────────────────────────

/** Whether the floating object browser is currently shown. */
let browserOpen = false;

/** Show or hide the floating browser panel and sync the header toggle. */
function setBrowserOpen(open) {
  browserOpen = open;
  if (open) syncChromeHeight(); // the anchor may have drifted since last time
  els.browser.classList.toggle('open', open);
  els.browserToggle.classList.toggle('open', open);
  els.browserToggle.textContent = open ? '▾' : '▸';
  els.browserToggle.title = open ? 'Hide object browser' : 'Show object browser';
  els.browserToggle.setAttribute('aria-expanded', String(open));
}

function populateObjects() {
  renderObjectList();
  els.objectFilter.addEventListener('input', () => {
    renderObjectList(els.objectFilter.value);
  });
  // The header toggle is the whole-panel switch; per-category collapse is
  // still preserved by the details rows inside the list itself.
  els.browserToggle.addEventListener('click', () => setBrowserOpen(!browserOpen));
  // Focusing the search (tab or click) opens the browser — the filter is only
  // useful while the list is visible.
  els.objectFilter.addEventListener('focus', () => {
    if (!browserOpen) setBrowserOpen(true);
  });
}

/** Keep --chrome-h in sync so the floating panels anchor exactly under the bar. */
function syncChromeHeight() {
  document.documentElement.style.setProperty('--chrome-h', `${els.chrome.offsetHeight}px`);
}

/**
 * Global overlay choreography. The browser closes on outside clicks and Escape,
 * but clicks on its own controls (toggle, filter) or on the parts popover /
 * its toggle are never treated as "outside" — the two overlays coexist.
 */
function bindOverlays() {
  document.addEventListener('pointerdown', (e) => {
    if (!browserOpen) return;
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (t.closest('#browser')) return;
    if (t.closest('#browser-toggle') || t.closest('#object-filter')) return;
    if (t.closest('#parts-popover') || t.closest('.parts-toggle')) return;
    setBrowserOpen(false);
  });

  // Escape dismisses the topmost overlay first: the parts popover, then the browser.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (closePartsPopover()) return;
    setBrowserOpen(false);
  });
}

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
  populateObjects();
  bindControls();
  bindOverlays();
  window.addEventListener('resize', syncChromeHeight);
  window.addEventListener('load', syncChromeHeight); // fonts can shift the bar
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
