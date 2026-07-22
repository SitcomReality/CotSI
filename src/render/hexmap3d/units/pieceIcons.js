/**
 * pieceIcons.js — Mob/trader piece icon → CanvasTexture pipeline.
 *
 * Renders monoline SVG icons onto offscreen Canvases and produces
 * THREE.CanvasTextures for use on the top face of board-game "pieces"
 * (flat cylindrical NPC representations).
 *
 * Each texture is cached after generation.  Call initPieceTextures() once
 * at startup; call disposePieceTextures() on game restart.
 *
 * Layer: render/ — imports vendor/ Three, reads nothing from game state.
 */

import * as THREE from '../../../vendor/three.module.js';

// ─── Icon SVG definitions ───────────────────────────────────────────────────
// These mirror the <symbol> entries in assets/icons/sprite.svg.
// Each is a standalone SVG fragment (paths, circles, etc.) with a 24×24 viewBox.
// Kept inline so this module can run synchronously without fetching the sprite.

const ICON_SVG = {
  'p-bear': `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="12" cy="13" rx="5.5" ry="7"/>
    <circle cx="9" cy="6" r="2.2"/>
    <circle cx="15" cy="6" r="2.2"/>
    <path d="M9 10a1.5 1.5 0 0 0 0 3M15 10a1.5 1.5 0 0 1 0 3"/>
  </g>`,
  'p-leopard': `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="11" cy="14" rx="5" ry="7"/>
    <path d="M16 10q5-3 6-8q-3 1-6 4"/>
    <circle cx="8" cy="7" r="2.5"/>
    <circle cx="9.5" cy="12" r=".8" fill="currentColor" stroke="none"/>
    <circle cx="13" cy="10" r=".8" fill="currentColor" stroke="none"/>
    <circle cx="10" cy="16" r=".8" fill="currentColor" stroke="none"/>
  </g>`,
  'p-snail': `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 20q3-2 4-6"/>
    <path d="M9 14a5 5 0 1 1 2.5-9.3"/>
    <circle cx="13" cy="10" r="5"/>
    <path d="M10 4.5a2.5 2 0 1 1 3.5-1"/>
    <path d="M15 8l2 1"/>
  </g>`,
  'p-tapir': `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="12" cy="14" rx="4.5" ry="6"/>
    <path d="M7 12q-5 0-5-4q1-1 3-1q3 0 4 3"/>
    <circle cx="10" cy="8.5" r="1.5"/>
    <path d="M7 20l-1 3M17 20l1 3"/>
  </g>`,
  'p-mushroom': `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 14q7-8 14 0"/>
    <path d="M9 14v6"/>
    <path d="M15 14v6"/>
    <path d="M5 14q5-3 5-7"/>
    <circle cx="8" cy="10" r="1" fill="currentColor" stroke="none"/>
    <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none"/>
  </g>`,
  'p-goose': `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 20q-2-3-2-6q0-4 4-6"/>
    <path d="M12 8q3-6 8-4"/>
    <path d="M19 5l3-2"/>
    <ellipse cx="14" cy="13" rx="3" ry="6"/>
    <path d="M11 20l1 3M17 20l-1 3"/>
  </g>`,
  'p-scorpion': `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="12" cy="14" rx="3" ry="4"/>
    <path d="M9 12q-5 2-6 6q3-2 5-2"/>
    <path d="M15 12q5 2 6 6q-3-2-5-2"/>
    <path d="M12 10q1-6 6-6q1 2 0 4q-3 0-4-2"/>
    <path d="M10 19l1 3M14 19l-1 3"/>
  </g>`,
  'i-trade': `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 5v13M8 18h8M5 8h14"/>
    <path d="M5 8l-2 4h4ZM19 8l-2 4h4Z"/>
    <circle cx="12" cy="5" r="1.4"/>
  </g>`,
};

// ─── Visual constants ───────────────────────────────────────────────────────

/** Background fill colour for piece cap — warm parchment matching the UI aesthetic. */
const CAP_BG = '#f0e8d0';

/** Icon stroke colour — dark manuscript brown. */
const ICON_COLOR = '#3a2a1a';

/** Texture size in pixels (square).  128 is enough for GPU-friendly mipmapping. */
const TEX_SIZE = 128;

// ─── Texture cache ──────────────────────────────────────────────────────────

/** @type {Map<string, THREE.CanvasTexture>} */
const textureCache = new Map();

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate all piece textures synchronously.  Idempotent — subsequent calls
 * are no-ops.
 *
 * Called once at scene init.  Textures are cached and reused across every
 * renderHexMap3D rebuild.
 */
export function initPieceTextures() {
  if (textureCache.size > 0) return; // already initialised

  for (const [iconId, svgContent] of Object.entries(ICON_SVG)) {
    const tex = _buildTexture(iconId, svgContent);
    textureCache.set(iconId, tex);
  }
}

/**
 * Retrieve a cached piece texture by icon ID.
 * @param {string} iconId — e.g. 'p-bear', 'i-trade'
 * @returns {THREE.CanvasTexture|undefined}
 */
export function getPieceTexture(iconId) {
  return textureCache.get(iconId);
}

/**
 * Dispose all cached textures and clear the cache.
 * Called on game restart / full scene teardown.
 */
export function disposePieceTextures() {
  for (const tex of textureCache.values()) {
    tex.dispose();
  }
  textureCache.clear();
}

/**
 * Map a mob archetype shape key to its piece icon ID.
 * @param {string} archetypeShape — e.g. 'bear', 'scorpion'
 * @returns {string} icon ID, e.g. 'p-bear'
 */
export function pieceIconForArchetype(archetypeShape) {
  const id = `p-${archetypeShape}`;
  return ICON_SVG[id] ? id : null;
}

/**
 * Return the icon ID to use for trader pieces.
 * @returns {string} 'i-trade'
 */
export function traderPieceIconId() {
  return 'i-trade';
}

// ─── Internal ───────────────────────────────────────────────────────────────

/**
 * Build a single CanvasTexture from an SVG icon fragment.
 *
 * The texture is created immediately with the circular background filled in.
 * The SVG icon is rendered asynchronously via Image.onload and the texture
 * is marked needsUpdate when the icon is painted.  In practice the icon
 * appears before the first renderHexMap3D call completes because data-URI
 * SVG images decode in well under a frame.
 *
 * @param {string} iconId
 * @param {string} svgContent — the inner <g> or <path> markup
 * @returns {THREE.CanvasTexture}
 */
function _buildTexture(iconId, svgContent) {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d');

  // Enable smooth rendering at texture size
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Circular background (drawn immediately — always visible even before icon loads)
  const cx = TEX_SIZE / 2;
  const cy = TEX_SIZE / 2;
  const r = cx - 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = CAP_BG;
  ctx.fill();

  // Build a texture with sensible defaults for an orthographic strategy view
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;

  // Render the SVG icon asynchronously — data URIs decode nearly instantly,
  // but Image loading is defined as async even for data: URIs.
  const fullSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${TEX_SIZE}" height="${TEX_SIZE}">` +
    `<g color="${ICON_COLOR}">` +
    svgContent +
    `</g>` +
    `</svg>`;

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, TEX_SIZE, TEX_SIZE);
    tex.needsUpdate = true;
  };
  img.src = 'data:image/svg+xml,' + encodeURIComponent(fullSvg);

  return tex;
}
