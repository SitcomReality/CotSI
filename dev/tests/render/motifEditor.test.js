/**
 * motifEditor.test.js — Editor load-a-library-motif mode.
 *
 * Pins the wiring that opens a shared library motif in the geometry editor for
 * authoring: `motifDescriptor` wraps a library motif block into a synthetic,
 * normalized decor (so the standard part-tree/inspector/preview machinery edits
 * it), and the wrapper previews exactly the motif's parts. The save wiring that
 * writes it back to data/motifs/<id>.js is covered by motifEmit.test.js and the
 * server routing tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motifDescriptor, MOTIF_SAMPLES } from '../../../dev/tools/geometryEditor/sampleObjects.js';
import { normalizeDescriptor } from '../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { recordsForDescriptor } from '../../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { motifById } from '../../../src/render/hexmap3d/worldObjects/descriptors/data/motifs/index.js';

const TILE = { terrain: 'plains', biomeId: null, feature: null };

test('every library motif wraps into a synthetic, valid decor', () => {
  for (const m of MOTIF_SAMPLES) {
    const d = motifDescriptor(m);
    assert.equal(d.kind, 'decor');
    assert.equal(d.id, m.id);
    assert.ok(Array.isArray(d.parts) && d.parts.length > 0, `${m.id} wrapper has parts`);
    assert.equal(d.cluster.min, 1, 'single slot preview');
    assert.equal(d.cluster.max, 1, 'single slot preview');
    // The wrapper is normalized (idempotent), so the inspector sees a fully
    // defaulted descriptor.
    assert.deepEqual(normalizeDescriptor(d), d, `${m.id} wrapper is already normalized`);
  }
});

test('motifDescriptor copies the library size/placement defaults', () => {
  for (const m of MOTIF_SAMPLES) {
    const d = motifDescriptor(m);
    // normalizeDescriptor fills the default size/placement when the library
    // block carries none; when it DOES author them, the wrapper must preserve
    // them verbatim.
    if (m.size) {
      assert.equal(d.size.min, m.size.min, `${m.id} inherits library size default (min)`);
      assert.equal(d.size.max, m.size.max, `${m.id} inherits library size default (max)`);
    }
    // Placement defaults are preserved; normalize may merge in the default mode.
    if (m.placement) {
      for (const [k, v] of Object.entries(m.placement)) {
        assert.equal(d.placement[k], v, `${m.id} inherits library placement default (${k})`);
      }
    }
  }
});

test('a motif wrapper renders exactly the motif parts via recordsForDescriptor', () => {
  for (const m of MOTIF_SAMPLES) {
    const d = motifDescriptor(m);
    const records = recordsForDescriptor(d, TILE, { x: 0, y: 0, z: 0 }, 1, {}, null, null, false, 1, new Map());
    // One item; every record's part id belongs to the motif's parts tree.
    assert.ok(records.length >= 1, `${m.id} wrapper emits at least one instance record`);
    const libParts = motifById(m.id).parts;
    const libIds = new Set();
    const collect = (nodes) => {
      for (const p of nodes) {
        if (Array.isArray(p.alternatives)) {
          for (const opt of p.alternatives) collect(opt.parts ?? []);
        } else {
          if (p.id) libIds.add(p.id);
          if (Array.isArray(p.children)) collect(p.children);
        }
      }
    };
    collect(libParts);
    for (const r of records) {
      assert.ok(libIds.has(r.partId), `record ${r.partId} is a library motif part`);
    }
  }
});