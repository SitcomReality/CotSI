/**
 * biomes.js — Biome archetype definitions.
 *
 * Each biome defines:
 *   type:              'biome'
 *   name:              Display name shown in setup UI
 *   terrainThresholds: Noise cutoffs for assigning terrain types.
 *                      Each key is a terrain type; values are { minElevation, maxElevation,
 *                      minMoisture, maxMoisture } — a tile must satisfy ALL specified
 *                      conditions to be assigned that terrain.
 *   featureFrequencies: Noise thresholds for spawning features per tile
 *   palette:           RGB color tuples that override the default TERRAIN_COLOR in terrainMesh.js
 *   terrainTags:       Terrain types this biome supports
 *   weatherAffinity:   Weather types this biome is most associated with
 */

import { defineArchetype } from '../archetypes.js';

defineArchetype('biome_default', {
  type: 'biome',
  name: 'Default Manuscript',
  terrainThresholds: {
    mountain: { minElevation: 0.905 },
    water: { maxElevation: 0.07, minMoisture: 0.5 },
    forest: { minMoisture: 0.72 },
    desert: { maxMoisture: 0.20 },
    marsh: { minMoisture: 0.58, maxElevation: 0.35 },
  },
  featureFrequencies: {
    tree: { threshold: 0.935, exclude: ['desert'] },
    knot: { threshold: 0.038 },
  },
  palette: {
    plains:   [0.455, 0.678, 0.365],  // vibrant meadow green
    forest:   [0.294, 0.557, 0.255],  // deep vivid forest
    desert:   [0.839, 0.694, 0.357],  // warm golden sand
    marsh:    [0.506, 0.600, 0.404],  // murky vibrant marsh
    mountain: [0.529, 0.486, 0.416],  // rocky warm gray
    water:    [0.373, 0.604, 0.757],  // bright cyan-blue
  },
  terrainTags: ['plains', 'forest', 'desert', 'marsh', 'mountain', 'water'],
  weatherAffinity: ['temperate', 'rainy'],
});

defineArchetype('biome_verdant', {
  type: 'biome',
  name: 'Verdant Weald',
  terrainThresholds: {
    mountain: { minElevation: 0.920 },
    water: { maxElevation: 0.05, minMoisture: 0.4 },
    forest: { minMoisture: 0.55 },
    desert: { maxMoisture: 0.08 },
    marsh: { minMoisture: 0.50, maxElevation: 0.40 },
  },
  featureFrequencies: {
    tree: { threshold: 0.880, exclude: ['desert'] },  // more trees
    knot: { threshold: 0.035 },
  },
  palette: {
    plains:   [0.380, 0.620, 0.280],  // deeper, richer green
    forest:   [0.220, 0.500, 0.180],  // darker, lusher forest
    desert:   [0.780, 0.650, 0.400],  // muted, sandy — rare here
    marsh:    [0.420, 0.550, 0.340],  // greener marsh
    mountain: [0.480, 0.520, 0.450],  // mossy gray
    water:    [0.300, 0.550, 0.700],  // deeper blue
  },
  terrainTags: ['plains', 'forest', 'marsh', 'mountain', 'water'],
  weatherAffinity: ['rainy', 'temperate'],
});

defineArchetype('biome_arid', {
  type: 'biome',
  name: 'Sere Wastes',
  terrainThresholds: {
    mountain: { minElevation: 0.890 },  // more mountains
    water: { maxElevation: 0.04, minMoisture: 0.7 },  // very rare water
    forest: { minMoisture: 0.85 },  // rare forest
    desert: { maxMoisture: 0.35 },  // very common desert
    marsh: { minMoisture: 0.75, maxElevation: 0.20 },
  },
  featureFrequencies: {
    tree: { threshold: 0.970, exclude: [] },  // very rare trees
    knot: { threshold: 0.040 },
  },
  palette: {
    plains:   [0.620, 0.520, 0.280],  // sun-bleached tan
    forest:   [0.400, 0.450, 0.200],  // sparse olive
    desert:   [0.880, 0.720, 0.380],  // bright golden sand
    marsh:    [0.580, 0.520, 0.350],  // dry reed-brown
    mountain: [0.580, 0.440, 0.350],  // warm reddish rock
    water:    [0.300, 0.520, 0.680],  // pale desert blue
  },
  terrainTags: ['plains', 'desert', 'mountain', 'water'],
  weatherAffinity: ['arid', 'temperate'],
});
