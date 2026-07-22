/**
 * spawnPosition.js — Radial coordinate math for faction base placement.
 * Computes a polar-to-hex spawn target with ring distance and angular jitter.
 */

/**
 * Compute a target hex coordinate for a champion's base, radially distributed.
 *
 * @param {number}  i      - Index of the champion (0-based)
 * @param {number}  N      - Total number of champions
 * @param {Function} rand   - Seeded RNG function returning [0, 1)
 * @param {number}  radius - Map radius in hexes
 * @returns {{ q: number, r: number }} Target axial coordinate
 */
export function spawnTarget(i, N, rand, radius) {
  const basesRing = Math.max(2, Math.floor(radius * 0.45));
  const basesJitter = Math.max(1, Math.floor(radius * 0.15));
  const wedgeSize = (2 * Math.PI) / N;

  const ring = Math.max(2, Math.min(radius - 2,
    basesRing + Math.floor((rand() - 0.5) * 2 * basesJitter)));

  const angle = (i / N) * 2 * Math.PI + (rand() - 0.5) * wedgeSize * 0.5;

  return {
    q: Math.round(ring * Math.cos(angle)),
    r: Math.round(ring * Math.sin(angle)),
  };
}
