import { seededNoise } from '../../../../engine/rules/seededRng.js';
import {
  KNOT_BASE_AMOUNT, KNOT_AMOUNT_VARIATION_SCALE, KNOT_AMOUNT_VARIATION_MOD,
  FEATURE_TIERS, NOISE_CHANNEL_FEATURE_TIER,
} from '../../../../params/game/worldParams.js';
import {
  CHEST_GOLD_BASE, CHEST_GOLD_VARIATION_SCALE, CHEST_GOLD_VARIATION_MOD,
} from '../../../../params/game/economyParams.js';

/**
 * Normalized distance of a hex from the map center (0 = center, 1 = edge).
 *
 * @param {number} q      - Axial q
 * @param {number} r      - Axial r
 * @param {number} radius - Map radius in hexes
 * @returns {number} value in [0, 1]
 */
export function centerDistance01(q, r, radius) {
  const d = (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2;
  return radius > 0 ? Math.min(1, d / radius) : 0;
}

/**
 * Acceptance gate for a feature tier at a given distance from the map center.
 *
 * Returns the probability that a tier-gated rule passes at `dist01`: 1.0 at
 * the center, `tier.gate` at the map edge, and 0 beyond the tier's `inner`
 * radius (T4 is therefore center-only). A missing or unknown tier behaves as
 * T1, which always accepts — untiered rules are uniform.
 *
 * @param {string} [tier] - 'T1'..'T4'; undefined/unknown → T1
 * @param {number} dist01 - normalized distance from the map center [0, 1]
 * @param {object} [tiers] - tier table (FEATURE_TIERS by default)
 * @returns {number} acceptance in [0, 1]
 */
export function tierAcceptance(tier, dist01, tiers = FEATURE_TIERS) {
  const t = tiers[tier] ?? tiers.T1;
  if (dist01 > t.inner) return 0;
  const x = dist01 / t.inner; // 0 at center → 1 at the inner boundary
  return t.gate + (1 - t.gate) * (1 - x);
}

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
 * Tiered banding (featureDesign.md §3): when `options.seed` is given, each
 * rule's `tier` gate is rolled separately. A rejected gate makes the rule
 * yield to the next one, so better (higher-tier) features are rarer toward
 * the map edge and more common toward the center. Without options the gate is
 * skipped and every rule behaves as T1 (uniform) — the legacy behavior.
 *
 * @param {number} roll    - Seeded noise value [0, 1] for this tile
 * @param {string} terrain - Terrain type string
 * @param {number} density - Continuous feature density [0, 1] from featureDensity()
 * @param {object[]} features - Ordered list of feature spawn rules
 * @param {object} [options] - Optional tier-banding context
 * @param {number} [options.seed] - Integer seed (stringSeed output); enables tier gating
 * @param {number} [options.q]    - Tile axial q (per-rule gate roll input)
 * @param {number} [options.r]    - Tile axial r (per-rule gate roll input)
 * @param {number} [options.dist01] - Normalized distance from the map center [0, 1]
 * @returns {object|null} Feature object with `kind` and `density`, or null
 */
export function spawnFeature(roll, terrain, density, features, options = {}) {
  const { seed, q = 0, r = 0, dist01 = 0 } = options;
  for (let i = 0; i < features.length; i++) {
    const rule = features[i];
    if (rule.terrainExclude && rule.terrainExclude.includes(terrain)) continue;
    if (rule.terrainOnly && !rule.terrainOnly.includes(terrain)) continue;

    // Tiered banding: a per-rule acceptance gate suppresses better features
    // away from the map center. On rejection the rule yields to the next one,
    // so a more common feature can still claim the tile toward the edge.
    if (seed !== undefined) {
      const gate = tierAcceptance(rule.tier, dist01);
      if (gate < 1) {
        const gateRoll = seededNoise(seed, q, r, NOISE_CHANNEL_FEATURE_TIER + i);
        if (gateRoll > gate) continue;
      }
    }

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
      default: {
        const feature = { kind: rule.kind, density };
        if (rule.state) Object.assign(feature, rule.state);
        return feature;
      }
    }
  }

  return null;
}
