/**
 * terrainTypes.test.js — Terrain data invariants (src/game/rules/terrainTypes.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TERRAIN, DEFAULT_FEATURES } from '../../../src/game/rules/terrainTypes.js';

test('TERRAIN: passable terrain has finite movementCost ≥ 1', () => {
  for (const [name, def] of Object.entries(TERRAIN)) {
    assert.equal(typeof def.passable, 'boolean', `${name}.passable`);
    if (def.passable) {
      assert.ok(Number.isFinite(def.movementCost) && def.movementCost >= 1,
        `${name} should have finite movementCost ≥ 1`);
    }
  }
});

test('TERRAIN: impassable terrain has movementCost === Infinity', () => {
  for (const [name, def] of Object.entries(TERRAIN)) {
    if (!def.passable) {
      assert.equal(def.movementCost, Infinity, `${name} should be impassable (Infinity)`);
    }
  }
});

test('TERRAIN: unique labels', () => {
  const labels = Object.values(TERRAIN).map((t) => t.label);
  assert.equal(new Set(labels).size, labels.length, 'labels must be unique');
});

test('TERRAIN: every entry has required fields', () => {
  for (const [name, def] of Object.entries(TERRAIN)) {
    assert.ok(typeof def.label === 'string' && def.label.length > 0, `${name}.label`);
    assert.ok(typeof def.fill === 'string', `${name}.fill`);
    assert.ok(typeof def.mark === 'string', `${name}.mark`);
  }
});

test('TERRAIN: known terrain set is present', () => {
  const expected = [
    'plains', 'forest', 'deepWood', 'desert', 'marsh', 'hill', 'plateau',
    'mountain', 'water', 'ice', 'beach', 'river',
  ];
  for (const name of expected) {
    assert.ok(TERRAIN[name], `missing terrain: ${name}`);
  }
});

test('TERRAIN: every finite movement cost divides the 60 AP pool', () => {
  for (const [name, def] of Object.entries(TERRAIN)) {
    if (Number.isFinite(def.movementCost)) {
      assert.equal(60 % def.movementCost, 0,
        `${name} cost ${def.movementCost} must divide 60 (design ladder)`);
    }
  }
});

test('DEFAULT_FEATURES: documented priority order and shape', () => {
  assert.deepEqual(
    DEFAULT_FEATURES.map((f) => f.kind),
    ['blessedFont', 'knot']
  );
  for (const f of DEFAULT_FEATURES) {
    assert.ok(typeof f.threshold === 'number' && f.threshold > 0 && f.threshold < 1,
      `threshold ${f.threshold} out of (0,1)`);
    assert.ok(f.compare === 'gt' || f.compare === 'lt', `compare ${f.compare}`);
  }
});

test('DEFAULT_FEATURES: blessedFont is woods-only, knot is a low-threshold lt rule', () => {
  const [blessedFont, knot] = DEFAULT_FEATURES;
  assert.deepEqual(blessedFont.terrainOnly, ['forest', 'deepWood']);
  assert.equal(knot.compare, 'lt');
  assert.ok(knot.threshold < 0.1, 'knot should be rare (low threshold)');
});
