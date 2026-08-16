/**
 * mountains.js — Descriptor data for mountain terrain.
 *
 * Migrated from mountainMeshes.js + mountainGeometries.js: one hex-pyramid
 * per mountain tile (MOUNTAIN_BASE_RADIUS = 1.0, tiling edge-to-edge), profile
 * variant (classic / offpeak) chosen per tile from the hash, height driven by
 * the terrain-generation `mountainType` tag (peak / slope / normal) via
 * `size.byMountainType` — the recordBuilder's mountain-scale rule.
 *
 * Variants carry distinct part ids (peak-classic / peak-offpeak) so the mesh
 * assembler builds one InstancedMesh per variant, exactly like the hard-coded
 * builder's per-variant bucketing. The variant roll is the dedicated
 * 'mountain' rule — the legacy MOUNTAIN_HASH_SEEDS hash — so per-tile
 * classic/offpeak assignments match the pre-migration render exactly.
 *
 * Biome tint: the mountain geometry carries per-vertex colors
 * (mountainGeometries.js) — the material is white with vertexColors on, so a
 * near-white instance color is the identity multiplier and keeps the current
 * rock look; the small primary influence (0.25) tints the rock subtly toward
 * the tile's blended biome color via instanceColor × vertexColors.
 *
 * Emphasis 'none': mountains are never displaced.
 */

export const MOUNTAIN_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'mountain',
  kind: 'mountain',
  variantRule: 'mountain',
  displayName: 'Mountain decor',
  scale: 1,
  size: {
    // mountainScale() per terrain-generation tag; XZ stays 1 (hex-tiling base).
    byMountainType: {
      peak: { min: 1.3, max: 1.45 }, // MOUNTAIN_PEAK_SCALE + (hash % 15)/100
      slope: { min: 0.7, max: 0.85 }, // MOUNTAIN_SLOPE_SCALE + (hash % 15)/100
      normal: { min: 0.9, max: 1.15 }, // MOUNTAIN_NORMAL_SCALE + (hash % 25)/100
    },
  },
  placement: { mode: 'center' },
  emphasis: { behavior: 'none' },
  parts: [{ id: 'peak-classic', shape: 'mountain', params: { variant: 'classic' }, color: 0xffffff, biomeColor: { source: 'primary', influence: 0.25 } }],
  variants: [
    { id: 'classic', parts: [{ id: 'peak-classic', shape: 'mountain', params: { variant: 'classic' }, color: 0xffffff, biomeColor: { source: 'primary', influence: 0.25 } }] },
    { id: 'offpeak', parts: [{ id: 'peak-offpeak', shape: 'mountain', params: { variant: 'offpeak' }, color: 0xffffff, biomeColor: { source: 'primary', influence: 0.25 } }] },
  ],
};
