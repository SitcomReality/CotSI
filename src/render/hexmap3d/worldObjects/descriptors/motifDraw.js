/**
 * motifDraw.js — Weighted draws for the decor composition system.
 *
 * Every choice point in a decor is a weighted pick (decorComposition.md §2),
 * and they all share ONE resolver: `resolveWeighted` walks a pre-weighted
 * table against a uniform draw over a CDF that accumulates over a STABLE SORT
 * BY ENTRY ID — so inserting, removing, or reordering entries is a content
 * edit, never a world-edit (the "why did my desert change" killer, §5.7).
 *
 * Call sites (the "one resolver, two skins" rule — never build a second CDF):
 *   - `effectiveMotifTable` + `motifForSlot` — the per-slot motif draw on the
 *     tile path (tileRecords.js). Biome influence is a per-motif relative
 *     multiplier (`biomeWeight`); zero-effective entries are FILTERED OUT so
 *     an excluded motif never shifts the surviving thresholds; if a biome
 *     excludes everything the table falls back to base weights (never empty,
 *     never a divide-by-zero) with a warning.
 *   - `resolveAlternatives` — per-item option draws inside parts trees
 *     (collectPart), using each node's authored seed from the reserved
 *     100–199 lane.
 *
 * Pure — no THREE. Every draw derives from the tile hash, so results are
 * deterministic across rebuilds.
 */
import { itemHash } from '../tileHash.js';
import { MOTIF_SEED } from './descriptorDefaults.js';

/** Stable comparator by entry id — the CDF must accumulate over id order. */
function byId(a, b) {
  return a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0;
}

/**
 * The one weighted resolver. `weighted` is an array of `{ entry, w }` (weight
 * already multiplied by any per-entry modifiers); zero/absent weights are
 * dropped, the survivors sort by entry id, and `draw` (a uniform [0, 1) value)
 * walks the half-open CDF — `draw < cum[i]` per bin, LAST BIN CLOSED so a draw
 * ≈ 1 lands in the last entry and never misses. Returns the chosen entry, or
 * null when every weight is 0 (callers resolve to a default/first — never a
 * divide-by-zero, never an unexpectedly empty pick).
 *
 * @param {{ entry: object, w: number }[]} weighted - pre-weighted candidates
 * @param {number} draw - uniform value in [0, 1)
 * @returns {object|null} the chosen `entry`, or null when the table is empty
 */
export function resolveWeighted(weighted, draw) {
  const table = weighted.filter((t) => t.w > 0);
  if (table.length === 0) return null;
  table.sort(byId);
  const total = table.reduce((sum, t) => sum + t.w, 0);
  let cum = 0;
  for (let i = 0; i < table.length; i++) {
    cum += table[i].w / total;
    if (draw < cum || i === table.length - 1) return table[i].entry;
  }
  return table[table.length - 1].entry; // unreachable; defensive
}

/**
 * The per-biome motif table for a descriptor: each motif's base `weight`
 * multiplied by its `biomeWeight[biomeId]` (absent key ≡ 1, present 0 ≡
 * excluded), with zero-effective entries filtered out — an excluded motif must
 * not shift the surviving thresholds, and adding a zeroed motif later must not
 * re-roll existing tiles.
 *
 * All-excluded fallback: when a biome's filter leaves zero motifs, fall back
 * to each motif's BASE weight (ignoring biomeWeight) — never empty, never a
 * divide-by-zero — and warn, so a typo that zeros the whole table can't ship
 * silently. (Falling back to "all weights 1" is explicitly wrong: it makes a
 * `dead-cactus` as common as `rock` exactly when the author most needs rarity
 * visible — decorComposition.md §2.1.)
 *
 * @param {object} descriptor - normalized descriptor with `motifs`
 * @param {string|null} biomeId - tile biome id (null/undefined = no biome)
 * @returns {{ entry: object, w: number }[]} fresh table per call — callers may
 *          mutate `w` (repeatPenalty) without corrupting the descriptor
 */
export function effectiveMotifTable(descriptor, biomeId) {
  const motifs = descriptor.motifs ?? [];
  const weighted = motifs.map((m) => ({
    entry: m,
    w: m.weight * (biomeId ? (m.biomeWeight?.[biomeId] ?? 1) : 1),
  }));
  const filtered = weighted.filter((t) => t.w > 0);
  if (filtered.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(`[motifDraw] biome "${biomeId}" excludes every motif of "${descriptor.id}" — falling back to base weights`);
    return weighted.map((t) => ({ entry: t.entry, w: t.entry.weight }));
  }
  return filtered;
}

/**
 * Which motif fills a slot. Precedence (highest first): biomeVariants pin
 * (forces that motif on EVERY slot — the hard guarantee) > editor force
 * (`forcedId`, a motif id) > the weighted table draw. A pin or force that
 * names an id the descriptor doesn't define falls through to the weights (a
 * stale id must never vanish a tile's content).
 *
 * Slot `i` draws from the dedicated `itemHash(tileH, i + MOTIF_SEED)` lane —
 * deterministic per tile, decorrelated between cluster members, and
 * independent of the size/placement lanes (decorComposition.md §3.2).
 *
 * @param {object} descriptor - normalized descriptor with `motifs`
 * @param {string|null} biomeId - tile biome id
 * @param {number} tileH - tile hash
 * @param {number} i - slot index
 * @param {{ entry: object, w: number }[]} table - effective table (mutated by
 *        repeatPenalty across slots — pass the SAME array per tile)
 * @param {string|null} [forcedId] - editor "Force motif" id (motif ids only)
 * @returns {object} the chosen motif
 */
export function motifForSlot(descriptor, biomeId, tileH, i, table, forcedId = null) {
  const motifs = descriptor.motifs ?? [];
  const findMotif = (id) => motifs.find((m) => m.id === id) ?? null;
  const pinned = biomeId ? descriptor.biomeVariants?.[biomeId] : null;
  if (pinned) {
    const forced = findMotif(pinned);
    if (forced) return forced;
  }
  if (forcedId) {
    const forced = findMotif(forcedId);
    if (forced) return forced;
  }
  return resolveWeighted(table, itemHash(tileH, i + MOTIF_SEED));
}

/** A tiny deterministic string hash — fallback lane for alternatives nodes
 *  that predate the authored `seed` field (100 + hash % 100 stays inside the
 *  reserved 100–199 range). Migration assigns real seeds; this only keeps old
 *  trees stable until then. */
function fallbackSeed(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return 100 + (Math.abs(h) % 100);
}

/**
 * Resolve one `alternatives` choice point for an item: pick by the node's
 * authored seed (`itemHash(tileH, i + seed)` — item-scoped, so two cacti on
 * one tile can show different arm configs), continuing with the chosen
 * option's parts. Per-biome bias: each option's optional `biomeWeight` is a
 * sparse multiplier (absent key ≡ 1, present 0 ≡ excluded) applied to the
 * option's base `weight` — the mirror of the motif-slot `biomeWeight`
 * (decorComposition.md §2.2), so a tree can favor one shape variant in a
 * biome. All-zero options (or a filtered-empty table) resolve to `default`,
 * else the first NON-EMPTY option (an authored `none` must never be the
 * catalog entry), else the first option — never skip the node, never a
 * divide-by-zero. The canonical (Show all) preview ignores the hash entirely
 * and resolves to `default`/first non-empty, so the piece inventory is stable
 * and biome bias does not enter it (biome tint/scale are likewise ignored).
 *
 * `previewOptionId` (the editor's per-node preview radio) forces one option —
 * the authoring equivalent of the variant picker, node-scoped. A stale id
 * falls back to the defaulted resolution rather than vanishing.
 *
 * @param {object} node - the alternatives choice point (id, seed?, default?,
 *        alternatives: [{ id, weight?, biomeWeight?, parts }])
 * @param {number} tileH - tile hash
 * @param {number} i - item index
 * @param {boolean} [canonical=false] - Show-all mode: no hash draw
 * @param {string|null} [previewOptionId] - forced option id (editor preview)
 * @param {string|null} [biomeId] - tile biome id (null = no per-biome bias)
 * @returns {object} the chosen option
 */
export function resolveAlternatives(node, tileH, i, canonical = false, previewOptionId = null, biomeId = null) {
  const opts = node.alternatives;
  if (opts.length === 0) return null;
  const defaulted = () => (
    (node.default ? opts.find((o) => o.id === node.default) : null)
    ?? opts.find((o) => (o.parts ?? []).length > 0)
    ?? opts[0]
  );
  if (previewOptionId) {
    return opts.find((o) => o.id === previewOptionId) ?? defaulted();
  }
  if (canonical) return defaulted();
  const weighted = opts.map((o) => ({
    entry: o,
    w: (o.weight ?? 1) * (biomeId ? (o.biomeWeight?.[biomeId] ?? 1) : 1),
  }));
  const chosen = resolveWeighted(weighted, itemHash(tileH, i + (node.seed ?? fallbackSeed(node.id))));
  return chosen ?? defaulted();
}
