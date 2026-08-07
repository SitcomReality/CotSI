import {
  KNOT_BASE_AMOUNT, KNOT_AMOUNT_VARIATION_SCALE, KNOT_AMOUNT_VARIATION_MOD,
} from '../../../../params/game/worldParams.js';
import {
  CHEST_GOLD_BASE, CHEST_GOLD_VARIATION_SCALE, CHEST_GOLD_VARIATION_MOD,
} from '../../../../params/game/economyParams.js';

/**
 * Attempt to spawn a feature on a tile.
 *
 * Iterates biome feature rules in priority order. For each rule, the noise
 * threshold is modulated by the tile's continuous density — higher density
 * lowers the effective threshold, making features more likely.
 *
 * Terrain gating is either negative (`terrainExclude` — skip listed terrains)
 * or positive (`terrainOnly` — only spawn on listed terrains); both may be
 * combined on one rule.
 *
 * @param {number} roll    - Seeded noise value [0, 1] for this tile
 * @param {string} terrain - Terrain type string
 * @param {number} density - Continuous feature density [0, 1] from featureDensity()
 * @param {object[]} features - Ordered list of feature spawn rules
 * @returns {object|null} Feature object with `kind` and `density`, or null
 */
export function spawnFeature(roll, terrain, density, features) {
  for (const rule of features) {
    if (rule.terrainExclude && rule.terrainExclude.includes(terrain)) continue;
    if (rule.terrainOnly && !rule.terrainOnly.includes(terrain)) continue;

    // Density modulates the threshold: higher density → effective threshold is lower
    // e.g., threshold 0.935 with density 0.8 → effective threshold 0.935 * (1 - 0.8 * 0.5) = 0.561
    const densityMod = 1.0 - density * 0.5;
    const effectiveThreshold = rule.threshold * densityMod;

    let matched = false;
    if (rule.compare === 'gt' && roll > effectiveThreshold) matched = true;
    else if (rule.compare === 'lt' && roll < effectiveThreshold) matched = true;

    if (!matched) continue;

    switch (rule.kind) {
      case 'tree':
      case 'largeTree':
        return { kind: rule.kind, density };
      case 'fruitTree':
        return { kind: 'fruitTree', nextFruitDay: 1, ripe: true, density };
      case 'knot':
        return {
          kind: 'knot', mined: false, density,
          amount: KNOT_BASE_AMOUNT + Math.floor(roll * KNOT_AMOUNT_VARIATION_SCALE) % KNOT_AMOUNT_VARIATION_MOD,
        };
      case 'chest':
        return {
          kind: 'chest', density,
          amount: CHEST_GOLD_BASE + Math.floor(roll * CHEST_GOLD_VARIATION_SCALE) % CHEST_GOLD_VARIATION_MOD,
        };
      case 'bush':
        return { kind: 'bush', density };
      case 'vine':
        return { kind: 'vine', density };
      default: {
        const feature = { kind: rule.kind, density };
        if (rule.state) Object.assign(feature, rule.state);
        return feature;
      }
    }
  }

  return null;
}
