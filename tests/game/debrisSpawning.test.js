/**
 * debrisSpawning.test.js — Debris kind selection
 * (src/game/rules/terrainGen/features/debrisSpawning.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectDebrisKind } from '../../src/game/rules/terrainGen/features/debrisSpawning.js';

const EDENFALL_DEF = { debris: ['crystal', 'shroom', 'rock'] };

test('selectDebrisKind: returns null on impassable terrain', () => {
  for (const roll of [0, 0.3, 0.7, 0.99]) {
    assert.equal(selectDebrisKind({ terrain: 'water' }, undefined, roll), null);
  }
});

test('selectDebrisKind: returns null when the tile hosts a feature', () => {
  assert.equal(
    selectDebrisKind({ terrain: 'plains', feature: { kind: 'tree' } }, undefined, 0.5),
    null
  );
});

test('selectDebrisKind: biome debris pool overrides terrain defaults', () => {
  for (const roll of [0, 0.1, 0.3, 0.5, 0.7, 0.9, 0.99]) {
    const kind = selectDebrisKind({ terrain: 'plains' }, EDENFALL_DEF, roll);
    assert.ok(
      ['crystal', 'shroom', 'rock'].includes(kind),
      `Edenfall should only yield its pool kinds, got ${kind}`
    );
  }
});

test('selectDebrisKind: desert never gets a flower (dry pool)', () => {
  for (const roll of [0, 0.2, 0.5, 0.8, 0.99]) {
    const kind = selectDebrisKind({ terrain: 'desert' }, undefined, roll);
    assert.ok(['bone', 'rock', 'tuft'].includes(kind), `desert got ${kind}`);
  }
});

test('selectDebrisKind: forest can yield a fallen log', () => {
  const kinds = new Set();
  for (let i = 0; i < 100; i++) {
    const kind = selectDebrisKind({ terrain: 'forest' }, undefined, i / 100);
    kinds.add(kind);
  }
  assert.ok(kinds.has('log'), 'forest pool should include logs');
  assert.ok(!kinds.has('bone'), 'forest should not contain bones');
});

test('selectDebrisKind: roll boundaries pick the pool edges', () => {
  assert.equal(selectDebrisKind({ terrain: 'desert' }, undefined, 0), 'bone');
  const last = selectDebrisKind({ terrain: 'desert' }, undefined, 0.999);
  assert.equal(last, 'tuft', 'roll clamped to the last pool kind');
});

test('selectDebrisKind: unknown passable terrain falls back to a default pool', () => {
  for (const roll of [0, 0.5, 0.99]) {
    const kind = selectDebrisKind({ terrain: 'plateau' }, undefined, roll);
    assert.ok(['tuft', 'flower', 'rock'].includes(kind), `fallback got ${kind}`);
  }
});

test('selectDebrisKind: impassable terrain yields null (mountains, water, ice)', () => {
  for (const terrain of ['mountain', 'peak', 'water', 'ice', 'floatingIsland']) {
    assert.equal(selectDebrisKind({ terrain }, undefined, 0.5), null, `${terrain}`);
  }
});
