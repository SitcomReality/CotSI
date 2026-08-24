/**
 * biomeDefault.js — 'Untouched' biome.
 * The default catch-all biome with vibrant temperate ecology.
 */

import { defineArchetype } from '../../archetypes.js';

defineArchetype('biome_default', {
  type: 'biome',
  id: 'biome_default',
  name: 'Untouched',
  origin: 'natural',

  // No climateRange — catch-all (last in priority, always matches)

  terrainRules: {
    // Inherits all DEFAULT_TERRAIN_RULES; override only if needed
  },

  // Features ordered by priority — first match wins.
  // blessedFont at high threshold (rare), then knot at the low end.
  features: [
    { kind: 'blessedFont',        threshold: 0.970, compare: 'gt', terrainOnly: ['forest', 'deepWood'] },
    { kind: 'vegetableLamb',      threshold: 0.925, compare: 'gt', terrainExclude: ['desert'], tier: 'T2' },
    { kind: 'witnessStone',       threshold: 0.910, compare: 'gt', terrainExclude: ['desert', 'marsh'], tier: 'T3' },
    { kind: 'treasureChest',              threshold: 0.900, compare: 'gt', terrainExclude: [], tier: 'T2' },
    { kind: 'screamroot',         threshold: 0.890, compare: 'gt', terrainExclude: ['desert'], tier: 'T3' },
    { kind: 'palimpsestSlab',     threshold: 0.875, compare: 'gt', terrainExclude: ['desert', 'marsh'], tier: 'T3' },
    { kind: 'gildedInitial',      threshold: 0.865, compare: 'gt', terrainExclude: ['desert', 'marsh'], tier: 'T3' },
    { kind: 'forge',              threshold: 0.015, compare: 'lt' },
    { kind: 'knot',               threshold: 0.038, compare: 'lt' },
  ],

  palette: {
    plains:        [0.455, 0.678, 0.365],  // vibrant meadow green
    forest:        [0.294, 0.557, 0.255],  // deep vivid forest
    deepWood:   [0.176, 0.420, 0.137],  // dark rich green
    desert:        [0.839, 0.694, 0.357],  // warm golden sand
    marsh:         [0.506, 0.600, 0.404],  // murky vibrant marsh
    hill:          [0.545, 0.659, 0.388],  // olive-green
    plateau:       [0.604, 0.565, 0.471],  // warm grey
    mountain:      [0.529, 0.486, 0.416],  // rocky warm gray
    water:         [0.157, 0.376, 0.545],  // #285f8b — deep ocean blue
    beach:         [0.878, 0.824, 0.627],  // warm golden sand
  },
  // Biome color swatches for terrain-decor tinting (decor-consolidation):
  // material-class colors — foliage/bloom/exotic are this biome's identity
  // colors; wood/soil/stone fall back to BIOME_COLOR_DEFAULTS unless
  // overridden here. Decor parts sample a swatch via a per-part influence
  // parameter, blended across hexes.
  colors: {
    foliage: [0.455, 0.678, 0.365], // #74ad5d — vibrant meadow green
    bloom: [0.839, 0.694, 0.357],   // #d6b15b — warm golden blossom
    exotic: [0.750, 0.280, 0.320],  // #bf474f — rose-berry accent
  },
  terrainTags: ['plains', 'beach', 'forest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'water'],
  weatherAffinity: ['temperate', 'rainy'],

  terrainElevation: null,
});
