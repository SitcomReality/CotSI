/**
 * featureSpawning.test.js — Feature spawn rules and density gates
 * (src/game/rules/terrainGen/features/).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnFeature } from '../../src/game/rules/terrainGen/features/featureSpawning.js';
import { canSpawnFruitTree, featureDensity, shouldSpawnRock } from '../../src/game/rules/terrainGen/features/featureDensity.js';
import { KNOT_BASE_AMOUNT, KNOT_AMOUNT_VARIATION_MOD } from '../../src/params/game/worldParams.js';

test('spawnFeature: returns null when no rule matches', () => {
  const features = [{ kind: 'tree', threshold: 0.9, compare: 'gt' }];
  assert.equal(spawnFeature(0.5, 'plains', 0, features), null);
});

test('spawnFeature: first matching rule wins (priority order)', () => {
  const features = [
    { kind: 'fruitTree', threshold: 0.9, compare: 'gt' },
    { kind: 'tree', threshold: 0.5, compare: 'gt' },
  ];
  const f = spawnFeature(0.95, 'plains', 0, features);
  assert.equal(f.kind, 'fruitTree');
});

test('spawnFeature: terrainExclude skips a rule', () => {
  const features = [
    { kind: 'fruitTree', threshold: 0.9, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'tree', threshold: 0.5, compare: 'gt' },
  ];
  const f = spawnFeature(0.95, 'desert', 0, features);
  assert.equal(f.kind, 'tree', 'fruitTree must be excluded on desert');
});

test('spawnFeature: terrainOnly restricts a rule to listed terrains', () => {
  const features = [
    { kind: 'fruitTree', threshold: 0.9, compare: 'gt', terrainOnly: ['forest', 'denseForest'] },
    { kind: 'tree', threshold: 0.5, compare: 'gt' },
  ];
  const onForest = spawnFeature(0.95, 'forest', 0, features);
  assert.equal(onForest.kind, 'fruitTree', 'fruitTree allowed on forest');
  const onPlains = spawnFeature(0.95, 'plains', 0, features);
  assert.equal(onPlains.kind, 'tree', 'fruitTree skipped off-forest, tree wins');
  const onDesert = spawnFeature(0.95, 'desert', 0, features);
  assert.equal(onDesert.kind, 'tree', 'terrainOnly also excludes desert');
  const onDenseForest = spawnFeature(0.95, 'denseForest', 0, features);
  assert.equal(onDenseForest.kind, 'fruitTree', 'fruitTree allowed on denseForest');
});

test('spawnFeature: density modulates threshold (higher density → easier match)', () => {
  const features = [{ kind: 'tree', threshold: 0.9, compare: 'gt' }];
  // density 0 → effective 0.9; roll 0.85 misses at density 0 but hits at high density.
  assert.equal(spawnFeature(0.85, 'plains', 0, features), null);
  const hit = spawnFeature(0.85, 'plains', 1, features);
  assert.equal(hit.kind, 'tree', 'high density should lower the effective threshold');
});

test('spawnFeature: gt vs lt comparison semantics', () => {
  const gtRule = [{ kind: 'tree', threshold: 0.5, compare: 'gt' }];
  const ltRule = [{ kind: 'knot', threshold: 0.5, compare: 'lt' }];
  assert.equal(spawnFeature(0.6, 'plains', 0, gtRule)?.kind, 'tree');
  assert.equal(spawnFeature(0.4, 'plains', 0, ltRule)?.kind, 'knot');
  assert.equal(spawnFeature(0.4, 'plains', 0, gtRule), null);
  assert.equal(spawnFeature(0.6, 'plains', 0, ltRule), null);
});

test('spawnFeature: knot gets an amount in the documented range', () => {
  const features = [{ kind: 'knot', threshold: 1, compare: 'lt' }];
  for (const roll of [0, 0.1, 0.5, 0.99]) {
    const knot = spawnFeature(roll, 'plains', 0, features);
    assert.equal(knot.kind, 'knot');
    assert.ok(Number.isInteger(knot.amount), 'knot amount must be an integer');
    assert.ok(knot.amount >= KNOT_BASE_AMOUNT, 'knot amount must be ≥ base');
    assert.ok(knot.amount <= KNOT_BASE_AMOUNT + KNOT_AMOUNT_VARIATION_MOD,
      'knot amount must be within variation range');
  }
});

test('spawnFeature: fruitTree spawns with ripe state', () => {
  const features = [{ kind: 'fruitTree', threshold: 0.9, compare: 'gt' }];
  const f = spawnFeature(0.99, 'plains', 0, features);
  assert.equal(f.kind, 'fruitTree');
  assert.equal(f.ripe, true);
  assert.equal(f.nextFruitDay, 1);
});

test('spawnFeature: unknown rule kind passes through with state', () => {
  const features = [{ kind: 'mystery', threshold: 0.5, compare: 'gt', state: { glow: true } }];
  const f = spawnFeature(0.9, 'plains', 0, features);
  assert.equal(f.kind, 'mystery');
  assert.equal(f.glow, true);
});

test('canSpawnFruitTree: climate gate', () => {
  assert.equal(canSpawnFruitTree(0.3, 0.8, 0.5), true);
  assert.equal(canSpawnFruitTree(0.3, 0.5, 0.5), false, 'too dry');
  assert.equal(canSpawnFruitTree(0.6, 0.8, 0.5), false, 'too high');
  assert.equal(canSpawnFruitTree(0.5, 0.7, 0.5), false, 'elevation equals treeLineMax is not allowed');
});

test('featureDensity: returns values in [0, 1]', () => {
  for (const terrain of ['plains', 'forest', 'desert', 'marsh', 'hill', 'denseForest']) {
    for (const moisture of [0, 0.3, 0.6, 1]) {
      const d = featureDensity(terrain, 0.3, moisture, 0.1, 0.6);
      assert.ok(d >= 0 && d <= 1, `${terrain} @ moisture ${moisture}: ${d}`);
    }
  }
});

test('featureDensity: forest is denser with more moisture', () => {
  const dry = featureDensity('forest', 0.2, 0.75, 0.05, 0.6);
  const wet = featureDensity('forest', 0.2, 1.0, 0.05, 0.6);
  assert.ok(wet >= dry, 'wetter forest should have density ≥ drier forest');
});

test('shouldSpawnRock: returns probability in [0, 1]', () => {
  assert.ok(shouldSpawnRock(0.5, 0.1) >= 0 && shouldSpawnRock(0.5, 0.1) <= 1);
  // Steep + dry should be at least as rocky as flat + wet.
  assert.ok(shouldSpawnRock(0.5, 0.0) >= shouldSpawnRock(0.0, 0.5));
});
