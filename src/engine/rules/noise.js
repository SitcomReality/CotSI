/**
 * noise.js — Seeded simplex noise (2D) and FBM for terrain generation.
 * Pure: no side effects, no project imports beyond seededRng.js.
 *
 * Simplex 2D provides smooth, spatially-continuous noise suitable for
 * elevation, moisture, and biome fields. The permutation table is
 * seeded deterministically so the same seed always produces the same
 * noise.
 *
 * FBM (Fractional Brownian Motion) layers multiple octaves of simplex
 * noise to produce natural-looking terrain with detail at multiple scales.
 */
import { stringSeed } from './seededRng.js';

// ---------------------------------------------------------------------------
// Permutation table (seeded)
// ---------------------------------------------------------------------------

/** @type {Map<number, Uint8Array>} */
const _permCache = new Map();

/** Max seeded permutation tables cached; oldest evicted on overflow (LRU-ish). */
const PERM_CACHE_MAX = 64;

/**
 * Build or retrieve a seeded permutation table (512 entries).
 * @param {number} seed - Integer seed from stringSeed()
 * @returns {Uint8Array} 512-byte permutation table
 */
function _getPerm(seed) {
  let perm = _permCache.get(seed);
  if (perm) return perm;

  // Build 256-element base table [0..255]
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;

  // Fisher-Yates shuffle deterministic on seed
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 13), 1274126177);
    s ^= s >>> 16;
    const j = (s >>> 0) % (i + 1);
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }

  // Double for wrap-free lookups
  perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  // Bound the cache: Map preserves insertion order, so evict the oldest seed
  if (_permCache.size >= PERM_CACHE_MAX) {
    _permCache.delete(_permCache.keys().next().value);
  }
  _permCache.set(seed, perm);
  return perm;
}

// ---------------------------------------------------------------------------
// Simplex 2D
// ---------------------------------------------------------------------------

/** Skew factor for 2D simplex */
const _F2 = 0.5 * (Math.sqrt(3) - 1);
/** Unskew factor for 2D simplex */
const _G2 = (3 - Math.sqrt(3)) / 6;

/** Gradient lookup for 2D simplex (8 directions). */
const _GRAD2 = [
  [ 1,  0], [-1,  0], [ 0,  1], [ 0, -1],
  [ 1,  1], [-1,  1], [ 1, -1], [-1, -1],
];

/**
 * 2D simplex noise at position (x, y).
 * Returns a value in [-1, 1].
 *
 * @param {number} x
 * @param {number} y
 * @param {Uint8Array} perm - Seeded 512-entry permutation table
 * @returns {number}
 */
function _simplex2D(x, y, perm) {
  let s = (x + y) * _F2;
  let i = Math.floor(x + s);
  let j = Math.floor(y + s);
  let t = (i + j) * _G2;
  let X0 = i - t;
  let Y0 = j - t;
  let x0 = x - X0;
  let y0 = y - Y0;

  // i1, j1 — which simplex corner
  let i1, j1;
  if (x0 > y0) {
    i1 = 1; j1 = 0;
  } else {
    i1 = 0; j1 = 1;
  }

  let x1 = x0 - i1 + _G2;
  let y1 = y0 - j1 + _G2;
  let x2 = x0 - 1 + 2 * _G2;
  let y2 = y0 - 1 + 2 * _G2;

  // Hash corners
  let ii = i & 255;
  let jj = j & 255;
  let gi0 = perm[ii + perm[jj]] & 7;
  let gi1 = perm[ii + i1 + perm[jj + j1]] & 7;
  let gi2 = perm[ii + 1 + perm[jj + 1]] & 7;

  // Corner contributions
  let n0 = 0, n1 = 0, n2 = 0;

  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    t0 *= t0;
    n0 = t0 * t0 * (_GRAD2[gi0][0] * x0 + _GRAD2[gi0][1] * y0);
  }

  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    t1 *= t1;
    n1 = t1 * t1 * (_GRAD2[gi1][0] * x1 + _GRAD2[gi1][1] * y1);
  }

  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    t2 *= t2;
    n2 = t2 * t2 * (_GRAD2[gi2][0] * x2 + _GRAD2[gi2][1] * y2);
  }

  // Normalize to [-1, 1] (empirical scale factor for 2D simplex)
  return 70 * (n0 + n1 + n2);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert axial hex coordinates (q, r) to world-space (x, y).
 */
export function hexToWorld(q, r) {
  return { x: q + r * 0.5, y: r * 0.8660254037844386 };
}

/**
 * Fractional Brownian Motion (2D).
 * Sums multiple octaves of simplex noise for a natural, multi-scale result.
 *
 * @param {number} x   - World-space x
 * @param {number} y   - World-space y
 * @param {number|string} seed - Integer seed or seed string (will be hashed)
 * @param {object} [opts]
 * @param {number} [opts.octaves=4]     - Number of octaves
 * @param {number} [opts.lacunarity=2]  - Frequency multiplier per octave
 * @param {number} [opts.gain=0.5]      - Amplitude multiplier per octave
 * @param {number} [opts.frequency=0.01]- Base frequency
 * @returns {number} - Value in [0, 1]
 */
export function fbm2D(x, y, seed, opts = {}) {
  const seedInt = typeof seed === 'number' ? seed : stringSeed(seed);
  const octaves    = opts.octaves    ?? 4;
  const lacunarity = opts.lacunarity ?? 2;
  const gain       = opts.gain       ?? 0.5;
  const frequency  = opts.frequency  ?? 0.01;

  const perm = _getPerm(seedInt);

  let value = 0;
  let amp = 1;
  let maxAmp = 0;
  let freq = frequency;

  for (let i = 0; i < octaves; i++) {
    value += amp * _simplex2D(x * freq, y * freq, perm);
    maxAmp += amp;
    amp *= gain;
    freq *= lacunarity;
  }

  // Map [-1, 1] → [0, 1]
  return (value / maxAmp + 1) / 2;
}

/**
 * Convenience: sample FBM at a hex coordinate's world-space position.
 */
export function hexFbm2D(q, r, seed, opts = {}) {
  const { x, y } = hexToWorld(q, r);
  return fbm2D(x, y, seed, opts);
}

/**
 * Ridged Fractional Brownian Motion (2D).
 *
 * Standard FBM sums octaves of simplex noise — produces rounded, rolling terrain.
 * Ridged FBM takes |noise| at each octave and inverts, producing sharp ridges
 * where the unmodified noise crosses zero.
 *
 * @param {number} x   - World-space x
 * @param {number} y   - World-space y
 * @param {number} seed - Integer seed
 * @param {object} [opts]
 * @param {number} [opts.octaves=4]
 * @param {number} [opts.lacunarity=2]
 * @param {number} [opts.gain=0.5]
 * @param {number} [opts.frequency=0.01]
 * @param {number} [opts.offset=1.0]  - Vertical offset to shift ridges above zero
 * @returns {number} - Value in [0, 1]
 */
export function ridgedFbm2D(x, y, seed, opts = {}) {
  const seedInt = typeof seed === 'number' ? seed : stringSeed(seed);
  const octaves    = opts.octaves    ?? 4;
  const lacunarity = opts.lacunarity ?? 2;
  const gain       = opts.gain       ?? 0.5;
  const frequency  = opts.frequency  ?? 0.01;
  const offset     = opts.offset     ?? 1.0;

  const perm = _getPerm(seedInt);

  let value = 0;
  let amp = 1;
  let maxAmp = 0;
  let freq = frequency;
  let weight = 1;

  for (let i = 0; i < octaves; i++) {
    let n = _simplex2D(x * freq, y * freq, perm);

    // Absolute value creates sharp ridge at zero-crossings
    n = Math.abs(n);
    // Invert so ridges point upward: offset - |n|
    n = offset - n;
    // Square to sharpen ridges further
    n = n * n * weight;

    // Weight successive octaves by the previous octave's value
    weight = n;

    value += n * amp;
    maxAmp += amp;
    amp *= gain;
    freq *= lacunarity;
  }

  // Normalize to [0, 1]
  // maxAmp is sum of amplitudes (1 + gain + gain² + ...) ≈ 2.0 for gain=0.5
  // offset=1.0 gives output roughly in [-1, 1] per octave before squaring
  const raw = (value / maxAmp + offset - 1) / offset;
  return raw < 0 ? 0 : raw > 1 ? 1 : raw;
}

/**
 * Convenience: sample ridged FBM at a hex coordinate's world-space position.
 */
export function hexRidgedFbm2D(q, r, seed, opts = {}) {
  const { x, y } = hexToWorld(q, r);
  return ridgedFbm2D(x, y, seed, opts);
}
