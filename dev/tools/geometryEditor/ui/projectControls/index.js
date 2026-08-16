/**
 * projectControls/index.js — Project-level actions: download, load JSON, and
 * create-from-template. The Save-to-game flow lives in saveToGame.js (server
 * probe + review diff + POST); this module wires the remaining chrome header
 * buttons and swaps the session descriptor for a fresh template
 * (objectTemplates.js). `ctx` supplies the post-change hooks (renderAll /
 * onEdit / onLoaded); `els` carries the button + error refs.
 */
import { S } from '../../state.js';
import { el } from '../formControls/index.js';
import {
  normalizeDescriptor,
  validateDescriptor,
} from '../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { newObjectTemplate } from '../objectTemplates.js';
import { bindSaveToGame } from './saveToGame.js';

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
  els.newItemBtn.addEventListener('click', () => createObject('item', els, ctx));
}
