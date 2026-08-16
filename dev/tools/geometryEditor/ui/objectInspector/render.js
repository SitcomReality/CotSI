/**
 * render.js — Object inspector field composition: the Motifs panel (v6
 * composition, motif decors only) and the Fields panel — the kind-dispatched
 * design sections (item icons, entity-driven faction/archetype, and
 * tile-driven variant/cluster/size/placement/emphasis/portrait). The Object
 * identity panel lives in identity.js; both compose through the barrel
 * (index.js). `ctx` supplies `mutate()` (and `onLoaded()` for renames, which
 * also refresh the object browser).
 */
import { S } from '../../state.js';
import { el, row, selectInput } from '../formControls/index.js';
import { ENTITY_KINDS } from '../../entityView.js';
import { ITEM_SLOTS } from '../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { section } from './sectionShell.js';
import { renderMotifControls } from './motifSection/index.js';
import { renderVariantSection } from './variantSection.js';
import { renderEntityControls } from './entitySection.js';
import { renderClusterSection, renderSizeSection, renderPlacementSection, renderEmphasisSection } from './tileSections.js';

/** The Motifs panel — the v6 composition panel for motif decors. */
export function renderMotifPanel(container, ctx) {
  renderMotifControls(container, ctx);
}

/** The Fields panel — the kind-dispatched design sections (everything except
 *  the Object identity + portrait, which live in the Object panel). */
export function renderFieldSections(container, ctx) {
  const d = S.descriptor;

  if (d.kind === 'item') {
    container.append(el('div', 'mode-banner', 'item — UI icon'));
    const itemSection = section('item', container);
    itemSection.append(row('Slot', selectInput(ITEM_SLOTS, d.slot, (v) => ctx.mutate(() => {
      d.slot = v;
      ctx.onLoaded(); // the slot moves the item between the weapon/armor browser categories
    }))));
    container.append(el('div', 'hint', 'Items render as a single centered icon — cluster/size/placement do not apply.'));
    return;
  }

  if (ENTITY_KINDS.has(d.kind)) {
    container.append(el('div', 'mode-banner', `${d.kind} — entity-driven`));
    renderEntityControls(section('entity', container), ctx);
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
}
