/**
 * labels.test.js — displayLabel (parts-tree display names), pure.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayLabel } from '../../../dev/tools/geometryEditor/ui/partTree/labels.js';

test('part inside an editor-generated option: strips the option prefix', () => {
  const node = { id: 'cactus-two-straight-arm-2' };
  const entry = { option: { id: 'cactus-two-straight' }, choiceId: 'cactus-arms' };
  assert.equal(displayLabel(node, entry, 'cactus'), 'arm-2');
});

test('part with full choice + option chain: peels both then the canvas left', () => {
  const node = { id: 'tree-branch-choice-1-option-1-config-1' };
  const entry = { option: { id: 'tree-branch-choice-1-option-1' }, choiceId: 'tree-branch-choice-1' };
  assert.equal(displayLabel(node, entry, 'tree'), 'config-1');
});

test('hand-authored short part inside an option passes through unchanged', () => {
  const node = { id: 'arm-two-a' };
  const entry = { option: { id: 'two-straight' }, choiceId: 'cactus-arms' };
  assert.equal(displayLabel(node, entry, 'cactus'), 'arm-two-a');
});

test('motif-scoped root part (no option): peels just the motif prefix', () => {
  const node = { id: 'cactus-trunk' };
  assert.equal(displayLabel(node, {}, 'cactus'), 'trunk');
});

test('no context and no motif: label is the id verbatim', () => {
  assert.equal(displayLabel({ id: 'shrub-a' }, {}, null), 'shrub-a');
});

test('an option row itself: its own id is shown, not a stripped fragment', () => {
  const option = { id: 'one-straight', parts: [] };
  const entry = { option, choiceId: 'cactus-arms' };
  assert.equal(displayLabel(option, entry, 'cactus'), 'one-straight');
});

test('a choice point row: shows the (motif-peeled) choice id', () => {
  const node = { id: 'cactus-arms', alternatives: [] };
  assert.equal(displayLabel(node, {}, 'cactus'), 'arms');
});

test('an empty motifId never strips', () => {
  const node = { id: 'cactus-trunk' };
  assert.equal(displayLabel(node, {}, null), 'cactus-trunk');
});
