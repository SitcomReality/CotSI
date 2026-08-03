// src/render/hexmap3d/features/treeMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import {
  getTreeTrunkGeo,
  getTreeCanopyRoundGeo,
  getTreeCanopyTallGeo,
  getTreeCanopyWideGeo,
} from './geometries/index.js';
import { collectInstances, buildInstanced } from './meshBuilder.js';
import {
  TREE_VARIANT_HASH_SEEDS, TREE_FOREST_TALL_THRESHOLD, TREE_VARIANT_THRESHOLDS,
  TREE_TALL, TREE_WIDE, TREE_ROUND,
  TREE_TRUNK_Y_FRACTION,
  TREE_CANOPY_ROUND, TREE_CANOPY_TALL, TREE_CANOPY_WIDE,
  TREE_CLUSTER_COUNTS, TREE_CLUSTER_RING, TREE_CLUSTER_LEAN,
  TREE_VARIATION, TREE_SOLITARY, TREE_CANOPY_COLORS,
} from '../../../params/render/geometryParams.js';

/**
 * Tree mesh builder — two treatments:
 *
 * Cluster (woods/forest): a `tree` feature on forest/denseForest terrain renders
 * 3–7 trees scattered inside the hex. Each tree varies slightly in size, trunk
 * height, leaf height/width, and rotation, and leans slightly away from the hex
 * center (cartoony bouquet look). The tile's continuous density drives cluster size.
 *
 * Solitary: `largeTree` (Elder Tree landmark), `fruitTree`, and a lone `tree` on
 * open terrain (plains, hill, marsh) render one bigger, more distinctive tree.
 */

const TREE_KINDS = new Set(['tree', 'fruitTree', 'largeTree']);
const CLUSTER_TERRAINS = new Set(['forest', 'denseForest']);
const TRUNK_COLOR = 0x8B5E3C;

// ── Deterministic hashing ────────────────────────────────────────────────────

function tileHash(tile) {
  return ((tile.q * TREE_VARIANT_HASH_SEEDS[0] + tile.r * TREE_VARIANT_HASH_SEEDS[1]) * TREE_VARIANT_HASH_SEEDS[2]) % TREE_VARIANT_HASH_SEEDS[3];
}

/** Per-tree sub-hash derived from the tile hash — stable across chunk rebuilds. */
function treeHash(tileH, i) {
  return (tileH * 17 + i * 29 + 5) % 89;
}

function frac(h) {
  return (h % 100) / 100;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

// ── Canopy variants ──────────────────────────────────────────────────────────

/**
 * Canopy variant for a solitary tree — deterministic from terrain + coords.
 * (Original behavior preserved; cluster trees pick variants separately.)
 */
function treeVariant(terrain, q, r) {
  const hash = ((q * TREE_VARIANT_HASH_SEEDS[0] + r * TREE_VARIANT_HASH_SEEDS[1]) * TREE_VARIANT_HASH_SEEDS[2]) % TREE_VARIANT_HASH_SEEDS[3];
  if (terrain === 'forest') {
    return hash < TREE_FOREST_TALL_THRESHOLD ? 'tall' : 'round';
  }
  if (hash < TREE_VARIANT_THRESHOLDS[0]) return 'round';
  if (hash < TREE_VARIANT_THRESHOLDS[1]) return 'tall';
  return 'wide';
}

/** Canopy variant mix inside a cluster: denseForest is tall-biased (taiga/pine). */
function clusterVariant(terrain, h) {
  const t = frac(h);
  if (terrain === 'denseForest') {
    return t < 0.55 ? 'tall' : (t < 0.8 ? 'round' : 'wide');
  }
  return t < 0.55 ? 'round' : (t < 0.85 ? 'tall' : 'wide');
}

/**
 * Per-variant geometry, placement offsets, and canopy half-height.
 * halfHeight anchors the canopy bottom to the trunk top when the canopy is
 * stretched in Y.
 */
function canopyForVariant(variant) {
  switch (variant) {
    case 'tall':
      return { geo: getTreeCanopyTallGeo(), heightOffset: TREE_TALL.heightOffset, canopyY: TREE_TALL.canopyY, halfHeight: TREE_CANOPY_TALL.height / 2 };
    case 'wide':
      return { geo: getTreeCanopyWideGeo(), heightOffset: TREE_WIDE.heightOffset, canopyY: TREE_WIDE.canopyY, halfHeight: TREE_CANOPY_WIDE.height / 2 };
    case 'round':
    default:
      return { geo: getTreeCanopyRoundGeo(), heightOffset: TREE_ROUND.heightOffset, canopyY: TREE_ROUND.canopyY, halfHeight: TREE_CANOPY_ROUND.radius };
  }
}

// ── Per-tree generation ──────────────────────────────────────────────────────

/** Cluster size from density: forest 3–5, denseForest 4–7, ±1 hash jitter. */
function clusterCount(terrain, density, tileH) {
  const [min, max] = TREE_CLUSTER_COUNTS[terrain] || TREE_CLUSTER_COUNTS.forest;
  // Density is continuous (≈0.2 → 1.0 on forest tiles); clamp to 0..1.
  const d = clamp01((density - 0.2) / 0.8);
  const count = Math.round(lerp(min, max, d));
  return Math.min(max, Math.max(min, count + (tileH % 3) - 1));
}

/** Per-tree variation, deterministic from (tileH, i). */
function treeVariation(tileH, i) {
  return {
    scale:        lerp(TREE_VARIATION.scaleMin, TREE_VARIATION.scaleMax, frac(treeHash(tileH, i + 3))),
    stretchY:     lerp(TREE_VARIATION.stretchYMin, TREE_VARIATION.stretchYMax, frac(treeHash(tileH, i + 4))),
    stretchXZ:    lerp(TREE_VARIATION.stretchXZMin, TREE_VARIATION.stretchXZMax, frac(treeHash(tileH, i + 5))),
    trunkStretch: lerp(TREE_VARIATION.trunkStretchMin, TREE_VARIATION.trunkStretchMax, frac(treeHash(tileH, i + 6))),
    rotY:         frac(treeHash(tileH, i + 7)) * Math.PI * 2,
  };
}

/** Leaf color = base variant color with a small deterministic brightness jitter. */
function clusterColor(baseHex, tileH, i) {
  const c = new THREE.Color(baseHex);
  const j = (frac(treeHash(tileH, i + 9)) - 0.5) * 2 * TREE_VARIATION.colorJitter;
  c.r = clamp01(c.r * (1 + j));
  c.g = clamp01(c.g * (1 + j));
  c.b = clamp01(c.b * (1 + j));
  return c;
}

/**
 * Emit trunk + canopy instance records for one tree.
 * Both parts pivot at the tree base `y`, with their center raised by `lift` in
 * their own frame — so the whole tree leans rigidly around its base and the
 * trunk/canopy stay perfectly coaxial (no sideways offset between them).
 * Trunk: uniform scale × trunkStretch on Y, planted on the surface.
 * Canopy: stretched in Y (leaf height) and XZ (leaf width); its Y-center shifts
 * up by halfHeight·(stretchY − 1) so the canopy bottom stays anchored to the trunk.
 */
function addTreeRecords(records, tree) {
  const { x, y, z, variant, scale, stretchY, stretchXZ, trunkStretch, rotY, tiltAxis, tilt, color } = tree;
  const { heightOffset, canopyY, halfHeight } = canopyForVariant(variant);

  records.push({
    x, z, variant, part: 'trunk',
    y,
    lift: heightOffset * TREE_TRUNK_Y_FRACTION * scale * trunkStretch,
    scale, scaleY: scale * trunkStretch,
    rotY, tiltAxis, tilt,
  });

  records.push({
    x, z, variant, part: 'canopy',
    y,
    lift: (canopyY * trunkStretch + halfHeight * (stretchY - 1)) * scale,
    scaleXZ: scale * stretchXZ, scaleY: scale * stretchY,
    rotY, tiltAxis, tilt,
    color,
  });
}

/**
 * Build trunk + canopy instance records for a tile's tree feature.
 * Cluster tiles return multiple trees; solitary tiles return one big one.
 */
function treeRecordsForTile(tile, worldPos) {
  const kind = tile.feature.kind;
  const tileH = tileHash(tile);
  const density = tile.feature.density ?? 0.5;
  const records = [];

  // ── Cluster: woods/forest tiles render a scattered grove ──
  if (kind === 'tree' && CLUSTER_TERRAINS.has(tile.terrain)) {
    const count = clusterCount(tile.terrain, density, tileH);
    for (let i = 0; i < count; i++) {
      const v = treeVariation(tileH, i);
      const variant = clusterVariant(tile.terrain, treeHash(tileH, i + 10));

      // Position on a jittered ring around the hex center (well inside the hex)
      const ringT = clamp01(frac(treeHash(tileH, i + 1)) + (frac(treeHash(tileH, i + 2)) - 0.5) * TREE_VARIATION.ringJitter * 2);
      const r = TREE_CLUSTER_RING.min + (TREE_CLUSTER_RING.max - TREE_CLUSTER_RING.min) * ringT;
      const angle = (i / count) * Math.PI * 2 + (frac(treeHash(tileH, i + 2)) - 0.5) * TREE_VARIATION.angleJitter;
      const dx = Math.cos(angle) * r;
      const dz = Math.sin(angle) * r;

      // Lean away from the hex center: tilt axis ⊥ outward direction, positive tilt → outward
      const len = Math.hypot(dx, dz) || 1e-6;
      const tilt = lerp(TREE_CLUSTER_LEAN.min, TREE_CLUSTER_LEAN.max, frac(treeHash(tileH, i + 8)));

      addTreeRecords(records, {
        x: worldPos.x + dx, y: worldPos.y, z: worldPos.z + dz,
        variant, ...v,
        tiltAxis: { x: dz / len, z: -dx / len }, tilt,
        color: clusterColor(TREE_CANOPY_COLORS[variant], tileH, i),
      });
    }
    return records;
  }

  // ── Solitary: one bigger, more distinctive tree ──
  const cfg = TREE_SOLITARY[kind] || TREE_SOLITARY.tree;
  const variant = (kind === 'largeTree' || kind === 'fruitTree') ? 'round' : treeVariant(tile.terrain, tile.q, tile.r);
  const off = frac(tileH) * Math.PI * 2;
  const ox = Math.cos(off) * 0.08;
  const oz = Math.sin(off) * 0.08;
  const tiltDir = frac(treeHash(tileH, 1)) * Math.PI * 2;
  const colorHex = kind === 'largeTree' ? TREE_CANOPY_COLORS.large
    : kind === 'fruitTree' ? TREE_CANOPY_COLORS.fruit
    : TREE_CANOPY_COLORS[variant];

  addTreeRecords(records, {
    x: worldPos.x + ox, y: worldPos.y, z: worldPos.z + oz,
    variant,
    scale: cfg.scale, stretchY: cfg.stretchY ?? 1.0, stretchXZ: cfg.stretchXZ ?? 1.0,
    trunkStretch: cfg.trunkStretch ?? 1.0,
    rotY: off,
    tiltAxis: { x: Math.sin(tiltDir), z: -Math.cos(tiltDir) },
    tilt: cfg.lean ?? 0,
    color: new THREE.Color(colorHex),
  });
  return records;
}

// ── Collection + mesh building ───────────────────────────────────────────────

function isTreeTile(tile) {
  return !!tile.feature && TREE_KINDS.has(tile.feature.kind);
}

function collectTreeInstances(tilesOrArray, visible) {
  return collectInstances(tilesOrArray, visible, isTreeTile, treeRecordsForTile);
}

function buildMeshesFromInstances(instances) {
  // Group trunk/canopy records by canopy variant (one InstancedMesh pair each)
  const groups = {};
  for (const inst of instances) {
    const g = groups[inst.variant] || (groups[inst.variant] = { trunks: [], canopies: [] });
    (inst.part === 'trunk' ? g.trunks : g.canopies).push(inst);
  }

  const results = [];
  const trunkMat = new THREE.MeshLambertMaterial({ color: TRUNK_COLOR, flatShading: true });
  // Canopy material is white; per-tree colors arrive via instance colors.
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, flatShading: true });

  for (const [variant, data] of Object.entries(groups)) {
    if (data.trunks.length > 0) {
      results.push(buildInstanced(getTreeTrunkGeo(), trunkMat, data.trunks, `tree-trunks-${variant}`));
    }
    if (data.canopies.length > 0) {
      const { geo } = canopyForVariant(variant);
      results.push(buildInstanced(geo, canopyMat, data.canopies, `tree-canopies-${variant}`));
    }
  }
  return results;
}

/**
 * Build tree InstancedMeshes for the current game state.
 * @param {object} state - Game state (state.tiles Map)
 * @param {Set<string>} visible - Set of "q,r" keys currently visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildTreeMeshes(state, visible) {
  return buildMeshesFromInstances(collectTreeInstances(state.tiles, visible));
}

/**
 * Build tree InstancedMeshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkTreeMeshes(chunkTiles, visible) {
  return buildMeshesFromInstances(collectTreeInstances(chunkTiles, visible));
}
