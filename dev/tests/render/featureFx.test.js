// dev/tests/render/featureFx.test.js
// Headless coverage for the pure parts of featureFx.js: the ripeness
// predicate and the ambient FX placement pass (flag gating, visibility
// gating, per-kind rules). Mesh assembly and burst animation need WebGL /
// the clock and are not covered here.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  featureRipe,
  collectFeatureFxPoints,
} from '../../../src/render/hexmap3d/worldObjects/featureFx.js';

const VISIBLE = new Set(['0,0', '1,0']);

function tile(q, r, feature) {
  return { q, r, terrain: 'plains', elevation: 0, feature };
}

test('featureRipe treats fresh spawns as ripe', () => {
  assert.equal(featureRipe({ kind: 'peridexionTree' }), true);
});

test('featureRipe follows the regrowth lifecycle flags', () => {
  assert.equal(featureRipe({ kind: 'blessedFont', ripe: false, growth: 0 }), false);
  assert.equal(featureRipe({ kind: 'blessedFont', ripe: false, growth: 0.5 }), false);
  assert.equal(featureRipe({ kind: 'blessedFont', ripe: true, growth: 1 }), true);
  assert.equal(featureRipe(null), false);
});

test('unmined visible knots get rainbow sparkle placements when particles are on', () => {
  const { knotSparkles } = collectFeatureFxPoints(
    [tile(0, 0, { kind: 'knot', mined: false })], VISIBLE, true, false);
  assert.ok(knotSparkles.length > 0);
  for (const p of knotSparkles) {
    assert.equal(typeof p.x, 'number');
    assert.equal(typeof p.y, 'number');
    assert.ok(p.hue >= 0 && p.hue < 1); // full-spectrum placement hue
  }
});

test('mined knots and off-particles produce no knot sparkles', () => {
  const mined = collectFeatureFxPoints(
    [tile(0, 0, { kind: 'knot', mined: true })], VISIBLE, true, false);
  assert.equal(mined.knotSparkles.length, 0);

  const gated = collectFeatureFxPoints(
    [tile(0, 0, { kind: 'knot', mined: false })], VISIBLE, false, true);
  assert.equal(gated.knotSparkles.length, 0);
});

test('only ripe visible peridexion trees get fruit sparkles', () => {
  const ripe = collectFeatureFxPoints(
    [tile(1, 0, { kind: 'peridexionTree' })], VISIBLE, true, false);
  assert.ok(ripe.fruitSparkles.length > 0);

  const spent = collectFeatureFxPoints(
    [tile(1, 0, { kind: 'peridexionTree', ripe: false, growth: 0 })], VISIBLE, true, false);
  assert.equal(spent.fruitSparkles.length, 0);
});

test('charged fonts glow only when glows is on and the font is ripe', () => {
  const charged = collectFeatureFxPoints(
    [tile(0, 0, { kind: 'blessedFont' })], VISIBLE, true, true);
  assert.equal(charged.fontGlows.length, 1);

  const noGlowFlag = collectFeatureFxPoints(
    [tile(0, 0, { kind: 'blessedFont' })], VISIBLE, true, false);
  assert.equal(noGlowFlag.fontGlows.length, 0);

  const spent = collectFeatureFxPoints(
    [tile(0, 0, { kind: 'blessedFont', ripe: false, growth: 0.2 })], VISIBLE, true, true);
  assert.equal(spent.fontGlows.length, 0);
});

test('features outside the visible set never emit FX', () => {
  const pts = collectFeatureFxPoints(
    [
      tile(5, 5, { kind: 'knot', mined: false }),
      tile(6, 5, { kind: 'blessedFont' }),
      tile(7, 5, { kind: 'peridexionTree' }),
    ],
    VISIBLE, true, true);
  assert.deepEqual(pts, { knotSparkles: [], fruitSparkles: [], fontGlows: [] });
});
