/**
 * unitSignature.test.js — the unit-mesh reuse signature
 * (collectUnitInstances in units/unitMeshes.js). Everything that changes the
 * built unit meshes must change the signature; nothing else (visible iteration
 * order) may, or the renderer would rebuild meshes for no reason.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectUnitInstances } from '../../../src/render/hexmap3d/units/unitMeshes.js';

function state(overrides = {}) {
  return {
    tiles: {
      '0,0': { q: 0, r: 0, terrain: 'plains' },
      '1,0': { q: 1, r: 0, terrain: 'plains' },
    },
    champions: [{ id: 'c1', pos: { q: 0, r: 0 }, faction: 0 }],
    mobs: [],
    traders: [],
    ...overrides,
  };
}

const sig = (s, visible, animating = new Set()) => collectUnitInstances(s, visible, animating).signature;

test('identical inputs produce an identical signature', () => {
  const visible = new Set(['0,0', '1,0']);
  assert.equal(sig(state(), visible), sig(state(), visible));
});

test('visible iteration order does not change the signature', () => {
  const s = state({
    champions: [
      { id: 'c1', pos: { q: 0, r: 0 }, faction: 0 },
      { id: 'c2', pos: { q: 1, r: 0 }, faction: 5 },
    ],
  });
  assert.equal(sig(s, new Set(['0,0', '1,0'])), sig(s, new Set(['1,0', '0,0'])));
});

test('a champion move changes the signature', () => {
  const moved = state({ champions: [{ id: 'c1', pos: { q: 1, r: 0 }, faction: 0 }] });
  const visible = new Set(['0,0', '1,0']);
  assert.notEqual(sig(state(), visible), sig(moved, visible));
});

test('a faction change changes the signature', () => {
  const other = state({ champions: [{ id: 'c1', pos: { q: 0, r: 0 }, faction: 5 }] });
  const visible = new Set(['0,0']);
  assert.notEqual(sig(state(), visible), sig(other, visible));
});

test('a visibility change changes the signature', () => {
  const s = state({
    champions: [
      { id: 'c1', pos: { q: 0, r: 0 }, faction: 0 },
      { id: 'c2', pos: { q: 1, r: 0 }, faction: 5 },
    ],
  });
  assert.notEqual(sig(s, new Set(['0,0', '1,0'])), sig(s, new Set(['0,0'])));
});

test('an animating champion drops out of the signature', () => {
  const s = state();
  const visible = new Set(['0,0']);
  assert.notEqual(sig(s, visible), sig(s, visible, new Set(['c1'])));
});

test('a tile elevation change under a unit changes the signature', () => {
  const raised = state({
    tiles: {
      '0,0': { q: 0, r: 0, terrain: 'plains', elevation: 2 },
      '1,0': { q: 1, r: 0, terrain: 'plains' },
    },
  });
  const visible = new Set(['0,0']);
  assert.notEqual(sig(state(), visible), sig(raised, visible));
});

test('mob archetype and scale changes change the signature', () => {
  const base = { id: 'm1', pos: { q: 0, r: 0 }, faction: 1, archetypeName: 'infernalpaca', visualScale: 1 };
  const visible = new Set(['0,0']);
  const a = state({ champions: [], mobs: [base] });
  const b = state({ champions: [], mobs: [{ ...base, archetypeName: 'scorpelican' }] });
  const c = state({ champions: [], mobs: [{ ...base, visualScale: 1.5 }] });
  assert.notEqual(sig(a, visible), sig(b, visible));
  assert.notEqual(sig(a, visible), sig(c, visible));
});
