/**
 * atlasBuild.js — Build the committed icon atlas in the editor browser.
 *
 * Renders every atlas entry (portraitCatalog.listPortraitEntries) into one
 * spritesheet via portraitAtlas.js, then returns the PNG data URL + manifest in
 * the shape the save server writes and the game loads (ui/iconAtlas.js). The
 * editor calls this after a successful Save so the atlas always reflects the
 * current geometry — the browser does the WebGL work the zero-dependency save
 * server cannot.
 */
import { listPortraitEntries } from '../../../src/render/hexmap3d/portrait/portraitCatalog.js';
import { renderPortraitAtlas } from '../../../src/render/hexmap3d/portrait/portraitAtlas.js';

/**
 * @param {{ onProgress?: (fraction:number) => void }} [opts]
 * @returns {Promise<{ dataUrl: string, manifest: object }>}
 */
export async function buildIconAtlas({ onProgress } = {}) {
  const entries = listPortraitEntries();
  const { dataUrl, manifest, columns, rows, tileSize } = await renderPortraitAtlas(entries, {
    onProgress: (fraction) => onProgress?.(fraction),
  });
  return {
    dataUrl,
    manifest: { columns, rows, tileSize, entries: manifest },
  };
}
