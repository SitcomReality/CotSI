/**
 * descriptorGrowth.test.js — Growth-state keyframes (part `states.empty`).
 *
 * A feature's continuous 0..1 `growth` (advanced one step per world turn by
 * featureRegrowth.js) lerps keyframed parts from their `empty` look (growth 0)
 * to their authored base (growth 1): per-axis scale, root bottom height `y`,
 * nested `localPos`, and color. Covers the flat root-record path and the
 * nested-matrix path, plus the no-op guarantees (no states / growth 1 /
 * undefined growth render the authored values byte-identically).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDescriptor, validateDescriptor } from '../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import {
  recordsForDescriptor,
} from '../../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { stateTransform, stateColor, mixColor } from '../../../src/render/hexmap3d/worldObjects/descriptors/partStates.js';

const TILE = { q: 3, r: -2, terrain: 'plains' };
const POS = { x: 1.732, y: 1.25, z: -3.0 };

/** A centered single-item feature whose water part grows and colors. */
function fontDescriptor() {
  return normalizeDescriptor({
    id: 'growth-font',
    kind: 'feature',
    displayName: 'Growth Font',
    schemaVersion: 5,
    scale: 1.1,
    placement: { mode: 'center' },
    emphasis: { behavior: 'dispersed' },
    parts: [
      { id: 'bowl', shape: 'cylinder', params: { bottomR: 0.3, topR: 0.3, height: 0.2 }, transform: { y: 0.1 }, color: 0x999999 },
      {
        id: 'water',
        shape: 'cylinder',
        params: { bottomR: 0.2, topR: 0.2, height: 0.02 },
        transform: { y: 0.3 },
        color: 0x6fd4e8,
        states: { empty: { scaleX: 0.35, scaleY: 0.2, scaleZ: 0.35, y: 0.14, color: 0x7e99a6 } },
      },
    ],
  });
}

/** A nested fruit (inside a crown group) that shrinks and turns green. */
function treeDescriptor() {
  return normalizeDescriptor({
    id: 'growth-tree',
    kind: 'feature',
    displayName: 'Growth Tree',
    schemaVersion: 5,
    scale: 1.35,
    parts: [
      { id: 'trunk', shape: 'cylinder', params: { bottomR: 0.1, topR: 0.1, height: 0.5 }, color: 0x555555 },
      {
        id: 'crown',
        transform: { localPos: { x: 0, y: 0.5, z: 0 } },
        children: [
          {
            id: 'fruit',
            shape: 'dodecahedron',
            params: { radius: 0.045 },
            transform: { localPos: { x: 0.2, y: 0.5, z: 0.15 } },
            color: 0xffb703,
            states: { empty: { scaleX: 0.3, scaleY: 0.3, scaleZ: 0.3, color: 0x7fa98a } },
          },
        ],
      },
    ],
  });
}

const waterRecord = (d, growth) =>
  recordsForDescriptor(d, TILE, POS, undefined, {}, null, null, true, growth)
    .find((r) => r.partId === 'water');

// ── Root leaf record path ─────────────────────────────────────────────────

test('growth: root leaf lerps scale, y, and color between empty and full', () => {
  const d = fontDescriptor();

  const empty = waterRecord(d, 0);
  assert.equal(empty.y, POS.y + 0.14 + 0.01 * d.scale * 0.2, 'y = bottom height + base offset × scaleY');
  assert.equal(empty.scale, d.scale * 0.35, 'empty XZ scale');
  assert.equal(empty.scaleY, d.scale * 0.2, 'empty Y scale');
  assert.equal(empty.color, 0x7e99a6, 'empty (dull) color');

  const mid = waterRecord(d, 0.5);
  assert.ok(mid.y > empty.y && mid.y < waterRecord(d, 1).y, 'height rises between states');
  assert.ok(mid.scale > empty.scale && mid.scale < d.scale, 'size grows between states');
  assert.equal(mid.color, mixColor(0x7e99a6, 0x6fd4e8, 0.5), 'color mixes by growth');

  const full = waterRecord(d, 1);
  assert.equal(full.y, POS.y + 0.3 + 0.01 * d.scale, 'full y is the authored bottom height');
  assert.equal(full.scale, d.scale, 'full XZ scale is the authored scale');
  assert.equal(full.scaleY, d.scale, 'full Y scale is the authored scale');
  assert.equal(full.color, 0x6fd4e8, 'full (vivid) color');
});

test('growth: 1 and undefined growth render the authored values byte-identically', () => {
  const d = fontDescriptor();
  const explicit = waterRecord(d, 1);
  const absent = waterRecord(d, undefined);
  assert.deepEqual(absent, explicit, 'undefined growth === growth 1');
});

test('growth: parts without states ignore growth entirely', () => {
  const d = fontDescriptor();
  const bowl = (g) =>
    recordsForDescriptor(d, TILE, POS, undefined, {}, null, null, true, g)
      .find((r) => r.partId === 'bowl');
  assert.deepEqual(bowl(0), bowl(1), 'no keyframe → no lerp');
});

test('growth: localPos.y keyframe moves a nested leaf in its parent frame', () => {
  const d = normalizeDescriptor({
    id: 'growth-hanging',
    kind: 'feature',
    displayName: 'Hanging Growth',
    schemaVersion: 5,
    parts: [
      {
        id: 'pendant',
        shape: 'sphere',
        params: { radius: 0.1 },
        transform: { localPos: { x: 0, y: 0.4, z: 0 } },
        states: { empty: { localPos: { y: 0.1 } } },
      },
    ],
  });
  const at = (g) => recordsForDescriptor(d, TILE, POS, undefined, {}, null, null, true, g)[0];
  // Flat record path: localPos is emitted pre-scaled.
  assert.equal(at(0).localPos.y, 0.1, 'empty hangs low');
  assert.equal(at(1).localPos.y, 0.4, 'full rises to the authored spot');
  assert.equal(at(0.5).localPos.y, 0.25, 'midway');
});

// ── Nested matrix path ─────────────────────────────────────────────────────

test('growth: nested leaves lerp scale and color through the matrix path', () => {
  const d = treeDescriptor();
  const fruit = (g) =>
    recordsForDescriptor(d, TILE, POS, undefined, {}, null, null, true, g)
      .find((r) => r.partId === 'fruit');

  const empty = fruit(0);
  const full = fruit(1);
  const mid = fruit(0.5);

  assert.equal(empty.color, 0x7fa98a, 'unripe green at growth 0');
  assert.equal(full.color, 0xffb703, 'ripe amber at growth 1');
  assert.equal(mid.color, mixColor(0x7fa98a, 0xffb703, 0.5), 'color mixes by growth');

  // Matrix column 0 is the X scale (pre-multiplied by the item scale) — the
  // fruit shrinks by its empty keyframe scale.
  assert.equal(empty.matrix[0], d.scale * 0.3, 'empty X scale baked into the matrix');
  assert.equal(full.matrix[0], d.scale, 'full X scale baked into the matrix');
  assert.ok(mid.matrix[0] > empty.matrix[0] && mid.matrix[0] < full.matrix[0], 'size grows between states');
});

// ── stateTransform / stateColor unit behavior ─────────────────────────────

test('stateTransform: partial keyframes only lerp the listed fields', () => {
  const part = {
    transform: { y: 0.3, scaleX: 1, scaleY: 1, scaleZ: 1, rotY: 0.5 },
    states: { empty: { scaleY: 0.2 } },
  };
  const t = stateTransform(part, 0.5);
  assert.ok(Math.abs(t.scaleY - 0.6) < 1e-9, `scaleY lerps 0.2 → 1 (got ${t.scaleY})`);
  assert.equal(t.y, 0.3, 'unlisted y keeps the base');
  assert.equal(t.scaleX, 1, 'unlisted scaleX keeps the base');
  assert.equal(t.rotY, 0.5, 'unlisted rotY keeps the base');
});

test('stateTransform: growth >= 1 or absent returns the base transform unchanged', () => {
  const part = {
    transform: { y: 0.3, scaleY: 1 },
    states: { empty: { y: 0.1, scaleY: 0.2 } },
  };
  assert.equal(stateTransform(part, 1), part.transform, 'growth 1 returns the same object');
  assert.equal(stateTransform(part, undefined), part.transform, 'absent growth returns the same object');
  assert.equal(stateTransform(part, 2), part.transform, 'clamped growth returns the same object');
});

test('stateColor: token colors and absent keyframes pass through', () => {
  assert.equal(stateColor({ color: 'factionBase' }, 0), undefined, 'tokens are entity-path only');
  assert.equal(stateColor({ color: 0xffb703 }, 0), 0xffb703, 'no keyframe → authored color');
  const part = { color: 0xffb703, states: { empty: { color: 0x7fa98a } } };
  assert.equal(stateColor(part, 0), 0x7fa98a);
  assert.equal(stateColor(part, 0.5), mixColor(0x7fa98a, 0xffb703, 0.5));
  assert.equal(stateColor(part, 1), 0xffb703);
});

// ── Validation ─────────────────────────────────────────────────────────────

test('validation: states.empty accepts scale/y/localPos/color and rejects bad values', () => {
  const good = normalizeDescriptor({
    id: 'good-states',
    kind: 'feature',
    displayName: 'Good States',
    schemaVersion: 5,
    parts: [
      { id: 'a', shape: 'sphere', params: { radius: 0.1 }, color: 0xffb703, states: { empty: { scaleY: 0.2, y: 0.1, color: 0x7fa98a } } },
    ],
  });
  assert.deepEqual(validateDescriptor(good), []);

  const bad = normalizeDescriptor({
    id: 'bad-states',
    kind: 'feature',
    displayName: 'Bad States',
    schemaVersion: 5,
    parts: [
      { id: 'a', shape: 'sphere', params: { radius: 0.1 }, states: { empty: { scaleY: -1 } } },
      { id: 'b', shape: 'sphere', params: { radius: 0.1 }, states: { empty: { color: 0xfffffff } } },
      { id: 'c', shape: 'sphere', params: { radius: 0.1 }, states: { empty: { localPos: { x: 'up' } } } },
      { id: 'd', shape: 'sphere', params: { radius: 0.1 }, states: { full: { scaleY: 1 } } },
    ],
  });
  const errors = validateDescriptor(bad);
  assert.ok(errors.some((e) => e.includes('scaleY')), 'negative scale rejected');
  assert.ok(errors.some((e) => e.includes('color')), 'out-of-range color rejected');
  assert.ok(errors.some((e) => e.includes('localPos.x')), 'non-number localPos rejected');
  assert.ok(errors.some((e) => e.includes('unknown state "full"')), 'unknown keyframe rejected');

  const group = normalizeDescriptor({
    id: 'group-states',
    kind: 'feature',
    displayName: 'Group States',
    schemaVersion: 5,
    parts: [
      { id: 'g', children: [{ id: 'leaf', shape: 'sphere', params: { radius: 0.1 } }], states: { empty: {} } },
    ],
  });
  assert.ok(validateDescriptor(group).some((e) => e.includes('groups have no states')), 'groups reject states');
});
