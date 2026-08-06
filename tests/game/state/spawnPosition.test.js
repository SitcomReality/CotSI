/**
 * spawnPosition.test.js — Spawn target metrics
 * (src/game/state/spawnPosition.js): determinism, edge placement, and
 * neighbour equidistance for large maps (R=200).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnTarget, computeSpawnTargets } from '../../../src/game/state/spawnPosition.js';
import { distance } from '../../../src/engine/rules/hexGrid.js';
import { makeRng } from '../../../src/engine/rules/seededRng.js';

const SEVEN = Array.from({ length: 7 }, (_, faction) => ({ faction, controller: 'bot' }));
const R = 200;

test('spawnTarget: deterministic for a given seed', () => {
  const a = spawnTarget(0, 7, makeRng('spawn-test'), R);
  const b = spawnTarget(0, 7, makeRng('spawn-test'), R);
  assert.deepEqual(a, b);
});

test('computeSpawnTargets: same seed reproduces the same targets', () => {
  const make = () => computeSpawnTargets({ champions: SEVEN, rand: makeRng('repeat-spawn'), radius: R }).targets;
  assert.deepEqual(make(), make());
});

test('computeSpawnTargets: distinct targets for a full roster', () => {
  const { targets } = computeSpawnTargets({ champions: SEVEN, rand: makeRng('distinct-test'), radius: R });
  const keys = new Set(targets.map((t) => `${t.q},${t.r}`));
  assert.equal(keys.size, 7);
});

test('computeSpawnTargets: champions land near the edge, inside the map', () => {
  const { targets } = computeSpawnTargets({ champions: SEVEN, rand: makeRng('edge-test'), radius: R });
  const dists = targets.map((t) => distance({ q: 0, r: 0 }, t));
  for (const d of dists) {
    assert.ok(d <= R, `target outside the map disc: ${d}`);
    assert.ok(d >= 0.6 * R, `target too central (would reveal the map quickly): ${d}`);
  }
  const mean = dists.reduce((a, b) => a + b, 0) / dists.length;
  assert.ok(mean >= 0.7 * R, `targets too central on average: ${mean}`);
  // Mean distance to the map edge — close, but far enough in that the edge
  // direction is not self-evident from the start tile.
  const meanEdge = R - mean;
  assert.ok(meanEdge >= 0.08 * R, `targets too close to the edge on average: edge ${meanEdge}`);
});

test('computeSpawnTargets: neighbours are ~equidistant', () => {
  const { targets } = computeSpawnTargets({ champions: SEVEN, rand: makeRng('equi-test'), radius: R });
  const neighborRatios = [];
  const minPairDists = [];
  for (const t of targets) {
    const ds = targets
      .filter((u) => u !== t)
      .map((u) => distance(t, u))
      .sort((a, b) => a - b);
    neighborRatios.push(ds[1] / ds[0]);
    minPairDists.push(ds[0]);
  }
  // The wedge-based angular placement puts every champion's two nearest
  // neighbours at nearly equal distance; angular jitter scatters them slightly.
  const maxRatio = Math.max(...neighborRatios);
  assert.ok(maxRatio <= 1.6, `neighbour spacing too asymmetric: ${maxRatio.toFixed(3)}`);
  // No two champions anywhere near each other.
  const minPair = Math.min(...minPairDists);
  assert.ok(minPair >= 100, `champions too close together: ${minPair}`);
});
