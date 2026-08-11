/**
 * logHelpers.test.js — Pure log segment helpers (champion → faction color)
 * (src/game/rules/logHelpers.js). Protects user-visible log text rendering.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChampionFactionMap,
  factionAccentVar,
  championSegment,
} from '../../../../src/game/rules/logHelpers.js';

test('buildChampionFactionMap: maps name → faction index', () => {
  const map = buildChampionFactionMap([
    { name: 'Alpha', faction: 0 },
    { name: 'Beta', faction: 3 },
  ]);
  assert.deepEqual(map, { Alpha: 0, Beta: 3 });
});

test('buildChampionFactionMap: null and empty input are safe', () => {
  assert.deepEqual(buildChampionFactionMap(null), {});
  assert.deepEqual(buildChampionFactionMap([]), {});
});

test('factionAccentVar: legacy fN-pale alias', () => {
  assert.equal(factionAccentVar(0), 'var(--f0-pale)');
  assert.equal(factionAccentVar(6), 'var(--f6-pale)');
});

test('championSegment: known champion gets their faction color', () => {
  assert.deepEqual(championSegment('Alpha', { Alpha: 2 }), {
    text: 'Alpha',
    color: 'var(--f2-pale)',
  });
});

test('championSegment: unknown name gets no color', () => {
  assert.deepEqual(championSegment('Ghost', {}), { text: 'Ghost', color: undefined });
});
