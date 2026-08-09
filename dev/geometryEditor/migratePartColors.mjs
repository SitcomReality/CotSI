#!/usr/bin/env node
/**
 * migratePartColors.mjs — One-time migration: descriptor colors to per-part (schema v4).
 *
 * v4 removed the object-level material color and the per-part materialColor:
 * every part now carries its own `color` (schema.js normalizeDescriptor migrates
 * v3 descriptors on load). This script rewrites the data files to that canonical
 * v4 form — exactly what the editor's Save path emits — so the repo no longer
 * carries v3 color fields.
 *
 * Table-driven / entity files are skipped (hand-edited once), as are the two
 * hand-authored files whose provenance comments the emit round-trip would drop:
 *   bases.js, mobs.js  — table-driven (BASE_VARIANTS / MOB_VARIANTS), Save-rejected
 *   champions.js       — authored structure; head materialColor → color by hand
 *   traders.js         — small entity file; white material dropped by hand
 *   knots.js, hills.js — hand-authored with migration-provenance comments
 *                        (KNOT_Y_OFFSET / HILL_DECOR.*); colors moved by hand
 *
 * Safety: for every migrated descriptor the script re-imports each rewritten
 * file directly (a fresh specifier — the barrel import above would serve the
 * pre-migration modules from the cache) and asserts normalize(imported) equals
 * the normalized value captured before the rewrite. Files that already match
 * (no v3 color fields) are left untouched.
 *
 * Run once from the repo root:
 *   /run/host/usr/bin/node dev/geometryEditor/migratePartColors.mjs
 */
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

import { normalizeDescriptor } from '../../src/render/hexmap3d/features/descriptors/schema.js';
import { emitDescriptorModule, descriptorExportName } from './emitDescriptor.js';
import { ALL_DESCRIPTORS, DESCRIPTOR_SOURCES } from '../../src/render/hexmap3d/features/descriptors/data/index.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const DATA_DIR = path.join(ROOT, 'src', 'render', 'hexmap3d', 'features', 'descriptors', 'data');

/** Files whose structure is authored / table-driven — migrated by hand, not rewritten. */
const HAND_EDITED = new Set(['base', 'champion', 'mob', 'trader', 'hill', 'knot']);

/** Whether a raw descriptor still carries v3 color fields (needs rewriting). */
function hasV3Colors(raw) {
  if (raw.material && raw.material.color !== undefined) return true;
  const parts = [raw.parts ?? [], ...(raw.variants ?? []).map((v) => v.parts ?? [])].flat();
  return parts.some((p) => p && p.materialColor !== undefined);
}

const migrations = ALL_DESCRIPTORS.filter((d) => !HAND_EDITED.has(d.id) && hasV3Colors(d));
if (migrations.length === 0) {
  console.log('no v3 color fields left in the data files — nothing to migrate');
  process.exit(0);
}

const expected = new Map(migrations.map((d) => [d.id, normalizeDescriptor(d)]));

for (const d of migrations) {
  const file = DESCRIPTOR_SOURCES[d.id] ?? `${d.id}.js`;
  const target = path.join(DATA_DIR, file);
  assert.ok(existsSync(target), `home file data/${file} missing for "${d.id}"`);
  const text = emitDescriptorModule(d);
  await writeFile(target, text);
  console.log(`migrated ${d.id} → data/${file}`);
}

// Self-check: re-import each migrated file directly (a fresh specifier — the
// barrel import above would serve the pre-migration modules from the cache)
// and assert the migration is stable.
for (const [id, before] of expected) {
  const file = DESCRIPTOR_SOURCES[id] ?? `${id}.js`;
  const mod = await import(pathToFileURL(path.join(DATA_DIR, file)).href + '?migrate=' + Date.now());
  const imported = mod[descriptorExportName(id)];
  assert.ok(imported, `migrated descriptor "${id}" missing from ${file}`);
  assert.deepEqual(normalizeDescriptor(imported), before, `descriptor "${id}" drifted during migration`);
  assert.equal(hasV3Colors(imported), false, `descriptor "${id}" still carries v3 color fields`);
}
console.log(`verify: ${migrations.length} descriptors migrated and round-trip identically`);
