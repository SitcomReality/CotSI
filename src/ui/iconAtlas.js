/**
 * iconAtlas.js — Load and crop the committed portrait/icon atlas.
 *
 * The geometry editor pre-renders every portrait/icon into a single spritesheet
 * (assets/icons/portraitAtlas.png + portraitAtlas.json) whenever an object is
 * saved. This module loads those assets once and serves cropped PNG data URLs
 * per atlas key (portraitCatalog.portraitKeyFor) — the same painted miniature
 * the map uses, without any runtime WebGL rendering.
 *
 * `atlasPortraitUrl(key)` returns null until the atlas is loaded (or when the
 * key is absent), so callers can fall back to the dynamic portrait renderer.
 */
const DEFAULT_BASE = 'assets/icons';

/** { image: HTMLImageElement, manifest: object } once loaded, else null. */
let atlas = null;
let loading = null;

/** Cropped data URLs, cached per key. */
const urlCache = new Map();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

/**
 * Load the atlas (manifest + PNG) once. Idempotent — later calls await the same
 * in-flight load. Failures leave the atlas null (callers fall back).
 * @returns {Promise<void>}
 */
export function loadIconAtlas(base = DEFAULT_BASE) {
  if (loading) return loading;
  loading = (async () => {
    const res = await fetch(`${base}/portraitAtlas.json`);
    if (!res.ok) throw new Error(`atlas manifest HTTP ${res.status}`);
    const manifest = await res.json();
    const image = await loadImage(`${base}/portraitAtlas.png`);
    atlas = { image, manifest: manifest.entries ?? manifest };
  })().catch((err) => {
    console.warn('[iconAtlas] load failed:', err);
    atlas = null;
  }).finally(() => {
    loading = null;
  });
  return loading;
}

/** Whether the atlas has finished loading (and has a manifest). */
export function atlasReady() {
  return atlas !== null;
}

/** The pixel rect for a key, or null. */
export function atlasRect(key) {
  return atlas?.manifest?.[key] ?? null;
}

/**
 * A cropped PNG data URL for `key`, or null when the atlas isn't loaded or
 * lacks the key. Cropping is done once per key on an offscreen 2D canvas and
 * cached — it never touches the WebGL portrait renderer.
 */
export function atlasPortraitUrl(key) {
  if (!key) return null;
  const rect = atlasRect(key);
  if (!rect) return null;
  if (urlCache.has(key)) return urlCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = rect.w;
  canvas.height = rect.h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(atlas.image, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  const url = canvas.toDataURL('image/png');
  urlCache.set(key, url);
  return url;
}
