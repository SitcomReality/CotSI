/**
 * paths.mjs — Repo paths, server settings, and the data-file conventions the
 * save server shares: where the descriptor data lives, the table-driven
 * entity layout (mobs/bases/champions), the per-kind subfolders, the id
 * pattern, and the static MIME table.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
export const DATA_DIR = path.join(ROOT, 'src', 'render', 'hexmap3d', 'worldObjects', 'descriptors', 'data');
export const INDEX_PATH = path.join(DATA_DIR, 'index.js');
export const MOTIF_DIR = path.join(DATA_DIR, 'motifs');
export const MOTIF_INDEX_PATH = path.join(MOTIF_DIR, 'index.js');
export const DATA_DIR_REL = path.relative(ROOT, DATA_DIR).replaceAll('\\', '/');
export const ATLAS_DIR = path.join(ROOT, 'assets', 'icons');
export const ATLAS_PNG = path.join(ATLAS_DIR, 'portraitAtlas.png');
export const ATLAS_JSON = path.join(ATLAS_DIR, 'portraitAtlas.json');

export const HOST = process.env.HOST || '127.0.0.1';
export const PORT = Number(process.env.PORT || 8000);
// Descriptors are a few KB; the icon atlas is a multi-MB PNG data URL.
export const MAX_BODY = 8 * 1024 * 1024;

export const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Table-driven entity files — the editor saves ONLY the active variant to its
 * own file (never the barrel). `dir` is the per-variant subdirectory under
 * descriptors/data/, `fileFor` maps a variant id to its file name (faction
 * shorts stay uppercase in the data but use lowercase file names).
 */
export const TABLE_DRIVEN = new Map([
  ['mob.js', { dir: 'mobs', fileFor: (id) => `${id}.js` }],
  ['base.js', { dir: 'bases', fileFor: (id) => `${id.toLowerCase()}.js` }],
  ['champion.js', { dir: 'champions', fileFor: (id) => `${id.toLowerCase()}.js` }],
]);

/** The data subfolder a descriptor kind saves into ('' = top-level). */
export function subfolderFor(kind) {
  if (kind === 'decor' || kind === 'mountain') return 'decor';
  if (kind === 'feature') return 'features';
  if (kind === 'item') return 'items';
  return '';
}

/** The data folder a shared library motif saves into (always `motifs`). */
export function subfolderForMotif() {
  return 'motifs';
}

export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
