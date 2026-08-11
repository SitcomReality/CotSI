/**
 * boundsSection.js — World-bounds readout for the part inspector.
 *
 * The exact AABB the viewport wireframe draws (union over every instance of
 * every descendant leaf), so the numbers always match the highlight. Groups
 * report their children's union; a leaf reports its own.
 */
import { el, row } from '../formControls.js';
import { descendantLeafIds } from '../partTree/index.js';
import { worldAABBForPartIds } from '../../preview/index.js';
import { section } from './sectionShell.js';

/**
 * World bounds readout — the exact AABB the viewport wireframe draws (union
 * over every instance of every descendant leaf), so the numbers always match
 * the highlight. Groups report their children's union; a leaf reports its own.
 */
function renderBoundsSection(container, entry, ctx) {
  const sec = section('bounds', container);
  const box = worldAABBForPartIds(descendantLeafIds(entry));
  if (!box) {
    sec.append(el('div', 'hint', '— no rendered geometry for this node'));
    return;
  }
  const fmt = (n) => (Math.round(n * 1000) / 1000).toFixed(3);
  const tri = (v) => `${fmt(v.x)}, ${fmt(v.y)}, ${fmt(v.z)}`;
  sec.append(row('min', el('code', 'mono', tri(box.min))));
  sec.append(row('max', el('code', 'mono', tri(box.max))));
  sec.append(row('center', el('code', 'mono', tri(box.center))));
  sec.append(row('size', el('code', 'mono', tri(box.size))));
}

export { renderBoundsSection };
