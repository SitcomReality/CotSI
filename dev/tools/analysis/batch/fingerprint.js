/**
 * fingerprint.js — Noise-config fingerprint utility for batch analysis.
 *
 * Produces a deterministic 8-hex hash from a noise-config object so
 * calibration metadata can trace which config produced the data.
 *
 * Pure: no DOM, no state, no side effects.
 */

/**
 * Create a compact hash/fingerprint of the noise config for tracking.
 *
 * @param {object} nc - Noise config object
 * @returns {string} Short hex fingerprint
 */
export function fingerprint(nc) {
  let s = '';
  for (const [key, val] of Object.entries(nc)) {
    if (typeof val === 'object' && val !== null) {
      s += `${key}:${val.frequency}/${val.octaves}/${val.lacunarity}/${val.gain}|`;
    } else if (typeof val === 'number') {
      s += `${key}:${val.toString(16)}|`;
    }
  }
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
