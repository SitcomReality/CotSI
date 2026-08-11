/**
 * hexProjection.test.js — Minimap projection math
 * (src/engine/rules/hexProjection.js): the 1px/hex scale floor, fit vs.
 * champion-centered window selection, and the pixel→hex inverse projection.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HEX_RADIUS,
  HEX_SPACING,
  rotatedPoint,
  computeMinimapProjection,
  pixelToHex,
} from '../../../src/engine/rules/hexProjection.js';
import {
  MINIMAP_SIZE,
  MINIMAP_PADDING,
  MINIMAP_MIN_HEX_PX,
} from '../../../src/params/render/minimapParams.js';

const MIN_SCALE = MINIMAP_MIN_HEX_PX / HEX_SPACING;
const AVAIL = MINIMAP_SIZE - MINIMAP_PADDING * 2;

function close(actual, expected, eps = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= eps, `${actual} !~ ${expected}`);
}

test('rotatedPoint: origin hex maps to the origin', () => {
  const p = rotatedPoint(0, 0);
  close(p.x, 0);
  close(p.z, 0);
});

test('rotatedPoint: hex (1,0) center rotated by the camera yaw (30°)', () => {
  // World center (√3, 0); rotating CCW by π/6 gives (√3·cos30, √3·sin30).
  const p = rotatedPoint(1, 0);
  close(p.x, Math.sqrt(3) * Math.cos(Math.PI / 6));
  close(p.z, Math.sqrt(3) * Math.sin(Math.PI / 6));
});

test('computeMinimapProjection: huge explored map pins at the 1px/hex floor (windowed)', () => {
  const bounds = { minX: -5000, maxX: 5000, minZ: -5000, maxZ: 5000 };
  const proj = computeMinimapProjection(bounds, { x: 10, z: -4 });
  assert.equal(proj.windowed, true);
  close(proj.scale, MIN_SCALE);
  // The window is centered on the champion
  close(proj.offsetX, 10 - AVAIL / (2 * MIN_SCALE));
  close(proj.offsetZ, -4 - AVAIL / (2 * MIN_SCALE));
  assert.ok(proj.scale >= MIN_SCALE);
});

test('computeMinimapProjection: small explored map fits, centered on the map', () => {
  const bounds = { minX: 0, maxX: 5, minZ: 0, maxZ: 5 };
  const proj = computeMinimapProjection(bounds, null);
  assert.equal(proj.windowed, false);
  assert.ok(proj.scale > MIN_SCALE);
  const w = 5 + HEX_RADIUS * 2;
  const h = 5 + HEX_RADIUS * 2;
  close(proj.scale, Math.min(AVAIL / w, AVAIL / h));
  close(proj.offsetX, -HEX_RADIUS);
  close(proj.offsetZ, -HEX_RADIUS);
});

test('computeMinimapProjection: a map that exactly fits stays in fit mode', () => {
  const span = AVAIL / MIN_SCALE - HEX_RADIUS * 2;
  const bounds = { minX: 0, maxX: span, minZ: 0, maxZ: span };
  const proj = computeMinimapProjection(bounds, { x: 3, z: 3 });
  assert.equal(proj.windowed, false);
  close(proj.scale, MIN_SCALE);
});

test('computeMinimapProjection: no explored bounds → windowed, centered on champion', () => {
  const proj = computeMinimapProjection(null, { x: 12, z: 7 });
  assert.equal(proj.windowed, true);
  close(proj.scale, MIN_SCALE);
  close(proj.offsetX, 12 - AVAIL / (2 * MIN_SCALE));
  close(proj.offsetZ, 7 - AVAIL / (2 * MIN_SCALE));
});

test('computeMinimapProjection: no bounds and no champion → windowed at origin', () => {
  const proj = computeMinimapProjection(null, null);
  assert.equal(proj.windowed, true);
  close(proj.offsetX, -AVAIL / (2 * MIN_SCALE));
  close(proj.offsetZ, -AVAIL / (2 * MIN_SCALE));
});

test('computeMinimapProjection: scale never drops below the 1px/hex floor', () => {
  for (const span of [0.1, 1, 10, 100, 1000, 10000]) {
    const bounds = { minX: -span, maxX: span, minZ: -span, maxZ: span };
    const proj = computeMinimapProjection(bounds, null);
    assert.ok(proj.scale >= MIN_SCALE - 1e-12, `span ${span}: scale ${proj.scale}`);
  }
});

test('pixelToHex: round-trips projected hex centers in fit mode', () => {
  const bounds = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
  const proj = computeMinimapProjection(bounds, { x: 0, z: 0 });
  const hexes = [
    { q: 0, r: 0 },
    { q: 3, r: -1 },
    { q: -4, r: 2 },
    { q: 12, r: 7 },
    { q: -9, r: -5 },
  ];
  for (const h of hexes) {
    const { x, z } = rotatedPoint(h.q, h.r);
    const px = (x - proj.offsetX) * proj.scale + MINIMAP_PADDING;
    const py = (z - proj.offsetZ) * proj.scale + MINIMAP_PADDING;
    assert.deepEqual(pixelToHex(px, py, proj), h, `round-trip ${h.q},${h.r}`);
  }
});

test('pixelToHex: windowed projection places the champion dead-center', () => {
  const bounds = { minX: -5000, maxX: 5000, minZ: -5000, maxZ: 5000 };
  const champ = rotatedPoint(5, -3);
  const proj = computeMinimapProjection(bounds, champ);
  assert.equal(proj.windowed, true);
  const { x, z } = rotatedPoint(5, -3);
  const px = (x - proj.offsetX) * proj.scale + MINIMAP_PADDING;
  const py = (z - proj.offsetZ) * proj.scale + MINIMAP_PADDING;
  close(px, MINIMAP_SIZE / 2, 1e-6);
  close(py, MINIMAP_SIZE / 2, 1e-6);
  assert.deepEqual(pixelToHex(px, py, proj), { q: 5, r: -3 });
});
