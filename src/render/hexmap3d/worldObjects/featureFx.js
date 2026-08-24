/**
 * featureFx.js — Feature FX accents and collect bursts.
 *
 * Ambient accents built per chunk alongside the descriptor meshes (see
 * hexMapRenderer.js):
 *   - God's Knot (unmined): rainbow sparkle stars hovering around the knot.
 *   - Peridexion Tree (ripe): pale-gold glints near the fruit crown.
 *   - Blessed Font (charged/ripe): soft additive glow ring above the font.
 * All are InstancedMeshes over the waterSparkles star/ring patterns, static
 * except for the shared uTime uniform — negligible GPU cost.
 *
 * One-shot collect bursts: when a chunk rebuilds and a knot / treasure chest
 * that existed in the previous snapshot is gone, a short particle puff
 * (rainbow sparkles for knots, coin flourish for chests) plays at the tile.
 * Detection diffs the previous per-chunk feature snapshot inside this module,
 * so the game-state layer stays untouched (the state→render contract remains
 * "mutate + markChunkDirty"). Bursts animate via clock onTick ticks and
 * remove themselves.
 *
 * Flag gating: sparkles/bursts follow graphicsSettings.effects.particles,
 * the font glow follows graphicsSettings.effects.glows.
 */

import * as THREE from '../../../vendor/three.module.js';
import { waterSparkleMaterial, fxGlowMaterial } from '../scene/materials.js';
import { starGeometry } from '../terrain/waterSparkles.js';
import { hexCenter } from '../hexWorldSpace.js';
import { hillFloorY } from './hillFloor.js';
import { getClock } from '../../../shared/clockScheduler.js';
import { graphicsSettings } from '../../overlays/graphicsSettings.js';
import {
  KNOT_SPARKLE_COUNT, KNOT_SPARKLE_Y_OFFSET, KNOT_SPARKLE_SCATTER, KNOT_SPARKLE_SIZE,
  FRUIT_SPARKLE_COUNT, FRUIT_SPARKLE_Y_OFFSET, FRUIT_SPARKLE_SCATTER, FRUIT_SPARKLE_SIZE,
  FONT_GLOW_Y_OFFSET, FONT_GLOW_INNER_RADIUS, FONT_GLOW_OUTER_RADIUS,
  KNOT_BURST_PARTICLE_COUNT, COIN_FLOURISH_COUNT,
  BURST_DURATION_MS, BURST_PARTICLE_SPEED, BURST_UP_BIAS,
} from '../../../params/render/featureFxParams.js';

/** Deterministic [0,1) hash of a tile (q, r) + salt — placement scatter. */
function tileHash01(q, r, salt) {
  const s = Math.sin(q * 127.1 + r * 311.7 + salt * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** A feature counts as ripe/charged unless its regrowth lifecycle says otherwise. */
export function featureRipe(feature) {
  if (!feature) return false;
  if (feature.ripe === false) return false;
  const g = feature.growth;
  if (typeof g === 'number' && Number.isFinite(g)) return g >= 1;
  return true;
}

/**
 * Pure placement pass: which FX points does this chunk's visible features
 * warrant? Split out from mesh assembly so it is testable without Three.js.
 *
 * @returns {{ knotSparkles: object[], fruitSparkles: object[], fontGlows: object[] }}
 *   point lists with world-space x/y/z plus per-instance phase/hue scatter
 */
export function collectFeatureFxPoints(chunkTiles, visible, particlesOn, glowsOn) {
  const knotSparkles = [];
  const fruitSparkles = [];
  const fontGlows = [];
  if (!particlesOn && !glowsOn) return { knotSparkles, fruitSparkles, fontGlows };

  for (const tile of chunkTiles) {
    const key = `${tile.q},${tile.r}`;
    if (!visible.has(key)) continue;
    const f = tile.feature;
    if (!f) continue;
    const baseY = hillFloorY(tile);
    const { x: cx, z: cz } = hexCenter(tile.q, tile.r);

    if (particlesOn && f.kind === 'knot' && !f.mined) {
      for (let k = 0; k < KNOT_SPARKLE_COUNT; k++) {
        const angle = tileHash01(tile.q, tile.r, 11 + k) * Math.PI * 2;
        const dist = KNOT_SPARKLE_SCATTER * (0.4 + tileHash01(tile.q, tile.r, 31 + k) * 0.6);
        knotSparkles.push({
          x: cx + Math.cos(angle) * dist,
          y: baseY + KNOT_SPARKLE_Y_OFFSET * (0.7 + tileHash01(tile.q, tile.r, 51 + k) * 0.6),
          z: cz + Math.sin(angle) * dist,
          phase: tileHash01(tile.q, tile.r, 71 + k) * Math.PI * 2,
          hue: tileHash01(tile.q, tile.r, 91 + k),
        });
      }
    }

    if (particlesOn && f.kind === 'peridexionTree' && featureRipe(f)) {
      for (let k = 0; k < FRUIT_SPARKLE_COUNT; k++) {
        const angle = tileHash01(tile.q, tile.r, 13 + k) * Math.PI * 2;
        const dist = FRUIT_SPARKLE_SCATTER * tileHash01(tile.q, tile.r, 33 + k);
        fruitSparkles.push({
          x: cx + Math.cos(angle) * dist,
          y: baseY + FRUIT_SPARKLE_Y_OFFSET * (0.8 + tileHash01(tile.q, tile.r, 53 + k) * 0.4),
          z: cz + Math.sin(angle) * dist,
          phase: tileHash01(tile.q, tile.r, 73 + k) * Math.PI * 2,
          hue: 0.12 + tileHash01(tile.q, tile.r, 93 + k) * 0.03, // warm gold range
        });
      }
    }

    if (glowsOn && f.kind === 'blessedFont' && featureRipe(f)) {
      fontGlows.push({
        x: cx,
        y: baseY + FONT_GLOW_Y_OFFSET,
        z: cz,
        phase: tileHash01(tile.q, tile.r, 17) * Math.PI * 2,
      });
    }
  }
  return { knotSparkles, fruitSparkles, fontGlows };
}

/**
 * Build an InstancedMesh of twinkling stars for a point list. Fresh geometry
 * per mesh (cloned from the shared water-sparkle star) so per-chunk
 * phase attributes never collide; the shared flag survives the clone so
 * chunk disposal skips it.
 */
function buildStarInstances(points, size) {
  if (points.length === 0) return null;
  const geo = starGeometry.clone();
  const mesh = new THREE.InstancedMesh(geo, waterSparkleMaterial, points.length);
  mesh.name = 'featureFxStars';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = true;

  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const scale = new THREE.Vector3(size, 1, size);
  const color = new THREE.Color();

  const phases = new Float32Array(points.length);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    pos.set(p.x, p.y, p.z);
    quat.setFromAxisAngle(up, p.phase);
    m.compose(pos, quat, scale);
    mesh.setMatrixAt(i, m);
    phases[i] = p.phase;
    color.setHSL(p.hue, 0.9, 0.65); // knot: full rainbow; fruit: pinned gold
    mesh.setColorAt(i, color);
  }

  geo.setAttribute('aSparklePhase', new THREE.InstancedBufferAttribute(phases, 1));
  // No bob: aSparkleAmp stays zero, leaving only the twinkle pulse.
  geo.setAttribute('aSparkleAmp', new THREE.InstancedBufferAttribute(new Float32Array(points.length), 1));

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/** The charged-font glow ring, lying flat above the font. */
function buildFontGlowRing(points) {
  if (points.length === 0) return null;
  const geo = new THREE.RingGeometry(FONT_GLOW_INNER_RADIUS, FONT_GLOW_OUTER_RADIUS, 24);
  geo.rotateX(-Math.PI / 2); // lie flat
  const mesh = new THREE.InstancedMesh(geo, fxGlowMaterial, points.length);
  mesh.name = 'featureFxGlows';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = true;

  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const phases = new Float32Array(points.length);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    pos.set(p.x, p.y, p.z);
    m.compose(pos, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    mesh.setMatrixAt(i, m);
    phases[i] = p.phase;
  }
  geo.setAttribute('aSparklePhase', new THREE.InstancedBufferAttribute(phases, 1));

  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/**
 * Build the ambient feature-FX meshes for a chunk's visible features.
 * @returns {THREE.Mesh[]} possibly empty
 */
export function buildChunkFeatureFx(chunkTiles, visible) {
  const { particles, glows } = graphicsSettings.effects;
  const pts = collectFeatureFxPoints(chunkTiles, visible, particles, glows);
  const meshes = [
    buildStarInstances(pts.knotSparkles, KNOT_SPARKLE_SIZE),
    buildStarInstances(pts.fruitSparkles, FRUIT_SPARKLE_SIZE),
    buildFontGlowRing(pts.fontGlows),
  ].filter(Boolean);
  return meshes;
}

// ─── Collect bursts (one-shot transient effects) ─────────────────────────────

/** Scene reference, set once by hexMapRenderer init. */
let fxScene = null;

/** Active bursts: each owns its stopFn and scene group. */
const activeBursts = new Set();

export function initFeatureFx(scene) {
  fxScene = scene;
}

/** Tear down all transient state (game restart / scene disposal). */
export function disposeFeatureFx() {
  for (const burst of activeBursts) {
    if (burst.stopFn) burst.stopFn();
    if (fxScene && burst.group) fxScene.remove(burst.group);
  }
  activeBursts.clear();
  chunkFeatureSnapshots.clear();
  fxScene = null;
}

const chunkFeatureSnapshots = new Map(); // chunk key → Map("q,r" → feature kind)

/**
 * Diff this chunk's features against the previous snapshot and fire collect
 * bursts for vanished knots/treasure chests. Called during a chunk rebuild —
 * exactly when markChunkDirty has flagged a change.
 */
export function detectCollectedFx(chunkKey, chunkTiles, visible) {
  const prev = chunkFeatureSnapshots.get(chunkKey);
  const next = new Map();
  for (const tile of chunkTiles) {
    const key = `${tile.q},${tile.r}`;
    const f = tile.feature;
    const present = f && !(f.kind === 'knot' && f.mined);
    if (present) next.set(key, f.kind);
    if (!present && prev && prev.has(key) && visible.has(key)
        && graphicsSettings.effects.particles) {
      spawnCollectBurst(prev.get(key), tile);
    }
  }
  chunkFeatureSnapshots.set(chunkKey, next);
}

/**
 * Spawn the one-shot burst for a collected feature kind at its tile.
 * knot → rainbow sparkle puff; treasureChest → gold coin flourish.
 */
export function spawnCollectBurst(kind, tile) {
  if (!fxScene) return;
  const isCoin = kind === 'treasureChest';
  const count = isCoin ? COIN_FLOURISH_COUNT : KNOT_BURST_PARTICLE_COUNT;

  const baseY = hillFloorY(tile) + (isCoin ? 0.4 : KNOT_SPARKLE_Y_OFFSET * 0.6);
  const { x: cx, z: cz } = hexCenter(tile.q, tile.r);

  const geo = isCoin
    ? new THREE.CylinderGeometry(0.09, 0.09, 0.03, 8)
    : starGeometry.clone();
  const mat = isCoin ? coinBurstMaterial() : burstStarMaterial();
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.name = 'featureFxBurst';
  mesh.castShadow = false;
  mesh.frustumCulled = true;

  const velocities = [];
  const colors = new THREE.Color();
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const speed = BURST_PARTICLE_SPEED * (0.6 + Math.random() * 0.8);
    velocities.push({
      vx: Math.cos(angle) * speed,
      vz: Math.sin(angle) * speed,
      spin: Math.random() * Math.PI * 2,
    });
    m.makeTranslation(cx, baseY, cz);
    mesh.setMatrixAt(i, m);
    if (!isCoin) {
      colors.setHSL((i / count + Math.random() * 0.08) % 1, 0.9, 0.65);
      mesh.setColorAt(i, colors);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const group = new THREE.Group();
  group.add(mesh);
  fxScene.add(group);

  const burst = { group, mesh };
  let lastTs = -1;
  burst.stopFn = getClock().onTick((ts) => {
    if (lastTs < 0) lastTs = ts;
    const elapsed = ts - (burst.startTime ??= ts);
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    const t = Math.min(elapsed / BURST_DURATION_MS, 1);

    // Analytic arc: radial ease-out, pop up then fall, shrink to nothing.
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const s = Math.max(1 - t, 0.001);
    const travel = BURST_DURATION_MS / 1000;
    for (let i = 0; i < count; i++) {
      const v = velocities[i];
      pos.set(
        cx + v.vx * travel * t * (2 - t),
        baseY + BURST_UP_BIAS * t - 2.6 * t * t,
        cz + v.vz * travel * t * (2 - t),
      );
      quat.setFromAxisAngle(AXIS_Y, v.spin + t * Math.PI * 2);
      scl.set(s, s, s);
      m.compose(pos, quat, scl);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;

    if (t >= 1) finishBurst(burst);
  });

  activeBursts.add(burst);
}

const AXIS_Y = new THREE.Vector3(0, 1, 0);

function finishBurst(burst) {
  if (burst.stopFn) {
    burst.stopFn();
    burst.stopFn = null;
  }
  if (fxScene && burst.group) fxScene.remove(burst.group);
  // Burst geometries/materials are per-burst allocations — dispose them.
  burst.mesh?.geometry?.dispose();
  activeBursts.delete(burst);
}

/** Shared unlit materials for burst particles (created lazily, kept forever). */
let _burstStarMat = null;
let _coinMat = null;
function burstStarMaterial() {
  if (!_burstStarMat) {
    _burstStarMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  }
  return _burstStarMat;
}
function coinBurstMaterial() {
  if (!_coinMat) {
    _coinMat = new THREE.MeshBasicMaterial({ color: 0xffd24a });
  }
  return _coinMat;
}
