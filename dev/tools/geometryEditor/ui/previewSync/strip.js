/**
 * strip.js — The tile-strip diversity view (decorComposition.md §6.3): a 3×3
 * real-hex neighborhood rendered in one pass, with the motif histogram
 * beside it. The strip is an acceptance view, not an editing surface — the
 * selection overlay is cleared (rendered by the caller).
 */
import { S } from '../../state.js';
import { els } from '../../domRefs.js';
import { recordsForDescriptor } from '../../../../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { effectiveMotifTable } from '../../../../../src/render/hexmap3d/worldObjects/descriptors/motifDraw.js';
import { hexCenter } from '../../../../../src/render/hexmap3d/hexWorldSpace.js';
import { ENTITY_KINDS } from '../../entityView.js';
import { previewTerrain, previewTile, previewTint } from './tile.js';

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

/** Render the 3×3 strip (or the single-tile preview) from the current state.
 *  `showRecordsMulti` / `refreshSelectionOverlay` come from the caller (the
 *  preview barrel + the previewSync composition) to keep the module graph
 *  acyclic; updateStripHistogram lives here. */
export function renderStrip(showRecordsMulti, refreshSelectionOverlay) {
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
