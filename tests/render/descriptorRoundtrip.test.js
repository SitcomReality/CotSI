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

// ── Nested part groups (schema v5) ──────────────────────────────────────────

test('synthetic group descriptor round-trips through denormalize and emit', async () => {
  const grouped = {
    id: 'groupedDemo',
    kind: 'feature',
    displayName: 'Grouped Demo',
    schemaVersion: 3,
    parts: [
      { id: 'base', shape: 'box' },
      {
        id: 'lid',
        transform: {
          localPos: { x: 0, y: 0.15, z: 0.125 },
          localAxis: { x: 1, y: 0, z: 0 },
          localAngle: -1.4,
        },
        children: [
          { id: 'lid-board', shape: 'box', params: { width: 0.35, height: 0.08, depth: 0.25 }, transform: { localPos: { x: 0, y: 0, z: -0.125 } } },
          { id: 'lid-strap', shape: 'box', transform: { localPos: { x: -0.12, y: 0, z: -0.125 }, scaleX: 0.5 } },
        ],
      },
    ],
  };
  const d = normalizeDescriptor(grouped);
  assert.deepEqual(validateDescriptor(d), []);
  // Default stripping + refill keeps the tree intact.
  assert.deepEqual(normalizeDescriptor(denormalizeDescriptor(d)), d, 'denormalize keeps the group tree');
  // And the Save round-trip: emit → import → normalize returns the same value.
  const text = emitDescriptorModule(d);
  const mod = await import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));
  assert.ok('GROUPED_DEMO_DESCRIPTOR' in mod, 'emitted module exports the group descriptor');
  assert.deepEqual(normalizeDescriptor(mod.GROUPED_DEMO_DESCRIPTOR), d, 'emitted module keeps the group tree');
});
