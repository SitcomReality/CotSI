#!/usr/bin/env node
/**
 * server/index.mjs — Dev server for the geometry editor's Save-to-game flow.
 *
 * Serves the repo statically (the editor page AND the game, so both work from
 * one origin) and exposes the save endpoints:
 *
 *   GET  /save/status     → { ok: true, dataDir }        (editor probes this)
 *   POST /save            → { descriptor }               (writes to data/)
 *   POST /save/atlas      → { dataUrl, manifest }        (writes the icon atlas)
 *   GET  /save/descriptor → { source }                   (on-disk source for the review diff)
 *
 * The POST handlers run the game's own validateDescriptor, then emit the
 * module source through emitDescriptor (the same code the editor uses) and
 * write it atomically into src/render/hexmap3d/worldObjects/descriptors/data/.
 * Existing objects are saved in place; brand-new ids create `data/<id>.js`
 * AND register it in data/index.js (import + ALL_DESCRIPTORS entry).
 *
 * The table-driven entity files (mob.js, base.js, champion.js) are saved
 * VARIANT-SCOPED: the POST must carry the `activeVariant` being edited, and
 * only that variant's file is written — data/mobs/<archetype>.js,
 * data/bases/<faction>.js, or data/champions/<faction>.js. The barrel files
 * are never rewritten (their import lists are hand-composed).
 *
 * Run from the repo root (see saveServer.sh for the node resolution):
 *   /run/host/usr/bin/node dev/tools/geometryEditor/server/index.mjs   # 127.0.0.1:8000
 *
 * Zero dependencies (node:http only). CORS is open so the page also works when
 * served from another origin (e.g. a different dev server) — the browser just
 * POSTs to http://127.0.0.1:8000/save.
 *
 * Split across single-purpose modules in server/: paths.mjs (constants),
 * http.mjs (HTTP plumbing), write.mjs (atomic data writes + barrel
 * registration), save.mjs / atlas.mjs / descriptor.mjs (the three handlers);
 * this entry assembles the router and listens.
 */
import http from 'node:http';

import { HOST, PORT, DATA_DIR_REL } from './paths.mjs';
import { json, sendStatic, readBody, serveStatic } from './http.mjs';
import { handleSave, handleMotifSave } from './save.mjs';
import { handleAtlasSave } from './atlas.mjs';
import { handleDescriptorGet, handleMotifGet } from './descriptor.mjs';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const route = url.pathname;
  const method = req.method ?? 'GET';

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  if (route === '/save' && method === 'POST') {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return json(res, 413, { error: 'payload too large' });
    }
    try {
      return await handleSave(res, body);
    } catch (err) {
      console.error('[save] failed:', err);
      return json(res, 500, { error: `save failed: ${err.message}` });
    }
  }

  // Shared library motif save — a parts block written to data/motifs/, never a
  // descriptor. Routed separately so the barrel/snapshot/atlas side-effects of
  // a descriptor save never touch the motif library.
  if (route === '/save/motif' && method === 'POST') {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return json(res, 413, { error: 'payload too large' });
    }
    try {
      return await handleMotifSave(res, body);
    } catch (err) {
      console.error('[save/motif] failed:', err);
      return json(res, 500, { error: `motif save failed: ${err.message}` });
    }
  }

  if (route === '/save/atlas' && method === 'POST') {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return json(res, 413, { error: 'payload too large' });
    }
    try {
      return await handleAtlasSave(res, body);
    } catch (err) {
      console.error('[save/atlas] failed:', err);
      return json(res, 500, { error: `atlas save failed: ${err.message}` });
    }
  }

  if (route === '/save/status') {
    return json(res, 200, { ok: true, dataDir: DATA_DIR_REL });
  }

  // The editor's save-review modal: the CURRENT on-disk source for a
  // descriptor (or one of its variants) — fresh import → normalize → emit, so
  // the diff shows exactly what a save would change in the emitted form.
  if (route === '/save/descriptor' && method === 'GET') {
    return handleDescriptorGet(res, url);
  }

  // The editor's save-review modal for a shared library motif.
  if (route === '/save/motif' && method === 'GET') {
    return handleMotifGet(res, url);
  }

  if (method === 'GET') {
    return serveStatic(res, url.pathname);
  }

  sendStatic(res, 405, 'text/plain; charset=utf-8', `method not allowed: ${method}`);
});

server.listen(PORT, HOST, () => {
  console.log(`geometry save server on http://${HOST}:${PORT}  (data → ${DATA_DIR_REL})`);
});
