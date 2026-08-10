/**
 * trader.js — Descriptor data for trader units.
 *
 * Migrated 1:1 from unitMeshes.js: a trader is a single flat coin body (the
 * old PIECE_BODY cylinder) in the fixed teal green, with the icon cap riding
 * on top. One fixed look — no archetype variation — so there is a single
 * 'trader' variant and variantRule 'archetype' always resolves to it. Authored
 * as data like the other entities, so the geometry editor can give traders a
 * more elaborate 3D look later.
 *
 * The teal color is a literal (not a token): traders are the same color
 * regardless of faction — matching the old hard-coded [0.29, 0.75, 0.6].
 *
 * Values are JSON-safe (colors as integers, lengths in world units where
 * hex radius = 1.0).
 */

const TRADER_BODY = {
  id: 'traderBody',
  shape: 'cylinder',
  params: { bottomR: 0.3, topR: 0.3, height: 0.1, segments: 16 },
  color: 0x4abf99, // teal [0.29, 0.75, 0.6]
};

/** The trader descriptor — one fixed look. */
export const TRADER_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'trader',
  kind: 'trader',
  displayName: 'Trader',
  variantRule: 'archetype',
  parts: [TRADER_BODY],
  variants: [{ id: 'trader', parts: [TRADER_BODY] }],
};
