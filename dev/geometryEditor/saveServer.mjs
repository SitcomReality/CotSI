#!/usr/bin/env node
/**
 * saveServer.mjs — Dev server for the geometry editor's Save-to-game flow.
 *
 * Serves the repo statically (the editor page AND the game, so both work from
 * one origin) and exposes the save endpoints:
 *
 *   GET /save/status  → { ok: true, dataDir }        (editor probes this)
 *   POST /save        → { descriptor }               (writes to data/)
 *
 * The POST handler runs the game's own validateDescriptor, then emits the
 * module source through emitDescriptor.js (the same code the editor uses) and
 * writes it atomically into src/render/hexmap3d/worldObjects/descriptors/data/.
 * Existing objects are saved in place; brand-new ids create `data/<id>.js`
 * AND register it in data/index.js (import + ALL_DESCRIPTORS entry).
 *
 * The table-driven entity files (base.js, mob.js) are rejected — their
 * descriptors are derived from variant tables, not edited through the editor.
 *
 * Run from the repo root (see saveServer.sh for the node resolution):
 *   /run/host/usr/bin/node dev/geometryEditor/saveServer.mjs   # 127.0.0.1:8000
 *
 * Zero dependencies (node:http only). CORS is open so the page also works when
 * served from another origin (e.g. a different dev server) — the browser just
 * POSTs to http://127.0.0.1:8000/save.
 */
import http from 'node:http';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { SCHEMA_VERSION, validateDescriptor } from '../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { emitDescriptorModule, descriptorExportName } from './emitDescriptor.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_DIR = path.join(ROOT, 'src', 'render', 'hexmap3d', 'features', 'descriptors', 'data');
const INDEX_PATH = path.join(DATA_DIR, 'index.js');
const DATA_DIR_REL = path.relative(ROOT, DATA_DIR).replaceAll('\\', '/');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8000);
const MAX_BODY = 1024 * 1024; // 1 MB — descriptors are a few KB

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const TABLE_DRIVEN = new Set(['base.js', 'mob.js']);

const MIME = {
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

// ── Data-barrel access ───────────────────────────────────────────────────────

/** Import data/index.js fresh (it changes as new objects are registered). */
function importBarrel() {
  return import(pathToFileURL(INDEX_PATH).href + '?save=' + Date.now());
}

/** Atomically replace a file (write temp + rename, so a crash never leaves a
 *  half-written descriptor or barrel). */
async function atomicWrite(target, content) {
  const tmp = target + `.tmp-${process.pid}`;
  await writeFile(tmp, content);
  await rename(tmp, target);
}

// ── Save handler ─────────────────────────────────────────────────────────────

/**
 * Register a brand-new descriptor in data/index.js: insert its import (in the
 * alphabetical import block) and append its export to ALL_DESCRIPTORS.
 */
async function registerInBarrel(id, exportName) {
  const text = await readFile(INDEX_PATH, 'utf8');
  const lines = text.split('\n');
  const importLine = `import { ${exportName} } from './${id}.js';`;
  const spec = `'./${id}.js';`;

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

async function handleSave(res, body) {
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return json(res, 400, { error: 'request body must be valid JSON' });
  }
  const def = payload?.descriptor;
  if (!def || typeof def !== 'object' || Array.isArray(def)) {
    return json(res, 400, { error: 'missing "descriptor" object' });
  }

  // A long-running server caches schema.js from when it started. If the editor
  // (a fresh browser load) ships a newer schema than this process knows, the
  // validator below rejects new fields cryptically — say so plainly instead.
  if (typeof def.schemaVersion === 'number' && def.schemaVersion > SCHEMA_VERSION) {
    return json(res, 400, {
      error: `this descriptor is schema v${def.schemaVersion} but the save server only knows v${SCHEMA_VERSION} — restart saveServer.sh to load the current schema`,
    });
  }

  const errors = validateDescriptor(def);
  if (errors.length > 0) {
    return json(res, 400, { error: 'invalid descriptor', errors });
  }
  const id = def.id;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    return json(res, 400, { error: `id must match /^[A-Za-z0-9_-]+$/ (got "${id}")` });
  }

  const barrel = await importBarrel();
  const knownIds = new Set(barrel.ALL_DESCRIPTORS.map((d) => d.id));
  const isNew = !knownIds.has(id);
  const file = `${id}.js`;

  if (TABLE_DRIVEN.has(file)) {
    return json(res, 409, {
      error: `${file} is table-driven — ${id} is derived from BASE_VARIANTS / MOB_VARIANTS, not editable through the editor yet`,
    });
  }
  if (isNew && existsSync(path.join(DATA_DIR, file))) {
    return json(res, 409, {
      error: `data/${file} already exists but id "${id}" is not registered — pick a different id`,
    });
  }
  if (!isNew && !existsSync(path.join(DATA_DIR, file))) {
    return json(res, 409, {
      error: `descriptor "${id}" is registered but data/${file} is missing — restore it first`,
    });
  }

  const content = emitDescriptorModule(def, file);
  await atomicWrite(path.join(DATA_DIR, file), content);

  if (isNew) {
    await registerInBarrel(id, descriptorExportName(id));
    console.log(`[save] registered new object ${id} → data/${file}`);
  } else {
    console.log(`[save] updated ${id} → data/${file}`);
  }
  return json(res, 200, { ok: true, file, wasNew: isNew });
}

// ── HTTP plumbing ────────────────────────────────────────────────────────────

function json(res, status, payload) {
  const text = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

function sendStatic(res, status, contentType, body) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache', // dev: edited data files must show on refresh
  });
  res.end(body);
}

/** Read the request body, capped at MAX_BODY bytes. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function serveStatic(res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === '/') rel = '/index.html';
  if (rel.includes('\0') || rel.split('/').includes('..')) {
    return sendStatic(res, 400, 'text/plain; charset=utf-8', 'bad path');
  }
  const filePath = path.join(ROOT, rel);
  if (path.resolve(filePath) !== filePath || !filePath.startsWith(ROOT + path.sep)) {
    return sendStatic(res, 400, 'text/plain; charset=utf-8', 'bad path');
  }
  try {
    const body = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    sendStatic(res, 200, MIME[ext] ?? 'application/octet-stream', body);
  } catch {
    sendStatic(res, 404, 'text/plain; charset=utf-8', `not found: ${rel}`);
  }
}

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

  if (route === '/save/status') {
    return json(res, 200, { ok: true, dataDir: DATA_DIR_REL });
  }

  if (method === 'GET') {
    return serveStatic(res, url.pathname);
  }

  sendStatic(res, 405, 'text/plain; charset=utf-8', `method not allowed: ${method}`);
});

server.listen(PORT, HOST, () => {
  console.log(`geometry save server on http://${HOST}:${PORT}  (data → ${DATA_DIR_REL})`);
});
