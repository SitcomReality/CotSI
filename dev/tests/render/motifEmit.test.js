/**
 * motifEmit.test.js — First-class shared-library motif emit + validation.
 *
 * Pins the authoring primitives a shared-library motif save relies on:
 *   - `motifExportName` produces the `<ID>_MOTIF` export name;
 *   - `emitMotifModule` emits a `data/motifs/<id>.js` module in the minimal
 *     (denormalized) form, matching the hand-authored library style;
 *   - the emitted source can be evaluated back (denormalizePart round-trips);
 *   - `validateMotifBlock` accepts a valid block and rejects bad ids, non-empty
 *     part requirements, and unknown fields.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motifExportName, emitMotifModule } from '../../../dev/tools/geometryEditor/emitDescriptor/index.js';
import { validateMotifBlock } from '../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { motifById } from '../../../src/render/hexmap3d/worldObjects/descriptors/data/motifs/index.js';

/** A small stand-in motif for emit tests (independent of the shipped library). */
const SAMPLE_MOTIF = {
  id: 'titanSpire',
  size: { min: 0.9, max: 1.2 },
  placement: { leanMin: 0.04, leanMax: 0.1 },
  parts: [
    {
      id: 'titanSpire-base',
      shape: 'cylinder',
      params: { bottomR: 0.2, topR: 0.05, height: 1.1, segments: 6 },
      color: 0x224488,
      biomeColor: { source: 'exotic', influence: 0.6 },
      transform: { localAxis: { x: 0, y: 1, z: 0 }, localAngle: 0.2 },
    },
  ],
};

test('motifExportName produces the <ID>_MOTIF export name', () => {
  assert.equal(motifExportName('log'), 'LOG_MOTIF');
  assert.equal(motifExportName('gnarledTree'), 'GNARLED_TREE_MOTIF');
  assert.equal(motifExportName('titanSpire'), 'TITAN_SPIRE_MOTIF');
  assert.equal(motifExportName('new-feature'), 'NEW_FEATURE_MOTIF');
});

test('emitMotifModule emits a data/motifs/<id>.js module with the <ID>_MOTIF export', () => {
  const src = emitMotifModule(SAMPLE_MOTIF, 'titanSpire.js');
  assert.match(src, /export const TITAN_SPIRE_MOTIF = \{/);
  assert.match(src, /id: 'titanSpire'/);
  assert.match(src, /shape: 'cylinder'/);
  assert.match(src, /0x224488/);
  // size/placement defaults are authored on the block.
  assert.match(src, /size: \{ min: 0\.9, max: 1\.2 \}/);
  assert.match(src, /placement: \{ leanMin: 0\.04, leanMax: 0\.1 \}/);
});

test('emitMotifModule output re-evaluates to a block whose parts round-trip', () => {
  const src = emitMotifModule(SAMPLE_MOTIF);
  // Strip the ES-module `export` keyword and evaluate the remaining `const
  // NAME = {...};` statement, capturing the block for inspection.
  const code = src.replace(/export /, '');
  const captured = {};
  const fn = new Function(`const slot = arguments[0]; ${code} slot[${JSON.stringify(SAMPLE_MOTIF.id)}] = TITAN_SPIRE_MOTIF;`);
  fn(captured);
  const emitted = captured[SAMPLE_MOTIF.id];
  assert.equal(emitted.id, 'titanSpire');
  assert.equal(emitted.parts.length, 1);
  assert.equal(emitted.parts[0].id, 'titanSpire-base');
  assert.equal(emitted.parts[0].color, 0x224488);
  // Denormalize strip: default shape params are removed (bottomR/topR/height/
  // segments authored non-default, color/biomeColor kept).
  assert.ok(emitted.parts[0].params, 'non-default params kept');
  assert.equal(emitted.parts[0].params.bottomR, 0.2);
});

test('a shipped library motif passes validateMotifBlock', () => {
  for (const id of ['log', 'gnarledTree']) {
    const block = motifById(id);
    assert.deepEqual(validateMotifBlock(block, { checkId: false }), [], `library motif "${id}" valid`);
    // With id checking, the block's own id also passes.
    assert.deepEqual(validateMotifBlock(block, { checkId: true }), [], `library motif "${id}" valid with id check`);
  }
});

test('validateMotifBlock rejects bad ids, missing parts, and unknown fields', () => {
  assert.ok(validateMotifBlock({}), 'no parts → invalid');
  assert.ok(validateMotifBlock({ id: 'bad id!', parts: [] }), 'bad id rejected');
  assert.ok(validateMotifBlock({ id: 'ok', parts: [] }).some((e) => /non-empty/.test(e)), 'empty parts rejected');
  assert.ok(validateMotifBlock({ id: 'ok', bogus: 1, parts: SAMPLE_MOTIF.parts }).some((e) => /unknown field/.test(e)), 'unknown field rejected');
  assert.deepEqual(
    validateMotifBlock({ id: 'ok', size: { min: 1, max: 0 }, parts: SAMPLE_MOTIF.parts }).some((e) => /min must be <= max/.test(e)),
    true,
    'bad size range rejected',
  );
});