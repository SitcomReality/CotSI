/**
 * list.js — The object-browser list: category-collapsible groups of sample
 * objects (one row per mob type for the Mobs category), filtered by the
 * header search input, with the pinned "Custom (loaded)" row on top.
 */
import { S } from '../../state.js';
import { els } from '../../domRefs.js';
import { SAMPLE_OBJECTS, OBJECT_CATEGORIES, categoryOf, MOB_ROWS, BROWSABLE_TOTAL } from '../../sampleObjects.js';
import { isCustomDescriptor } from '../previewSync/index.js';

/** Categories the user collapsed; browser re-renders preserve the choice. All
 *  start collapsed so the first open is scannable — searching forces every
 *  group open (see collapsibleShell). */
const collapsedCategories = new Set(OBJECT_CATEGORIES.map((c) => c.id));

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
export function renderObjectList(filterText = '') {
  const query = filterText.trim().toLowerCase();
  els.objectList.textContent = '';

  if (isCustomDescriptor()) {
    const custom = objectItem({ id: '', displayName: 'Custom (loaded)' }, true);
    custom.classList.add('custom');
    els.objectList.append(custom);
  }

  const selectedId = S.descriptor?.id ?? null;
  // The pinned "Custom (loaded)" row counts toward the filtered total.
  let matched = isCustomDescriptor() ? 1 : 0;
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
