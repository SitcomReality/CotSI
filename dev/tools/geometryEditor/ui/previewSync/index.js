/**
 * previewSync/index.js — State → preview bridge for the geometry editor.
 *
 * Reads editor state (S) and drives the preview through the recordBuilder →
 * showRecords pipeline: descriptor, entity/hash, displacement, biome tint and
 * variant selection. Also owns the preview-tile biome selector
 * (populateBiomeSelect) and the selection-overlay refresh / entity-mode
 * visibility updates. The preview-tile derivation lives in tile.js and the
 * tile-strip + histogram in strip.js; this barrel composes them and
 * re-exports the original public API. Render-only for the preview — state
 * mutations happen in main.js's controls wiring and in editorPanel's mutate
 * flow.
 */
import { S } from '../../state.js';
import { els } from '../../domRefs.js';
import { SAMPLE_OBJECTS } from '../../sampleObjects.js';
import {
  showRecords,
  showRecordsMulti,
  worldAABBForPartIds,
  updateSelectionOverlay,
} from '../../preview/index.js';
import { activeParts, activeVariant, activeMotif } from '../variantQuery.js';
import {
  recordsForDescriptor,
  recordsForEntity,
  nodeWorldFrames,
  nodeWorldFramesForEntity,
} from '../../../../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { findNodeById, descendantLeafIds } from '../partTree/index.js';
import { listArchetypes, getArchetype } from '../../../../../src/game/rules/archetypes.js';
import { ENTITY_KINDS, entityForSelection } from '../../entityView.js';
import { renderStrip, stripTiles, updateStripHistogram } from './strip.js';
import { previewTile, previewTint, previewOrigin } from './tile.js';

export { stripTiles, updateStripHistogram } from './strip.js';

/** Fill the preview-tile biome selector: none + every registered biome. */
export function populateBiomeSelect() {
  const options = [
    { value: '', label: '— none (default colors)' },
    ...listArchetypes('biome').map((id) => ({ value: id, label: getArchetype(id)?.name ?? id })),
  ];
  els.biomeSelect.replaceChildren(...options.map((o) => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    return opt;
  }));
  els.biomeSelect.value = S.biomeId ?? '';
}

/** True while the loaded descriptor came from JSON (or is a motif wrapper),
 *  not a built-in sample. A library-motif wrapper is a synthetic decor, so it
 *  is never a SAMPLE_OBJECTS entry — but it is still a first-class browser row
 *  (under Motif Library), so it must not render the "Custom (loaded)" pin. */
export function isCustomDescriptor() {
  if (!S.descriptor) return false;
  if (S.motifEditing) return false;
  return !SAMPLE_OBJECTS.some((d) => d.id === S.descriptor.id);
}

/** Fill the preview-tools Motif select (the Force-motif / editing selector —
 *  S.variantId, motif ids only) and show it only for motif decors. Rebuilt on
 *  every rebuild() so add/duplicate/delete/rename stay in sync; the option
 *  list only re-renders when the ids change, so an open dropdown keeps focus. */
function refreshMotifSelect() {
  const d = S.descriptor;
  const row = els.motifRow;
  const sel = els.motifSelect;
  const show = !!d && !ENTITY_KINDS.has(d.kind) && (d.motifs ?? []).length > 0;
  row.hidden = !show;
  if (!show) { sel.replaceChildren(); sel.dataset.ids = ''; return; }
  const ids = d.motifs.map((m) => m.id);
  if (sel.dataset.ids !== ids.join(',')) {
    const options = [
      { value: '', label: '— real rolls (weights)' },
      ...ids.map((id) => ({ value: id, label: id })),
    ];
    sel.replaceChildren(...options.map((o) => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      return opt;
    }));
    sel.dataset.ids = ids.join(',');
  }
  sel.value = S.variantId && ids.includes(S.variantId) ? S.variantId : '';
}

/** Rebuild the preview from the current state (descriptor, entity/hash, displacement). */
export function rebuild() {
  if (!S.descriptor) return;
  refreshMotifSelect();
  if (S.strip && !ENTITY_KINDS.has(S.descriptor.kind)) {
    renderStrip(showRecordsMulti, refreshSelectionOverlay);
    return;
  }
  const d = S.descriptor;
  const tile = previewTile(d);
  const origin = previewOrigin();
  const records = ENTITY_KINDS.has(d.kind)
    ? recordsForEntity(d, entityForSelection(S.entity.faction, S.entity.archetype), origin)
    : recordsForDescriptor(d, tile, origin, S.tileH, { displaced: S.displaced }, previewTint(tile), S.variantId, S.canonical, S.growth, S.previewOptions);
  showRecords(d, records, { outlines: S.outlines });

  // Items = records / parts-of-the-active-parts (motif decors edit one motif
  // at a time; variant objects have more parts than the fallback `parts`).
  const variant = activeVariant();
  const motif = activeMotif();
  const parts = activeParts().length;
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
      (S.motifEditing ? ` · library motif ${S.motifEditing.id}` : motif ? ` · editing motif ${motif.id}` : variant ? ` · variant ${variant.id}` : '') +
      (S.growth < 1 ? ' · state empty' : ' · state full') +
      ` · terrain ${tile.terrain}` +
      (biome ? ` · biome ${biome}` : '') +
      (S.strip ? ' · strip mode' : '');
  }

  refreshSelectionOverlay();
}

/**
 * World frames ({ origin, parentRot }) for every node of the active parts tree
 * — the same recordBuilder path as rebuild(), so partIds always match the
 * preview meshes.
 */
function currentFrames() {
  const d = S.descriptor;
  const tile = previewTile(d);
  const origin = previewOrigin();
  return ENTITY_KINDS.has(d.kind)
    ? nodeWorldFramesForEntity(d, entityForSelection(S.entity.faction, S.entity.archetype), origin)
    : nodeWorldFrames(d, tile, origin, S.tileH, { displaced: S.displaced }, previewTint(tile), S.variantId, S.canonical, S.growth, S.previewOptions);
}

/**
 * Recompute the selection wireframe + gizmo from the current state — called at
 * the end of every rebuild() and whenever selection changes (click-to-select,
 * panel edits). Clears the overlay when nothing is selected or the selection is
 * stale (e.g. after a variant switch).
 */
export function refreshSelectionOverlay() {
  const d = S.descriptor;
  if (!d) { updateSelectionOverlay(null); return; }
  const entry = findNodeById(activeParts(), S.selectedPartId);
  if (!entry) { updateSelectionOverlay(null); return; }
  const frame = currentFrames().get(entry.node.id);
  if (!frame) { updateSelectionOverlay(null); return; }
  const entityScale = ENTITY_KINDS.has(d.kind)
    ? (entityForSelection(S.entity.faction, S.entity.archetype).scale ?? 1)
    : 1;
  updateSelectionOverlay({
    partId: entry.node.id,
    origin: frame.origin,
    parentRot: frame.parentRot,
    itemScale: d.scale * entityScale,
    box: worldAABBForPartIds(descendantLeafIds(entry)),
  });
}

/** Hide the tile-preview controls (biome / terrain / state / occupied / re-roll) for entity-driven objects. */
export function updateEntityMode() {
  const entity = ENTITY_KINDS.has(S.descriptor?.kind);
  els.biomeRow.style.display = entity ? 'none' : '';
  els.stateRow.style.display = entity ? 'none' : '';
  els.stateSelect.value = S.growth < 1 ? '0' : '1';
  els.occupiedRow.style.display = entity ? 'none' : '';
  els.canonicalRow.style.display = entity ? 'none' : '';
  els.rerollRow.style.display = entity ? 'none' : '';
  if (els.stripRow) els.stripRow.style.display = entity ? 'none' : '';
}
