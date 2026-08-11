/**
 * projectControls.js — Project-level actions: save, download, load JSON, create.
 *
 * Wires the chrome header buttons. Saves the current descriptor into the
 * game's data files through the save server (dev/tools/geometryEditor/saveServer.sh);
 * downloads it as JSON as a fallback; loads a normalized/validated descriptor
 * from a file; and swaps the session descriptor for a fresh template
 * (objectTemplates.js). `ctx` supplies the post-change hooks (renderAll /
 * onEdit / onLoaded); `els` carries the button + error refs.
 */
import { S } from '../state.js';
import { el } from './formControls.js';
import { activeVariant } from './variantQuery.js';
import { ENTITY_KINDS } from '../entityView.js';
import { diffLines } from './lineDiff.js';
import { emitDescriptorModule, emitVariantModule } from '../emitDescriptor.js';
import {
  normalizeDescriptor,
  validateDescriptor,
} from '../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { SAMPLE_OBJECTS } from '../sampleObjects.js';
import { newObjectTemplate } from './objectTemplates.js';

/** The data-file path the descriptor id saves to (the per-object convention
 *  data/<id>.js). */
function targetFile(id) {
  return `${id}.js`;
}

/** The per-variant data-file path for entity kinds (the table-driven save
 *  convention the server mirrors): mobs/<archetype>.js, bases/<faction>.js,
 *  champions/<faction>.js. Null for tile-driven objects — they save the whole
 *  descriptor to data/<id>.js. */
function variantTargetFile(d, variantId) {
  if (d.kind === 'mob') return `mobs/${variantId}.js`;
  if (d.kind === 'base') return `bases/${variantId.toLowerCase()}.js`;
  if (d.kind === 'champion') return `champions/${variantId.toLowerCase()}.js`;
  return null;
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
      : 'Saving needs the dev server — run dev/tools/geometryEditor/saveServer.sh';
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

  // ── Save-review modal ────────────────────────────────────────────────────
  // Replaces the bare window.confirm: a before/after side-by-side diff of the
  // data file on disk vs what this save would write (both emitted through the
  // same emitter the server runs, so the diff shows the real content change).
  // The overlay shell reuses the object browser's .floating pattern.

  let modal = null; // lazily-built DOM, null until the first save
  let modalResolver = null;

  function ensureModal() {
    if (modal) return modal;
    const panel = el('div', 'floating diff-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'save-diff-title');

    const fileEl = el('span', 'diff-file');
    const head = el('div', 'diff-head');
    head.append(el('h2', null, 'Review Save'), fileEl);
    const hint = el('div', 'diff-hint', 'Left: the data file on disk · Right: what this save writes. Save only proceeds on your confirmation.');
    const body = el('div', 'diff-body');
    const cancelBtn = el('button', null, 'Cancel');
    cancelBtn.type = 'button';
    const confirmBtn = el('button', 'create-btn', 'Save');
    confirmBtn.type = 'button';
    const actions = el('div', 'diff-actions');
    actions.append(cancelBtn, confirmBtn);
    panel.append(head, hint, body, actions);
    document.body.append(panel);

    const close = (result) => {
      panel.classList.remove('open');
      body.textContent = '';
      const resolve = modalResolver;
      modalResolver = null;
      if (resolve) resolve(result);
    };
    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('open')) close(false);
    });

    modal = { panel, fileEl, body, close };
    return modal;
  }

  /** Open the diff modal and resolve true/false with the user's choice. */
  function openDiffModal({ file, before, after }) {
    const m = ensureModal();
    const rows = diffLines(before, after);
    const changed = rows.filter((r) => r.type !== 'same').length;
    m.fileEl.textContent = `data/${file} · ${changed} line${changed === 1 ? '' : 's'} changed`;
    m.body.textContent = '';
    for (const row of rows) {
      const div = el('div', `diff-row ${row.type}`);
      div.append(el('pre', null, row.left ?? ''), el('pre', null, row.right ?? ''));
      m.body.append(div);
    }
    m.panel.classList.add('open');
    return new Promise((resolve) => { modalResolver = resolve; });
  }

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
    let file = targetFile(d.id);
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
        els.loadError.textContent =
          `Saved data/${json.file} — refresh the game to see it.` +
          (json.wasNew ? ' (Reload this page to browse the new object.)' : '') +
          (json.unregistered ? ' (The barrel data/index.js is hand-composed — add the variant import there to see it in-game.)' : '');
        els.loadError.classList.add('ok');
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
    // Normalize so a downloaded file re-loads cleanly (same canonical form the
    // save path writes; see bindSaveToGame).
    const blob = new Blob([JSON.stringify(normalizeDescriptor(S.descriptor), null, 2)], { type: 'application/json' });
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
