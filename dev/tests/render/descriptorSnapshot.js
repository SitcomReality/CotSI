/**
 * descriptorSnapshot.js — Golden-snapshot generation for descriptor data.
 *
 * Single source of truth for the fixed test tile(s) and the descriptor→record
 * golden fixture (fixtures/descriptorData.snap.json): the record output of
 * every non-entity descriptor on a fixed tile, deep-equal'd by
 * descriptorData.test.js. The geometry editor's save server refreshes this
 * fixture on every successful Save, so editing geometry never leaves the test
 * suite red; the CLI (dev/scripts/regenerate_descriptor_snapshot.sh) re-
 * reconciles it manually. Pure + zero-dependency (no THREE) — node-safe.
 */
import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { normalizeDescriptor } from '../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { recordsForDescriptor } from '../../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';

/** The world position every snapshot renders its descriptor at. */
export const SNAPSHOT_POS = { x: 1.732, y: 1.25, z: -3.0 };

/** Per-id test tiles — descriptors that need a special terrain/moisture/type. */
export const SNAPSHOT_TILES = {
  grove: { q: 3, r: -2, terrain: 'forest', moisture: 0.8 },
  hill: { q: 3, r: -2, terrain: 'hill' },
  mountain: { q: 3, r: -2, terrain: 'mountain', mountainType: 'peak' },
};

/** The tile a descriptor's snapshot is generated on (plains unless overridden). */
export function snapshotTileFor(d) {
  return SNAPSHOT_TILES[d.id] ?? { q: 3, r: -2, terrain: 'plains' };
}

/** Entity + item descriptors record via recordsForEntity (single centered
 *  item), not the tile path — they are excluded from the tile snapshot. */
export const SNAPSHOT_ENTITY_KINDS = new Set(['base', 'champion', 'mob', 'trader', 'item']);

/** The golden fixture file (a file URL — readFileSync/readFile accept it). */
export const SNAPSHOT_PATH = new URL('./fixtures/descriptorData.snap.json', import.meta.url);
const SNAPSHOT_FILE = fileURLToPath(SNAPSHOT_PATH);

/**
 * Generate the golden snapshot for a set of RAW descriptors: normalized record
 * output per id, exactly as descriptorData.test.js compares it.
 * @param {object[]} descriptors - raw descriptors (ALL_DESCRIPTORS)
 * @returns {object} { [id]: { tile, records } }
 */
export function generateDescriptorSnapshot(descriptors) {
  const out = {};
  for (const raw of descriptors) {
    if (SNAPSHOT_ENTITY_KINDS.has(raw.kind)) continue;
    const d = normalizeDescriptor(raw);
    out[raw.id] = {
      tile: snapshotTileFor(d),
      records: recordsForDescriptor(d, snapshotTileFor(d), SNAPSHOT_POS),
    };
  }
  return out;
}

/**
 * Write the golden snapshot fixture, atomically and only when the content
 * would change (a save that doesn't alter records leaves the file untouched).
 * @param {object[]} descriptors - raw descriptors (ALL_DESCRIPTORS)
 * @returns {Promise<boolean>} true when the fixture was rewritten
 */
export async function writeDescriptorSnapshot(descriptors) {
  const text = JSON.stringify(generateDescriptorSnapshot(descriptors), null, 2) + '\n';
  let current = null;
  try {
    current = await readFile(SNAPSHOT_PATH, 'utf8');
  } catch {
    current = null; // first write
  }
  if (current === text) return false;
  const tmp = `${SNAPSHOT_FILE}.tmp-${process.pid}`;
  await writeFile(tmp, text);
  await rename(tmp, SNAPSHOT_FILE);
  return true;
}
