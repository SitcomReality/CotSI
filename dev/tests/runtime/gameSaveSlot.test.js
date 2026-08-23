/**
 * gameSaveSlot.test.js — Save-slot round trip through the storage adapters.
 *
 * Uses an injected memory storage so the full save→load path is verified
 * headless; setGameInstance's window exposure is guarded, so the instance
 * swap is safe to assert under Node too.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../../src/game/state/gameFactory.js';
import { GAME_SAVE_KEY, saveGameToSlot, loadGameFromSlot, hasSavedGame } from '../../../src/runtime/gameSaveSlot.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    peek: (k) => map.get(k),
  };
}

const CHAMPIONS = [
  { faction: 0, controller: 'human' },
  { faction: 1, controller: 'bot' },
];

test('save → slot → load round trips champions and day', () => {
  const store = memoryStorage();
  const state = createGame({ seed: 'slot-test', radius: 7, champions: CHAMPIONS, objectives: {} });
  state.day = 4;

  assert.equal(saveGameToSlot(state, store), true);
  assert.equal(hasSavedGame(store), true);

  // The stored document carries the save marker before deserialization.
  const doc = JSON.parse(store.peek(GAME_SAVE_KEY));
  assert.equal(doc.format, 'cotsi-save');

  const restored = loadGameFromSlot(store);
  assert.notEqual(restored, null);
  assert.equal(restored.seed, 'slot-test');
  assert.equal(restored.day, 4);
  assert.deepEqual(restored.champions.map((c) => c.faction), [0, 1]);
});

test('empty slot loads as null and hasSavedGame is false', () => {
  assert.equal(loadGameFromSlot(memoryStorage()), null);
  assert.equal(hasSavedGame(memoryStorage()), false);
});
