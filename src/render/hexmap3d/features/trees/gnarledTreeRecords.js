// src/render/hexmap3d/features/trees/gnarledTreeRecords.js
// Gnarled-tree treatment: a snaking 2–3 segment gnarled trunk (tapering
// thicker at the base) forking into two steep branches — each may bend a
// second segment — with a leaf ball riding one final tip. This was the
// original fruit-tree landmark; it now draws Painforest's grove members
// (twisted trees) and stays parameterized (per-member hash offset, scale,
// canopy color, tilt, optional apple) for reuse by other features/biomes.

import * as THREE from '../../../../vendor/three.module.js';
import { tileHash, treeHash, frac, lerp } from './treeHash.js';
import { clusterColor } from './treeParts.js';
import {
  TREE_SOLITARY, TREE_CANOPY_COLORS,
  FRUIT_TREE, FRUIT_TREE_COLORS, FRUIT_TREE_TRUNK, FRUIT_TREE_BRANCH,
} from '../../../../params/render/geometryParams.js';

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
 * Compose one gnarled tree: 2–3 long trunk segments, each leaning its own
 * direction with severe per-segment angles (a snaking gnarled trunk that
 * tapers thicker at the base), forking into two steep branches — each may bend
 * a second segment — with a leaf ball riding one final tip. All parts share
 * the tree's rotY and world tilt, so the whole tree leans rigidly around its
 * base.
 *
 * Local frame: +Y up. Every position is pre-folded through the per-tree scale
 * so the segments stack exactly.
 *
 * @param {object[]} records      - instance record accumulator
 * @param {object}   tile         - tile (deterministic hash source)
 * @param {{x,y,z}}  worldPos     - tree base position
 * @param {object}   [opts]
 * @param {number}   [opts.hashOffset=0] - per-tree hash offset (grove members)
 * @param {number}   [opts.scale]        - base scale (defaults to the old fruit-tree scale)
 * @param {number}   [opts.canopyColor]  - leaf-ball color hex (defaults to the warm fruit-tree green)
 * @param {{x,z}}    [opts.tiltAxis]     - world-space lean axis (default: hash-chosen)
 * @param {number}   [opts.tilt]         - lean angle in radians (default: hash-chosen)
 * @param {boolean}  [opts.apple=false]  - hang a fruit below the second branch tip
 */
export function gnarledTreeRecords(records, tile, worldPos, opts = {}) {
  const tileH = tileHash(tile);
  const seed = opts.hashOffset ?? 0;
  const th = (i) => frac(treeHash(tileH, i + seed));
  const f = (i, min, max) => lerp(min, max, th(i));
  const cfg = FRUIT_TREE;
  const s = (opts.scale ?? TREE_SOLITARY.fruitTree.scale) * f(1, cfg.scaleVar[0], cfg.scaleVar[1]);
  const off = frac(tileH) * Math.PI * 2;
  const tiltDir = th(1) * Math.PI * 2;

  const shared = {
    x: worldPos.x, y: worldPos.y, z: worldPos.z,
    rotY: off,
    tiltAxis: opts.tiltAxis ?? { x: Math.sin(tiltDir), z: -Math.cos(tiltDir) },
    tilt: opts.tilt ?? (TREE_SOLITARY.fruitTree.lean ?? 0),
  };

  // ── Trunk: 2–3 segments, each leaning its own direction (snaking) and
  // tapering thicker toward the base; stacked exactly ──
  const segCount = (tileH + seed) % 2 === 0 ? cfg.segmentCount[0] : cfg.segmentCount[1];
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
    segAz += (th(9 + i) - 0.5) * 2 * segAzMax;
  }

  /**
   * Walk one forked branch from `start`: a straight first segment, then — if the
   * per-branch hash rolls under branchSecondSegChance — a bent second segment
   * splaying outward by `bendSign`. Returns { tip, dir } for the final tip.
   */
  const walkBranch = (start, azimuth, elev, len, hashIdx, bendSign) => {
    const dir1 = branchDir(azimuth, elev);
    if (th(hashIdx) >= cfg.branchSecondSegChance) {
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
  const canopyTiltDir = th(25) * Math.PI * 2;
  const canopyTiltAmt = (th(26) - 0.5) * 2 * cfg.canopyTilt;
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
    color: clusterColor(opts.canopyColor ?? TREE_CANOPY_COLORS.fruit, tileH, 29 + seed, cfg.colorJitter),
  });

  // ── Optional fruit hanging just below branch B tip ──
  if (opts.apple) {
    const drop = f(30, cfg.appleDrop[0], cfg.appleDrop[1]);
    records.push({
      ...shared, geo: 'fruit-apple',
      localPos: {
        x: branchB.tip.x + (th(31) - 0.5) * 0.015,
        y: branchB.tip.y - drop,
        z: branchB.tip.z + (th(32) - 0.5) * 0.015,
      },
      scale: s * f(33, 0.9, 1.1),
      color: clusterColor(FRUIT_TREE_COLORS.apple, tileH, 34 + seed, cfg.colorJitter),
    });
  }

  return records;
}
