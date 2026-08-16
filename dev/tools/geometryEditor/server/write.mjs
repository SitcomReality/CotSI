/**
 * write.mjs — Data-file + barrel writes: atomic file replacement and the
 * data/index.js registration flow (fresh import of the barrel, inserting a
 * new object's import + ALL_DESCRIPTORS entry).
 */
import { readFile, writeFile, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { INDEX_PATH } from './paths.mjs';

/** Atomically replace a file (write temp + rename, so a crash never leaves a
 *  half-written descriptor or barrel). */
export async function atomicWrite(target, content) {
  const tmp = target + `.tmp-${process.pid}`;
  await writeFile(tmp, content);
  await rename(tmp, target);
}

/** Import data/index.js fresh (it changes as new objects are registered). */
export function importBarrel() {
  return import(pathToFileURL(INDEX_PATH).href + '?save=' + Date.now());
}

/**
 * Register a brand-new descriptor in data/index.js: insert its import (in the
 * alphabetical import block) and append its export to ALL_DESCRIPTORS.
 */
export async function registerInBarrel(id, exportName, subfolder = '') {
  const rel = subfolder ? `${subfolder}/${id}` : id;
  const text = await readFile(INDEX_PATH, 'utf8');
  const lines = text.split('\n');
  const importLine = `import { ${exportName} } from './${rel}.js';`;
  const spec = `'./${rel}.js';`;

  // Insert the import before the first import whose specifier sorts after it
  // (the barrel's imports are alphabetical by file name).
  let insertAt = null;
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^import \{ .* \} from '(\.[^']+)';$/);
    if (m) {
      if (m[1] > spec) { insertAt = i; break; }
      insertAt = i + 1; // last seen import; insert after it if nothing sorts later
    }
  }
  lines.splice(insertAt ?? lines.length, 0, importLine);

  // Append to ALL_DESCRIPTORS (the line `];` right after the array header).
  const headerIdx = lines.findIndex((l) => l.startsWith('export const ALL_DESCRIPTORS'));
  const closeIdx = lines.findIndex((l, i) => i > headerIdx && l.trim() === '];');
  lines.splice(closeIdx, 0, `  ${exportName},`);

  await atomicWrite(INDEX_PATH, lines.join('\n'));
}
