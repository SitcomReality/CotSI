/**
 * archetypes.test.js — Archetype registry invariants (src/game/rules/archetypes.js).
 *
 * Imports the full archetype data barrel so the real registry (biomes, mobs,
 * features) is loaded; registry API tests use names prefixed with `test_`
 * to avoid colliding with real registrations.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defineArchetype, getArchetype, createVariant, listArchetypes,
  getArchetypesByType, clearArchetypes,
} from '../../../src/game/rules/archetypes.js';
import '../../../src/game/rules/archetypeData/index.js';
import { BIOME_PRIORITY_ORDER, SUPERNATURAL_BIOMES } from '../../../src/game/rules/terrainGen/classification/biomeSelection.js';

test('real registry: every biome in the priority order is registered', () => {
  for (const biomeId of [...BIOME_PRIORITY_ORDER, ...SUPERNATURAL_BIOMES]) {
    const def = getArchetype(biomeId);
    assert.ok(def, `biome ${biomeId} must be registered`);
    assert.equal(def.type, 'biome', `${biomeId} must be type biome`);
    assert.ok(def.name, `${biomeId} must have a name`);
  }
});

test('real registry: biome_default is the catch-all (no climateRange)', () => {
  const def = getArchetype('biome_default');
  assert.ok(def);
  assert.equal(def.climateRange, undefined, 'biome_default should have no climateRange');
});

test('real registry: every biome defines primary + accent colors', () => {
  for (const biomeId of [...BIOME_PRIORITY_ORDER, ...SUPERNATURAL_BIOMES]) {
    const def = getArchetype(biomeId);
    const { primary, accent } = def.colors ?? {};
    assert.ok(Array.isArray(primary) && primary.length === 3, `${biomeId} primary must be an [r,g,b] tuple`);
    assert.ok(Array.isArray(accent) && accent.length === 3, `${biomeId} accent must be an [r,g,b] tuple`);
    for (const c of [...primary, ...accent]) {
      assert.ok(Number.isFinite(c) && c >= 0 && c <= 1, `${biomeId} color component ${c} out of [0,1]`);
    }
  }
});

test('real registry: every archetype has a type field', () => {
  for (const name of listArchetypes()) {
    const def = getArchetype(name);
    assert.ok(def && typeof def.type === 'string', `${name} must have a type`);
  }
});

test('real registry: biome types include mobs and features', () => {
  const types = new Set(listArchetypes().map((n) => getArchetype(n).type));
  assert.ok(types.has('mob'), 'registry should contain mobs');
  assert.ok(types.has('feature'), 'registry should contain features');
});

test('defineArchetype/getArchetype: register and retrieve', () => {
  defineArchetype('test_simple', { type: 'widget', value: 42 });
  const def = getArchetype('test_simple');
  assert.deepEqual(def, { type: 'widget', value: 42 });
});

test('defineArchetype: duplicate name throws', () => {
  defineArchetype('test_dupe', { type: 'widget' });
  assert.throws(() => defineArchetype('test_dupe', { type: 'widget' }), /already defined/);
});

test('defineArchetype: unknown parent throws', () => {
  assert.throws(
    () => defineArchetype('test_orphan', { parent: 'test_no_such_parent', type: 'widget' }),
    /parent .* not found/
  );
});

test('archetype inheritance: variant merges parent props, child wins conflicts', () => {
  defineArchetype('test_parent', { type: 'mob', name: 'Parent', base: { hp: 10, atk: 2 }, tag: 'x' });
  defineArchetype('test_child', { parent: 'test_parent', name: 'Child', base: { hp: 20 } });
  const child = getArchetype('test_child');
  assert.equal(child.name, 'Child');
  assert.equal(child.type, 'mob');
  assert.equal(child.tag, 'x', 'parent props should be inherited');
  assert.deepEqual(child.base, { hp: 20 }, 'child base should fully override parent base');
});

test('getArchetype: returns a copy — mutation does not corrupt registry', () => {
  defineArchetype('test_copy', { type: 'widget', value: 1 });
  const first = getArchetype('test_copy');
  first.value = 999;
  const second = getArchetype('test_copy');
  assert.equal(second.value, 1, 'registry should be unchanged after mutating a retrieved copy');
});

test('createVariant: convenience wrapper', () => {
  defineArchetype('test_variant_parent', { type: 'mob', hp: 5 });
  createVariant('test_variant_child', 'test_variant_parent', { hp: 9, extra: true });
  const def = getArchetype('test_variant_child');
  assert.equal(def.hp, 9);
  assert.equal(def.type, 'mob');
  assert.equal(def.extra, true);
});

test('listArchetypes/getArchetypesByType: type filtering', () => {
  defineArchetype('test_filter_widget', { type: 'widget' });
  const widgets = listArchetypes('widget');
  assert.ok(widgets.includes('test_filter_widget'));
  const byType = getArchetypesByType('widget');
  assert.ok(byType.some((d) => d.type === 'widget'));
});

test('clearArchetypes: empties the registry', () => {
  clearArchetypes();
  assert.equal(listArchetypes().length, 0);
  assert.equal(getArchetype('biome_default'), null);
});
