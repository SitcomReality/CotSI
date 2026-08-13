/**
 * dungeonRules.test.js — Dungeon placement math and re-entry timing
 * (src/game/rules/dungeonRules.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dungeonCountForRadius, dungeonReentryDay } from '../../../../src/game/rules/dungeonRules.js';

test('dungeonCountForRadius: always at least 1, +1 per full 22 radii', () => {
  assert.equal(dungeonCountForRadius(0), 1);
  assert.equal(dungeonCountForRadius(1), 1);
  assert.equal(dungeonCountForRadius(21), 1);
  assert.equal(dungeonCountForRadius(22), 2);
  assert.equal(dungeonCountForRadius(43), 2);
  assert.equal(dungeonCountForRadius(44), 3); // exact multiple of 22 — one band higher
  assert.equal(dungeonCountForRadius(45), 3);
  assert.equal(dungeonCountForRadius(66), 4);
  assert.equal(dungeonCountForRadius(67), 4);
  assert.equal(dungeonCountForRadius(88), 5);
  assert.equal(dungeonCountForRadius(89), 5);
  assert.equal(dungeonCountForRadius(110), 6); // 1 + floor(110/22) = 1 + 5
  assert.equal(dungeonCountForRadius(111), 6);
});

test('dungeonCountForRadius: negative radius clamps to one dungeon', () => {
  assert.equal(dungeonCountForRadius(-5), 1);
});

test('dungeonReentryDay: flee on day D → blocked on D+1 → re-enter on D+2', () => {
  assert.equal(dungeonReentryDay(1), 3);
  assert.equal(dungeonReentryDay(5), 7);
  assert.equal(dungeonReentryDay(12), 14);
});
