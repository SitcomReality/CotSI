/**
 * spawnPosition.js — Radial coordinate math for faction base placement.
 * Computes a polar-to-hex spawn target with ring distance and angular jitter.
 *
 * Hex axial coordinates are NOT Cartesian — the q and r axes are 60° apart.
 * To generate hex positions from polar (ring, angle), we convert to world
 * space first, then invert through the hex projection, then cube-round to
 * the nearest valid hex. This guarantees the result is at the correct
 * hex-distance from center regardless of angle.
 */
import { cubeRound } from '../../engine/rules/hexGrid.js';
import { SPAWN_RING_FRACTION, SPAWN_RING_REFERENCE_RADIUS, SPAWN_RING_RADIUS_SCALE, SPAWN_RING_FRACTION_MAX, MIN_SPAWN_RING, SPAWN_JITTER_FRACTION, MIN_SPAWN_JITTER, SPAWN_EDGE_MARGIN, SPAWN_EDGE_MARGIN_FRACTION, ANGULAR_JITTER_FRACTION } from '../../params/game/spawnParams.js';

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
  const edgeMargin = Math.max(SPAWN_EDGE_MARGIN, Math.floor(radius * SPAWN_EDGE_MARGIN_FRACTION));
  const ringFraction = Math.min(
    SPAWN_RING_FRACTION + Math.max(0, radius - SPAWN_RING_REFERENCE_RADIUS) * SPAWN_RING_RADIUS_SCALE,
    SPAWN_RING_FRACTION_MAX
  );
  const basesRing = Math.max(MIN_SPAWN_RING, Math.floor(radius * ringFraction));
  const basesJitter = Math.max(MIN_SPAWN_JITTER, Math.floor(radius * SPAWN_JITTER_FRACTION));
  const wedgeSize = (2 * Math.PI) / N;

  const ring = Math.max(MIN_SPAWN_RING, Math.min(radius - edgeMargin,
    basesRing + Math.floor((rand() - 0.5) * 2 * basesJitter)));

  const angle = (i / N) * 2 * Math.PI + (rand() - 0.5) * wedgeSize * ANGULAR_JITTER_FRACTION;

  // Convert polar (ring, angle) to a position in world space, then invert
  // through the hex projection to get fractional axial coords, then snap
  // to the nearest valid hex via cube rounding.
  const wx = Math.sqrt(3) * ring * Math.cos(angle);
  const wy = Math.sqrt(3) * ring * Math.sin(angle);
  const rf = wy / 1.5;
  const qf = wx / Math.sqrt(3) - rf / 2;
  return cubeRound(qf, rf);
}
