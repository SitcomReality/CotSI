/**
 * decorEmphasis.test.js — Decoration de-emphasis rules and placement
 * (src/render/hexmap3d/worldObjects/decorEmphasis.js). Pure math, no THREE.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DECOR_STATE, DECORATION,
  decorState, featureState,
  dispersedSingleOffset, dispersedRingOffsets,
  sunkTransform, DISPERSED_SCALE,
  occupiedKeys, isTileOccupied,
} from '../../src/render/hexmap3d/worldObjects/decorEmphasis.js';

test('decorState: no decoration returns null regardless of occupants', () => {
  assert.equal(decorState({ hasOccupant: false, hasFeature: false, decoration: null }), null);
  assert.equal(decorState({ hasOccupant: true, hasFeature: false, decoration: null }), null);
  assert.equal(decorState({ hasOccupant: true, hasFeature: true, decoration: null }), null);
});

test('decorState: unclaimed tile keeps its decoration at normal', () => {
  for (const decoration of Object.values(DECORATION)) {
    assert.equal(
      decorState({ hasOccupant: false, hasFeature: false, decoration }),
      DECOR_STATE.NORMAL,
    );
  }
});

test('decorState: a feature alone disperses the decoration', () => {
  assert.equal(
    decorState({ hasOccupant: false, hasFeature: true, decoration: DECORATION.GROVE }),
    DECOR_STATE.DISPERSED,
  );
});

test('decorState: an occupant alone disperses the decoration', () => {
  assert.equal(
    decorState({ hasOccupant: true, hasFeature: false, decoration: DECORATION.GROVE }),
    DECOR_STATE.DISPERSED,
  );
});

test('decorState: mounds sink, the clustered growth disperses', () => {
  for (const claimed of [
    { hasOccupant: false, hasFeature: true },
    { hasOccupant: true, hasFeature: false },
  ]) {
    for (const sunk of [DECORATION.HILL, DECORATION.PLATEAU]) {
      assert.equal(decorState({ ...claimed, decoration: sunk }), DECOR_STATE.SUNK);
    }
    for (const dispersed of [DECORATION.GROVE, DECORATION.MARSH, DECORATION.PLAINS, DECORATION.DESERT, DECORATION.BEACH]) {
      assert.equal(decorState({ ...claimed, decoration: dispersed }), DECOR_STATE.DISPERSED);
    }
  }
});

test('decorState: occupant + feature hides the decoration (any kind)', () => {
  for (const decoration of Object.values(DECORATION)) {
    assert.equal(
      decorState({ hasOccupant: true, hasFeature: true, decoration }),
      DECOR_STATE.HIDDEN,
    );
  }
});

test('featureState: an occupant displaces a feature, otherwise it stays central', () => {
  assert.equal(featureState({ hasOccupant: true }), DECOR_STATE.DISPERSED);
  assert.equal(featureState({ hasOccupant: false }), DECOR_STATE.NORMAL);
});

test('dispersedSingleOffset: deterministic — same anchor every call', () => {
  const a = dispersedSingleOffset();
  const b = dispersedSingleOffset();
  assert.deepEqual(a, b);
});

test('dispersedSingleOffset: lands in the upper-left of the hex, inside the edge', () => {
  const { dx, dz } = dispersedSingleOffset();
  assert.ok(dx < 0, `expected upper-left (dx < 0), got dx=${dx}`);
  assert.ok(dz > 0, `expected upper-left (dz > 0), got dz=${dz}`);
  assert.ok(Math.hypot(dx, dz) < 1, 'anchor must sit inside the hex (radius 1.0)');
});

test('dispersedRingOffsets: count matches and is deterministic', () => {
  const a = dispersedRingOffsets(5, 42);
  const b = dispersedRingOffsets(5, 42);
  assert.equal(a.length, 5);
  assert.deepEqual(a, b);
});

test('dispersedRingOffsets: every point sits on the dispersed ring (near the edge)', () => {
  for (const count of [1, 3, 5, 7]) {
    for (const hash of [0, 7, 42, 88]) {
      for (const { dx, dz } of dispersedRingOffsets(count, hash)) {
        const r = Math.hypot(dx, dz);
        assert.ok(r >= 0.68 - 1e-9, `point too close to center: r=${r}`);
        assert.ok(r <= 0.88 + 1e-9, `point beyond the edge ring: r=${r}`);
      }
    }
  }
});

test('dispersedRingOffsets: even angular spacing (with deterministic jitter)', () => {
  const count = 4;
  const offsets = dispersedRingOffsets(count, 13);
  const angles = offsets.map(({ dx, dz }) => Math.atan2(dz, dx));
  const step = (Math.PI * 2) / count;
  for (let i = 0; i < count; i++) {
    const next = angles[(i + 1) % count];
    let delta = next - angles[i];
    if (delta < 0) delta += Math.PI * 2;
    // base step ± 2 × (jitter ±0.3 rad)
    assert.ok(Math.abs(delta - step) <= 0.6 + 1e-9, `bad spacing at i=${i}: ${delta}`);
  }
});

test('sunkTransform: shrinks and descends below the surface', () => {
  const { scale, yOffset } = sunkTransform();
  assert.ok(scale > 0 && scale < 1, `expected shrink, got scale=${scale}`);
  assert.ok(yOffset < 0, `expected descent, got yOffset=${yOffset}`);
});

test('DISPERSED_SCALE: defined and smaller than full size', () => {
  assert.ok(DISPERSED_SCALE > 0 && DISPERSED_SCALE < 1);
});

test('occupiedKeys: collects champions, mobs, and traders by "q,r"', () => {
  const state = {
    champions: [{ pos: { q: 1, r: 0 } }, { pos: { q: -2, r: 3 } }],
    mobs: [{ pos: { q: 0, r: 0 } }],
    traders: [{ pos: { q: 4, r: 4 } }],
  };
  const keys = occupiedKeys(state);
  assert.deepEqual([...keys].sort(), ['-2,3', '0,0', '1,0', '4,4']);
});

test('occupiedKeys: tolerates missing entity lists', () => {
  assert.equal(occupiedKeys({}).size, 0);
  assert.equal(occupiedKeys({ champions: [] }).size, 0);
});

test('isTileOccupied: matches tiles by hex key', () => {
  const keys = new Set(['3,-1']);
  assert.equal(isTileOccupied(keys, { q: 3, r: -1 }), true);
  assert.equal(isTileOccupied(keys, { q: 3, r: 0 }), false);
  assert.equal(isTileOccupied(undefined, { q: 3, r: -1 }), false);
});
