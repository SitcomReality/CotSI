/**
 * previewSync.js — State → preview bridge for the geometry editor.
 *
 * Reads editor state (S) and drives the preview through the recordBuilder →
 * showRecords pipeline: descriptor, entity/hash, displacement, biome tint and
 * variant selection. Also owns the preview-tile biome selector
 * (populateBiomeSelect) and the selection-overlay refresh / entity-mode
 * visibility updates. Render-only for the preview — state mutations happen in
 * main.js's controls wiring and in editorPanel's mutate flow.
 */
import { S } from '../state.js';
import { els } from '../domRefs.js';
import { SAMPLE_OBJECTS } from '../sampleObjects.js';
import {
  showRecords,
  worldAABBForPartIds,
  updateSelectionOverlay,
} from '../preview/index.js';
import { activeParts, activeVariant } from './variantQuery.js';
import {
  recordsForDescriptor,
  recordsForEntity,
  nodeWorldFrames,
  nodeWorldFramesForEntity,
} from '../../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { findNodeById, descendantLeafIds } from './partTree/index.js';
import { biomeTintForTile } from '../../../src/render/hexmap3d/worldObjects/biomeTint.js';
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

/** True while the loaded descriptor came from JSON, not a built-in sample. */
export function isCustomDescriptor() {
  return !!S.descriptor && !SAMPLE_OBJECTS.some((d) => d.id === S.descriptor.id);
}

/** Rebuild the preview from the current state (descriptor, entity/hash, displacement). */
export function rebuild() {
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

  refreshSelectionOverlay();
}

/**
 * World frames ({ origin, parentRot }) for every node of the active parts tree
 * — the same recordBuilder path as rebuild(), so partIds always match the
 * preview meshes.
 */
function currentFrames() {
  const d = S.descriptor;
  const tile = previewTile();
  return ENTITY_KINDS.has(d.kind)
    ? nodeWorldFramesForEntity(d, entityForSelection(S.entity.faction, S.entity.archetype), ORIGIN)
    : nodeWorldFrames(d, tile, ORIGIN, S.tileH, { displaced: S.displaced }, previewTint(tile), S.variantId);
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

/** Hide the tile-preview controls (biome / occupied / re-roll) for entity-driven objects. */
export function updateEntityMode() {
  const entity = ENTITY_KINDS.has(S.descriptor?.kind);
  els.biomeRow.style.display = entity ? 'none' : '';
  els.occupiedRow.style.display = entity ? 'none' : '';
  els.rerollRow.style.display = entity ? 'none' : '';
}
