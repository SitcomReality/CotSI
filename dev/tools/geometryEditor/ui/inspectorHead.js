/**
 * inspectorHead.js — Inspector header (title/meta + optional breadcrumb).
 *
 * Shared by the object-level header (objectControls.js) and the selected-part
 * header (partInspector.js); the parts list above has its own slim header
 * (see partList.js).
 */
import { el } from './formControls.js';

/** Inspector head: title/meta (and optional breadcrumb back to the object). */
export function inspectorHead(title, meta, back) {
  const head = el('div', 'inspector-head');
  const main = el('div', 'inspector-head-main');
  if (back) main.append(back);
  main.append(el('div', 'inspector-title', title));
  if (meta) main.append(el('div', 'inspector-meta', meta));
  head.append(main);
  return head;
}
