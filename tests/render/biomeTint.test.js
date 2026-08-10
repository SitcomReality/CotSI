/**
 * biomeTint.test.js — Neighbor-blended biome colors
 * (src/render/hexmap3d/worldObjects/biomeTint.js): the blend formula, water/river
 * exclusion, gate filtering, and the Untouched/Painforest no-tint rule.
 * Pure module — no THREE, no game state.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { biomeTintForTile, isDefaultTintBiome } from '../../src/render/hexmap3d/worldObjects/biomeTint.js';
import { TERRAIN_BLEND_FACTOR } from '../../src/params/render/terrainParams.js';

// Arbitrary-but-real biome colors (0-1 tuples): Edenfall purple/gold and
// Painforest green/teal.
const EDEN_PRIMARY = [0.55, 0.30, 0.55];
const EDEN_ACCENT = [0.91, 0.76, 0.29];
const PAIN_PRIMARY = [0.38, 0.62, 0.28];
const PAIN_ACCENT = [0.16, 0.42, 0.38];

const COLORS = new Map([
  ['biome_edenfall', { primary: EDEN_PRIMARY, accent: EDEN_ACCENT }],
  ['biome_painforest', { primary: PAIN_PRIMARY, accent: PAIN_ACCENT }],
]);

const closeTo = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const allClose = (a, b) => a.length === b.length && a.every((v, i) => closeTo(v, b[i]));

test('isDefaultTintBiome marks Untouched and Painforest, not others', () => {
  assert.equal(isDefaultTintBiome('biome_default'), true);
  assert.equal(isDefaultTintBiome('biome_painforest'), true);
  assert.equal(isDefaultTintBiome('biome_edenfall'), false);
  assert.equal(isDefaultTintBiome(undefined), false);
});

test('isolated tile blends with nothing: tint is its own colors', () => {
  const tile = { q: 0, r: 0, biomeId: 'biome_edenfall' };
  const tint = biomeTintForTile(tile, new Map(), COLORS);
  assert.deepEqual(tint, { primary: EDEN_PRIMARY, accent: EDEN_ACCENT });
});

test('Edenfall beside Painforest dilutes the purple toward green', () => {
  // Painforest sits at (1,0) — one of (0,0)'s six neighbors.
  const tiles = new Map([
    ['0,0', { q: 0, r: 0, biomeId: 'biome_edenfall' }],
    ['1,0', { q: 1, r: 0, biomeId: 'biome_painforest' }],
  ]);
  const tint = biomeTintForTile(tiles.get('0,0'), tiles, COLORS, new Set(['0,0', '1,0']));
  // Formula mirrors cornerBlendColor: own·(1-f) + mean(all parts)·f.
  const f = TERRAIN_BLEND_FACTOR;
  const mean = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const mP = mean(EDEN_PRIMARY, PAIN_PRIMARY);
  const mA = mean(EDEN_ACCENT, PAIN_ACCENT);
  const expectP = [EDEN_PRIMARY[0] * (1 - f) + mP[0] * f, EDEN_PRIMARY[1] * (1 - f) + mP[1] * f, EDEN_PRIMARY[2] * (1 - f) + mP[2] * f];
  const expectA = [EDEN_ACCENT[0] * (1 - f) + mA[0] * f, EDEN_ACCENT[1] * (1 - f) + mA[1] * f, EDEN_ACCENT[2] * (1 - f) + mA[2] * f];
  assert.ok(allClose(tint.primary, expectP), `primary ${tint.primary} vs ${expectP}`);
  assert.ok(allClose(tint.accent, expectA), `accent ${tint.accent} vs ${expectA}`);
  // The purple red channel dropped and the green rose — the visible dilution.
  assert.ok(tint.primary[0] < EDEN_PRIMARY[0], 'red pulled down by Painforest');
  assert.ok(tint.primary[1] > EDEN_PRIMARY[1], 'green pulled up by Painforest');
});

test('water and river neighbors never participate in the blend', () => {
  // All six neighbors of (0,0) are water (with Painforest colors — they must
  // still be skipped): the tint is the tile's own colors.
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
  assert.deepEqual(tint, { primary: EDEN_PRIMARY, accent: EDEN_ACCENT });
});

test('neighbors outside the decor gate are skipped', () => {
  const tiles = new Map([
    ['0,0', { q: 0, r: 0, biomeId: 'biome_edenfall' }],
    ['1,0', { q: 1, r: 0, biomeId: 'biome_painforest' }],
  ]);
  // Painforest neighbor out of the gate → no dilution.
  const gated = biomeTintForTile(tiles.get('0,0'), tiles, COLORS, new Set(['0,0']));
  assert.deepEqual(gated, { primary: EDEN_PRIMARY, accent: EDEN_ACCENT });
});

test('Untouched and Painforest tiles never tint, whatever their neighbors', () => {
  const tiles = new Map([
    ['0,0', { q: 0, r: 0, biomeId: 'biome_default' }],
    ['1,0', { q: 1, r: 0, biomeId: 'biome_edenfall' }],
  ]);
  const tiles2 = new Map([
    ['0,0', { q: 0, r: 0, biomeId: 'biome_painforest' }],
    ['1,0', { q: 1, r: 0, biomeId: 'biome_edenfall' }],
  ]);
  const gate = new Set(['0,0', '1,0']);
  assert.equal(biomeTintForTile(tiles.get('0,0'), tiles, COLORS, gate), null);
  assert.equal(biomeTintForTile(tiles2.get('0,0'), tiles2, COLORS, gate), null);
});

test('missing colors or biome id yield no tint', () => {
  const tile = { q: 0, r: 0, biomeId: 'biome_edenfall' };
  assert.equal(biomeTintForTile(tile, new Map(), null), null, 'no biomeColors map');
  assert.equal(biomeTintForTile(tile, new Map(), new Map()), null, 'tile biome unknown');
  assert.equal(biomeTintForTile({ q: 0, r: 0 }, new Map(), COLORS), null, 'tile has no biomeId');
});
