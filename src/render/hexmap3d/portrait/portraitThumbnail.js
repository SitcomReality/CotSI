/**
 * portraitThumbnail.js — One-shot 3D "profile picture" of a game piece.
 *
 * Renders a descriptor's meshes — the exact geometry the hex map uses — into a
 * small transparent PNG data URL, cached per piece, for use as a DOM portrait
 * (combat, trade) or as an icon. Built on the shared descriptor pipeline
 * (recordsForEntity → buildDescriptorMeshes → addOutlines), so a portrait is
 * the same painted piece the player sees on the map, ink outline included.
 *
 * Framing comes from the object's optional `portrait` field (see
 * portraitFraming.js); objects without one use the shared auto-frame defaults
 * (the map's isometric angle with a bounding-sphere fit).
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
import { descriptorById } from '../worldObjects/descriptors/data/index.js';
import { resolvePortraitFraming, framePortraitCamera } from './portraitFraming.js';
import { portraitKeyFor } from './portraitCatalog.js';
import { MOB_COLOR_DARKEN } from '../../../params/render/geometryParams.js';

const normalizedChampion = normalizeDescriptor(CHAMPION_DESCRIPTOR);
const normalizedMob = normalizeDescriptor(MOB_DESCRIPTOR);
const normalizedTrader = normalizeDescriptor(TRADER_DESCRIPTOR);
const normalizedBase = normalizeDescriptor(BASE_DESCRIPTOR);

/** Square raster size (CSS px) — crisp at ~112px display on a 2× display. */
const PORTRAIT_SIZE = 256;

/** A single centered world-space position for portrait/icon records. */
const ORIGIN = { x: 0, y: 0, z: 0 };

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

/** Mob body/accent colors for a faction (body = faction base darkened). */
function mobColorsFor(faction) {
  const fac = FACTIONS[faction];
  const fallback = 0x4c3f33; // the old piece-body fallback color
  const base = fac ? hexColor(fac.base) : fallback;
  return {
    factionBody: fac ? darkenHex(base, MOB_COLOR_DARKEN) : fallback,
    factionAccent: fac ? hexColor(fac.color) : fallback,
  };
}

function championEntityFor(entity) {
  return factionEntityFor(entity.faction);
}

function mobEntityFor(entity) {
  return {
    archetype: entity.archetypeName ?? entity.archetype,
    scale: entity.visualScale ?? 1,
    colors: mobColorsFor(entity.faction),
  };
}

/**
 * The `entity` argument recordsForEntity expects for a portrait shape. Entity
 * kinds resolve their faction/archetype; items and representative tile objects
 * are a single centered item with no entity colors (their parts carry literal
 * colors, so an empty entity is enough).
 *
 * @param {object} descriptor - normalized descriptor
 * @param {object} [shape] - { faction?, archetype?, visualScale? }
 */
function entityForShape(descriptor, shape = {}) {
  if (descriptor.kind === 'base' || descriptor.kind === 'champion') {
    return factionEntityFor(shape.faction);
  }
  if (descriptor.kind === 'mob') {
    return mobEntityFor({ faction: shape.faction, archetypeName: shape.archetype });
  }
  return { scale: 1 };
}

/**
 * Instance records for a single centered portrait/icon of `descriptor` — the
 * entity record path with no tile-hash draws. Items and representative tile
 * objects (feature/decor/mountain) resolve through an empty entity; entities
 * resolve through `entityForShape`.
 */
export function recordsForPortrait(descriptor, shape = {}) {
  const entity = entityForShape(descriptor, shape);
  if (!entity) return [];
  return recordsForEntity(descriptor, entity, ORIGIN);
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
 * Frame the orthographic camera around `group` at `framing`'s pitch/yaw, using
 * a bounding-sphere fit scaled by `pad`, with `raise` shifting the view down so
 * grounded models sit above center. Mirrors the map's isometric angle by
 * default (see resolvePortraitFraming).
 */
function frameCamera(group, framing) {
  framePortraitCamera(camera, group, framing);
}

// ─── Cache + snapshot ───────────────────────────────────────────────────────

const cache = new Map();

/** Build the group, frame it, render once, and return the PNG data URL. */
export function renderPortraitSnapshot(descriptor, records, name) {
  ensureContext();
  const group = new THREE.Group();
  group.name = name;
  for (const mesh of buildDescriptorMeshes(descriptor, records, name)) {
    group.add(...addOutlines(mesh));
  }
  scene.add(group);
  frameCamera(group, resolvePortraitFraming(descriptor));
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
    url = build();
  } catch (err) {
    console.warn('[portrait] render failed:', key, err);
    url = null;
  }
  cache.set(key, url);
  return url;
}

/**
 * Cached portrait of any descriptor for a shape, keyed by `key`. `descriptor`
 * must be normalized (see normalizeDescriptor) so recordsForPortrait sees the
 * canonical form.
 * @param {object} descriptor - normalized descriptor
 * @param {object} shape - { faction?, archetype?, visualScale? }
 * @param {string} key - unique cache key
 */
export function getDescriptorPortrait(descriptor, shape, key) {
  return cachedPortrait(key, () => {
    const records = recordsForPortrait(descriptor, shape);
    if (records.length === 0) throw new Error('no records for descriptor');
    return renderPortraitSnapshot(descriptor, records, `portrait-${key}`);
  });
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
    const records = recordsForEntity(descriptor, shape, ORIGIN);
    if (records.length === 0) throw new Error('no records for entity');
    return renderPortraitSnapshot(descriptor, records, `portrait-${key}`);
  });
}

/** Cached portrait of the wandering trader (teal coin). */
export function getTraderPortrait() {
  return cachedPortrait('trader', () => {
    const records = recordsForEntity(normalizedTrader, { scale: 1 }, ORIGIN);
    if (records.length === 0) throw new Error('no records for trader');
    return renderPortraitSnapshot(normalizedTrader, records, 'portrait-trader');
  });
}

/** Cached portrait of a faction base (faction-colored tower). */
export function getBasePortrait(faction) {
  const shape = factionEntityFor(faction);
  if (!shape) return null;
  const key = `base:${shape.faction}`;
  return cachedPortrait(key, () => {
    const records = recordsForEntity(normalizedBase, shape, ORIGIN);
    if (records.length === 0) throw new Error('no records for base');
    return renderPortraitSnapshot(normalizedBase, records, `portrait-${key}`);
  });
}

/** Cached icon of an equipment item (kind 'item'), by descriptor id. */
export function getItemPortrait(itemId) {
  const raw = descriptorById(itemId);
  if (!raw || raw.kind !== 'item') return null;
  const key = portraitKeyFor('item', { id: itemId });
  return getDescriptorPortrait(normalizeDescriptor(raw), {}, key);
}

function portraitKey(entity) {
  const id = entity.id ?? entity.name ?? 'entity';
  return `${id}:${entity.faction ?? '?'}:${entity.archetypeName ?? ''}:${entity.visualScale ?? 1}`;
}

/** Drop all cached portraits (e.g. on game restart / scene teardown). */
export function clearPortraitCache() {
  cache.clear();
}
