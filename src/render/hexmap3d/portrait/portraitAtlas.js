/**
 * portraitAtlas.js — Render many portraits into one spritesheet + manifest.
 *
 * Used by the geometry editor: after a Save, the editor renders every atlas
 * entry (portraitCatalog.listPortraitEntries) into a single transparent PNG and
 * posts it (with the manifest) to the save server, which writes the committed
 * assets the game loads (ui/iconAtlas.js). Rendering happens here, in the
 * browser, because it needs WebGL — the zero-dependency save server cannot.
 *
 * Each entry is framed with its own `portrait` field (portraitFraming.js) and
 * drawn into a fixed square tile; the manifest maps key → pixel rect in
 * image (top-left) coordinates.
 */
import * as THREE from '../../../vendor/three.module.js';
import { buildDescriptorMeshes } from '../worldObjects/descriptors/meshAssembly.js';
import { addOutlines } from '../scene/outline.js';
import { addLights } from '../scene/lightSetup.js';
import { recordsForPortrait } from './portraitThumbnail.js';
import { resolvePortraitFraming, framePortraitCamera } from './portraitFraming.js';

/** Square tile size (CSS px) — crisp at ~112px display on a 2× display. */
export const ATLAS_TILE = 256;

/**
 * Grid layout for `count` tiles — as close to square as possible so the atlas
 * stays within a browser's comfortable image size for 71 entries (9×8).
 * @returns {{ columns: number, rows: number, width: number, height: number }}
 */
export function layoutAtlas(count) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  return {
    columns,
    rows,
    width: columns * ATLAS_TILE,
    height: rows * ATLAS_TILE,
  };
}

/**
 * Render every entry into one atlas and return its PNG data URL + manifest.
 * Yields to the browser periodically so a loading indicator can paint.
 *
 * @param {object[]} entries - portraitCatalog.listPortraitEntries() output
 * @param {{ onProgress?: (fraction:number, key:string) => void }} [opts]
 * @returns {Promise<{ dataUrl: string, manifest: object, columns: number, rows: number, tileSize: number }>}
 */
export async function renderPortraitAtlas(entries, { onProgress } = {}) {
  const { columns, rows, width, height } = layoutAtlas(entries.length);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true, // one-shot toDataURL() capture
  });
  renderer.setPixelRatio(1); // tiles are authored at their final pixel size
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(width, height, false);
  renderer.setScissorTest(true);

  const scene = new THREE.Scene();
  scene.background = null;
  addLights(scene, { shadows: false });

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);

  const manifest = {};

  for (let i = 0; i < entries.length; i++) {
    const { key, descriptor, shape } = entries[i];

    let group = null;
    try {
      const records = recordsForPortrait(descriptor, shape);
      if (records.length === 0) continue; // skip unrenderable entries

      group = new THREE.Group();
      group.name = key;
      for (const mesh of buildDescriptorMeshes(descriptor, records, key)) {
        group.add(...addOutlines(mesh));
      }
      scene.add(group);
      framePortraitCamera(camera, group, resolvePortraitFraming(descriptor));

      const col = i % columns;
      const row = Math.floor(i / columns);
      // WebGL viewport origin is bottom-left; the image is top-left. A tile at
      // image row `row` maps to GL viewport y = (rows - 1 - row) * TILE.
      const viewX = col * ATLAS_TILE;
      const viewY = (rows - 1 - row) * ATLAS_TILE;
      renderer.setViewport(viewX, viewY, ATLAS_TILE, ATLAS_TILE);
      renderer.setScissor(viewX, viewY, ATLAS_TILE, ATLAS_TILE);
      renderer.render(scene, camera);

      manifest[key] = { x: col * ATLAS_TILE, y: row * ATLAS_TILE, w: ATLAS_TILE, h: ATLAS_TILE };
    } catch (err) {
      console.warn('[portraitAtlas] render failed:', key, err);
    } finally {
      if (group) scene.remove(group);
    }

    onProgress?.((i + 1) / entries.length, key);
    // Yield every few tiles so the editor's loading indicator paints.
    if (i % 4 === 3) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const dataUrl = renderer.domElement.toDataURL('image/png');
  renderer.dispose();
  return { dataUrl, manifest, columns, rows, tileSize: ATLAS_TILE };
}
