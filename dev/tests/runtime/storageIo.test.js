/**
 * storageIo.test.js — JSON storage adapters with an injected memory backend.
 *
 * Pins the failure contract: missing keys and corrupt JSON read as null,
 * writes never throw, and values round-trip unchanged.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readStoredJson, writeStoredJson } from '../../../src/runtime/storageIo.js';

/** Minimal Storage shim backed by a Map. */
function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

test('missing key reads as null', () => {
  assert.equal(readStoredJson('nope', memoryStorage()), null);
});

test('corrupt JSON reads as null', () => {
  const store = memoryStorage();
  store.setItem('bad', '{not json');
  assert.equal(readStoredJson('bad', store), null);
});

test('value round-trips through write/read', () => {
  const store = memoryStorage();
  const value = { effects: { shadows: false }, speeds: { bot: 2 }, nested: [1, 'a'] };
  assert.equal(writeStoredJson('key', value, store), true);
  assert.deepEqual(readStoredJson('key', store), value);
});

test('write returns false instead of throwing on backend failure', () => {
  const throwing = {
    getItem: () => null,
    setItem: () => { throw new Error('quota'); },
  };
  assert.equal(writeStoredJson('k', {}, throwing), false);
});

test('read returns null instead of throwing on backend failure', () => {
  const throwing = {
    getItem: () => { throw new Error('boom'); },
    setItem: () => {},
  };
  assert.equal(readStoredJson('k', throwing), null);
});
