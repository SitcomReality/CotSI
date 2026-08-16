/**
 * saveToGame.js — The Save-to-game flow: server probe, the save-review diff
 * gate, and the POST /save handoff.
 *
 * Saves the current descriptor into the game's data files through the save
 * server (dev/tools/geometryEditor/saveServer.sh). The button stays disabled
 * until a /save/status probe confirms the server is up; before writing, the
 * user reviews a side-by-side diff of the data file on disk vs what this save
 * would emit (the same emitter the server runs) — the modal lives in
 * saveReviewModal.js. The committed icon-atlas refresh (atlasSave.js) runs
 * after a successful save. `els` carries the button + status/error refs.
 */
import { S } from '../../state.js';
import { activeVariant } from '../variantQuery.js';
import { ENTITY_KINDS } from '../../entityView.js';
import { emitDescriptorModule, emitVariantModule } from '../../emitDescriptor/index.js';
import {
  normalizeDescriptor,
  validateDescriptor,
} from '../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { SAMPLE_OBJECTS, syncSampleObject } from '../../sampleObjects.js';
import { renderObjectList } from '../objectBrowser/index.js';
import { openDiffModal } from './saveReviewModal.js';
import { refreshIconAtlas } from './atlasSave.js';

/** The data-file path the descriptor saves to, categorized by kind:
 *  data/decor/<id>.js, data/features/<id>.js, data/items/<id>.js, or
 *  data/<id>.js for entities (which save their variant via variantTargetFile). */
export function targetFile(d) {
  if (d.kind === 'decor' || d.kind === 'mountain') return `decor/${d.id}.js`;
  if (d.kind === 'feature') return `features/${d.id}.js`;
  if (d.kind === 'item') return `items/${d.id}.js`;
  return `${d.id}.js`;
}

/** The per-variant data-file path for entity kinds (the table-driven save
 *  convention the server mirrors): mobs/<archetype>.js, bases/<faction>.js,
 *  champions/<faction>.js. Null for tile-driven objects — they save the whole
 *  descriptor to data/<id>.js. */
export function variantTargetFile(d, variantId) {
  if (d.kind === 'mob') return `mobs/${variantId}.js`;
  if (d.kind === 'base') return `bases/${variantId.toLowerCase()}.js`;
  if (d.kind === 'champion') return `champions/${variantId.toLowerCase()}.js`;
  return null;
}

/** Default port the save server binds (saveServer) — the cross-origin
 *  fallback for pages served by a different dev server (e.g. Live Server). */
const SAVE_FALLBACK_ORIGIN = 'http://127.0.0.1:8000';

/**
 * Wire the Save button to the save server. The editor page may be served by
 * any static dev server (e.g. Live Server on :5500); the save endpoints live
 * on the save server, so the probe tries the page's own origin first, then
 * falls back to the save server's default port.
 */
export function bindSaveToGame(els) {
  let saveAvailable = false;
  let saveBase = ''; // '' = same origin as the page; otherwise an absolute origin

  const enable = (on, base) => {
    saveAvailable = on;
    saveBase = base;
    els.saveBtn.disabled = !on;
    els.saveBtn.title = on
      ? 'Save this object into the game\'s data files'
      : 'Saving needs the dev server — run dev/tools/geometryEditor/saveServer.sh';
    // Offline is a persistent, colored warning in the header (the enabled Save
    // button is the positive signal when online); re-probing flips it live.
    els.saveStatus.hidden = on;
    els.saveStatus.textContent = 'Save server offline — run dev/tools/geometryEditor/saveServer.sh';
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
    const probe = async () => {
      const base =
        (await probeSaveBase('')) ?? (await probeSaveBase(SAVE_FALLBACK_ORIGIN));
      enable(base !== null, base ?? '');
    };
    await probe();
    // Keep watching — starting saveServer.sh after the page load should enable
    // Save without a reload, and a dying server should warn immediately.
    setInterval(probe, 10000);
  })();

  /**
   * Ask before saving. The "after" side is emitted locally with the same
   * emitter the server uses; the "before" side comes from GET /save/descriptor
   * (fresh import → normalize → emit). A missing on-disk file (404) diffs
   * against an empty source so a new object shows its full content; any other
   * probe failure falls back to the old window.confirm so saving never
   * dead-ends. Resolves true when the user proceeds.
   */
  async function reviewSave(d, { isNew, file, variantId }) {
    const after = variantId
      ? emitVariantModule(d, variantId, file)
      : emitDescriptorModule(d, file);
    let before = null;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2000);
      const query = variantId
        ? `?id=${encodeURIComponent(d.id)}&variant=${encodeURIComponent(variantId)}`
        : `?id=${encodeURIComponent(d.id)}`;
      const r = await fetch(`${saveBase}/save/descriptor${query}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (r.status === 404) before = ''; // not registered yet — a brand-new file
      else if (r.ok) {
        const j = await r.json();
        before = j?.source ?? null;
      }
    } catch {
      before = null;
    }
    if (before === null) {
      return isNew
        ? window.confirm(
            `Save "${d.displayName}" as a NEW object?\n\n` +
            `This creates data/${file} and registers it in data/index.js.`)
        : window.confirm(`Save "${d.displayName}" to data/${file}?`);
    }
    return openDiffModal({ file, before, after });
  }

  els.saveBtn.addEventListener('click', async () => {
    if (!saveAvailable) return;
    if (!S.descriptor) return;

    // Normalize first — the live session may carry fields the schema rejects
    // (e.g. root-only `y`/`lift` written onto a root group before the
    // inspector hid those fields); normalizeDescriptor folds them into the
    // canonical form (y/lift → localPos.y) so a stale edit saves with its
    // height preserved instead of erroring.
    const d = normalizeDescriptor(S.descriptor);

    const errors = validateDescriptor(d);
    if (errors.length > 0) {
      els.loadError.textContent = `Cannot save — invalid descriptor:\n${errors.join('\n')}`;
      els.loadError.classList.remove('ok');
      return;
    }

    const isNew = !SAMPLE_OBJECTS.some((o) => o.id === d.id);
    const body = { descriptor: d };
    let file = targetFile(d);
    // Entity kinds save ONLY the active variant to its own file (mobs/
    // bases/ champions/) — the table-driven barrels are hand-composed and
    // never rewritten. Tile-driven objects save the whole descriptor.
    const av = activeVariant();
    if (ENTITY_KINDS.has(d.kind) && av) {
      if (d.kind === 'mob' && !S.entity.archetype) {
        els.loadError.textContent = 'Pick a mob type in the browser first — the archetype drives the save target.';
        els.loadError.classList.remove('ok');
        return;
      }
      const variantFile = variantTargetFile(d, av.id);
      if (variantFile) {
        body.activeVariant = av.id;
        file = variantFile;
      }
    }
    const confirmed = await reviewSave(d, { isNew, file, variantId: body.activeVariant ?? null });
    if (!confirmed) return;

    try {
      const res = await fetch(saveBase + '/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        S.descriptor = d; // session now matches the saved (normalized) file
        syncSampleObject(d); // the browser list shows the saved name/id, not a stale sample
        renderObjectList(els.objectFilter.value);
        els.loadError.textContent =
          `Saved data/${json.file} — refresh the game to see it.` +
          (json.wasNew ? ' (Reload this page to browse the new object.)' : '') +
          (json.unregistered ? ' (The barrel data/index.js is hand-composed — add the variant import there to see it in-game.)' : '');
        els.loadError.classList.add('ok');
        await refreshIconAtlas(saveBase, els);
      } else {
        const detail = json?.errors?.length ? `\n${json.errors.join('\n')}` : '';
        els.loadError.textContent = `Save failed: ${json?.error ?? `HTTP ${res.status}`}${detail}`;
        els.loadError.classList.remove('ok');
      }
    } catch (err) {
      els.loadError.textContent = `Save failed: ${err.message}`;
      els.loadError.classList.remove('ok');
    }
  });
}
