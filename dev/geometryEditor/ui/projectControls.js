/**
 * projectControls.js — Project-level actions: save, download, load JSON, create.
 *
 * Wires the chrome header buttons. Saves the current descriptor into the
 * game's data files through the save server (dev/geometryEditor/saveServer.sh);
 * downloads it as JSON as a fallback; loads a normalized/validated descriptor
 * from a file; and swaps the session descriptor for a fresh template
 * (objectTemplates.js). `ctx` supplies the post-change hooks (renderAll /
 * onEdit / onLoaded); `els` carries the button + error refs.
 */
import { S } from '../state.js';
import { el } from './formControls.js';
import {
  normalizeDescriptor,
  validateDescriptor,
} from '../../../src/render/hexmap3d/features/descriptors/schema.js';
import { DESCRIPTOR_SOURCES } from '../../../src/render/hexmap3d/features/descriptors/data/index.js';
import { SAMPLE_OBJECTS } from '../sampleObjects.js';
import { newObjectTemplate } from './objectTemplates.js';

/** The data-file path the descriptor id saves to (the per-object convention,
 *  or the mapped legacy file for DESCRIPTOR_SOURCES ids like knots.js). */
function targetFile(id) {
  return DESCRIPTOR_SOURCES[id] ?? `${id}.js`;
}

/** Default port the save server binds (saveServer.mjs) — the cross-origin
 *  fallback for pages served by a different dev server (e.g. Live Server). */
const SAVE_FALLBACK_ORIGIN = 'http://127.0.0.1:8000';

/**
 * Save the current descriptor into the game's files. The save server runs the
 * same validation + emission the editor uses, writes data/<file> atomically,
 * and registers brand-new ids in data/index.js. The button stays disabled
 * until a /save/status probe confirms the server is up.
 *
 * The editor page may be served by any static dev server (e.g. Live Server on
 * :5500); the save endpoints live on the save server, so the probe tries the
 * page's own origin first, then falls back to the save server's default port.
 */
function bindSaveToGame(els) {
  let saveAvailable = false;
  let saveBase = ''; // '' = same origin as the page; otherwise an absolute origin

  const enable = (on, base) => {
    saveAvailable = on;
    saveBase = base;
    els.saveBtn.disabled = !on;
    els.saveBtn.title = on
      ? 'Save this object into the game\'s data files'
      : 'Saving needs the dev server — run dev/geometryEditor/saveServer.sh';
  };

  /** Probe one candidate base ('' = the page's own origin) for /save/status. */
  async function probeSaveBase(base) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    try {
      const r = await fetch(`${base}/save/status`, { signal: ctrl.signal });
      if (!r.ok) return null;
      const status = await r.json();
      return status?.ok ? base : null;
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }

  (async () => {
    const base =
      (await probeSaveBase('')) ?? (await probeSaveBase(SAVE_FALLBACK_ORIGIN));
    enable(base !== null, base ?? '');
  })();

  els.saveBtn.addEventListener('click', async () => {
    if (!saveAvailable) return;
    const d = S.descriptor;
    if (!d) return;

    const errors = validateDescriptor(d);
    if (errors.length > 0) {
      els.loadError.textContent = `Cannot save — invalid descriptor:\n${errors.join('\n')}`;
      els.loadError.classList.remove('ok');
      return;
    }

    const isNew = !SAMPLE_OBJECTS.some((o) => o.id === d.id);
    const file = targetFile(d.id);
    const confirmed = isNew
      ? window.confirm(
          `Save "${d.displayName}" as a NEW object?\n\n` +
          `This creates data/${file} and registers it in data/index.js.`)
      : window.confirm(`Save "${d.displayName}" to data/${file}?`);
    if (!confirmed) return;

    try {
      const res = await fetch(saveBase + '/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor: d }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        els.loadError.textContent =
          `Saved data/${json.file} — refresh the game to see it.` +
          (json.wasNew ? ' (Reload this page to browse the new object.)' : '');
        els.loadError.classList.add('ok');
      } else {
        els.loadError.textContent = `Save failed: ${json?.error ?? `HTTP ${res.status}`}`;
        els.loadError.classList.remove('ok');
      }
    } catch (err) {
      els.loadError.textContent = `Save failed: ${err.message}`;
      els.loadError.classList.remove('ok');
    }
  });
}

/** Swap the session descriptor for a fresh template and reset selection. */
function createObject(kind, els, ctx) {
  const template = normalizeDescriptor(newObjectTemplate(kind));
  const errors = validateDescriptor(template);
  if (errors.length > 0) {
    els.loadError.textContent = `Template error:\n${errors.join('\n')}`;
    return;
  }
  S.descriptor = template;
  S.selectedPartId = null;
  S.variantId = null;
  if (kind === 'mob') S.entity.archetype = template.variants[0].id; // keep picker + preview on the new variant
  els.loadError.textContent = '';
  ctx.renderAll();
  ctx.onEdit();
  ctx.onLoaded(); // object browser shows the Custom (loaded) item
}

/**
 * Wire the chrome header buttons to their project actions.
 * @param {object} els - the editor's DOM refs (downloadBtn, loadFile, loadError, newFeatureBtn, newDecorBtn, newMobBtn)
 * @param {object} ctx - panel hooks: renderAll / onEdit / onLoaded
 */
export function bindProjectControls(els, ctx) {
  bindSaveToGame(els);

  els.downloadBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(S.descriptor, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = `${S.descriptor.id}.descriptor.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  els.loadFile.addEventListener('change', () => {
    const file = els.loadFile.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        // Normalize first — legacy shape names (knot/snowperson) and the legacy
        // scaleXZ/stretchXZ fields resolve in normalizeDescriptor, so validation
        // runs on the canonical result and old downloads still load.
        const normalized = normalizeDescriptor(parsed);
        const errors = validateDescriptor(normalized);
        if (errors.length > 0) {
          els.loadError.textContent = `Invalid descriptor:\n${errors.join('\n')}`;
          return;
        }
        S.descriptor = normalized;
        S.selectedPartId = null;
        S.variantId = null;
        els.loadError.textContent = '';
        ctx.renderAll();
        ctx.onEdit();
        ctx.onLoaded(); // object browser shows the Custom (loaded) item
      } catch (err) {
        els.loadError.textContent = `Load failed: ${err.message}`;
      }
    };
    reader.readAsText(file);
    els.loadFile.value = '';
  });

  els.newFeatureBtn.addEventListener('click', () => createObject('feature', els, ctx));
  els.newDecorBtn.addEventListener('click', () => createObject('decor', els, ctx));
  els.newMobBtn.addEventListener('click', () => createObject('mob', els, ctx));
}
