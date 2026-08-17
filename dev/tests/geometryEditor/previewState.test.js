/**
 * previewState.test.js — previewState.js (alternatives preview pin/clear), pure.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  previewStateFor,
  setPinnedOption,
} from '../../../dev/tools/geometryEditor/ui/previewState.js';

test('previewStateFor: natural when no entry exists', () => {
  assert.deepEqual(previewStateFor(new Map(), 'arms'), { mode: 'natural' });
});

test('previewStateFor: pinned when an entry exists', () => {
  const map = new Map([['arms', 'two-straight']]);
  assert.deepEqual(previewStateFor(map, 'arms'), { mode: 'pinned', optionId: 'two-straight' });
});

test('previewStateFor: reads per-choice (not global)', () => {
  const map = new Map([['arms', 'elbow'], ['branches', 'option-2']]);
  assert.deepEqual(previewStateFor(map, 'arms'), { mode: 'pinned', optionId: 'elbow' });
  assert.deepEqual(previewStateFor(map, 'branches'), { mode: 'pinned', optionId: 'option-2' });
  assert.deepEqual(previewStateFor(map, 'other'), { mode: 'natural' });
});

test('setPinnedOption: pins an option and leaves the source map untouched', () => {
  const map = new Map();
  const next = setPinnedOption(map, 'arms', 'elbow');
  assert.equal(map.has('arms'), false, 'source map must not mutate');
  assert.deepEqual(previewStateFor(next, 'arms'), { mode: 'pinned', optionId: 'elbow' });
});

test('setPinnedOption: overriding replaces the previous pin', () => {
  const map = new Map([['arms', 'two-straight']]);
  const next = setPinnedOption(map, 'arms', 'none');
  assert.deepEqual(previewStateFor(next, 'arms'), { mode: 'pinned', optionId: 'none' });
  assert.equal(map.get('arms'), 'two-straight', 'source map unchanged');
});

test('setPinnedOption: clear with null returns to natural', () => {
  const map = new Map([['arms', 'two-straight']]);
  const next = setPinnedOption(map, 'arms', null);
  assert.deepEqual(previewStateFor(next, 'arms'), { mode: 'natural' });
  assert.equal(map.get('arms'), 'two-straight', 'source map unchanged');
});

test('setPinnedOption: clear with undefined also returns to natural', () => {
  const map = new Map([['arms', 'two-straight']]);
  const next = setPinnedOption(map, 'arms', undefined);
  assert.deepEqual(previewStateFor(next, 'arms'), { mode: 'natural' });
});

test('setPinnedOption: clearing one choice leaves other pins intact', () => {
  const map = new Map([['arms', 'two-straight'], ['b', 'x']]);
  const next = setPinnedOption(map, 'arms', null);
  assert.deepEqual(previewStateFor(next, 'arms'), { mode: 'natural' });
  assert.deepEqual(previewStateFor(next, 'b'), { mode: 'pinned', optionId: 'x' });
});
