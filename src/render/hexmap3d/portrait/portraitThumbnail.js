/**
 * portraitThumbnail.js — One-shot 3D "profile picture" of a game piece.
 *
 * Renders a single entity's descriptor meshes (champion, mob, trader, or a
 * faction base) — the exact geometry the hex map uses — into a small
 * transparent PNG data URL, cached per piece, for use as a DOM portrait in the
 * combat and trade screens. Built on the shared descriptor pipeline
 * (recordsForEntity → buildDescriptorMeshes → addOutlines), so a portrait is
 * the same painted piece the player sees on the map, ink outline included.
 *
 * Cost: one lazily-created offscreen WebGLRenderer (preserveDrawingBuffer) is
 * reused for every portrait; each piece renders once and the data URL is
 * cached. Geometries and materials come from the shared shapeFactory/outline
 * caches (marked userData.shared), so nothing here is disposed and shaders only
 * compile once per WebGL context.
 *
 * Layer: render/ — imports the render descriptor pipeline + scene lights, the
 * pure game rules (FACTIONS), and vendor Three. Entity state is read via the
 * function argument only.
 */
import * as THREE from '../../../vendor/three.module.js';
import { FACTIONS } from '../../../game/rules/factionData.js';
import { normalizeDescriptor } from '../worldObjects/descriptors/schema.js';
import { recordsForEntity } from '../worldObjects/descriptors/recordBuilder.js';
import { buildDescriptorMeshes } from '../worldObjects/descriptors/meshAssembly.js';
import { addOutlines } from '../scene/outline.js';
import { addLights } from '../scene/lightSetup.js';
import { CHAMPION_DESCRIPTOR } from '../worldObjects/descriptors/data/champion.js';
import { MOB_DESCRIPTOR } from '../worldObjects/descriptors/data/mob.js';
import { TRADER_DESCRIPTOR } from '../worldObjects/descriptors/data/trader.js';
import { BASE_DESCRIPTOR } from '../worldObjects/descriptors/data/base.js';
import { CAMERA_PITCH, CAMERA_YAW } from '../../../params/render/cameraParams.js';
import { MOB_COLOR_DARKEN } from '../../../params/render/geometryParams.js';

const normalizedChampion = normalizeDescriptor(CHAMPION_DESCRIPTOR);
const normalizedMob = normalizeDescriptor(MOB_DESCRIPTOR);
const normalizedTrader = normalizeDescriptor(TRADER_DESCRIPTOR);
const normalizedBase = normalizeDescriptor(BASE_DESCRIPTOR);

/** Square raster size (CSS px) — crisp at ~112px display on a 2× display. */
const PORTRAIT_SIZE = 256;
/** Framing margin around the model's bounding sphere (1.0 = tight fit). */
const PORTRAIT_FRAME_PAD = 1.25;
/**
 * Fraction of the half-frame the model is raised inside the portrait: the
 * frustum's top edge is pulled down by this much, so the spare space collects
 * below the model's feet rather than above its head (grounded models read as
 * sitting too low when the frame is symmetric).
 */
const PORTRAIT_FRAME_RAISE = 0.12;

const hexColor = (hex) => parseInt(hex.slice(1), 16);

/** Darken an integer color channel-wise by `f` (mirrors units/unitMeshes.js). */
function darkenHex(hex, f) {
  const ch = (shift) => Math.round(((hex >> shift) & 0xff) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

// ─── Entity → descriptor record shape (mirrors units/unitMeshes.js) ────────

/** Faction index → the entity shape recordsForEntity expects (champion + base). */
function factionEntityFor(faction) {
  const fac = FACTIONS[faction];
  if (!fac) return null;
  return {
    faction: fac.short,
    colors: { factionBase: hexColor(fac.base), factionAccent: hexColor(fac.color) },
  };
}

function championEntityFor(entity) {
  return factionEntityFor(entity.faction);
}

function mobEntityFor(entity) {
  const fac = FACTIONS[entity.faction];
  const fallback = 0x4c3f33; // the old piece-body fallback color
  const base = fac ? hexColor(fac.base) : fallback;
  return {
    archetype: entity.archetypeName || 'default',
    scale: entity.visualScale ?? 1,
    colors: {
      factionBody: fac ? darkenHex(base, MOB_COLOR_DARKEN) : fallback,
      factionAccent: fac ? hexColor(fac.color) : fallback,
    },
  };
}

// ─── Lazy offscreen render context (one renderer/scene/camera, reused) ──────

let renderer = null;
let scene = null;
let camera = null;

function ensureContext() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true, // one-shot toDataURL() capture
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0); // transparent
  renderer.setSize(PORTRAIT_SIZE, PORTRAIT_SIZE, false);

  scene = new THREE.Scene();
  scene.background = null;
  addLights(scene, { shadows: false });

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
}

/**
 * Frame the orthographic camera around `group` using the map's isometric angle
 * (CAMERA_PITCH / CAMERA_YAW), so the portrait matches the hex-map view.
 */
function frameCamera(group) {
  const sphere = new THREE.Box3().setFromObject(group)
    .getBoundingSphere(new THREE.Sphere());
  const center = sphere.center;
  // No size floor: small mobs (snail, leopard, …) need a tight frame too —
  // a minimum-radius clamp inflated their portraits and left them tiny.
  const radius = Math.max(sphere.radius, 0.001);

  const distance = 30;
  const camX = center.x + distance * Math.cos(CAMERA_PITCH) * Math.sin(CAMERA_YAW);
  const camY = center.y + distance * Math.sin(CAMERA_PITCH);
  const camZ = center.z + distance * Math.cos(CAMERA_PITCH) * Math.cos(CAMERA_YAW);
  camera.position.set(camX, camY, camZ);
  camera.lookAt(center);

  const half = radius * PORTRAIT_FRAME_PAD;
  // Raise the model: shift the view rectangle down by RAISE×half (top edge
  // pulled toward the centre, bottom edge pushed out) so the spare space ends
  // up below the model's feet instead of above its head.
  const raise = half * PORTRAIT_FRAME_RAISE;
  camera.left = -half;
  camera.right = half;
  camera.top = half - raise;
  camera.bottom = -half - raise;
  camera.near = 0.1;
  camera.far = 100;
  camera.updateProjectionMatrix();
}

// ─── Cache + snapshot ───────────────────────────────────────────────────────

const cache = new Map();

/** Build the group, frame it, render once, and return the PNG data URL. */
function snapshot(descriptor, records, name) {
  const group = new THREE.Group();
  group.name = name;
  for (const mesh of buildDescriptorMeshes(descriptor, records, name)) {
    group.add(...addOutlines(mesh));
  }
  scene.add(group);
  frameCamera(group);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  // Geometries/materials are shared caches — removing the group releases them.
  scene.remove(group);
  return url;
}

/** Run `build` once and cache the result (null on failure, cached too). */
function cachedPortrait(key, build) {
  if (cache.has(key)) return cache.get(key);
  let url = null;
  try {
    ensureContext();
    url = build();
  } catch (err) {
    console.warn('[portrait] render failed:', key, err);
    url = null;
  }
  cache.set(key, url);
  return url;
}

function portraitKey(entity) {
  const id = entity.id ?? entity.name ?? 'entity';
  return `${id}:${entity.faction ?? '?'}:${entity.archetypeName ?? ''}:${entity.visualScale ?? 1}`;
}

/**
 * Cached portrait of a combatant — a champion or mob.
 * @param {object|null} entity — ({ controller } ⇒ champion, { archetypeName } ⇒ mob)
 * @returns {string|null} PNG data URL
 */
export function getCombatantPortrait(entity) {
  if (!entity) return null;
  const isChampion = entity.controller !== undefined;
  const isMob = entity.archetypeName !== undefined;
  if (!isChampion && !isMob) return null;

  const descriptor = isChampion ? normalizedChampion : normalizedMob;
  const shape = isChampion ? championEntityFor(entity) : mobEntityFor(entity);
  if (!shape) return null;

  const key = portraitKey(entity);
  return cachedPortrait(key, () => {
    const records = recordsForEntity(descriptor, shape, { x: 0, y: 0, z: 0 });
    if (records.length === 0) throw new Error('no records for entity');
    return snapshot(descriptor, records, `portrait-${key}`);
  });
}

/** Cached portrait of the wandering trader (teal coin). */
export function getTraderPortrait() {
  return cachedPortrait('trader', () => {
    const records = recordsForEntity(normalizedTrader, { scale: 1 }, { x: 0, y: 0, z: 0 });
    if (records.length === 0) throw new Error('no records for trader');
    return snapshot(normalizedTrader, records, 'portrait-trader');
  });
}

/** Cached portrait of a faction base (faction-colored tower). */
export function getBasePortrait(faction) {
  const shape = factionEntityFor(faction);
  if (!shape) return null;
  const key = `base:${shape.faction}`;
  return cachedPortrait(key, () => {
    const records = recordsForEntity(normalizedBase, shape, { x: 0, y: 0, z: 0 });
    if (records.length === 0) throw new Error('no records for base');
    return snapshot(normalizedBase, records, `portrait-${key}`);
  });
}

/** Drop all cached portraits (e.g. on game restart / scene teardown). */
export function clearPortraitCache() {
  cache.clear();
}
