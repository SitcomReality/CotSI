/**
 * portraitSection.js — The Object panel's "profile picture": the live
 * portrait render (the same offscreen pipeline the game's icons use —
 * recordsForPortrait → renderPortraitSnapshot, ink outlines and map lights
 * included) plus the camera-framing controls that customize it.
 *
 * Framing comes from the optional `portrait` field (pitch / yaw / pad /
 * raise over the shared defaults — leave at defaults for the auto-frame
 * isometric view). "Use current camera view" copies the preview's orbit
 * angle into pitch/yaw so the portrait matches exactly what the user is
 * looking at.
 */
import { el, row, numberInput, degreeInput } from '../formControls/index.js';
import { S } from '../../state.js';
import { viewport } from '../../preview/viewportState.js';
import { ENTITY_KINDS } from '../../entityView.js';
import { previewTerrain } from '../previewSync/tile.js';
import { PORTRAIT_DEFAULTS } from '../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { section, fmt } from './sectionShell.js';
import { recordsForPortrait, renderPortraitSnapshot } from '../../../../../src/render/hexmap3d/portrait/portraitThumbnail.js';
import { recordsForDescriptor } from '../../../../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';

const ORIGIN = { x: 0, y: 0, z: 0 };

/** Effective portrait framing value — the authored field or the shared default. */
function portraitField(d, key) {
  return d.portrait?.[key] ?? PORTRAIT_DEFAULTS[key];
}

/**
 * The portrait framing that shows the object from the preview's current
 * orbit. Both cameras are spherical around the object — the editor looks
 * from (sinφ·cosθ, cosφ, sinφ·sinθ) and the portrait camera from
 * (cosp·siny, sinp, cosp·cosy) — so the same view direction maps as
 * pitch = π/2 − φ, yaw = π/2 − θ (WYSIWYG: the icon matches the preview).
 */
export function framingFromOrbit() {
  const { theta, phi } = viewport.orbit;
  return { pitch: Math.PI / 2 - phi, yaw: Math.PI / 2 - theta };
}

/**
 * The records the portrait renders, per kind: entity kinds use the editor's
 * selected faction/archetype (the same records the game's combat/trade icons
 * draw), items the game's item-icon path, and tile-driven objects the
 * canonical variation-free look — the editor's "Show all" records, so motif
 * decors show every motif in a ring and features their base parts. All are
 * framed by the portrait camera (resolvePortraitFraming).
 */
function portraitRecords(d) {
  if (ENTITY_KINDS.has(d.kind)) {
    return recordsForPortrait(d, { faction: S.entity.faction, archetype: S.entity.archetype });
  }
  if (d.kind === 'item') {
    return recordsForPortrait(d, {});
  }
  return recordsForDescriptor(d, { q: 1, r: 0, terrain: previewTerrain(d) }, ORIGIN, 0, {}, null, null, true, 1, null);
}

/** The descriptor's portrait as a PNG data URL (the game's icon pipeline),
 *  or null when the descriptor has no renderable records. */
function portraitSnapshot(d) {
  const records = portraitRecords(d);
  if (records.length === 0) return null;
  return renderPortraitSnapshot(d, records, `portrait-${d.id}`);
}

/**
 * The profile-card avatar: the live portrait image (re-rendered on every
 * panel refresh, so framing and part edits show up immediately) over the
 * kind caption. Returns the column element for the card to lay out.
 */
export function renderPortraitAvatar() {
  const d = S.descriptor;
  const col = el('div', 'profile-avatar-col');
  const box = el('div', 'profile-avatar');
  const img = el('img', 'portrait-img');
  img.alt = `${d.displayName} portrait`;
  img.title = 'The object\u2019s UI portrait — how it frames in-game (combat, trade)';
  const url = portraitSnapshot(d);
  if (url) {
    img.src = url;
  } else {
    img.hidden = true;
    box.append(el('span', 'portrait-fallback', '\u2014'));
  }
  box.append(img);
  col.append(box);
  col.append(el('div', 'profile-kind', d.kind));
  return col;
}

/** Camera-framing controls for the object's UI icon/portrait (all kinds). */
export function renderPortraitControls(container, ctx) {
  const d = S.descriptor;
  const set = (key) => (v) => ctx.mutate(() => {
    d.portrait ??= {};
    d.portrait[key] = v;
  });

  const sec = section('portrait', container, () => {
    const isDefault = (k) => (d.portrait?.[k] ?? PORTRAIT_DEFAULTS[k]) === PORTRAIT_DEFAULTS[k];
    if (['pitch', 'yaw', 'pad', 'raise'].every(isDefault)) return 'default';
    const p = portraitField(d, 'pitch') * 180 / Math.PI;
    const y = portraitField(d, 'yaw') * 180 / Math.PI;
    return `pitch ${fmt(p)}° yaw ${fmt(y)}°`;
  });
  sec.classList.add('portrait-camera');

  const fromCamera = el('button', 'create-btn', '\u21A4 Use current camera view');
  fromCamera.type = 'button';
  fromCamera.title = 'Point the portrait camera the same way the preview is looking \u2014 copies the orbit angle into pitch/yaw';
  fromCamera.addEventListener('click', () => {
    const { pitch, yaw } = framingFromOrbit();
    ctx.mutate(() => {
      d.portrait ??= {};
      d.portrait.pitch = pitch;
      d.portrait.yaw = yaw;
    });
  });
  sec.append(fromCamera);

  sec.append(row('Pitch', degreeInput(portraitField(d, 'pitch'), { step: 2, onChange: set('pitch') })));
  sec.append(row('Yaw', degreeInput(portraitField(d, 'yaw'), { step: 2, onChange: set('yaw') })));
  sec.append(row('Pad', numberInput(portraitField(d, 'pad'), { min: 0.5, step: 0.05, onChange: set('pad') })));
  sec.append(row('Raise', numberInput(portraitField(d, 'raise'), { step: 0.02, onChange: set('raise') })));
  sec.append(el('div', 'hint', 'How this object frames its icon — pitch/yaw are the viewing angle, pad the frame margin, raise the vertical shift. Leave at defaults for the auto-frame isometric view.'));
}
