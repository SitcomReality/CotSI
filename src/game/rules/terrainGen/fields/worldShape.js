/**
 * Shape the macro elevation envelope. Returns a multiplier in [0, 1].
 * Quadratic falloff: central peak, dropping to zero at the map border
 * (ocean ring). The steeper edge narrows the ring of tiles with near-zero
 * elevation, reducing the zero point-mass in the histogram.
 *
 * @param {number} distFromCenter - Hex distance from map center (0,0)
 * @param {number} radius         - Map radius in hexes
 * @returns {number} Multiplier in [0, 1]
 */
export function worldShape(distFromCenter, radius) {
  const falloff = 1.0 - ((distFromCenter / radius) ** 2);
  // Clamp at 0: beyond the map radius the multiplier would go negative,
  // and Math.pow(negative, 0.6) in sampleBaseFields yields NaN, poisoning
  // slope computation for border-ring hexes.
  return falloff < 0 ? 0 : falloff;
}
