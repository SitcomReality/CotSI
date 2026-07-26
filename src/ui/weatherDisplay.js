/**
 * weatherDisplay.js — Shared weather display element.
 *
 * Builds an inline SVG fog-overlay + weather name + decorative corners for
 * any modal that shows a weather report.
 *
 * Uses h() — no innerHTML. The SVG pattern is inlined because CSS url(#…)
 * can't reach cross-document SVG fragment identifiers.
 */
import { h } from './domBuilder.js';
import { svgIcon } from './svgIcon.js';
import { WEATHER_FOG_VIEWBOX, WEATHER_FOG_PATTERN_SIZE, WEATHER_FOG_STROKE, WEATHER_CORNER_ICON_SIZE } from '../params/ui/uiParams.js';

/**
 * Create a weather display element.
 *
 * @param {Object} weather — { name, text, tint }
 * @param {Object} opts
 * @param {string} opts.classPrefix — BEM block prefix, e.g. 'herald-modal'
 * @param {string} [opts.patternId] — SVG pattern ID; derived from classPrefix
 *   if omitted (e.g. 'herald-modal' → 'fog-clouds-herald')
 * @returns {HTMLElement}
 */
export function weatherDisplayEl(weather, { classPrefix, patternId } = {}) {
  if (!patternId) {
    patternId = 'fog-clouds-' + classPrefix.replace('-modal', '');
  }

  // Inline SVG fog pattern — can't reference <pattern> from an external sprite
  const fogSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  fogSvg.setAttribute('class', classPrefix + '__weather-fog');
  fogSvg.setAttribute('viewBox', '0 0 ' + WEATHER_FOG_VIEWBOX + ' ' + WEATHER_FOG_VIEWBOX);
  fogSvg.setAttribute('preserveAspectRatio', 'none');
  const fogDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  fogDefs.innerHTML =
    '<pattern id="' + patternId + '" width="' + WEATHER_FOG_PATTERN_SIZE + '" height="' + WEATHER_FOG_PATTERN_SIZE + '" patternUnits="userSpaceOnUse">' +
    '<g fill="none" stroke="currentColor" stroke-width="' + WEATHER_FOG_STROKE + '" stroke-linecap="round" opacity=".5">' +
    '<path d="M6 30 q10 -12 22 -4 q10 -10 22 0 q12 -6 18 6"/>' +
    '<path d="M-4 60 q12 -12 24 -2 q12 -10 24 2 q10 -6 18 4"/>' +
    '<path d="M40 12 q8 -8 16 0"/>' +
    '<circle cx="64" cy="44" r="2.4" fill="currentColor" stroke="none"/>' +
    '</g></pattern>';
  fogSvg.append(fogDefs);
  const fogRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  fogRect.setAttribute('width', '100%');
  fogRect.setAttribute('height', '100%');
  fogRect.setAttribute('fill', 'url(#' + patternId + ')');
  fogSvg.append(fogRect);

  const name = h('div', { class: classPrefix + '__weather-name' }, weather.name);

  const cornerTL = svgIcon('d-corner', WEATHER_CORNER_ICON_SIZE, { class: classPrefix + '__wc ' + classPrefix + '__wc--tl' });
  const cornerTR = svgIcon('d-corner', WEATHER_CORNER_ICON_SIZE, { class: classPrefix + '__wc ' + classPrefix + '__wc--tr' });
  const cornerBL = svgIcon('d-corner', WEATHER_CORNER_ICON_SIZE, { class: classPrefix + '__wc ' + classPrefix + '__wc--bl' });
  const cornerBR = svgIcon('d-corner', WEATHER_CORNER_ICON_SIZE, { class: classPrefix + '__wc ' + classPrefix + '__wc--br' });

  return h('div', {
    class: classPrefix + '__weather-display',
    style: { '--weather-tint': weather.tint },
  }, fogSvg, cornerTL, cornerTR, cornerBL, cornerBR, name);
}
