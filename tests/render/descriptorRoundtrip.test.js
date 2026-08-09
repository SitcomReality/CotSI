/**
 * descriptorRoundtrip.test.js — descriptor ↔ data-file serialization safety.
 *
 * The geometry editor saves objects by denormalizing (stripping defaults),
 * emitting a data-file module, and writing it to descriptors/data/. These
 * tests pin the invariant that makes that safe: for every descriptor,
 *   - normalize(denormalize(d)) equals normalize(d) — denormalize loses nothing,
 *   - the emitted module re-imports and normalizes back to the same value,
 *   - the export name follows the id → <ID>_DESCRIPTOR convention the barrel
 *     (data/index.js) and the save server rely on,
 *   - every descriptor's home file exists (per-object file or a
 *     DESCRIPTOR_SOURCES legacy name).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  normalizeDescriptor,
  denormalizeDescriptor,
  validateDescriptor,
} from '../../src/render/hexmap3d/features/descriptors/schema.js';
import { ALL_DESCRIPTORS, DESCRIPTOR_SOURCES } from '../../src/render/hexmap3d/features/descriptors/data/index.js';
import { emitDescriptorModule, descriptorExportName } from '../../dev/geometryEditor/emitDescriptor.js';

const all = ALL_DESCRIPTORS;

test('denormalize round-trips: normalize(denormalize(d)) === normalize(d)', () => {
  for (const raw of all) {
    const d = normalizeDescriptor(raw);
    assert.deepEqual(normalizeDescriptor(denormalizeDescriptor(d)), d, `denormalize broke "${raw.id}"`);
  }
});

test('denormalize is idempotent and its output validates', () => {
  for (const raw of all) {
    const d = normalizeDescriptor(raw);
    const once = denormalizeDescriptor(d);
    assert.deepEqual(denormalizeDescriptor(once), once, `denormalize not idempotent for "${raw.id}"`);
    assert.deepEqual(validateDescriptor(once), [], `denormalized "${raw.id}" is invalid`);
  }
});

test('emitted modules re-import and normalize back to the same descriptor', async () => {
  for (const raw of all) {
    const d = normalizeDescriptor(raw);
    const text = emitDescriptorModule(d);
    const exportName = descriptorExportName(d.id);
    const mod = await import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));
    assert.ok(exportName in mod, `${d.id}: export "${exportName}" missing from emitted module`);
    assert.deepEqual(normalizeDescriptor(mod[exportName]), d, `${d.id}: emitted module drifted`);
  }
});

test('export names follow the <ID>_DESCRIPTOR convention', () => {
  for (const raw of all) {
    const name = descriptorExportName(raw.id);
    assert.match(name, /^[A-Z][A-Z0-9_]*_DESCRIPTOR$/, `${raw.id} → bad export name "${name}"`);
  }
});

test('every descriptor has a home file (per-object file or DESCRIPTOR_SOURCES)', () => {
  for (const raw of all) {
    const file = DESCRIPTOR_SOURCES[raw.id] ?? `${raw.id}.js`;
    const p = new URL(`../../src/render/hexmap3d/features/descriptors/data/${file}`, import.meta.url);
    assert.ok(existsSync(p), `"${raw.id}" home file data/${file} missing`);
  }
  // DESCRIPTOR_SOURCES only lists non-conventional names; a per-object file must
  // exist for every id NOT listed there.
  for (const raw of all) {
    if (DESCRIPTOR_SOURCES[raw.id] === undefined) {
      assert.ok(existsSync(new URL(`../../src/render/hexmap3d/features/descriptors/data/${raw.id}.js`, import.meta.url)),
        `"${raw.id}" should live in data/${raw.id}.js`);
    }
  }
});
