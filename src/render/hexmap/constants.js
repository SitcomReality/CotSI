// Hexmap rendering constants
export const HEX_SIZE = 30;
export const HEX_WIDTH = HEX_SIZE * Math.sqrt(3);
export const HEX_HEIGHT = HEX_SIZE * 1.5;
export const HEX_VERT = HEX_SIZE * 2;

// Depth: mountains (3), bases (2), trees (2), knots (1), units (1), flat (0)
export const FEATURE_HEIGHT = {
  mountain: 3,
  base: 2,
  tree: 2,
  knot: 1,
  mob: 1,
  champion: 1,
  trader: 1,
};