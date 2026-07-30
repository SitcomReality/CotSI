/**
 * biomes.js — Biome archetype definitions.
 *
 * Each biome defines:
 *   type:                   'biome'
 *   name:                   Display name shown in setup UI
 *   terrainRules:           Flat noise thresholds (e.g. forestMinMoisture, mountainThreshold).
 *                           Merged on top of DEFAULT_TERRAIN_RULES; override selectively.
 *   features:               Ordered list of feature spawn rules (replaces featureFrequencies).
 *                           Each entry: { kind, threshold, compare, terrainExclude? }.
 *                           First matching rule on the noise roll wins.
 *     kind:            Feature archetype kind ('tree', 'fruitTree', 'knot', 'bush', etc.)
 *     threshold:       Noise threshold value
 *     compare:         'gt' = roll > threshold, 'lt' = roll < threshold
 *     terrainExclude:  Terrain types that can't host this feature
 *   palette:               RGB color tuples that override the default TERRAIN_COLOR in terrainMesh.js
 *   terrainTags:           Terrain types this biome supports
 *   weatherAffinity:       Weather types this biome is most associated with
 *   terrainElevation:      (optional) Per-terrain height overrides (Y offset).
 *                          Falls back to TERRAIN_ELEVATION defaults.
 *   origin:                'natural' | 'supernatural' — how this biome is placed.
 *   climateRange:          (natural only) Climate constraints for biome selection.
 *   supportsFloatingIslands: (optional) Whether this biome can contain floating-island terrain.
 */

import { defineArchetype } from '../archetypes.js';

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
  // fruitTree at high threshold (rare), tree at medium threshold (common),
  // then knot at the low end.
  features: [
    { kind: 'fruitTree',          threshold: 0.970, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'tree',               threshold: 0.935, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'vegetableLamb',      threshold: 0.925, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'witnessStone',       threshold: 0.910, compare: 'gt', terrainExclude: ['desert', 'marsh'] },
    { kind: 'screamroot',         threshold: 0.890, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'palimpsestSlab',     threshold: 0.875, compare: 'gt', terrainExclude: ['desert', 'marsh'] },
    { kind: 'gildedInitial',      threshold: 0.865, compare: 'gt', terrainExclude: ['desert', 'marsh'] },
    { kind: 'placeholderCypress', threshold: 0.850, compare: 'gt', terrainExclude: ['desert', 'forest', 'marsh'] },
    { kind: 'knot',               threshold: 0.038, compare: 'lt' },
  ],

  palette: {
    plains:        [0.455, 0.678, 0.365],  // vibrant meadow green
    forest:        [0.294, 0.557, 0.255],  // deep vivid forest
    denseForest:   [0.176, 0.420, 0.137],  // dark rich green
    desert:        [0.839, 0.694, 0.357],  // warm golden sand
    marsh:         [0.506, 0.600, 0.404],  // murky vibrant marsh
    hill:          [0.545, 0.659, 0.388],  // olive-green
    plateau:       [0.604, 0.565, 0.471],  // warm grey
    mountain:      [0.529, 0.486, 0.416],  // rocky warm gray
    peak:          [0.690, 0.729, 0.784],  // pale snowy rock
    floatingIsland:[0.753, 0.847, 0.910],  // pale cyan-white
    water:         [0.373, 0.604, 0.757],  // bright cyan-blue
  },
  terrainTags: ['plains', 'forest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'floatingIsland', 'water'],
  weatherAffinity: ['temperate', 'rainy'],

  terrainElevation: null,
  supportsFloatingIslands: false,
});

defineArchetype('biome_brass_grave', {
  type: 'biome',
  id: 'biome_brass_grave',
  name: 'Brass Grave',
  origin: 'supernatural',

  epicenter: {
    radius:       12,
    radiusNoise:  0.30,
    noiseScale:   0.04,
  },

  fieldModifiers: {
    elevationOffset:    -0.05,
    moistureMultiplier:  0.50,
    temperatureOffset:  -0.15,
  },

  terrainRules: {
    mountainThreshold:  0.85,
    forestMinMoisture:  0.92,
    desertMaxMoisture:  0.45,
    waterMaxElevation:  0.06,
  },

  features: [
    // Rare unique features
    { kind: 'volvelle',       threshold: 0.99, compare: 'gt', terrainExclude: [] },
    { kind: 'censerSaint',    threshold: 0.98, compare: 'gt', terrainExclude: [] },
    // Decorative features
    { kind: 'scoriaRose',     threshold: 0.95, compare: 'gt', terrainExclude: ['ice'] },
    { kind: 'cinderbloom',    threshold: 0.92, compare: 'gt', terrainExclude: ['ice'] },
    // Hazard (narrow lt before broader knot)
    { kind: 'brassLungVent',  threshold: 0.02, compare: 'lt', terrainExclude: [] },
    // Resources
    { kind: 'knot',           threshold: 0.08, compare: 'lt' },
  ],

  palette: {
    plains:   [0.710, 0.630, 0.420],  // warm brass
    desert:   [0.780, 0.650, 0.380],  // bleached brass
    hill:     [0.620, 0.550, 0.370],  // brass-toned brown
    plateau:  [0.550, 0.480, 0.380],  // dark oxidized brass
    mountain: [0.580, 0.450, 0.320],  // dark oxidized brass
    peak:     [0.750, 0.680, 0.550],  // pale brass highlight
    water:    [0.350, 0.450, 0.500],  // murky metallic blue
    ice:      [0.600, 0.680, 0.720],  // cold brass-teal
  },
  terrainTags: ['plains', 'desert', 'hill', 'plateau', 'mountain', 'peak', 'water', 'ice'],
  weatherAffinity: ['arid'],
});

defineArchetype('biome_scorch', {
  type: 'biome',
  id: 'biome_scorch',
  name: 'Scorch',
  origin: 'natural',

  climateRange: {
    minMoisture: 0.22,
    maxMoisture: 0.60,
    minTemperature: 0.60,
  },

  terrainRules: {
    mountainThreshold: 0.900,
    forestMinMoisture: 0.76,
    denseForestMinMoisture: 0.88,
    desertMaxMoisture: 0.12,
    marshMinMoisture: 0.62,
    marshMaxElevation: 0.30,
    waterMaxElevation: 0.08,
  },

  // Scorch: sparse trees, rare fruit trees, scattered knots
  // Note: fruitTree must come before tree (higher threshold = rarer, first-match-wins)
  features: [
    // Low-roll hazard (narrow lt before broader knot)
    { kind: 'redLetterBramble', threshold: 0.01, compare: 'lt', terrainExclude: ['water', 'ice'] },
    // High-roll features — rarest first
    { kind: 'fruitTree', threshold: 0.980, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'saintsRib', threshold: 0.965, compare: 'gt', terrainExclude: [] },
    { kind: 'tree',      threshold: 0.945, compare: 'gt', terrainExclude: ['desert'] },
    // Resources
    { kind: 'knot',      threshold: 0.038, compare: 'lt' },
  ],

  palette: {
    plains:      [0.620, 0.580, 0.310],  // sun-bleached grass
    forest:      [0.420, 0.480, 0.220],  // dry woodland
    denseForest: [0.320, 0.380, 0.160],  // dark thicket
    desert:      [0.840, 0.700, 0.400],  // warm sand
    marsh:       [0.560, 0.540, 0.360],  // dry reed
    hill:        [0.560, 0.540, 0.340],  // dry grass hill
    plateau:     [0.600, 0.540, 0.440],  // warm dusty plateau
    mountain:    [0.580, 0.500, 0.400],  // warm rock
    peak:        [0.700, 0.660, 0.580],  // dusty peak
    water:       [0.340, 0.560, 0.700],  // warm blue
  },
  terrainTags: ['plains', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'water'],
  weatherAffinity: ['arid', 'temperate'],
  terrainElevation: { mountain: 0.70, plains: 0.05 },
  supportsFloatingIslands: false,
});

defineArchetype('biome_edenfall', {
  type: 'biome',
  id: 'biome_edenfall',
  name: 'Edenfall',
  origin: 'natural',

  // Temperate mid-moisture — fills the gap between hot savanna and cold frigid_silence
  climateRange: {
    minMoisture: 0.20,
    maxMoisture: 0.62,
    minTemperature: 0.48,
    maxTemperature: 0.65,
  },

  // Fertile temperate: abundant forests, sparse desert, moderate marsh
  terrainRules: {
    forestMinMoisture:      0.40,
    denseForestMinMoisture: 0.55,
    desertMaxMoisture:      0.15,
    marshMinMoisture:       0.60,
    marshMaxElevation:      0.35,
    mountainThreshold:      0.85,
    waterMaxElevation:      0.10,
  },

  features: [
    // Giant mushrooms — rarest first
    { kind: 'edenMushroom',          threshold: 0.970, compare: 'gt', terrainExclude: ['desert', 'marsh'] },
    { kind: 'edenShroomlet',         threshold: 0.920, compare: 'gt', terrainExclude: ['desert'] },
    // Standard features
    { kind: 'fruitTree',             threshold: 0.890, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'tree',                  threshold: 0.830, compare: 'gt', terrainExclude: ['desert'] },
    // Resources
    { kind: 'knot',                  threshold: 0.038, compare: 'lt' },
  ],

  // Purple grass palette — all terrain types get a violet-magenta shift
  palette: {
    plains:        [0.550, 0.300, 0.550],  // purple grass
    forest:        [0.420, 0.200, 0.480],  // deep purple woodland
    denseForest:   [0.300, 0.150, 0.380],  // dark purple thicket
    desert:        [0.680, 0.550, 0.650],  // pale purple sand (rare)
    marsh:         [0.450, 0.350, 0.480],  // purple marsh
    hill:          [0.500, 0.320, 0.520],  // purple-tinted hill
    plateau:       [0.550, 0.420, 0.560],  // pale purple plateau
    mountain:      [0.480, 0.380, 0.500],  // purplish rock
    peak:          [0.650, 0.580, 0.720],  // pale purple snow
    water:         [0.300, 0.380, 0.600],  // deep blue-purple
  },
  terrainTags: ['plains', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'water'],
  weatherAffinity: ['temperate', 'rainy'],

  terrainElevation: {
    forest: 0.20,
    denseForest: 0.30,
  },
  supportsFloatingIslands: false,
});

defineArchetype('biome_painforest', {
  type: 'biome',
  id: 'biome_painforest',
  name: 'Painforest',
  origin: 'natural',

  climateRange: {
    minMoisture: 0.62,
    minTemperature: 0.25,
  },

  terrainRules: {
    forestMinMoisture: 0.55,
    denseForestMinMoisture: 0.80,
    desertMaxMoisture: 0.08,
    marshMinMoisture: 0.50,
    marshMaxElevation: 0.40,
    mountainThreshold: 0.920,
  },

  // Painforest: abundant fruit trees + decorative trees + bushes on low-moisture tiles
  features: [
    { kind: 'fruitTree',       threshold: 0.930, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'peridexionTree',  threshold: 0.910, compare: 'gt', terrainExclude: ['desert', 'marsh'] },
    { kind: 'screamroot',      threshold: 0.890, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'tree',            threshold: 0.860, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'bush',            threshold: 0.060, compare: 'lt', terrainExclude: ['desert', 'marsh'] },
    { kind: 'knot',            threshold: 0.035, compare: 'lt' },
  ],

  palette: {
    plains:        [0.380, 0.620, 0.280],  // deeper, richer green
    forest:        [0.220, 0.500, 0.180],  // darker, lusher forest
    denseForest:   [0.120, 0.350, 0.100],  // very dark deep wood
    desert:        [0.780, 0.650, 0.400],  // muted, sandy — rare here
    marsh:         [0.420, 0.550, 0.340],  // greener marsh
    hill:          [0.400, 0.580, 0.300],  // mossy green
    plateau:       [0.500, 0.520, 0.430],  // mossy grey
    mountain:      [0.480, 0.520, 0.450],  // mossy gray
    peak:          [0.650, 0.700, 0.750],  // moss-snow blend
    floatingIsland:[0.650, 0.750, 0.800],  // greenish float
    water:         [0.300, 0.550, 0.700],  // deeper blue
  },
  terrainTags: ['plains', 'forest', 'denseForest', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'floatingIsland', 'water'],
  weatherAffinity: ['rainy', 'temperate'],

  terrainElevation: {
    forest: 0.18,
    denseForest: 0.25,
    marsh: -0.08,
  },
  supportsFloatingIslands: false,
});

defineArchetype('biome_sere_wastes', {
  type: 'biome',
  id: 'biome_sere_wastes',
  name: 'Sere Wastes',
  origin: 'natural',

  climateRange: {
    maxMoisture: 0.22,
    minTemperature: 0.65,
  },

  terrainRules: {
    mountainThreshold: 0.890,
    waterMaxElevation: 0.04,
    waterMinMoisture: 0.70,
    forestMinMoisture: 0.85,
    desertMaxMoisture: 0.35,
    marshMinMoisture: 0.75,
    marshMaxElevation: 0.20,
  },

  // Sere Wastes: sparse everything — rare fruit trees, very rare decorative trees
  features: [
    // High-roll features — rarest first
    { kind: 'fruitTree',         threshold: 0.985, compare: 'gt', terrainExclude: [] },
    { kind: 'saintsRib',         threshold: 0.975, compare: 'gt', terrainExclude: [] },
    { kind: 'ouroborosLoop',     threshold: 0.970, compare: 'gt', terrainExclude: [] },
    { kind: 'tree',              threshold: 0.965, compare: 'gt', terrainExclude: [] },
    // Low-roll hazards (narrow lt before broader knot)
    { kind: 'redLetterBramble',  threshold: 0.01, compare: 'lt', terrainExclude: ['water', 'ice'] },
    { kind: 'listenerLichen',    threshold: 0.025, compare: 'lt', terrainExclude: ['desert'] },
    // Resources
    { kind: 'knot',              threshold: 0.040, compare: 'lt' },
  ],

  palette: {
    plains:        [0.620, 0.520, 0.280],  // sun-bleached tan
    forest:        [0.400, 0.450, 0.200],  // sparse olive
    denseForest:   [0.350, 0.380, 0.180],  // withered olive
    desert:        [0.880, 0.720, 0.380],  // bright golden sand
    marsh:         [0.580, 0.520, 0.350],  // dry reed-brown
    hill:          [0.580, 0.480, 0.300],  // reddish tan
    plateau:       [0.620, 0.540, 0.420],  // warm pale grey
    mountain:      [0.580, 0.440, 0.350],  // warm reddish rock
    peak:          [0.720, 0.680, 0.600],  // dusty pale
    floatingIsland:[0.750, 0.700, 0.650],  // dusty float
    water:         [0.300, 0.520, 0.680],  // pale desert blue
  },
  terrainTags: ['plains', 'desert', 'hill', 'plateau', 'mountain', 'peak', 'floatingIsland', 'water'],
  weatherAffinity: ['arid', 'temperate'],

  terrainElevation: {
    mountain: 0.75,
    plains: 0.05,
  },
  supportsFloatingIslands: false,
});

defineArchetype('biome_dustbleed', {
  type: 'biome',
  id: 'biome_dustbleed',
  name: 'Dustbleed',
  origin: 'natural',

  climateRange: {
    minElevation: 0,
    maxElevation: 0.1,
    minMoisture:  0.1,
    maxMoisture:  0.2,
  },

  // Low-elevation, low-moisture cursed terrain — tainted by dried god-blood
  terrainRules: {
    desertMaxMoisture:    0.35,
    forestMinMoisture:    0.60,
    mountainThreshold:    0.92,
    waterMaxElevation:    0.04,
    waterMinMoisture:     0.70,
    marshMinMoisture:     0.60,
    marshMaxElevation:    0.15,
  },

  // Dustbleed: sparse cursed-land features — turquoise crystals, rare screamroot
  features: [
    { kind: 'dustbleedCrystal', threshold: 0.94, compare: 'gt', terrainExclude: [] },
    { kind: 'screamroot',       threshold: 0.96, compare: 'gt', terrainExclude: [] },
    { kind: 'knot',             threshold: 0.04, compare: 'lt' },
  ],

  palette: {
    plains:        [0.550, 0.200, 0.150],  // deep rusty red-brown (dead cursed grass)
    forest:        [0.250, 0.500, 0.450],  // dark teal (grass quenched by god blood)
    denseForest:   [0.150, 0.400, 0.350],  // deeper teal thicket
    desert:        [0.700, 0.350, 0.200],  // reddish sandy
    marsh:         [0.350, 0.250, 0.200],  // murky blood-mud
    hill:          [0.500, 0.250, 0.200],  // rusty hill
    plateau:       [0.550, 0.300, 0.250],  // dusty red plateau
    mountain:      [0.450, 0.250, 0.220],  // dark red rock
    peak:          [0.600, 0.450, 0.400],  // pale red-grey
    water:         [0.200, 0.450, 0.500],  // murky teal (tainted water)
  },
  terrainTags: ['plains', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'water'],
  weatherAffinity: ['arid', 'temperate'],

  terrainElevation: null,
  supportsFloatingIslands: false,
});

defineArchetype('biome_frigid_silence', {
  type: 'biome',
  id: 'biome_frigid_silence',
  name: 'The Frigid Silence',
  origin: 'natural',

  climateRange: {
    minMoisture: 0.22,
    maxMoisture: 0.60,
    maxTemperature: 0.55,
  },

  // Cold steppe/tundra: cold suppresses forest, more ice, sparse growth
  terrainRules: {
    forestMinMoisture:      0.65,
    denseForestMinMoisture: 0.75,
    freezeTempMax:          0.60,
    desertMaxMoisture:      0.30,
    marshMinMoisture:       0.55,
  },

  // Frigid: very sparse — cold stunts growth
  features: [
    { kind: 'waxbloom',       threshold: 0.97, compare: 'gt', terrainExclude: [] },
    { kind: 'listenerLichen', threshold: 0.94, compare: 'gt', terrainExclude: [] },
    { kind: 'knot',           threshold: 0.05, compare: 'lt' },
  ],

  palette: {
    plains:        [0.580, 0.620, 0.550],  // frost-bleached grass
    forest:        [0.340, 0.480, 0.350],  // sparse taiga green
    denseForest:   [0.220, 0.350, 0.250],  // deep cold green
    desert:        [0.720, 0.680, 0.550],  // pale cold sand
    marsh:         [0.480, 0.540, 0.480],  // frosty marsh
    hill:          [0.520, 0.580, 0.480],  // cold olive
    plateau:       [0.550, 0.560, 0.520],  // pale grey-green
    mountain:      [0.500, 0.520, 0.500],  // cold grey
    peak:          [0.650, 0.720, 0.780],  // bright frost
    water:         [0.350, 0.500, 0.620],  // cold blue
    ice:           [0.680, 0.780, 0.850],  // pale frost
  },
  terrainTags: ['plains', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'water', 'ice'],
  weatherAffinity: ['temperate', 'snowy'],

  terrainElevation: null,
  supportsFloatingIslands: false,
});

defineArchetype('biome_mourning_marsh', {
  type: 'biome',
  id: 'biome_mourning_marsh',
  name: 'Mourning Marsh',
  origin: 'natural',

  climateRange: {
    minMoisture: 0.62,
    maxTemperature: 0.25,
  },

  // Cold wetland: marsh dominates, lots of ice, almost no desert
  terrainRules: {
    marshMinMoisture:        0.20,
    marshMaxElevation:       0.50,
    waterMinMoisture:        0.15,
    waterMaxElevation:       0.08,
    forestMinMoisture:       0.30,
    denseForestMinMoisture:  0.50,
    desertMaxMoisture:       0.05,
    freezeTempMax:           0.60,
  },

  // Mourning Marsh: very sparse — cold, wet, not hospitable
  features: [
    { kind: 'foolsFire',      threshold: 0.98, compare: 'gt', terrainExclude: [] },
    { kind: 'drownedCopyist', threshold: 0.96, compare: 'gt', terrainExclude: [] },
    { kind: 'screamroot',     threshold: 0.93, compare: 'gt', terrainExclude: [] },
    { kind: 'knot',           threshold: 0.04, compare: 'lt' },
  ],

  palette: {
    plains:        [0.350, 0.480, 0.350],  // dark wet grass
    forest:        [0.220, 0.380, 0.220],  // murky woodland
    denseForest:   [0.120, 0.280, 0.150],  // deep dark mire
    desert:        [0.550, 0.480, 0.350],  // rare dry patch
    marsh:         [0.300, 0.420, 0.280],  // deep marsh green
    hill:          [0.380, 0.440, 0.320],  // wet hill
    plateau:       [0.420, 0.460, 0.400],  // wet grey
    mountain:      [0.400, 0.440, 0.420],  // wet rock
    peak:          [0.600, 0.620, 0.680],  // pale cold peak
    water:         [0.250, 0.420, 0.550],  // deep mournful blue
    ice:           [0.550, 0.650, 0.750],  // pale ice
  },
  terrainTags: ['plains', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'water', 'ice'],
  weatherAffinity: ['rainy', 'snowy'],

  terrainElevation: {
    marsh: -0.08,
  },
  supportsFloatingIslands: false,
});

defineArchetype('biome_unfinished_lands', {
  type: 'biome',
  id: 'biome_unfinished_lands',
  name: 'Unfinished Lands',
  origin: 'supernatural',

  epicenter: {
    radius:       16,
    radiusNoise:  0.35,
    noiseScale:   0.03,
  },

  fieldModifiers: {
    elevationOffset:     0.02,
    moistureMultiplier:  0.70,
    temperatureOffset:  -0.10,
  },

  // Raw, half-formed terrain: lots of mountains, barren, incomplete
  terrainRules: {
    mountainThreshold:      0.80,
    peakThreshold:          0.90,
    hillElevationMin:       0.08,
    forestMinMoisture:      0.80,
    denseForestMinMoisture: 0.90,
    desertMaxMoisture:      0.50,
    waterMaxElevation:      0.04,
  },

  features: [
    { kind: 'errataSlip',       threshold: 0.99, compare: 'gt', terrainExclude: [] },
    { kind: 'gildedInitial',    threshold: 0.98, compare: 'gt', terrainExclude: [] },
    { kind: 'palimpsestSlab',   threshold: 0.96, compare: 'gt', terrainExclude: [] },
    { kind: 'halfDrawnObelisk', threshold: 0.95, compare: 'gt', terrainExclude: [] },
    { kind: 'nullLily',         threshold: 0.93, compare: 'gt', terrainExclude: [] },
    { kind: 'placeholderCypress', threshold: 0.90, compare: 'gt', terrainExclude: [] },
    { kind: 'knot',             threshold: 0.03, compare: 'lt' },
  ],

  palette: {
    plains:   [0.650, 0.620, 0.580],  // faded earth
    desert:   [0.750, 0.680, 0.550],  // bleached sand
    hill:     [0.580, 0.550, 0.520],  // washed grey-brown
    plateau:  [0.550, 0.520, 0.500],  // unfinished grey
    mountain: [0.520, 0.500, 0.480],  // pale incomplete rock
    peak:     [0.680, 0.700, 0.720],  // cold pale
    water:    [0.400, 0.480, 0.580],  // desaturated blue
    ice:      [0.650, 0.680, 0.720],  // pale teal
  },
  terrainTags: ['plains', 'desert', 'hill', 'plateau', 'mountain', 'peak', 'water', 'ice'],
  weatherAffinity: ['arid', 'temperate'],
});


