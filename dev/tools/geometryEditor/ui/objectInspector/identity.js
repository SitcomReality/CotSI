/**
 * identity.js — The Object panel of the object inspector: the inspector
 * header (name + id/kind meta) and the editable Name / ID rows every object
 * gets. `ctx` supplies `mutate()` (and `onLoaded()` for renames, which also
 * refresh the object browser).
 */
import { S } from '../../state.js';
import { el, row, textInput } from '../formControls/index.js';
import { inspectorHead } from '../inspectorHead.js';
import { SAMPLE_OBJECTS } from '../../sampleObjects.js';

/** The Object panel: inspector header (name + id/kind meta) and the editable
 *  Name / ID rows every object gets. */
export function renderObjectIdentity(container, ctx) {
  const d = S.descriptor;

  container.append(inspectorHead(d.displayName, `${d.id} · ${d.kind}`));

  // Name is editable for every object (samples included) — renames take effect
  // in the inspector header, the preview info, and the browser list right away.
  container.append(row('Name', textInput(d.displayName, (v) => ctx.mutate(() => {
    d.displayName = v;
    ctx.onLoaded(); // browser labels + custom pin re-render with the new name
  }))));

  // ID — fixed for registered game objects (the save path derives file and
  // export name from it); editable for new/custom objects so they can be saved
  // under a real id. Sanitized to the schema's id pattern on commit.
  const isRegistered = SAMPLE_OBJECTS.some((o) => o.id === d.id);
  const idInput = el('input');
  idInput.type = 'text';
  idInput.value = d.id;
  idInput.disabled = isRegistered;
  idInput.addEventListener('change', () => {
    const clean = idInput.value.trim().replace(/[^A-Za-z0-9_-]/g, '_');
    if (clean && clean !== d.id) {
      ctx.mutate(() => { d.id = clean; });
      ctx.onLoaded(); // browser labels + custom pin re-render with the new id
    } else {
      idInput.value = d.id;
    }
  });
  container.append(row('ID', idInput));
  if (!isRegistered) {
    container.append(el('div', 'hint', 'New objects need a real id before saving to the game — letters, numbers, _ and -.'));
  }
}
