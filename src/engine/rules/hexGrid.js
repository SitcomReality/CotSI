/**
 * hexGrid.js — Generic axial hex-grid math.
 * Coordinates are { q, r } objects; keys are "q,r" strings.
 * Pure and reusable: no game rules, no rendering, no state.
 */

export const coordKey = (c) => `${c.q},${c.r}`;
export const parseKey = (k) => { const [q, r] = k.split(',').map(Number); return { q, r }; };
export const distance = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
export const neighbors = (c) => [
  { q: c.q + 1, r: c.r }, { q: c.q + 1, r: c.r - 1 }, { q: c.q, r: c.r - 1 },
  { q: c.q - 1, r: c.r }, { q: c.q - 1, r: c.r + 1 }, { q: c.q, r: c.r + 1 }
];

export function hexesWithinRadius(radius) {
  const out = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.abs(s) <= radius) out.push({ q, r });
    }
  }
  return out;
}

export function hexRing(radius) {
  if (radius === 0) return [{ q: 0, r: 0 }];
  const results = []; let coord = { q: -radius, r: radius };
  const dirs = [{ q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 }, { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }];
  for (const d of dirs) { for (let i = 0; i < radius; i++) { results.push({ ...coord }); coord.q += d.q; coord.r += d.r; } }
  return results;
}
