/**
 * groundDecor.js — Descriptor data for the low ground-level terrain
 * decorations: marsh reeds, plateau mound, plains grass, desert scrub, and
 * beach driftwood.
 *
 * New decor introduced by the terrain-decor consolidation (one named decor
 * per decor-producing terrain — water, river, and ice stay bare): each
 * descriptor's display name identifies the terrain it depicts, and the
 * terrain → decor mapping lives in gameBuilder.js.
 *
 * Emphasis mirrors the terrain they sit on:
 *   sunk       — plateau mound (raised like the hill mound; sinks below the
 *                surface when the hex center is claimed).
 *   dispersed  — the clustered growth (reeds, grass, scrub, driftwood) steps
 *                aside to the dispersal ring when the center is claimed.
 *
 * The default part colors are the pre-biome-tint baseline: per-biome color
 * variation (primary/accent influence + neighbor blending) lands in a later
 * phase and replaces these per biome.
 */

/** Blades of grass on plains — a small tuft of thin cones. */
export const PLAINS_GRASS_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'plainsGrass',
  kind: 'decor',
  displayName: 'Plains Grass',
  cluster: { rule: 'uniform', min: 3, max: 6 },
  size: { min: 0.9, max: 1.15 },
  placement: { mode: 'jitter', offset: 0.14, tiltMin: 0.06, tiltMax: 0.18, tiltSeed: 1 },
  emphasis: { behavior: 'dispersed' },
  material: { color: 0x4e7d33 }, // fresh meadow green
  parts: [
    {
      id: 'blade',
      shape: 'cone',
      params: { bottomR: 0.02, height: 0.18, radialSegs: 3, heightSegs: 1 },
      stretch: { y: { min: 0.8, max: 1.4, seed: 6 }, xz: false },
    },
  ],
};

/** Reed cluster on marsh — tall thin cones in a tight clump. */
export const MARSH_REEDS_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'marshReeds',
  kind: 'decor',
  displayName: 'Marsh Reeds',
  cluster: { rule: 'uniform', min: 4, max: 7 },
  size: { min: 1.0, max: 1.25 },
  placement: { mode: 'jitter', offset: 0.12, tiltMin: 0.04, tiltMax: 0.16, tiltSeed: 1 },
  emphasis: { behavior: 'dispersed' },
  material: { color: 0x3f5a2e }, // murky marsh green
  parts: [
    {
      id: 'reed',
      shape: 'cone',
      params: { bottomR: 0.028, height: 0.55, radialSegs: 4, heightSegs: 2 },
      stretch: { y: { min: 0.85, max: 1.3, seed: 6 }, xz: false },
    },
  ],
};

/** Flat-top mound on plateau — like the hill mound but with a level top. */
export const PLATEAU_MOUND_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'plateauMound',
  kind: 'decor',
  displayName: 'Plateau Mound',
  placement: { mode: 'center' },
  emphasis: { behavior: 'sunk' },
  material: { color: 0x8a8578 }, // warm grey rock
  parts: [
    {
      id: 'mound',
      shape: 'cylinder',
      params: { bottomR: 0.42, topR: 0.3, height: 0.22, segments: 6 },
    },
  ],
};

/** Dry scrub on desert — a sparse scatter of low round bushes. */
export const DESERT_SCRUB_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'desertScrub',
  kind: 'decor',
  displayName: 'Desert Scrub',
  cluster: { rule: 'uniform', min: 2, max: 4 },
  size: { min: 0.9, max: 1.15 },
  placement: { mode: 'jitter', offset: 0.15, tiltMin: 0.02, tiltMax: 0.02, tiltSeed: 1 },
  emphasis: { behavior: 'dispersed' },
  material: { color: 0x7a6b3f }, // dry olive-brown
  parts: [
    {
      id: 'scrub',
      shape: 'spheroid',
      params: { radius: 0.12, wSegs: 6, hSegs: 4 },
      transform: { scaleY: 0.8 },
    },
  ],
};

/** Driftwood on beach — flat planks lying on the sand. */
export const BEACH_DRIFTWOOD_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'beachDriftwood',
  kind: 'decor',
  displayName: 'Beach Driftwood',
  cluster: { rule: 'uniform', min: 1, max: 3 },
  size: { min: 0.9, max: 1.2 },
  placement: { mode: 'jitter', offset: 0.16, tiltMin: 0.02, tiltMax: 0.02, tiltSeed: 1 },
  emphasis: { behavior: 'dispersed' },
  material: { color: 0xb9a37e }, // bleached driftwood tan
  parts: [
    {
      id: 'plank',
      shape: 'box',
      params: { width: 0.34, height: 0.05, depth: 0.12 },
      stretch: { y: false, xz: false },
    },
  ],
};
