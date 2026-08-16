/**
 * render.js — Object inspector composition, split across the sidebar panels.
 *
 * Renders into the sidebar's Object / Motifs / Fields panels when no part is
 * selected. `renderObjectIdentity` owns the header + Name/ID rows;
 * `renderMotifPanel` the v6 motif composition panel (motif decors only);
 * `renderFieldSections` the kind-dispatched field sets — item icons,
 * entity-driven (faction/archetype), and tile-driven objects (variant panel,
 * then cluster/size/placement/emphasis/portrait). `ctx` supplies `mutate()`
 * (and `onLoaded()` for renames, which also refresh the object browser).
 */
import { S } from '../../state.js';
import { el, row, textInput, selectInput } from '../formControls.js';
import { inspectorHead } from '../inspectorHead.js';
import { ENTITY_KINDS } from '../../entityView.js';
import { SAMPLE_OBJECTS } from '../../sampleObjects.js';
import { ITEM_SLOTS } from '../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { section } from './sectionShell.js';
import { renderMotifControls } from './motifSection.js';
import { renderVariantSection } from './variantSection.js';
import { renderEntityControls } from './entitySection.js';
import { renderPortraitControls } from './portraitSection.js';
import { renderClusterSection, renderSizeSection, renderPlacementSection, renderEmphasisSection } from './tileSections.js';

/** The Object panel: inspector header (name + id/kind meta) and the editable
 *  Name / ID rows every object gets. */
export function renderObjectIdentity(container, ctx) {
  const d = S.descriptor;

  container.append(inspectorHead(d.displayName, `${d.id} · ${d.kind}`));

  // Name is editable for every object (samples included) — renames take effect
  // in the inspector header, the preview info, and the browser list right away.
  container.append(row('Name', textInput(d.displayName, (v) => ctx.mutate(() => {
    d.displayName = v;
    ctx.onLoaded(); // browser labels + custom pin re-render with the new name
  }))));

  // ID — fixed for registered game objects (the save path derives file and
  // export name from it); editable for new/custom objects so they can be saved
  // under a real id. Sanitized to the schema's id pattern on commit.
  const isRegistered = SAMPLE_OBJECTS.some((o) => o.id === d.id);
  const idInput = el('input');
  idInput.type = 'text';
  idInput.value = d.id;
  idInput.disabled = isRegistered;
  idInput.addEventListener('change', () => {
    const clean = idInput.value.trim().replace(/[^A-Za-z0-9_-]/g, '_');
    if (clean && clean !== d.id) {
      ctx.mutate(() => { d.id = clean; });
      ctx.onLoaded(); // browser labels + custom pin re-render with the new id
    } else {
      idInput.value = d.id;
    }
  });
  container.append(row('ID', idInput));
  if (!isRegistered) {
    container.append(el('div', 'hint', 'New objects need a real id before saving to the game — letters, numbers, _ and -.'));
  }
}

/** The Motifs panel — the v6 composition panel for motif decors. */
export function renderMotifPanel(container, ctx) {
  renderMotifControls(container, ctx);
}

/** The Fields panel — the kind-dispatched design sections (everything except
 *  the Object identity and the Motifs panel). */
export function renderFieldSections(container, ctx) {
  const d = S.descriptor;

  if (d.kind === 'item') {
    container.append(el('div', 'mode-banner', 'item — UI icon'));
    const itemSection = section('item', container);
    itemSection.append(row('Slot', selectInput(ITEM_SLOTS, d.slot, (v) => ctx.mutate(() => {
      d.slot = v;
      ctx.onLoaded(); // the slot moves the item between the weapon/armor browser categories
    }))));
    renderPortraitControls(section('portrait', container), ctx);
    container.append(el('div', 'hint', 'Items render as a single centered icon — cluster/size/placement do not apply.'));
    return;
  }

  if (ENTITY_KINDS.has(d.kind)) {
    container.append(el('div', 'mode-banner', `${d.kind} — entity-driven`));
    renderEntityControls(section('entity', container), ctx);
    renderPortraitControls(section('portrait', container), ctx);
    container.append(el('div', 'hint', 'Entities are singletons at the hex center — cluster/size/placement do not apply.'));
    return;
  }

  // Tile-driven kinds only (entity/item returned above). Motif decors get the
  // motif panel in its own sidebar panel; everything else keeps the Variant
  // section here (the duplicate path still starts a per-biome variant).
  const hasMotifs = (d.motifs ?? []).length > 0;
  if (!hasMotifs) {
    renderVariantSection(container, d, ctx);
  }

  renderClusterSection(section('cluster', container), d, ctx);
  renderSizeSection(section('size', container), d, ctx);
  renderPlacementSection(section('placement', container), d, ctx);
  renderEmphasisSection(section('emphasis', container), d, ctx);
  renderPortraitControls(section('portrait', container), ctx);
}
