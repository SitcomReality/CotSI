/**
 * exportNames.js — Canonical export names for descriptor data files.
 *
 * The game's data files name their exports from the descriptor/variant id:
 * descriptor id `knot` → file `knot.js`, export `KNOT_DESCRIPTOR`; variant id
 * `leopard` → `LEOPARD_VARIANT`. Shared by the geometry editor (Save to game),
 * the node tooling (splitDescriptorFiles.mjs, saveServer) and the round-trip
 * tests. Browser-safe — no DOM.
 */

/**
 * The canonical export name for a descriptor id: camelCase/`-`/`_` →
 * SCREAMING_SNAKE, suffixed `_DESCRIPTOR` (`knot` → `KNOT_DESCRIPTOR`,
 * `plainsGrass` → `PLAINS_GRASS_DESCRIPTOR`, `new-feature` →
 * `NEW_FEATURE_DESCRIPTOR`).
 * @param {string} id - descriptor id (matches /^[A-Za-z0-9_-]+$/)
 * @returns {string} export name
 */
export function descriptorExportName(id) {
  return id
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_') + '_DESCRIPTOR';
}

/**
 * The canonical export name for a per-variant file (mobs/<archetype>.js,
 * bases/<faction>.js, champions/<faction>.js): the same id → SCREAMING_SNAKE
 * transform, suffixed `_VARIANT` (`leopard` → `LEOPARD_VARIANT`,
 * `infernalpaca` → `INFERNALPACA_VARIANT`, `CRU` → `CRU_VARIANT`).
 * @param {string} id - variant id (matches /^[A-Za-z0-9_-]+$/)
 * @returns {string} export name
 */
export function variantExportName(id) {
  return id
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_') + '_VARIANT';
}
