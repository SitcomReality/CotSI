/**
 * featureSpawning.test.js — Feature spawn rules and density gates
 * (src/game/rules/terrainGen/features/).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnFeature, tierAcceptance, centerDistance01 } from '../../../src/game/rules/terrainGen/features/featureSpawning.js';
import { canSpawnFruitTree, featureDensity } from '../../../src/game/rules/terrainGen/features/featureDensity.js';
import { KNOT_BASE_AMOUNT, KNOT_AMOUNT_VARIATION_MOD, FEATURE_TIERS } from '../../../src/params/game/featureSpawnParams.js';

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
  assert.equal(f.nextRewardDay, 1);
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

// ── Tiered + banded placement (featureDesign.md §3) ───────────────────────

test('tierAcceptance: T1 is uniform, T2/T3 ramp toward the center', () => {
  const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
  // T1 (the default tier) accepts everywhere.
  assert.equal(tierAcceptance('T1', 0, FEATURE_TIERS), 1);
  assert.equal(tierAcceptance('T1', 0.5, FEATURE_TIERS), 1);
  assert.equal(tierAcceptance('T1', 1, FEATURE_TIERS), 1);
  // T2: gate 0.55 at the edge, linear to 1.0 at the center.
  near(tierAcceptance('T2', 1, FEATURE_TIERS), 0.55);
  near(tierAcceptance('T2', 0.5, FEATURE_TIERS), 0.775);
  assert.equal(tierAcceptance('T2', 0, FEATURE_TIERS), 1);
  // T3 ramps harder: gate 0.2 at the edge.
  near(tierAcceptance('T3', 1, FEATURE_TIERS), 0.2);
  near(tierAcceptance('T3', 0.5, FEATURE_TIERS), 0.6);
  assert.equal(tierAcceptance('T3', 0, FEATURE_TIERS), 1);
});

test('tierAcceptance: T4 is center-only', () => {
  const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
  assert.equal(tierAcceptance('T4', 0.6, FEATURE_TIERS), 0, 'beyond the inner radius');
  assert.equal(tierAcceptance('T4', 0.5, FEATURE_TIERS), 0, 'at the inner boundary');
  near(tierAcceptance('T4', 0.25, FEATURE_TIERS), 0.5);
  assert.equal(tierAcceptance('T4', 0, FEATURE_TIERS), 1);
});

test('tierAcceptance: missing or unknown tier behaves as T1', () => {
  assert.equal(tierAcceptance(undefined, 1, FEATURE_TIERS), 1);
  assert.equal(tierAcceptance('T9', 1, FEATURE_TIERS), 1);
  assert.equal(tierAcceptance('T9', 0, FEATURE_TIERS), 1);
});

test('centerDistance01: normalized distance from the map center', () => {
  assert.equal(centerDistance01(0, 0, 14), 0);
  assert.equal(centerDistance01(14, 0, 14), 1);
  assert.equal(centerDistance01(0, 14, 14), 1);
  assert.equal(centerDistance01(7, 7, 14), 1, 'corner hex sits at distance 14');
  assert.equal(centerDistance01(7, 0, 14), 0.5);
  assert.equal(centerDistance01(7, 0, 0), 0, 'zero radius guards the division');
});

test('spawnFeature: a T4 rule never fires beyond its inner radius', () => {
  const features = [{ kind: 'ouroborosLoop', threshold: 0.999, compare: 'gt', tier: 'T4' }];
  for (let s = 0; s < 200; s++) {
    const f = spawnFeature(0.9999, 'plains', 0, features, { seed: s, q: s, r: 2 * s, dist01: 0.8 });
    assert.equal(f, null, `T4 rule must not spawn at dist01 0.8 (seed ${s})`);
  }
});

test('spawnFeature: a rejected tier gate falls through to a lower-priority rule', () => {
  // At the edge the T3 gate (0.2) rejects the rule ~80% of the time; the
  // lower-priority T1 rule then gets its chance with the same roll. Every
  // tree win proves the fallthrough.
  const features = [
    { kind: 'foolsFire', threshold: 0.5, compare: 'gt', tier: 'T3' },
    { kind: 'tree', threshold: 0.5, compare: 'gt' },
  ];
  let treeWins = 0;
  for (let s = 0; s < 300; s++) {
    const f = spawnFeature(0.9, 'plains', 0, features, { seed: s, q: s, r: s * 3, dist01: 1 });
    if (f?.kind === 'tree') treeWins++;
  }
  assert.ok(treeWins > 100, `expected the fallback tree to win often at the edge (got ${treeWins})`);
});

test('spawnFeature: T3 fires far more at the center than at the edge', () => {
  const features = [{ kind: 'foolsFire', threshold: 0.5, compare: 'gt', tier: 'T3' }];
  let center = 0;
  let edge = 0;
  for (let s = 0; s < 400; s++) {
    if (spawnFeature(0.9, 'plains', 0, features, { seed: s, q: s, r: 0, dist01: 0 })) center++;
    if (spawnFeature(0.9, 'plains', 0, features, { seed: s, q: s, r: 0, dist01: 1 })) edge++;
  }
  assert.equal(center, 400, 'gate 1 at the center → the rule always matches');
  assert.ok(edge < center * 0.5, `edge fires should be ~20% of the center (got ${edge})`);
});

test('spawnFeature: without options the tier gate is skipped (legacy behavior)', () => {
  const features = [{ kind: 'foolsFire', threshold: 0.5, compare: 'gt', tier: 'T4' }];
  for (let s = 0; s < 50; s++) {
    assert.equal(spawnFeature(0.9, 'plains', 0, features)?.kind, 'foolsFire',
      'no options → no gating → the rule behaves as T1');
  }
});
