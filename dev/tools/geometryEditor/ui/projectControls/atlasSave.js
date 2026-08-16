/**
 * atlasSave.js — Rebuild the committed icon atlas (WebGL, in-browser) and
 * post it to the save server's /save/atlas endpoint, updating #atlas-status
 * as a loading indicator.
 */
import { el } from '../formControls/index.js';
import { buildIconAtlas } from '../../atlasBuild.js';

/** Rebuild the icon atlas and POST it to `base + '/save/atlas'`. */
export async function refreshIconAtlas(base, els) {
  const status = els.atlasStatus;
  const show = (busy, text) => {
    status.hidden = false;
    status.textContent = '';
    if (busy) status.append(el('span', 'dot'));
    status.append(document.createTextNode(text));
  };
  show(true, 'Building icon atlas…');
  try {
    const { dataUrl, manifest } = await buildIconAtlas({
      onProgress: (fraction) => show(true, `Building icon atlas… ${Math.round(fraction * 100)}%`),
    });
    const res = await fetch(base + '/save/atlas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, manifest }),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.ok) show(false, 'Icon atlas saved');
    else show(false, `Atlas failed: ${json?.error ?? `HTTP ${res.status}`}`);
  } catch (err) {
    show(false, `Atlas failed: ${err.message}`);
  }
}
