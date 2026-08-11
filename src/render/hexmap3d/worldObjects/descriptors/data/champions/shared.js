/**
 * shared.js — Shared building blocks for the per-faction champion variants.
 *
 * Every champion stands on the same low PEDESTAL disc (dark warm stone), the
 * tabletop-miniature convention from the faction-geometry design brief. The
 * pedestal is identical in all seven variants — same id, same shape, same
 * params — so meshAssembly merges every champion's stand into a single
 * InstancedMesh (one draw call for the whole set), while the miniatures
 * themselves use per-faction part ids (cruX, revX, ...) so their silhouettes
 * never collide under one part id.
 *
 * Generated caveat: saving a faction in the geometry editor rewrites that
 * faction's file with a SELF-CONTAINED variant block (parts inlined — the
 * editor emits plain JSON, no imports). These helpers stay the canonical
 * hand-authoring source for any faction not yet re-saved.
 *
 * Values are JSON-safe (colors as tokens / integers, angles in radians,
 * lengths in world units where hex radius = 1.0).
 */

export const PEDESTAL = {
  id: 'pedestal',
  shape: 'cylinder',
  params: { bottomR: 0.23, topR: 0.21, height: 0.06, segments: 8 },
  color: 0x2a2628, // dark iron stand — identical for every faction
};
