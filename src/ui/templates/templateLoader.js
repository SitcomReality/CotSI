/**
 * Minimal template loader — fetches .html files, caches as DocumentFragment.
 *
 * Returns { frag, refs } where:
 *   frag   — a fresh DocumentFragment clone, safe to mutate and append
 *   refs   — auto-collected map of [data-ref] elements (optional convenience)
 *
 * Usage:
 *   import { loadTemplate } from './templateLoader.js';
 *   const { frag, refs } = await loadTemplate('modalShell');
 *   refs.modalBody.append(myContentEl);
 *
 * URL resolution uses import.meta.url so it works regardless of deployment
 * path. Dev mode appends a cache-busting query parameter.
 */

const CACHE = new Map();

// Base URL resolves to this module's directory — templates live here
// alongside the loader, regardless of where the app is served from.
// (import.meta.url is safe and avoids relative-path fragility.)
const BASE_URL = new URL(
  './',
  import.meta.url
).href;

const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

/**
 * @param {string} name  basename without extension, e.g. 'modalShell'
 * @returns {Promise<{ frag: DocumentFragment, refs: Record<string, Element> }>}
 */
export async function loadTemplate(name) {
  if (!CACHE.has(name)) {
    const url = isDev
      ? `${BASE_URL}${name}.html?t=${Date.now()}`
      : `${BASE_URL}${name}.html`;

    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(
        `Template "${name}" not found (${resp.status})\n` +
        `Expected at: ${url}`
      );
    }

    const html = await resp.text();
    const wrapper = document.createElement('template');
    wrapper.innerHTML = html;
    CACHE.set(name, wrapper.content);
  }

  // Clone so callers can mutate without dirtying the cache.
  const frag = CACHE.get(name).cloneNode(true);

  // Auto-gather [data-ref] elements for convenient access.
  const refs = {};
  frag.querySelectorAll('[data-ref]').forEach(el => {
    refs[el.dataset.ref] = el;
  });

  return { frag, refs };
}

/**
 * Preload multiple templates in parallel. Use during bootstrap
 * to ensure critical UI is ready before the first render.
 *
 * @param {string[]} names
 * @returns {Promise<void>}
 */
export function preloadTemplates(names) {
  return Promise.all(names.map(loadTemplate)).then(() => {});
}