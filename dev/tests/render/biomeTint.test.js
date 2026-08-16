/**
 * biomeTint.test.js — Neighbor-blended biome colors
 * (src/render/hexmap3d/worldObjects/biomeTint.js): the per-swatch blend
 * formula, water/river exclusion, gate filtering, the Untouched/Painforest
 * no-signature-tint rule, and the `terrain` source (ground-matching tint from
 * the biome palettes). Pure module — no THREE, no game state.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { biomeTintForTile } from '../../../src/render/hexmap3d/worldObjects/biomeTint.js';
import { TERRAIN_BLEND_FACTOR, TERRAIN_COLOR } from '../../../src/params/render/terrainParams.js';

// Arbitrary-but-real biome color swatches (0-1 tuples): Edenfall purple/gold
// and Painforest green/teal, plus the shared material defaults (wood/soil/
// stone) exactly as gameFactory merges them for the game state.
const EDEN = {
  foliage: [0.55, 0.30, 0.55],
  wood: [0.545, 0.369, 0.235],
  soil: [0.541, 0.420, 0.290],
  stone: [0.55, 0.55, 0.55],
  bloom: [0.91, 0.76, 0.29],
  exotic: [0.80, 0.65, 0.95],
};
const PAIN = {
  foliage: [0.38, 0.62, 0.28],
  wood: [0.545, 0.369, 0.235],
  soil: [0.541, 0.420, 0.290],
  stone: [0.55, 0.55, 0.55],
  bloom: [0.82, 0.25, 0.40],
  exotic: [0.16, 0.42, 0.38],
};
// Untouched — the default game biome; it tints like every other (there is no
// per-biome suppression anymore).
const DEFAULT_BIOME = {
  foliage: [0.455, 0.678, 0.365],
  wood: [0.545, 0.369, 0.235],
  soil: [0.541, 0.420, 0.290],
  stone: [0.55, 0.55, 0.55],
  bloom: [0.839, 0.694, 0.357],
  exotic: [0.750, 0.280, 0.320],
};

const COLORS = new Map([
  ['biome_edenfall', EDEN],
  ['biome_painforest', PAIN],
  ['biome_default', DEFAULT_BIOME],
]);

// Per-terrain palettes, like state.biomePalettes (terrain type → 0-1 tuple).
const EDEN_PALETTE = { forest: [0.30, 0.50, 0.30], desert: [0.68, 0.55, 0.65], hill: [0.50, 0.32, 0.52] };
const PAIN_PALETTE = { forest: [0.25, 0.45, 0.20], hill: [0.40, 0.58, 0.30] };
const PALETTES = new Map([
  ['biome_edenfall', EDEN_PALETTE],
  ['biome_painforest', PAIN_PALETTE],
]);

const closeTo = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const allClose = (a, b) => a.length === b.length && a.every((v, i) => closeTo(v, b[i]));
const swatchKeys = (obj) => Object.keys(obj).filter((k) => k !== 'terrain').sort();

test('every biome swatch-tints — including the default game biome', () => {
  // There is no per-biome tint suppression: any tile with known biome colors
  // takes the swatch tint, Untouched (the default single-biome game) included.
  const tile = { q: 0, r: 0, biomeId: 'biome_default' };
  assert.deepEqual(biomeTintForTile(tile, new Map(), COLORS), DEFAULT_BIOME);
});

test('isolated tile blends with nothing: tint is its own swatches', () => {
  const tile = { q: 0, r: 0, biomeId: 'biome_edenfall' };
  const tint = biomeTintForTile(tile, new Map(), COLORS);
  assert.deepEqual(tint, EDEN);
});

test('Edenfall beside Painforest dilutes each differing swatch toward its neighbor', () => {
  // Painforest sits at (1,0) — one of (0,0)'s six neighbors. Swatches the
  // biomes share (the wood/soil/stone defaults) blend to the same color.
  const tiles = new Map([
    ['0,0', { q: 0, r: 0, biomeId: 'biome_edenfall' }],
    ['1,0', { q: 1, r: 0, biomeId: 'biome_painforest' }],
  ]);
  const tint = biomeTintForTile(tiles.get('0,0'), tiles, COLORS, new Set(['0,0', '1,0']));
  // Formula mirrors cornerBlendColor: own·(1-f) + mean(all parts)·f.
  const f = TERRAIN_BLEND_FACTOR;
  const mean = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  assert.deepEqual(swatchKeys(tint), ['bloom', 'exotic', 'foliage', 'soil', 'stone', 'wood']);
  for (const swatch of Object.keys(EDEN)) {
    const m = mean(EDEN[swatch], PAIN[swatch]);
    const expect = [
      EDEN[swatch][0] * (1 - f) + m[0] * f,
      EDEN[swatch][1] * (1 - f) + m[1] * f,
      EDEN[swatch][2] * (1 - f) + m[2] * f,
    ];
    assert.ok(allClose(tint[swatch], expect), `${swatch} ${tint[swatch]} vs ${expect}`);
  }
  // The visible dilution: purple red channel dropped, green rose.
  assert.ok(tint.foliage[0] < EDEN.foliage[0], 'red pulled down by Painforest');
  assert.ok(tint.foliage[1] > EDEN.foliage[1], 'green pulled up by Painforest');
});

test('water and river neighbors never participate in the blend', () => {
  // All six neighbors of (0,0) are water (with Painforest colors — they must
  // still be skipped): the tint is the tile's own swatches.
  const tiles = new Map([
    ['0,0', { q: 0, r: 0, biomeId: 'biome_edenfall' }],
    ['1,0', { q: 1, r: 0, terrain: 'water', biomeId: 'biome_painforest' }],
    ['1,-1', { q: 1, r: -1, terrain: 'water', biomeId: 'biome_painforest' }],
    ['0,-1', { q: 0, r: -1, terrain: 'river', biomeId: 'biome_painforest' }],
    ['-1,0', { q: -1, r: 0, terrain: 'water', biomeId: 'biome_painforest' }],
    ['-1,1', { q: -1, r: 1, terrain: 'river', biomeId: 'biome_painforest' }],
    ['0,1', { q: 0, r: 1, terrain: 'water', biomeId: 'biome_painforest' }],
  ]);
  const tint = biomeTintForTile(tiles.get('0,0'), tiles, COLORS);
  assert.deepEqual(tint, EDEN);
});

test('neighbors outside the decor gate are skipped', () => {
  const tiles = new Map([
    ['0,0', { q: 0, r: 0, biomeId: 'biome_edenfall' }],
    ['1,0', { q: 1, r: 0, biomeId: 'biome_painforest' }],
  ]);
  // Painforest neighbor out of the gate → no dilution.
  const gated = biomeTintForTile(tiles.get('0,0'), tiles, COLORS, new Set(['0,0']));
  assert.deepEqual(gated, EDEN);
});

test('neighboring Painforest colors bleed into the blend like any biome', () => {
  // No biome is exempt: Painforest's own tile tints, and its colors dilute
  // neighbors' blends exactly like every other biome's.
  const tiles = new Map([
    ['0,0', { q: 0, r: 0, biomeId: 'biome_edenfall' }],
    ['1,0', { q: 1, r: 0, biomeId: 'biome_painforest' }],
  ]);
  const gate = new Set(['0,0', '1,0']);
  const tint = biomeTintForTile(tiles.get('0,0'), tiles, COLORS, gate);
  assert.ok(tint.foliage[0] < EDEN.foliage[0], 'Painforest red bleeds into Edenfall');
  assert.deepEqual(biomeTintForTile({ q: 0, r: 0, biomeId: 'biome_painforest' }, new Map(), COLORS), PAIN, 'Painforest tile tints with its own swatches');
});

test('missing colors or biome id yield no tint', () => {
  const tile = { q: 0, r: 0, biomeId: 'biome_edenfall' };
  assert.equal(biomeTintForTile(tile, new Map(), null), null, 'no biomeColors map');
  assert.equal(biomeTintForTile(tile, new Map(), new Map()), null, 'tile biome unknown');
  assert.equal(biomeTintForTile({ q: 0, r: 0 }, new Map(), COLORS), null, 'tile has no biomeId');
});

// ── terrain source (ground-matching tint) ──────────────────────────────────

test('terrain source is the tile\'s own palette color (no neighbors)', () => {
  const tile = { q: 0, r: 0, biomeId: 'biome_edenfall', terrain: 'hill' };
  const tint = biomeTintForTile(tile, new Map(), COLORS, null, PALETTES);
  assert.deepEqual(tint, { ...EDEN, terrain: EDEN_PALETTE.hill });
});

test('terrain tint rides alongside the swatch tints on the same tile', () => {
  // Painforest tints like every biome — swatches AND the ground-matching
  // terrain source both apply.
  const tile = { q: 0, r: 0, biomeId: 'biome_painforest', terrain: 'hill' };
  const tint = biomeTintForTile(tile, new Map(), COLORS, null, PALETTES);
  assert.deepEqual(tint, { ...PAIN, terrain: PAIN_PALETTE.hill });
});

test('terrain source blends toward neighbors\' terrain colors', () => {
  const tiles = new Map([
    ['0,0', { q: 0, r: 0, biomeId: 'biome_edenfall', terrain: 'hill' }],
    ['1,0', { q: 1, r: 0, biomeId: 'biome_painforest', terrain: 'forest' }],
  ]);
  const tint = biomeTintForTile(tiles.get('0,0'), tiles, COLORS, new Set(['0,0', '1,0']), PALETTES);
  // Same formula as the terrain surface's corner blend: own·(1-f) + mean·f.
  const f = TERRAIN_BLEND_FACTOR;
  const mT = [(EDEN_PALETTE.hill[0] + PAIN_PALETTE.forest[0]) / 2, (EDEN_PALETTE.hill[1] + PAIN_PALETTE.forest[1]) / 2, (EDEN_PALETTE.hill[2] + PAIN_PALETTE.forest[2]) / 2];
  const expectT = [EDEN_PALETTE.hill[0] * (1 - f) + mT[0] * f, EDEN_PALETTE.hill[1] * (1 - f) + mT[1] * f, EDEN_PALETTE.hill[2] * (1 - f) + mT[2] * f];
  assert.ok(allClose(tint.terrain, expectT), `terrain ${tint.terrain} vs ${expectT}`);
  // Swatch and terrain blends are independent (neighbor is Painforest: it
  // dilutes foliage but its terrain color comes from its own palette).
  assert.ok(tint.foliage[0] < EDEN.foliage[0], 'swatch blend unaffected by terrain source');
});

test('water and river neighbors are excluded from the terrain blend', () => {
  const tiles = new Map([
    ['0,0', { q: 0, r: 0, biomeId: 'biome_edenfall', terrain: 'hill' }],
    ['1,0', { q: 1, r: 0, biomeId: 'biome_painforest', terrain: 'water' }],
    ['0,-1', { q: 0, r: -1, biomeId: 'biome_painforest', terrain: 'river' }],
  ]);
  const tint = biomeTintForTile(tiles.get('0,0'), tiles, COLORS, new Set(['0,0', '1,0', '0,-1']), PALETTES);
  assert.deepEqual(tint.terrain, EDEN_PALETTE.hill);
});

test('out-of-gate neighbors are excluded from the terrain blend', () => {
  const tiles = new Map([
    ['0,0', { q: 0, r: 0, biomeId: 'biome_edenfall', terrain: 'hill' }],
    ['1,0', { q: 1, r: 0, biomeId: 'biome_painforest', terrain: 'forest' }],
  ]);
  const gated = biomeTintForTile(tiles.get('0,0'), tiles, COLORS, new Set(['0,0']), PALETTES);
  assert.deepEqual(gated.terrain, EDEN_PALETTE.hill);
});

test('missing palette falls back to the base terrain color', () => {
  // TERRAIN_COLOR has no hill entry (biomes always define palette.hill), so
  // the fallback chain lands on plains — the same resolution the terrain
  // mesh uses (tileColor.js). The biome has no colors entry either, so no
  // swatches are computed.
  const tile = { q: 0, r: 0, biomeId: 'biome_unfinished_lands', terrain: 'hill' };
  const tint = biomeTintForTile(tile, new Map(), COLORS, null, PALETTES);
  assert.deepEqual(tint, { terrain: TERRAIN_COLOR.plains });
});

test('without palettes the tint has no terrain entry', () => {
  const tile = { q: 0, r: 0, biomeId: 'biome_edenfall', terrain: 'hill' };
  const tint = biomeTintForTile(tile, new Map(), COLORS);
  assert.equal(tint.terrain, undefined);
  assert.deepEqual(swatchKeys(tint), ['bloom', 'exotic', 'foliage', 'soil', 'stone', 'wood']);
});
