/**
 * terrainTypes.js — Terrain type definitions and default generation config.
 * Pure data: no functions, no imports.
 *
 * Each terrain type may have:
 *   fill, ink     – Display colours (legacy ASCII fallback)
 *   label         – Display name
 *   passable      – Whether entities can occupy this tile
 *   movementCost  – Per-hex movement cost (Infinity for impassable; not yet consumed by movement logic)
 *   mark          – ASCII symbol fallback
 */

export const TERRAIN = {
  plains:        { fill:'#74ad5d', ink:'#c8e0b8', label:'Plains',          passable:true,  movementCost:1, mark:'' },
  forest:        { fill:'#4b8e41', ink:'#a0d090', label:'Forest',          passable:true,  movementCost:1, mark:'∷' },
  denseForest:   { fill:'#2d6b23', ink:'#70b060', label:'Deep wood',       passable:true,  movementCost:2, mark:'♣' },
  desert:        { fill:'#d6b15b', ink:'#f0d890', label:'Desert',          passable:true,  movementCost:1, mark:'·' },
  marsh:         { fill:'#819967', ink:'#b8cfa0', label:'Marsh',           passable:true,  movementCost:1, mark:'≈' },
  hill:          { fill:'#8ba863', ink:'#c8d8b0', label:'Hill',            passable:true,  movementCost:1, mark:'∧' },
  plateau:       { fill:'#9a9078', ink:'#d0c8b8', label:'Plateau',         passable:true,  movementCost:1, mark:'⊓' },
  mountain:      { fill:'#877c6a', ink:'#c0b8a8', label:'Impassable peaks', passable:false, movementCost:Infinity, mark:'∧' },
  peak:          { fill:'#b0b8c8', ink:'#e0e8f0', label:'High peak',       passable:false, movementCost:Infinity, mark:'▲' },
  floatingIsland:{ fill:'#c0d8e8', ink:'#e0f0ff', label:'Floating isle',   passable:false, movementCost:Infinity, mark:'⌂' },
  water:         { fill:'#5f9ac1', ink:'#a0d0e8', label:'Broken water',    passable:false, movementCost:Infinity, mark:'~' },
  ice:           { fill:'#b8d8f0', ink:'#e0f0ff', label:'Frozen surface',  passable:false, movementCost:Infinity, mark:'❄' },
  beach:         { fill:'#e8d8a0', ink:'#f5ecd0', label:'Beach',           passable:true,  movementCost:1, mark:'∿' },
};

export const DEFAULT_FEATURES = [
  { kind: 'fruitTree', threshold: 0.970, compare: 'gt', terrainExclude: ['desert'] },
  { kind: 'tree',      threshold: 0.935, compare: 'gt', terrainExclude: ['desert'] },
  { kind: 'knot',      threshold: 0.038, compare: 'lt' },
];
