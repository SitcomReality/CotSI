/**
 * sightCull.test.js — Render-cap culling math (src/engine/rules/sightCull.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  humanChampionPositions, hexKeysWithinCap, chunkKeysWithinCap,
} from '../../src/engine/rules/sightCull.js';
import { SIGHT_RENDER_CAP } from '../../src/params/game/championParams.js';
import { distance, coordKey } from '../../src/engine/rules/hexGrid.js';

const champ = (q, r, { controller = 'human', alive = true } = {}) => ({ pos: { q, r }, controller, alive });

test('SIGHT_RENDER_CAP is the hard cap of 5', () => {
  assert.equal(SIGHT_RENDER_CAP, 5);
});

test('humanChampionPositions: only living human champions', () => {
  const champs = [
    champ(0, 0),
    champ(3, -2, { controller: 'bot' }),
    champ(5, 5, { alive: false }),
    champ(-2, 1),
  ];
  assert.deepEqual(humanChampionPositions(champs), [{ q: 0, r: 0 }, { q: -2, r: 1 }]);
});

test('hexKeysWithinCap: empty for no living humans', () => {
  assert.equal(hexKeysWithinCap([]).size, 0);
  assert.equal(hexKeysWithinCap([champ(0, 0, { alive: false })]).size, 0);
});

test('hexKeysWithinCap: 91 hexes in a radius-5 disc around a champion', () => {
  const keys = hexKeysWithinCap([champ(0, 0)]);
  assert.equal(keys.size, 1 + 3 * 5 * 6); // 1 + 3R(R+1) = 91
  assert.ok(keys.has('0,0'));
  assert.ok(keys.has('5,0'), 'distance-5 hex must be inside the cap');
  assert.ok(keys.has('0,-5'));
  assert.ok(!keys.has('6,0'), 'distance-6 hex must be outside the cap');
  // Every key is within the cap of the champion
  for (const k of keys) {
    const [q, r] = k.split(',').map(Number);
    assert.ok(distance({ q: 0, r: 0 }, { q, r }) <= SIGHT_RENDER_CAP);
  }
});

test('hexKeysWithinCap: sight-5 clamp — sight stats above the cap change nothing', () => {
  // The cap is hard: even a champion with a sight stat far beyond the cap is
  // rendered only within SIGHT_RENDER_CAP (the clamp is not min(sight, cap)).
  const bigSight = { ...champ(0, 0), sight: 9 };
  const keys = hexKeysWithinCap([bigSight]);
  assert.equal(keys.size, 1 + 3 * 5 * 6, 'render set stays the radius-5 disc');
  for (const k of keys) {
    const [q, r] = k.split(',').map(Number);
    assert.ok(distance({ q: 0, r: 0 }, { q, r }) <= SIGHT_RENDER_CAP);
  }
});

test('hexKeysWithinCap: union across multiple champions', () => {
  const keys = hexKeysWithinCap([champ(0, 0), champ(0, 6)]);
  // Two radius-5 discs 6 hexes apart overlap in 25 hexes → 91 + 91 − 25.
  assert.equal(keys.size, 157);
  assert.ok(keys.has('0,0'));
  assert.ok(keys.has('0,6'));
  assert.ok(keys.has(coordKey({ q: 5, r: 1 }))); // distance 5 from (0,6)
});

test('chunkKeysWithinCap: champion deep inside a chunk → only its chunk', () => {
  const keys = chunkKeysWithinCap([champ(0, 0)]);
  assert.deepEqual([...keys].sort(), ['0,0']);
});

test('chunkKeysWithinCap: champion near a chunk boundary pulls in neighbors', () => {
  // (12,0) is the first tile of chunk (1,0); the cap disc (q ∈ [7,17]) spans
  // chunks (0,0) and (1,0) along q, while r stays inside chunk row 0.
  const keys = chunkKeysWithinCap([champ(12, 0)]);
  assert.deepEqual([...keys].sort(), ['0,0', '1,0']);
});

test('chunkKeysWithinCap: far-away chunks are excluded', () => {
  const keys = chunkKeysWithinCap([champ(0, 0)]);
  // Chunk (2,0) holds q ≥ 36 — far beyond the cap.
  assert.ok(!keys.has('2,0'));
  assert.ok(!keys.has('0,2'));
  assert.ok(!keys.has('-1,1'));
  // Every returned chunk must touch the cap disc of some champion.
  for (const ck of keys) {
    const [cq, cr] = ck.split(',').map(Number);
    let touches = false;
    for (const o of humanChampionPositions([champ(0, 0)])) {
      for (let lq = -12; lq < 12 && !touches; lq++) {
        for (let lr = -12; lr < 12 && !touches; lr++) {
          const q = cq * 24 + lq, r = cr * 24 + lr;
          if (distance(o, { q, r }) <= SIGHT_RENDER_CAP) touches = true;
        }
      }
    }
    assert.ok(touches, `chunk ${ck} should touch the cap disc`);
  }
});
