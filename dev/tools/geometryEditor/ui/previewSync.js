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
  showRecordsMulti,
  worldAABBForPartIds,
  updateSelectionOverlay,
} from '../preview/index.js';
import { activeParts, activeVariant, activeMotif } from './variantQuery.js';
import {
  recordsForDescriptor,
  recordsForEntity,
  nodeWorldFrames,
  nodeWorldFramesForEntity,
} from '../../../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { findNodeById, descendantLeafIds } from './partTree/index.js';
import { biomeTintForTile } from '../../../../src/render/hexmap3d/worldObjects/biomeTint.js';
import { listArchetypes, getArchetype } from '../../../../src/game/rules/archetypes.js';
import { ENTITY_KINDS, entityForSelection } from '../entityView.js';
import { TERRAIN } from '../../../../src/game/rules/terrainTypes.js';
import { hexCenter } from '../../../../src/render/hexmap3d/hexWorldSpace.js';
import { effectiveMotifTable } from '../../../../src/render/hexmap3d/worldObjects/descriptors/motifDraw.js';

/** The tile the preview renders on — a stable hex with a hash. */
const PREVIEW_TILE = { q: 1, r: 0, terrain: 'forest' };
const ORIGIN = { x: 0, y: 0, z: 0 };

/**
 * The preview tile's terrain, derived from the descriptor: decors and
 * mountains are bound to exactly one terrain — the decor's id IS the terrain's
 * id (gameBuilder's SIMPLE_DECOR_BY_TERRAIN dispatch) — so the terrain is
 * never a free choice; a feature has no terrain of its own and previews on
 * the plain default. Only descriptors whose id is a real TERRAIN key use it
 * as terrain (the biome-override decors — titanflesh, forespring, … — keep
 * the default tile).
 */
function previewTerrain(d) {
  return TERRAIN[d.id] ? d.id : 'forest';
}

/**
 * The preview tile, with the editor's selected biome applied (S.biomeId) and
 * the terrain derived from the descriptor (previewTerrain). The terrain
 * feeds moisture cluster counts and the `terrain` biome-tint source; a null
 * biome keeps a plain tile — default part colors and full sizes.
 */
function previewTile(d) {
  const tile = { ...PREVIEW_TILE, terrain: previewTerrain(d) };
  if (S.biomeId) tile.biomeId = S.biomeId;
  return tile;
}

/** Biome signature colors (biome id → { primary, accent }), for the preview
 *  tint. The single preview tile has no neighbors, so the tint is the biome's
 *  own colors — no blending to show here. */
const biomeColors = new Map(
  listArchetypes('biome')
    .map((id) => [id, getArchetype(id)?.colors])
    .filter(([, colors]) => colors?.primary && colors?.accent),
);

/** Biome terrain palettes (biome id → per-terrain color), for the `terrain`
 *  tint source — the tile's ground color. Same per-biome data the game state
 *  collects into state.biomePalettes. */
const biomePalettes = new Map(
  listArchetypes('biome')
    .map((id) => [id, getArchetype(id)?.palette])
    .filter(([, palette]) => palette),
);

/** The biome tint for the preview tile, or null (default colors). */
function previewTint(tile) {
  if (!S.biomeId) return null;
  return biomeTintForTile(tile, new Map([['1,0', tile]]), biomeColors, null, biomePalettes);
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
  if (S.strip && !ENTITY_KINDS.has(S.descriptor.kind)) {
    renderStrip();
    return;
  }
  const d = S.descriptor;
  const tile = previewTile(d);
  const records = ENTITY_KINDS.has(d.kind)
    ? recordsForEntity(d, entityForSelection(S.entity.faction, S.entity.archetype), ORIGIN)
    : recordsForDescriptor(d, tile, ORIGIN, S.tileH, { displaced: S.displaced }, previewTint(tile), S.variantId, S.canonical, S.growth, S.previewOptions);
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
      (motif ? ` · editing motif ${motif.id}` : variant ? ` · variant ${variant.id}` : '') +
      (S.growth < 1 ? ' · state empty' : ' · state full') +
      ` · terrain ${previewTerrain(d)}` +
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
  return ENTITY_KINDS.has(d.kind)
    ? nodeWorldFramesForEntity(d, entityForSelection(S.entity.faction, S.entity.archetype), ORIGIN)
    : nodeWorldFrames(d, tile, ORIGIN, S.tileH, { displaced: S.displaced }, previewTint(tile), S.variantId, S.canonical, S.growth, S.previewOptions);
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

// ── Tile-strip + histogram (decorComposition.md §6.3) ───────────────────────

/**
 * The 3×3 neighborhood of real hexes the strip renders: a 3×3 axial block
 * around a scrubbed center. Their hashes come from the actual (q, r) coords —
 * consecutive tileH integers are NOT a neighborhood and may be correlated.
 */
export function stripTiles() {
  const cq = 1 + S.stripOffset;
  const cr = 0;
  const out = [];
  for (let dq = -1; dq <= 1; dq++) {
    for (let dr = -1; dr <= 1; dr++) {
      const tile = { q: cq + dq, r: cr + dr, terrain: previewTerrain(S.descriptor), moisture: 0.6 };
      if (S.biomeId) tile.biomeId = S.biomeId;
      out.push({ tile, origin: { x: hexCenter(dq, dr).x, y: 0, z: hexCenter(dq, dr).z } });
    }
  }
  return out;
}

/** Render the 3×3 strip (or the single-tile preview) from the current state. */
function renderStrip() {
  if (!S.descriptor || ENTITY_KINDS.has(S.descriptor.kind)) return;
  const d = S.descriptor;
  const perTile = stripTiles().map(({ tile, origin }) => (
    recordsForDescriptor(d, tile, origin, undefined, { displaced: false }, previewTint(tile), S.variantId, S.canonical, S.growth, S.previewOptions)
  ));
  showRecordsMulti(d, perTile, { outlines: S.outlines });
  refreshSelectionOverlay();
  updateStripHistogram();
}

/**
 * The histogram beside the strip — a 64-tile tally of motif draws (and the
 * duplicate-per-tile rate) against the expected w_i/Σw shares. Nine tiles
 * cannot tell you whether cactus is 32% or 48%; this is the "did I write the
 * weights I think I wrote" view (§6.3).
 */
export function updateStripHistogram() {
  if (!els.stripHistogram) return;
  const d = S.descriptor;
  const box = els.stripHistogram;
  box.textContent = '';
  if (!d || !Array.isArray(d.motifs) || d.motifs.length === 0) return;
  const N = 64;
  const counts = new Map(d.motifs.map((m) => [m.id, 0]));
  let items = 0;
  let dupTiles = 0;
  for (let q = 0; q < N; q++) {
    const tile = { q: q + S.stripOffset * 7, r: -2, terrain: previewTerrain(d), moisture: 0.6 };
    if (S.biomeId) tile.biomeId = S.biomeId;
    const records = recordsForDescriptor(d, tile, { x: 0, y: 0, z: 0 }, undefined, {}, previewTint(tile), S.variantId, false, S.growth, S.previewOptions);
    const perTile = new Map();
    for (const r of records) {
      // Root records carry x/z — attribute each ITEM to its motif by its root
      // partId's first segment (motif ids prefix their parts).
      if (r.x === undefined) continue;
      const motifId = d.motifs.find((m) => r.partId.startsWith(`${m.id}-`))?.id;
      if (motifId) {
        counts.set(motifId, (counts.get(motifId) ?? 0) + 1);
        perTile.set(motifId, (perTile.get(motifId) ?? 0) + 1);
        items++;
      }
    }
    if (perTile.size > 0 && Math.max(...perTile.values()) > 1) dupTiles++;
  }
  const expected = effectiveMotifTable(d, S.biomeId ?? null);
  const totalW = expected.reduce((s, t) => s + t.w, 0);
  const lines = [];
  for (const m of d.motifs) {
    const share = counts.get(m.id) ?? 0;
    const expShare = (expected.find((t) => t.entry.id === m.id)?.w ?? 0) / totalW;
    const pct = items > 0 ? Math.round((share / items) * 100) : 0;
    const expPct = Math.round(expShare * 100);
    const raw = m.biomeWeight?.[S.biomeId] ?? 1;
    lines.push(
      `${m.id}: ${pct}% (exp ${expPct}%)${raw === 0 ? ' · excluded' : ''}`,
    );
  }
  lines.push(`items ${items} · tiles with a duplicate look: ${dupTiles}/${N}`);
  box.append(el('div', 'histogram-title', `Motif histogram over ${N} tiles`));
  for (const line of lines) box.append(el('div', 'histogram-line', line));
}

/** Local DOM helper for the histogram builder (previewSync renders no forms). */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
