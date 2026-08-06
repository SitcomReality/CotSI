/**
 * startingRegion.test.js — Eager starting-region chunk selection
 * (src/game/rules/terrainGen/startingRegion.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startingRegionChunkKeys } from '../../src/game/rules/terrainGen/startingRegion.js';
import { tileToChunk, chunkKey } from '../../src/engine/rules/chunkGrid.js';
import { STARTING_REGION_RADIUS } from '../../src/params/game/worldParams.js';

/** All in-map hex keys of a disc map, mapped to their chunk keys. */
function allMapChunkKeys(radius) {
  const set = new Set();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(-q - r) > radius) continue;
      const { cq, cr } = tileToChunk(q, r);
      set.add(chunkKey(cq, cr));
    }
  }
  return set;
}

test('STARTING_REGION_RADIUS is a sane eager radius', () => {
  assert.ok(STARTING_REGION_RADIUS >= 12, 'region spans more than half a chunk');
  assert.ok(STARTING_REGION_RADIUS <= 40, 'region stays a fraction of a large map');
});

test('small maps: the region covers every in-map chunk', () => {
  // Spawns sit near 0.6R, so at small radii every map hex is well inside the
  // region discs → generation stays fully eager, preserving classic behavior.
  const radius = 7;
  const targets = [
    { q: 4, r: 0 }, { q: 2, r: 3 }, { q: -2, r: 5 }, { q: -5, r: 2 },
    { q: -4, r: -3 }, { q: 0, r: -5 }, { q: 4, r: -2 },
  ];
  const region = startingRegionChunkKeys(targets, radius);
  for (const ck of allMapChunkKeys(radius)) {
    assert.ok(region.has(ck), `map chunk ${ck} must be in the region at small radius`);
  }
});

test('large maps: far-away chunks are excluded', () => {
  const radius = 200;
  const targets = [{ q: 100, r: 0 }, { q: 0, r: 100 }, { q: -100, r: 0 }, { q: 0, r: -100 }];
  const region = startingRegionChunkKeys(targets, radius);

  // Every target's own chunk is included
  for (const t of targets) {
    const { cq, cr } = tileToChunk(t.q, t.r);
    assert.ok(region.has(chunkKey(cq, cr)), `target chunk (${cq},${cr}) included`);
  }

  // Chunks far from every target are excluded
  assert.ok(!region.has(chunkKey(-4, -4)), 'distant corner chunk excluded');
  assert.ok(!region.has(chunkKey(9, 0)), 'chunk beyond the region disc excluded');
});

test('every region chunk touches the region disc of some target', () => {
  const radius = 200;
  const targets = [{ q: 100, r: 0 }, { q: -100, r: 50 }, { q: 20, r: -80 }];
  const region = startingRegionChunkKeys(targets, radius);

  for (const ck of region) {
    const [cq, cr] = ck.split(',').map(Number);
    let touches = false;
    for (const t of targets) {
      // Scan the chunk's hexes for one within the region radius of the target
      for (let lq = -12; lq < 12 && !touches; lq++) {
        for (let lr = -12; lr < 12 && !touches; lr++) {
          const q = cq * 24 + lq;
          const r = cr * 24 + lr;
          const s = -q - r;
          if (Math.abs(q) > radius || Math.abs(r) > radius || Math.abs(s) > radius) continue;
          const dq = q - t.q;
          const dr = r - t.r;
          const ds = dq + dr;
          const dist = (Math.abs(dq) + Math.abs(ds) + Math.abs(dr)) / 2;
          if (dist <= STARTING_REGION_RADIUS) touches = true;
        }
      }
    }
    assert.ok(touches, `chunk ${ck} must touch some region disc`);
  }
});

test('empty targets produce an empty region (gameFactory falls back to center)', () => {
  assert.equal(startingRegionChunkKeys([], 50).size, 0);
});

test('region selection is deterministic', () => {
  const targets = [{ q: 60, r: -20 }, { q: -30, r: 50 }];
  const a = startingRegionChunkKeys(targets, 150);
  const b = startingRegionChunkKeys(targets, 150);
  assert.deepEqual([...a].sort(), [...b].sort());
});
