import { seededNoise } from '../../../../engine/rules/seededRng.js';
import {
  KNOT_BASE_AMOUNT, KNOT_AMOUNT_VARIATION_SCALE, KNOT_AMOUNT_VARIATION_MOD,
} from '../../../../params/game/worldParams.js';

export function spawnFeature(roll, terrain, features) {
  for (const rule of features) {
    if (rule.terrainExclude && rule.terrainExclude.includes(terrain)) continue;

    let matched = false;
    if (rule.compare === 'gt' && roll > rule.threshold) matched = true;
    else if (rule.compare === 'lt' && roll < rule.threshold) matched = true;

    if (!matched) continue;

    switch (rule.kind) {
      case 'tree':
      case 'largeTree': {
        const density = terrain === 'forest' || terrain === 'denseForest' ? 'dense'
          : terrain === 'plains' ? 'medium' : 'sparse';
        return { kind: rule.kind, density };
      }
      case 'fruitTree': {
        const density = terrain === 'forest' || terrain === 'denseForest' ? 'dense'
          : terrain === 'plains' ? 'medium' : 'sparse';
        return { kind: 'fruitTree', nextFruitDay: 1, ripe: true, density };
      }
      case 'knot':
        return {
          kind: 'knot', mined: false,
          amount: KNOT_BASE_AMOUNT + Math.floor(roll * KNOT_AMOUNT_VARIATION_SCALE) % KNOT_AMOUNT_VARIATION_MOD,
        };
      case 'bush':
        return { kind: 'bush' };
      case 'vine':
        return { kind: 'vine' };
      default:
        return { kind: rule.kind };
    }
  }

  return null;
}
