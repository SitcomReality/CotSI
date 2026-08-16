/**
 * atlas.mjs — The POST /save/atlas handler: write the committed icon atlas
 * (the editor's WebGL render of every portrait/icon) as
 * assets/icons/portraitAtlas.png + portraitAtlas.json. The PNG comes in as a
 * data URL; the manifest maps each atlas key to its pixel rect.
 */
import { mkdir } from 'node:fs/promises';

import { ATLAS_DIR, ATLAS_PNG, ATLAS_JSON } from './paths.mjs';
import { atomicWrite } from './write.mjs';
import { json } from './http.mjs';

/**
 * Handle POST /save/atlas: validate the PNG data URL + manifest and write
 * both committed atlas files atomically.
 */
export async function handleAtlasSave(res, body) {
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return json(res, 400, { error: 'request body must be valid JSON' });
  }
  const { dataUrl, manifest } = payload ?? {};
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) {
    return json(res, 400, { error: 'missing "dataUrl" (a PNG data URL)' });
  }
  if (!manifest || typeof manifest !== 'object') {
    return json(res, 400, { error: 'missing "manifest" object' });
  }

  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const png = Buffer.from(base64, 'base64');
  if (png.length === 0 || !png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return json(res, 400, { error: 'dataUrl did not decode to a PNG' });
  }

  await mkdir(ATLAS_DIR, { recursive: true });
  await atomicWrite(ATLAS_PNG, png);
  await atomicWrite(ATLAS_JSON, JSON.stringify(manifest, null, 2) + '\n');
  const count = Object.keys(manifest.entries ?? {}).length;
  console.log(`[save/atlas] wrote ${count} entries → assets/icons/portraitAtlas.{png,json}`);
  return json(res, 200, { ok: true, entries: count });
}
