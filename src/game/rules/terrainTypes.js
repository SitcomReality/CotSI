/**
 * terrainTypes.js — Terrain type definitions and default generation config.
 * Pure data: no functions, no imports.
 */

export const TERRAIN = {
  plains:  { fill:'#74ad5d', ink:'#c8e0b8', label:'Plains', passable:true, mark:'' },
  forest:  { fill:'#4b8e41', ink:'#a0d090', label:'Forest', passable:true, mark:'∷' },
  desert:  { fill:'#d6b15b', ink:'#f0d890', label:'Desert', passable:true, mark:'·' },
  marsh:   { fill:'#819967', ink:'#b8cfa0', label:'Marsh', passable:true, mark:'≈' },
  mountain:{ fill:'#877c6a', ink:'#c0b8a8', label:'Impassable peaks', passable:false, mark:'∧' },
  water:   { fill:'#5f9ac1', ink:'#a0d0e8', label:'Broken water', passable:false, mark:'~' },
};

// Default thresholds used when no biome is supplied (backward-compatible)
export const DEFAULT_THRESHOLDS = {
  mountain: { minElevation: 0.905 },
  water: { maxElevation: 0.07, minMoisture: 0.5 },
  forest: { minMoisture: 0.72 },
  desert: { maxMoisture: 0.20 },
  marsh: { minMoisture: 0.58, maxElevation: 0.35 },
};

export const DEFAULT_FEATURES = {
  tree: { threshold: 0.935, exclude: ['desert'] },
  knot: { threshold: 0.038 },
};
