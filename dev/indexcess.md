# Escaping the `index.html` Monolith — The Synthesized Proposal

## Overview

As CotSI grows, a single `index.html` becomes unmanageable: hard to navigate, impossible to reuse, fragile when mixing static content with dynamic rendering. This proposal replaces it with **one `.html` file per component**, fetched at runtime, cached, and cloned as `DocumentFragment`s.

**No build step. No bundler. No HTML strings in JavaScript.** Static layout stays in HTML; dynamic logic stays in JS. The two layers are cleanly separated using standard browser APIs.

---

## Core Architecture

Each component with significant static markup lives in its own `.html` file under `src/ui/templates/`. A tiny loader (`templateLoader.js`) fetches them on demand, caches the parsed `<template>` content, and returns a fresh `DocumentFragment` clone per call.

**How it works at a glance:**

1. `fetch()` retrieves the `.html` file as a string.
2. A `<template>` element parses it — no `innerHTML` into the live DOM.
3. The parsed `DocumentFragment` is cached.
4. Each call returns a **clone** of the cached fragment, safe to mutate and append.

---

## Directory Layout

```
src/ui/
  templates/
    modalShell.html
    combatModal.html
    dispatchModal.html
    setupScreen.html
    rewardModal.html
    headerPanel.html
    leftPanel.html
    rightPanel.html
    logPanel.html
    toast.html
    mapTooltip.html
    heptagramWidget.html
  templateLoader.js          ← new module
  domBuilder.js              ← unchanged
  …
```

Encourage **one template per UI component** with significant static HTML. Tiny wrappers can stay inside `domBuilder`, but any structure with multiple children, classes, or inline SVG markup should move to a template.

---

## `templateLoader.js` — The Module

```javascript src/ui/templates/templateLoader.js
/**
 * Minimal template loader — fetches .html files, caches as DocumentFragment.
 *
 * Returns { frag, refs } where:
 *   frag   – a fresh DocumentFragment clone, safe to mutate and append
 *   refs   – auto-collected map of [data-ref] elements (optional convenience)
 *
 * Usage:
 *   import { loadTemplate } from './templateLoader.js';
 *   const { frag, refs } = await loadTemplate('modalShell');
 *   refs.modalBody.append(myContentEl);
 */

const CACHE = new Map();

// Base URL resolves to this module's sibling `templates/` directory,
// regardless of where the app is served from (import.meta.url is safe).
const BASE_URL = new URL(
  './templates/',
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
```

### Key design decisions explained

| Decision | Why |
|----------|-----|
| `import.meta.url` | Resolves relative to `templateLoader.js` itself, not the page URL. Safe when deployed to any path or subdirectory. |
| Dev cache buster (`?t=${Date.now()}`) | Prevents stale browser cache during development. Never fires in production — no performance cost. |
| Returns `{ frag, refs }` | The `data-ref` auto-collection eliminates `querySelector` soup for complex templates. The object form is non-breaking: callers can destructure what they need. |
| `preloadTemplates(names)` | Keeps bootstrap explicit about critical vs. lazy templates. |

---

## Usage Patterns

### Pattern 1: Basic shell + dynamic body

```javascript src/ui/modals/modalShell.js
import { loadTemplate } from '../templates/templateLoader.js';

export async function showModal(contentEl) {
  const { frag, refs } = await loadTemplate('modalShell');

  // refs.modalBody is the <div data-ref="modalBody"> element
  refs.modalBody.append(contentEl);

  document.getElementById('game-root').append(frag);
}
```

The template (`modalShell.html`):

```html src/ui/templates/modalShell.html
<div class="modal-shell hidden">
  <div class="modal-backdrop" data-action="closeModal"></div>
  <div class="modal-content">
    <header class="modal-header">
      <h2 class="modal-title"></h2>
      <button class="modal-close" data-action="closeModal">&times;</button>
    </header>
    <div data-ref="modalBody" class="modal-body"></div>
  </div>
</div>
```

Notice: no `<template>` tag in the source HTML. The loader wraps it. Notice: `data-ref` instead of `id`, so multiple instances never collide.

### Pattern 2: Panel that re-renders frequently

```javascript src/ui/panels/leftPanel.js
import { loadTemplate } from '../templates/templateLoader.js';
import { h } from '../domBuilder.js';

let _template; // lazy — fetched on first render

export async function renderLeftPanel(champ) {
  if (!_template) {
    _template = await loadTemplate('leftPanel');
  }

  // Clone from the cached template
  const { frag, refs } = _template; // .cloneNode(true) already applied by loadTemplate
  // Actually we need the clone each time:
  const { frag, refs } = await loadTemplate('leftPanel');
  // ^ loadTemplate always returns a clone, so this is fine

  refs.champName.textContent = champ.name;

  champ.inventory.forEach(item => {
    refs.inventoryList.append(
      h('li', { class: 'item' }, item.name)
    );
  });

  document.getElementById('left-panel').replaceChildren(frag);
}
```

The template (`leftPanel.html`):

```html src/ui/templates/leftPanel.html
<section class="left-panel">
  <h3 data-ref="champName"></h3>
  <ul data-ref="inventoryList" class="inventory"></ul>
  <footer class="panel-footer">
    <button data-action="openDispatch">Dispatch</button>
  </footer>
</section>
```

### Pattern 3: No `data-ref` needed (simple templates)

For a one-off tooltip or toast, just use the fragment directly:

```javascript
const { frag } = await loadTemplate('toast');
frag.querySelector('.toast-text').textContent = message;
document.getElementById('toast-container').append(frag);
```

The `data-ref` system is **optional** — use it when a template has many dynamic parts, skip it for simple shells.

---

## Bootstrapping & Lifecycle

### Critical preloads (bootstrap phase)

```javascript src/runtime/bootstrap.js
import { preloadTemplates } from '../ui/templates/templateLoader.js';

export async function bootstrap() {
  try {
    await preloadTemplates([
      'setupScreen',
      'modalShell',
      'headerPanel',
      'leftPanel',
      'rightPanel',
      'logPanel',
    ]);
  } catch (err) {
    // Fatal error — templates didn't load. Show a clear message.
    document.body.innerHTML = `
      <div style="padding:2rem;font-family:monospace;color:red;">
        Failed to load UI templates: ${err.message}<br>
        Check that the server is running and src/ui/templates/ exists.
      </div>`;
    throw err; // Prevent the game from continuing in a broken state
  }

  // Remove loading indicator
  document.getElementById('initial-loader')?.remove();

  // … proceed with setup screen rendering
}
```

### Lazy templates (loaded on demand)

Templates not needed on the first screen should be fetched when the relevant feature is triggered:

```javascript
// Inside combat start logic:
await preloadTemplates(['combatModal', 'rewardModal']);
```

This keeps bootstrap fast and avoids fetching templates the user might never see.

### Loading indicator

Keep a minimal spinner in `index.html` that gets removed after the critical preload:

```html
<!-- index.html -->
<body>
  <div id="game-root"></div>
  <div id="initial-loader">Loading the Interregnum…</div>
</body>
```

---

## The Gotchas (And How to Avoid Them)

### 1. SVG namespace issues

The `<template>` element correctly switches to the SVG namespace when it encounters `<svg>`, but **test this first** with your actual SVG markup. If you hit rendering issues (SVG appears as an empty box), wrap your SVG content explicitly:

```html
<!-- ✅ Explicit namespace — bulletproof -->
<svg xmlns="http://www.w3.org/2000/svg">
  <!-- your paths, polygons, etc. -->
</svg>
```

**Always test** each SVG template by cloning, appending to the DOM, and inspecting the result in DevTools. The HTML parser transforms markup in ways that aren't always obvious from looking at the string.

### 2. Relative URLs break in fetched HTML

```html
<!-- ❌ Breaks silently when fetched from src/ui/templates/ -->
<img src="./icons/champion.png">
<link rel="stylesheet" href="./leftPanel.css">
<use href="./icons.svg#sword">
```

`./` resolves relative to the `.html` file's URL, not the page URL. Your images 404, stylesheets don't load, SVG references fail.

**Recommendation**: Templates contain **structural HTML only**. All CSS loads once from `index.html`. All images and icon references are injected dynamically by JavaScript (or use absolute paths like `/src/ui/icons/champion.png`). This eliminates the problem entirely.

### 3. No IDs in templates

After cloning a template twice, you'd have duplicate `id` attributes. Use `data-ref` or classes instead:

```html
<!-- ✅ Good -->
<button class="modal-close" data-action="closeModal">&times;</button>
<div data-ref="modalBody" class="modal-body"></div>

<!-- ❌ Bad — duplicates after clone -->
<button id="modal-close" data-action="closeModal">&times;</button>
<div id="modal-body" class="modal-body"></div>
```

### 4. DocumentFragment empties on append

```javascript
const { frag } = await loadTemplate('myPanel');
document.getElementById('app').append(frag);
// frag is now empty — its children were moved into the DOM
// .querySelector on frag now returns null
```

**Store references before appending**, or query from the parent after appending. The `data-ref` pattern (which collects references from the fragment before it's appended) handles this automatically.

### 5. Avoid deeply nested template loading

If `combatModal.html` tries to load `healthBar.html` inside itself via JS, you get a network waterfall. Instead, preload related templates together:

```javascript
// ✅ Do this
await Promise.all([
  loadTemplate('combatModal'),
  loadTemplate('healthBar'),
  loadTemplate('rewardModal'),
]);

// ❌ Not this — no nested fetch() calls inside template code
```

---

## Migration Path

1. **Add `templateLoader.js`** — one file, zero dependencies.
2. **Pick the biggest fragment** in `index.html` (likely `#setup-screen` or modal skeletons) and move it to `src/ui/templates/setupScreen.html`. Replace the original with a placeholder `<div id="setup-screen-root"></div>`.
3. **Update the JS code** that references the static HTML — change `document.getElementById('setupScreen')` to fetching the template and rendering into the placeholder.
4. **Rinse, repeat** — one fragment per change, test each step.
5. **End state** — `index.html` becomes a minimal shell:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Champions of the Supernal Interregnum</title>
  <link rel="stylesheet" href="styles/codex.css">
  <link rel="preload" href="assets/fonts/cinzel.woff2" as="font" crossorigin>
</head>
<body>
  <div id="game-root"></div>
  <div id="initial-loader">Loading the Interregnum…</div>
  <script type="module" src="src/entrypoint.js"></script>
</body>
</html>
```

---

## Why This Approach Wins

| Concern | How it's addressed |
|---------|-------------------|
| HTML in JS strings | Eliminated — HTML stays in `.html` files |
| Build step | None — plain `fetch`, no bundler |
| Single-file monolith | Eliminated — one file per component |
| Separation of concerns | Static layout in `.html`, dynamic logic in `.js` |
| Reusability | Templates are cloned per instance; multiple modals/tooltips share one source |
| Performance | `fetch` cache + `cloneNode` — sub-millisecond after first load |
| Dev ergonomics | Cache buster prevents stale files in dev |
| Production correctness | No cache buster, no dev paths; `import.meta.url` is deployment-agnostic |
| Ergonomics on complex templates | `data-ref` system eliminates `querySelector` soup |
| Error resilience | Preload with explicit fail-fast during bootstrap |
| Scalability | New features get their own `.html` + `.js` pair, as conventions already recommend |

---

## What Was Left Out and Why

| Idea | Source | Decision |
|------|--------|----------|
| Synchronous XHR fallback | `indexcess_assess.md` | Overkill. The async bootstrap is fine — the setup screen is the first thing the user sees, and a 10ms fetch on localhost is imperceptible. |
| Service worker caching | `indexcess_assess.md` | Premature optimization. If template loading becomes a bottleneck later, add it then. |
| `base` attribute URL rewriting | `indexcess_review.md` | Fragile and complex. The "structural HTML only" rule solves the problem more cleanly. |
| Explicit `<template>` tags in `.html` files | Internal consideration | Unnecessary — the loader wraps content in `<template>` internally. The source files are just plain HTML fragments. |

---

## Final Verdict

This pattern gives CotSI a **frameworkless, zero-build-step, scalable UI architecture** that preserves separation of concerns and fits the existing codebase like a glove. The three additions to the original idea — `import.meta.url` for safe pathing, `data-ref` for ergonomic wiring, and explicit preload/error handling for resilience — bulletproof it against the real-world pitfalls that would otherwise surface weeks after adoption.