/**
 * hillFloor.test.js — Hill stacking floor height
 * (src/render/hexmap3d/worldObjects/hillFloor.js): the per-tile peak height an
 * object stands on, derived from the hill descriptor record.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hillPeakHeight, hillFloorY } from '../../../src/render/hexmap3d/worldObjects/hillFloor.js';
import { tileSurfaceY } from '../../../src/render/hexmap3d/terrain/index.js';

test('hillPeakHeight: zero off-hill, positive and deterministic on hill', () => {
  assert.equal(hillPeakHeight({ terrain: 'plains', q: 3, r: -2 }), 0);
  const hill = { terrain: 'hill', q: 3, r: -2 };
  const peak = hillPeakHeight(hill);
  assert.ok(peak > 0, `peak height ${peak}`);
  assert.equal(peak, hillPeakHeight({ ...hill }), 'deterministic per tile');
});

test('hillFloorY: peak above the surface on hills, surface elsewhere', () => {
  const hill = { terrain: 'hill', q: 3, r: -2 };
  assert.ok(Math.abs(hillFloorY(hill) - (tileSurfaceY(hill) + hillPeakHeight(hill))) < 1e-9);
  const plains = { terrain: 'plains', q: 3, r: -2 };
  assert.equal(hillFloorY(plains), tileSurfaceY(plains));
});
