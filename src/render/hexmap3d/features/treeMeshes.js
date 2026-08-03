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
 * The fruit tree is the most elaborate: a snaking 2–3 segment gnarled trunk
 * (tapering thicker at the base) forking into two steep branches — each may bend
 * a second segment — with a leaf ball riding one final tip and a red apple
 * hanging below the other.
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
 * Unit direction for a segment: azimuth around +Y (0 → +X), elevation above
 * horizontal. A cylinder's +Y axis rotates onto this (see dirAxisAngle).
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
 * Local axis/angle that rotates a part's +Y axis onto `dir`
 * (axis = Y × dir, angle = acos(dir·Y)).
 */
function dirAxisAngle(dir) {
  _axisV.crossVectors(_upDir, _dirV.set(dir.x, dir.y, dir.z));
  if (_axisV.lengthSq() < 1e-8) _axisV.set(1, 0, 0); // dir ≈ ±Y (won't happen for branches)
  _axisV.normalize();
  return {
    axis: { x: _axisV.x, y: _axisV.y, z: _axisV.z },
    angle: Math.acos(Math.min(1, Math.max(-1, dir.y))),
  };
}

/**
 * One branch-segment record: a cylinder spanning `start` → `start + dir·len`.
 * `scaleXZ` tapers the segment (defaults to the branch scale `s`).
 */
function pushBranchRecord(records, shared, s, start, dir, len, scaleXZ) {
  const { axis, angle } = dirAxisAngle(dir);
  records.push({
    ...shared, geo: 'fruit-branch',
    localPos: { x: start.x + (dir.x * len) / 2, y: start.y + (dir.y * len) / 2, z: start.z + (dir.z * len) / 2 },
    localAxis: axis, localAngle: angle,
    scaleXZ: scaleXZ ?? s, scaleY: len / FRUIT_TREE_BRANCH.height,
  });
}

/**
 * Compose the parts of one fruit tree: 2–3 long trunk segments, each leaning its
 * own direction with severe per-segment angles (a snaking gnarled trunk that
 * tapers thicker at the base), forking into two steep branches — each may bend a
 * second segment — with a leaf ball riding one final tip and a red apple hanging
 * below the other. All parts share the tree's rotY and world tilt, so the whole
 * tree leans rigidly around its base.
 *
 * Local frame: +Y up. Every position is pre-folded through the per-tree scale so
 * the segments stack exactly.
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

  // ── Trunk: 2–3 segments, each leaning its own direction (snaking) and
  // tapering thicker toward the base; stacked exactly ──
  const segCount = tileH % 2 === 0 ? cfg.segmentCount[0] : cfg.segmentCount[1];
  let segAz = f(2, 0, Math.PI * 2); // lean azimuth random-walk start
  const segAzMax = cfg.segmentAzDelta[1];
  const trunkTop = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < segCount; i++) {
    const lean = f(3 + i, cfg.segmentLean[0], cfg.segmentLean[1]);
    const len = s * f(6 + i, cfg.segmentLen[0], cfg.segmentLen[1]);
    // branchDir's elevation is above horizontal; the trunk lean is off vertical,
    // so complement it — a lean of 7–14° off straight up.
    const dir = branchDir(segAz, Math.PI / 2 - lean);
    const { axis, angle } = dirAxisAngle(dir);
    records.push({
      ...shared, geo: 'fruit-trunk',
      localPos: { x: trunkTop.x + (dir.x * len) / 2, y: trunkTop.y + (dir.y * len) / 2, z: trunkTop.z + (dir.z * len) / 2 },
      localAxis: axis, localAngle: angle,
      scaleXZ: s * Math.pow(cfg.segmentTaper, i),
      scaleY: len / FRUIT_TREE_TRUNK.height,
    });
    trunkTop.x += dir.x * len;
    trunkTop.y += dir.y * len;
    trunkTop.z += dir.z * len;
    segAz += (frac(treeHash(tileH, 9 + i)) - 0.5) * 2 * segAzMax;
  }

  /**
   * Walk one forked branch from `start`: a straight first segment, then — if the
   * per-branch hash rolls under branchSecondSegChance — a bent second segment
   * splaying outward by `bendSign`. Returns { tip, dir } for the final tip.
   */
  const walkBranch = (start, azimuth, elev, len, hashIdx, bendSign) => {
    const dir1 = branchDir(azimuth, elev);
    if (frac(treeHash(tileH, hashIdx)) >= cfg.branchSecondSegChance) {
      pushBranchRecord(records, shared, s, start, dir1, len);
      return { tip: { x: start.x + dir1.x * len, y: start.y + dir1.y * len, z: start.z + dir1.z * len }, dir: dir1 };
    }
    const seg2Frac = f(hashIdx + 1, cfg.branchSeg2Frac[0], cfg.branchSeg2Frac[1]);
    const bendAz = f(hashIdx + 2, cfg.branchBendAzimuth[0], cfg.branchBendAzimuth[1]);
    const bendElev = f(hashIdx + 3, cfg.branchBendElevation[0], cfg.branchBendElevation[1]);
    const len1 = len * (1 - seg2Frac);
    const len2 = len * seg2Frac;
    pushBranchRecord(records, shared, s, start, dir1, len1);
    const mid = { x: start.x + dir1.x * len1, y: start.y + dir1.y * len1, z: start.z + dir1.z * len1 };
    const dir2 = branchDir(azimuth + bendSign * bendAz, elev + bendElev);
    pushBranchRecord(records, shared, s, mid, dir2, len2, s * 0.75);
    return { tip: { x: mid.x + dir2.x * len2, y: mid.y + dir2.y * len2, z: mid.z + dir2.z * len2 }, dir: dir2 };
  };

  // ── Branches: fork out from the trunk top ──
  const az = f(12, cfg.branchAzimuth[0], cfg.branchAzimuth[1]);
  const lenA = s * f(15, cfg.branchLenA[0], cfg.branchLenA[1]);
  const lenB = s * f(16, cfg.branchLenB[0], cfg.branchLenB[1]);
  const branchA = walkBranch(trunkTop, az, f(13, cfg.branchElevation[0], cfg.branchElevation[1]), lenA, 17, 1);
  const branchB = walkBranch(trunkTop, -az, f(14, cfg.branchElevation[0], cfg.branchElevation[1]), lenB, 21, -1);

  // ── Leaf ball on branch A tip (sunk slightly onto the tip, lopsided tilt) ──
  const canopyTiltDir = frac(treeHash(tileH, 25)) * Math.PI * 2;
  const canopyTiltAmt = (frac(treeHash(tileH, 26)) - 0.5) * 2 * cfg.canopyTilt;
  records.push({
    ...shared, geo: 'fruit-canopy',
    localPos: {
      x: branchA.tip.x - branchA.dir.x * cfg.canopySink,
      y: branchA.tip.y - branchA.dir.y * cfg.canopySink,
      z: branchA.tip.z - branchA.dir.z * cfg.canopySink,
    },
    localAxis: { x: Math.cos(canopyTiltDir), y: 0, z: Math.sin(canopyTiltDir) }, localAngle: canopyTiltAmt,
    scaleXZ: s * f(27, cfg.canopyStretchXZ[0], cfg.canopyStretchXZ[1]),
    scaleY: s * f(28, cfg.canopyStretchY[0], cfg.canopyStretchY[1]),
    color: clusterColor(TREE_CANOPY_COLORS.fruit, tileH, 29, cfg.colorJitter),
  });

  // ── Apple hanging just below branch B tip ──
  const drop = f(30, cfg.appleDrop[0], cfg.appleDrop[1]);
  records.push({
    ...shared, geo: 'fruit-apple',
    localPos: {
      x: branchB.tip.x + (frac(treeHash(tileH, 31)) - 0.5) * 0.015,
      y: branchB.tip.y - drop,
      z: branchB.tip.z + (frac(treeHash(tileH, 32)) - 0.5) * 0.015,
    },
    scale: s * f(33, 0.9, 1.1),
    color: clusterColor(FRUIT_TREE_COLORS.apple, tileH, 34, cfg.colorJitter),
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
