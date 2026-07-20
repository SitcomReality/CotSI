/**
 * svgIcon.js — Build an <svg><use href="..."/></svg> DOM node
 * from the project's monoline sprite.
 *
 * Usage:
 *   import { svgIcon } from './svgIcon.js';
 *   el.append(svgIcon('g-crucible', 16));
 *   el.append(svgIcon('i-move', 12, { class: 'foo', ariaHidden: true }));
 *
 * The `href` is resolved relative to the page root (index.html),
 * so any consumer can call this — no import.meta.url gymnastics.
 */
const SPRITE_PATH = 'assets/icons/sprite.svg';

/**
 * @param {string} id  symbol id, e.g. 'g-crucible' or 'i-move'
 * @param {number} [size=14]  width/height in px
 * @param {object} [extra]  optional attributes: class, ariaHidden, style, etc.
 * @returns {SVGSVGElement}
 */
export function svgIcon(id, size = 14, extra = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');

  if (extra.class) svg.setAttribute('class', extra.class);
  if (extra.style && typeof extra.style === 'object') {
    for (const [k, v] of Object.entries(extra.style)) {
      svg.style[k] = v;
    }
  }
  // aria-hidden defaults to true for decorative icons
  svg.setAttribute('aria-hidden', extra.ariaHidden !== undefined ? String(extra.ariaHidden) : 'true');

  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `${SPRITE_PATH}#${id}`);
  svg.append(use);
  return svg;
}
