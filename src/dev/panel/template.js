/**
 * panel/template.js — Dev tools panel DOM template injection.
 *
 * Layer: dev/ — imports ui/templates.
 */

import { loadTemplate } from '../../ui/templates/templateLoader.js';

export async function injectTemplate() {
  // Already injected?
  if (document.querySelector('.devtools-mount')) return;

  const mount = document.createElement('div');
  mount.className = 'devtools-mount';
  document.body.appendChild(mount);

  const { frag } = await loadTemplate('devTools');
  mount.appendChild(frag);
}
