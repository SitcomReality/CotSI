// src/render/hexmap3d/features/treeMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import {
  getTreeTrunkGeo,
  getTreeCanopyRoundGeo,
  getTreeCanopyTallGeo,
  getTreeCanopyWideGeo,
  getFruitTreeTrunkGeo,
  getFruitTreeBranchGeo,
  getFruitTreeCanopyGeo,
  getFruitTreeAppleGeo,
} from './geometries/index.js';
import { collectInstances, buildInstanced } from './meshBuilder.js';
import {
  TREE_VARIANT_HASH_SEEDS, TREE_FOREST_TALL_THRESHOLD, TREE_VARIANT_THRESHOLDS,
  TREE_TALL, TREE_WIDE, TREE_ROUND,
  TREE_TRUNK_Y_FRACTION,
  TREE_CANOPY_ROUND, TREE_CANOPY_TALL, TREE_CANOPY_WIDE,
  TREE_CLUSTER_COUNTS, TREE_CLUSTER_RING, TREE_CLUSTER_LEAN,
  TREE_VARIATION, TREE_SOLITARY, TREE_CANOPY_COLORS,
  FRUIT_TREE, FRUIT_TREE_COLORS, FRUIT_TREE_TRUNK, FRUIT_TREE_BRANCH,
} from '../../../params/render/geometryParams.js';

/**
 * Tree mesh builder — three treatments:
 *
 * Cluster (woods/forest): a `tree` feature on forest/denseForest terrain renders
 * 3–7 trees scattered inside the hex. forest is a spherical (round) deciduous
 * grove; denseForest (deep wood) a conical (tall) pine stand. Each tree varies
 * slightly in size, trunk height, leaf height/width, and rotation, and leans
 * slightly away from the hex center (cartoony bouquet look). The tile's
 * continuous density drives cluster size.
 *
 * Solitary: `largeTree` (Elder Tree landmark), `fruitTree`, and a lone `tree` on
 * open terrain (plains, hill, marsh) render one bigger, more distinctive tree.
 * The fruit tree is the most elaborate: a curving 2–3 segment trunk forking
 * into two branches — a leaf ball rides one tip, a red apple hangs below the
 * other.
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
 * (Cluster trees pick their shape per terrain below; lone trees keep the
 * original round/tall/wide mix.)
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

/**
 * Canopy shape for a cluster terrain — one shape per landscape:
 * forest = spherical (round) deciduous groves, denseForest (deep wood) =
 * conical (tall) pines. Per-tree size/stretch/lean/color variation still comes
 * from treeVariation, so cluster members stay individually distinct.
 */
function clusterVariant(terrain) {
  return terrain === 'denseForest' ? 'tall' : 'round';
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

/** Leaf/fruit color = base color with a small deterministic brightness jitter. */
function clusterColor(baseHex, tileH, i, jitter = TREE_VARIATION.colorJitter) {
  const c = new THREE.Color(baseHex);
  const j = (frac(treeHash(tileH, i + 9)) - 0.5) * 2 * jitter;
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
    x, z, geo: 'trunk',
    y,
    lift: heightOffset * TREE_TRUNK_Y_FRACTION * scale * trunkStretch,
    scale, scaleY: scale * trunkStretch,
    rotY, tiltAxis, tilt,
  });

  records.push({
    x, z, geo: `canopy-${variant}`,
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
      const variant = clusterVariant(tile.terrain);

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

  // ── Fruit tree: curving segmented trunk + forked branches ──
  if (kind === 'fruitTree') {
    return fruitTreeRecords(tile, worldPos);
  }

  // ── Solitary: one bigger, more distinctive tree ──
  const cfg = TREE_SOLITARY[kind] || TREE_SOLITARY.tree;
  const variant = kind === 'largeTree' ? 'round' : treeVariant(tile.terrain, tile.q, tile.r);
  const off = frac(tileH) * Math.PI * 2;
  const ox = Math.cos(off) * 0.08;
  const oz = Math.sin(off) * 0.08;
  const tiltDir = frac(treeHash(tileH, 1)) * Math.PI * 2;
  const colorHex = kind === 'largeTree' ? TREE_CANOPY_COLORS.large : TREE_CANOPY_COLORS[variant];

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

// ── Fruit tree parts ─────────────────────────────────────────────────────────

// Module-scope temps for branch orientation math (records store axis/angle).
const _upDir = new THREE.Vector3(0, 1, 0);
const _dirV = new THREE.Vector3();
const _axisV = new THREE.Vector3();

/**
 * Unit direction for a forked branch: azimuth around the trunk's curve axis
 * (+X), elevation above horizontal. A cylinder's +Y axis rotates onto this.
 */
function branchDir(azimuth, elevation) {
  const ce = Math.cos(elevation);
  return {
    x: Math.cos(azimuth) * ce,
    y: Math.sin(elevation),
    z: Math.sin(azimuth) * ce,
  };
}

/**
 * One forked-branch record: the branch spans from the trunk top to
 * trunk top + dir·len. localAxis/localAngle rotate the branch's +Y axis onto
 * `dir` (axis = Y × dir, angle = acos(dir·Y)).
 */
function pushBranchRecord(records, shared, s, trunkTopX, trunkTopY, dir, len) {
  _axisV.crossVectors(_upDir, _dirV.set(dir.x, dir.y, dir.z));
  if (_axisV.lengthSq() < 1e-8) _axisV.set(1, 0, 0); // dir ≈ ±Y (won't happen for branches)
  _axisV.normalize();
  const angle = Math.acos(Math.min(1, Math.max(-1, dir.y)));

  records.push({
    ...shared, geo: 'fruit-branch',
    localPos: { x: trunkTopX + (dir.x * len) / 2, y: trunkTopY + (dir.y * len) / 2, z: (dir.z * len) / 2 },
    localAxis: { x: _axisV.x, y: _axisV.y, z: _axisV.z }, localAngle: angle,
    scaleXZ: s, scaleY: len / FRUIT_TREE_BRANCH.height,
  });
}

/**
 * Compose the parts of one fruit tree: 2–3 trunk segments that lean a little
 * more with each rise (a gentle curve), forking into two branches — a leaf
 * ball rides one tip, a red apple hangs just below the other. All parts share
 * the tree's rotY and world tilt, so the whole tree leans rigidly around its
 * base.
 *
 * Local frame: +Y up, trunk curve runs along +X. Every position is pre-folded
 * through the per-tree scale so the segments stack exactly.
 */
function fruitTreeRecords(tile, worldPos) {
  const tileH = tileHash(tile);
  const cfg = FRUIT_TREE;
  const f = (i, min, max) => lerp(min, max, frac(treeHash(tileH, i)));
  const s = TREE_SOLITARY.fruitTree.scale * f(1, cfg.scaleVar[0], cfg.scaleVar[1]);
  const off = frac(tileH) * Math.PI * 2;
  const tiltDir = frac(treeHash(tileH, 1)) * Math.PI * 2;

  const records = [];
  const shared = {
    x: worldPos.x, y: worldPos.y, z: worldPos.z,
    rotY: off,
    tiltAxis: { x: Math.sin(tiltDir), z: -Math.cos(tiltDir) },
    tilt: TREE_SOLITARY.fruitTree.lean ?? 0,
  };

  // ── Trunk: 2–3 leaning segments, stacked exactly ──
  const segCount = tileH % 2 === 0 ? cfg.segmentCount[0] : cfg.segmentCount[1];
  const segLean = f(2, cfg.segmentLean[0], cfg.segmentLean[1]);
  let trunkTopX = 0;
  let trunkTopY = 0;
  for (let i = 0; i < segCount; i++) {
    const len = s * f(3 + i, cfg.segmentLen[0], cfg.segmentLen[1]);
    const angle = (i + 1) * segLean;
    const dx = len * Math.sin(angle);
    const dy = len * Math.cos(angle);
    // Negative localAngle: rotating around +Z by −α points the segment's +Y
    // axis toward +X (the curve axis), so consecutive segments stack exactly.
    records.push({
      ...shared, geo: 'fruit-trunk',
      localPos: { x: trunkTopX + dx / 2, y: trunkTopY + dy / 2, z: 0 },
      localAxis: { x: 0, y: 0, z: 1 }, localAngle: -angle,
      scaleXZ: s, scaleY: len / FRUIT_TREE_TRUNK.height,
    });
    trunkTopX += dx;
    trunkTopY += dy;
  }

  // ── Branches: fork out from the trunk top ──
  const az = f(10, cfg.branchAzimuth[0], cfg.branchAzimuth[1]);
  const dirA = branchDir(az, f(11, cfg.branchElevation[0], cfg.branchElevation[1]));
  const dirB = branchDir(-az, f(12, cfg.branchElevation[0], cfg.branchElevation[1]));
  const lenA = s * f(13, cfg.branchLenA[0], cfg.branchLenA[1]);
  const lenB = s * f(14, cfg.branchLenB[0], cfg.branchLenB[1]);

  const tipAX = trunkTopX + dirA.x * lenA;
  const tipAY = trunkTopY + dirA.y * lenA;
  const tipAZ = dirA.z * lenA;
  const tipBX = trunkTopX + dirB.x * lenB;
  const tipBY = trunkTopY + dirB.y * lenB;
  const tipBZ = dirB.z * lenB;

  pushBranchRecord(records, shared, s, trunkTopX, trunkTopY, dirA, lenA);
  pushBranchRecord(records, shared, s, trunkTopX, trunkTopY, dirB, lenB);

  // ── Leaf ball on branch A tip (sunk slightly onto the tip, lopsided tilt) ──
  const canopyTiltDir = frac(treeHash(tileH, 15)) * Math.PI * 2;
  const canopyTiltAmt = (frac(treeHash(tileH, 16)) - 0.5) * 2 * cfg.canopyTilt;
  records.push({
    ...shared, geo: 'fruit-canopy',
    localPos: {
      x: tipAX - dirA.x * cfg.canopySink,
      y: tipAY - dirA.y * cfg.canopySink,
      z: tipAZ - dirA.z * cfg.canopySink,
    },
    localAxis: { x: Math.cos(canopyTiltDir), y: 0, z: Math.sin(canopyTiltDir) }, localAngle: canopyTiltAmt,
    scaleXZ: s * f(17, cfg.canopyStretchXZ[0], cfg.canopyStretchXZ[1]),
    scaleY: s * f(18, cfg.canopyStretchY[0], cfg.canopyStretchY[1]),
    color: clusterColor(TREE_CANOPY_COLORS.fruit, tileH, 19, cfg.colorJitter),
  });

  // ── Apple hanging just below branch B tip ──
  const drop = f(20, cfg.appleDrop[0], cfg.appleDrop[1]);
  records.push({
    ...shared, geo: 'fruit-apple',
    localPos: {
      x: tipBX + (frac(treeHash(tileH, 21)) - 0.5) * 0.015,
      y: tipBY - drop,
      z: tipBZ + (frac(treeHash(tileH, 22)) - 0.5) * 0.015,
    },
    scale: s * f(23, 0.9, 1.1),
    color: clusterColor(FRUIT_TREE_COLORS.apple, tileH, 24, cfg.colorJitter),
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

/** Part geometry registry — one InstancedMesh per geo key. */
const PART_GEOS = {
  trunk:         getTreeTrunkGeo,
  'canopy-round': getTreeCanopyRoundGeo,
  'canopy-tall':  getTreeCanopyTallGeo,
  'canopy-wide':  getTreeCanopyWideGeo,
  'fruit-trunk':  getFruitTreeTrunkGeo,
  'fruit-branch': getFruitTreeBranchGeo,
  'fruit-canopy': getFruitTreeCanopyGeo,
  'fruit-apple':  getFruitTreeAppleGeo,
};

/** Solid-wood parts share the brown trunk material (branches get a lighter one). */
const WOOD_GEO_KEYS = new Set(['trunk', 'fruit-trunk', 'fruit-branch']);

function buildMeshesFromInstances(instances) {
  // Group records by part geometry (one InstancedMesh per geo key)
  const groups = {};
  for (const inst of instances) {
    (groups[inst.geo] || (groups[inst.geo] = [])).push(inst);
  }

  const results = [];
  const trunkMat = new THREE.MeshLambertMaterial({ color: TRUNK_COLOR, flatShading: true });
  const branchMat = new THREE.MeshLambertMaterial({ color: FRUIT_TREE_COLORS.branch, flatShading: true });
  // Canopy/apple material is white; per-tree colors arrive via instance colors.
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, flatShading: true });

  for (const [geo, data] of Object.entries(groups)) {
    const makeGeo = PART_GEOS[geo];
    if (!makeGeo) continue;
    const material = geo === 'fruit-branch' ? branchMat : WOOD_GEO_KEYS.has(geo) ? trunkMat : canopyMat;
    results.push(buildInstanced(makeGeo(), material, data, `tree-${geo}`));
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
