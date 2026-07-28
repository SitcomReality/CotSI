/**
 * Shape the macro elevation envelope. Returns a multiplier in [0, 1].
 * Default: center peak, dropping to zero at the map border (ocean ring).
 *
 * @param {number} distFromCenter - Hex distance from map center (0,0)
 * @param {number} radius         - Map radius in hexes
 * @returns {number} Multiplier in [0, 1]
 */
export function worldShape(distFromCenter, radius) {
  return 1.0 - (distFromCenter / radius);
}
