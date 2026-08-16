/**
 * renameIds.js — Id renames with reference rewrites (pure descriptor data, no DOM).
 *
 * Renaming an id is never just a string swap: variants and motifs are pinned
 * from `biomeVariants`, alternatives resolve through the choice point's
 * `default`, and motif-scoped storage ids (decorComposition.md §6.2 — a part
 * under motif M is stored `M-…`) prefix the motif's own parts. Each helper
 * rewrites the references that live in the descriptor; the editor caller
 * validates uniqueness and fixes session state (S.variantId, selection,
 * preview options).
 */

/** Visit every node in a parts tree (leaves, groups, choice points) — the
 *  node itself and, for choice points, each option (so empty `none` options
 *  are reachable too, which a listNodes-based walk would miss). */
function forEachNode(parts, fn) {
  const walk = (list) => {
    for (const node of list) {
      fn(node);
      if (Array.isArray(node.alternatives)) {
        for (const opt of node.alternatives) walk(opt.parts ?? []);
      } else if (Array.isArray(node.children)) {
        walk(node.children);
      }
    }
  };
  walk(parts);
}

/** Rename one node (part / group) or option inside a single parts tree,
 *  rewriting the owning choice point's `default` when the renamed id is an
 *  option. Ids stay unique within the tree the editor is editing. */
export function renameNodeId(parts, oldId, newId) {
  forEachNode(parts, (node) => {
    if (node.id === oldId) node.id = newId;
    for (const opt of node.alternatives ?? []) {
      if (opt.id === oldId) {
        opt.id = newId;
        if (node.default === oldId) node.default = newId;
      }
    }
  });
  return newId;
}

/** Rename a variant id, rewriting `biomeVariants` pins that named it. */
export function renameVariantId(d, oldId, newId) {
  const variant = (d.variants ?? []).find((v) => v.id === oldId);
  if (variant) variant.id = newId;
  rewritePins(d, oldId, newId);
  return newId;
}

/** Rename a motif id, rewriting `biomeVariants` pins that named it and the
 *  motif-scoped storage prefixes on its own parts and options (`cactus-trunk`
 *  → `succulent-trunk`), so the strip histogram's motif attribution
 *  (partId.startsWith(motifId + '-')) keeps working after the rename. */
export function renameMotifId(d, oldId, newId) {
  const motif = (d.motifs ?? []).find((m) => m.id === oldId);
  if (motif) {
    motif.id = newId;
    const oldPrefix = oldId + '-';
    forEachNode(motif.parts ?? [], (node) => {
      if (node.id.startsWith(oldPrefix)) {
        node.id = newId + node.id.slice(oldId.length); // keeps the '-'
      }
      for (const opt of node.alternatives ?? []) {
        if (opt.id.startsWith(oldPrefix)) {
          opt.id = newId + opt.id.slice(oldId.length);
        }
      }
    });
  }
  rewritePins(d, oldId, newId);
  return newId;
}

/** Rewrite `biomeVariants` pin values that named `oldId`. */
function rewritePins(d, oldId, newId) {
  if (!d.biomeVariants) return;
  for (const [biome, id] of Object.entries(d.biomeVariants)) {
    if (id === oldId) d.biomeVariants[biome] = newId;
  }
}
