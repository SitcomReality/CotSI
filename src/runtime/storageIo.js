/**
 * storageIo.js — Thin localStorage JSON adapters.
 *
 * Node-safe (returns null / no-op when localStorage is absent) and
 * failure-safe (quota or serialization errors are swallowed as null/false,
 * never thrown). An alternate storage backend can be injected for tests.
 *
 * Layer: runtime/ — may import everything; imports nothing here.
 */

function resolveStorage(storage) {
  if (storage) return storage;
  return typeof localStorage === 'undefined' ? null : localStorage;
}

/**
 * Read a JSON value from storage.
 * @param {string} key
 * @param {Storage|null} [storage] - injected backend; defaults to localStorage
 * @returns {any|null} parsed value, or null on missing key / bad JSON / no storage
 */
export function readStoredJson(key, storage = null) {
  const store = resolveStorage(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Write a JSON-safe value to storage.
 * @param {string} key
 * @param {any} value
 * @param {Storage|null} [storage] - injected backend; defaults to localStorage
 * @returns {boolean} true when the write succeeded
 */
export function writeStoredJson(key, value, storage = null) {
  const store = resolveStorage(storage);
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
