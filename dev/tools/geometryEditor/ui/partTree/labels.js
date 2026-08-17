/**
 * labels.js — Readable display labels for parts-tree rows (pure, no DOM).
 *
 * The tree shows the raw storage id today (`cactus-two-straight-arm-2`), which
 * buries the part's own name under motif/choice/option prefixes. `displayLabel`
 * peels those context prefixes (the enclosing choice and its option, then the
 * motif) to show the part's local "given name". The full storage id stays the
 * source of truth — never rewritten — and is always available via the row
 * tooltip and the inspector's id row.
 *
 * Purely presentational, so it is unit-testable in Node. No editor state, no
 * DOM; the caller passes the enclosing option/choice context and the motif id
 * (rows.js) from the tree walk.
 */

/**
 * @param {object} node - the parts-tree node
 * @param {{option?:object, choiceId?:string|null}} [entry] - tree context: the
 *   owning option object (for parts that live inside an option) and the owning
 *   choice point's id.
 * @param {string|null} [motifId] - active motif id (null outside motif decors)
 * @returns {string} the short display label
 */
export function displayLabel(node, entry = {}, motifId = null) {
  let id = node.id;
  const { option, choiceId } = entry;

  // Peel the most specific context first: the enclosing option's id.
  if (option?.id && option.id.length < id.length && id.startsWith(`${option.id}-`)) {
    id = id.slice(option.id.length + 1);
  }
  // Then the owning choice point's id.
  if (choiceId && choiceId.length < id.length && id.startsWith(`${choiceId}-`)) {
    id = id.slice(choiceId.length + 1);
  }
  // Finally the motif prefix (e.g. cactus-trunk → trunk on a decor tree).
  if (motifId && motifId !== option?.id && motifId !== choiceId &&
      motifId.length < id.length && id.startsWith(`${motifId}-`)) {
    id = id.slice(motifId.length + 1);
  }
  return id || node.id;
}
