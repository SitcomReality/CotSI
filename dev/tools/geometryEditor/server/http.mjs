/**
 * http.mjs — HTTP plumbing for the save server: JSON responses, static-file
 * serving (with path traversal guards), and the capped request-body reader.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, MAX_BODY, MIME } from './paths.mjs';

/** A JSON response (CORS-open, no-store — the editor probes it often). */
export function json(res, status, payload) {
  const text = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

/** A raw static response (CORS-open, no-cache — edited data files must show on refresh). */
export function sendStatic(res, status, contentType, body) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache', // dev: edited data files must show on refresh
  });
  res.end(body);
}

/** Read the request body, capped at MAX_BODY bytes. */
export function readBody(req) {
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

/** Serve a static file from the repo root, resolving '/' → index.html. */
export async function serveStatic(res, urlPath) {
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
