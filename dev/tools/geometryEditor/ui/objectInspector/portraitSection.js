/**
 * portraitSection.js — Camera-framing controls for the object's UI
 * icon/portrait (all kinds): pitch / yaw / pad / raise over the shared
 * defaults. Leave at defaults for the auto-frame isometric view.
 */
import { el, row, numberInput, degreeInput } from '../formControls/index.js';
import { S } from '../../state.js';
import { PORTRAIT_DEFAULTS } from '../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';

/** Effective portrait framing value — the authored field or the shared default. */
function portraitField(d, key) {
  return d.portrait?.[key] ?? PORTRAIT_DEFAULTS[key];
}

/** Camera-framing controls for the object's UI icon/portrait (all kinds). */
export function renderPortraitControls(container, ctx) {
  const d = S.descriptor;
  const set = (key) => (v) => ctx.mutate(() => {
    d.portrait ??= {};
    d.portrait[key] = v;
  });
  container.append(row('Pitch', degreeInput(portraitField(d, 'pitch'), { step: 2, onChange: set('pitch') })));
  container.append(row('Yaw', degreeInput(portraitField(d, 'yaw'), { step: 2, onChange: set('yaw') })));
  container.append(row('Pad', numberInput(portraitField(d, 'pad'), { min: 0.5, step: 0.05, onChange: set('pad') })));
  container.append(row('Raise', numberInput(portraitField(d, 'raise'), { step: 0.02, onChange: set('raise') })));
  container.append(el('div', 'hint', 'How this object frames its icon/portrait — leave at defaults for the auto-frame isometric view.'));
}
