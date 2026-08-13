/**
 * portraitFraming.js — Resolve an object's portrait camera framing and frame
 * a camera around a built group.
 *
 * A descriptor may carry an optional `portrait` field (authored in the geometry
 * editor) overriding how it is framed as a UI icon: camera pitch/yaw, the
 * bounding-sphere frame margin (`pad`), and the vertical frame shift (`raise`).
 * Objects without the field fall back to the shared defaults — the map's
 * isometric angle with the long-standing auto-frame padding — so `portrait`
 * is purely additive.
 *
 * framePortraitCamera() is the shared orthographic-framing math used by both
 * the one-off portrait renderer (portraitThumbnail.js) and the icon atlas
 * renderer (portraitAtlas.js).
 */
import * as THREE from '../../../vendor/three.module.js';
import { PORTRAIT_DEFAULTS } from '../worldObjects/descriptors/descriptorDefaults.js';

/**
 * The framing to render `descriptor`'s portrait with. Every sub-field resolves
 * to the shared default when the descriptor doesn't author its own.
 *
 * @param {object|null} descriptor - normalized descriptor (or null)
 * @returns {{ pitch: number, yaw: number, pad: number, raise: number }}
 */
export function resolvePortraitFraming(descriptor) {
  const p = descriptor?.portrait;
  if (!p || typeof p !== 'object') {
    return { ...PORTRAIT_DEFAULTS };
  }
  return {
    pitch: p.pitch ?? PORTRAIT_DEFAULTS.pitch,
    yaw: p.yaw ?? PORTRAIT_DEFAULTS.yaw,
    pad: p.pad ?? PORTRAIT_DEFAULTS.pad,
    raise: p.raise ?? PORTRAIT_DEFAULTS.raise,
  };
}

/**
 * Frame an orthographic camera around `group` at `framing`'s pitch/yaw, using
 * a bounding-sphere fit scaled by `pad`, with `raise` shifting the view down so
 * grounded models sit above center (the spare space collects below the feet).
 * Assumes `camera` is an orthographic camera with square tiles.
 *
 * @param {THREE.OrthographicCamera} camera
 * @param {THREE.Object3D} group
 * @param {{ pitch, yaw, pad, raise }} framing
 */
export function framePortraitCamera(camera, group, framing) {
  const sphere = new THREE.Box3().setFromObject(group)
    .getBoundingSphere(new THREE.Sphere());
  const center = sphere.center;
  // No size floor: small mobs need a tight frame too — a minimum-radius clamp
  // inflated their portraits and left them tiny.
  const radius = Math.max(sphere.radius, 0.001);

  const distance = 30;
  const camX = center.x + distance * Math.cos(framing.pitch) * Math.sin(framing.yaw);
  const camY = center.y + distance * Math.sin(framing.pitch);
  const camZ = center.z + distance * Math.cos(framing.pitch) * Math.cos(framing.yaw);
  camera.position.set(camX, camY, camZ);
  camera.lookAt(center);

  const half = radius * framing.pad;
  const raise = half * framing.raise;
  camera.left = -half;
  camera.right = half;
  camera.top = half - raise;
  camera.bottom = -half - raise;
  camera.near = 0.1;
  camera.far = 100;
  camera.updateProjectionMatrix();
}
