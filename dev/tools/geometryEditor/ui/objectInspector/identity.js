/**
 * identity.js — The Object panel of the object inspector: a social-media
 * style profile card — the live portrait avatar + kind caption on the left,
 * the editable Name / ID rows on the right — and below it the portrait
 * camera block (pitch/yaw/pad/raise + "Use current camera view", see
 * portraitSection.js). `ctx` supplies `mutate()` (and `onLoaded()` for
 * renames, which also refresh the object browser).
 */
import { S } from '../../state.js';
import { el, row, textInput } from '../formControls/index.js';
import { SAMPLE_OBJECTS } from '../../sampleObjects.js';
import { renderPortraitAvatar, renderPortraitControls } from './portraitSection.js';

/** The Object panel: profile card (avatar + editable Name/ID) and the
 *  portrait camera controls that customize the picture. */
export function renderObjectIdentity(container, ctx) {
  const d = S.descriptor;

  const card = el('div', 'profile-card');
  card.append(renderPortraitAvatar());

  const fields = el('div', 'profile-fields');
  // Name is editable for every object (samples included) — renames take effect
  // in the preview info, the inspector and the browser list right away.
  fields.append(row('Name', textInput(d.displayName, (v) => ctx.mutate(() => {
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
  fields.append(row('ID', idInput));
  card.append(fields);
  container.append(card);

  if (!isRegistered) {
    container.append(el('div', 'hint', 'New objects need a real id before saving to the game — letters, numbers, _ and -.'));
  }

  renderPortraitControls(container, ctx);
}
