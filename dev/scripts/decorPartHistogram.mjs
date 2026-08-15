#!/usr/bin/env node
/**
 * decorPartHistogram.mjs — Part-count histogram gate for decor migrations
 * (decorComposition.md §5.5). For one decor descriptor, renders N tile hashes
 * and tallies the instance-record count per tile (each record = one part
 * instance, so it is the part count per tile) against the tile's biome.
 *
 * Usage:  node dev/scripts/decorPartHistogram.mjs <id> [biomeId] [N] [terrain]
 *
 *   <id>      descriptor id (desert, beach, plains, marsh, plateau, forest,
 *             denseForest)
 *   [biomeId] pin/table biome for the tiles (default: none — the unpinned
 *             table). A real game tile always has a biome; pass the biome you
 *             want to measure (e.g. biome_edenfall).
 *   [N]       number of tile hashes (default 120)
 *   [terrain] tile terrain (defaults to the descriptor id)
 *
 * Prints the mean / p10 / p90 part count and a compact histogram, so a
 * migration can be gated within ~20% of the v5 mean (run before rewriting for
 * the v5 baseline, then again after — the v5 file renders through the shim's
 * pins, which is exactly the old look).
 */
import { normalizeDescriptor } from '../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { recordsForDescriptor } from '../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { descriptorById } from '../../src/render/hexmap3d/worldObjects/descriptors/data/index.js';

const [id, biomeId = '', nArg = '120', terrainArg = ''] = process.argv.slice(2);
const N = Number(nArg) || 120;
const raw = descriptorById(id);
if (!raw) {
  console.error(`unknown descriptor "${id}"`);
  process.exit(1);
}
const d = normalizeDescriptor(raw);
const terrain = terrainArg || id;

const counts = [];
for (let q = 0; q < N; q++) {
  const tile = { q, r: -2, terrain, ...(biomeId ? { biomeId } : {}) };
  const records = recordsForDescriptor(d, tile, { x: 0, y: 0, z: 0 });
  counts.push(records.length);
}
counts.sort((a, b) => a - b);
const mean = counts.reduce((s, c) => s + c, 0) / N;
const p10 = counts[Math.floor(N * 0.1)];
const p90 = counts[Math.floor(N * 0.9)];
const min = counts[0];
const max = counts[N - 1];

const buckets = new Map();
for (const c of counts) buckets.set(c, (buckets.get(c) ?? 0) + 1);
const hist = [...buckets.entries()]
  .sort((a, b) => a[0] - b[0])
  .map(([c, f]) => `${c}:${'#'.repeat(Math.round((f / N) * 40))}(${f})`)
  .join(' ');

console.log(`${id}${biomeId ? ` @ ${biomeId}` : ' @ no-biome'} (${terrain}, N=${N}): mean ${mean.toFixed(2)} [${min}..${max}] p10 ${p10} p90 ${p90}`);
console.log(`  ${hist}`);
