// src/render/hexmap3d/featureUtils.js

/**
 * Deterministic pseudo-random number in [min, max) based on a seed.
 */
export function pseudoRandom(seed, min, max) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  const frac = x - Math.floor(x);
  return min + frac * (max - min);
}