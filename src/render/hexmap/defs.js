// SVG <defs> block: filters, gradients, and patterns for the parchment-fantasy look
//
// All numeric filter parameters come from theme.js.
// Existing theme constants are used for pattern fills and gradient colours.

import {
  FILTER_WOBBLE_INK,
  FILTER_PARCHMENT_NOISE,
  FILTER_DROP_SHADOW,
  FILTER_TALL_SHADOW,
  FILTER_MOUNTAIN_SHADOW,
  SHADOW_COLOR,
  PARCHMENT_BASE,
  PARCHMENT_SPECKLE1,
  PARCHMENT_SPECKLE2,
  BG_GRADIENT_STOPS,
} from './theme.js';

export function renderDefs() {
  const [stop0, stop1, stop2] = BG_GRADIENT_STOPS; // for use in linearGradient if needed

  return `
  <defs>
    <!-- Wobble ink filter -->
    <filter id="wobbleInk">
      <feTurbulence baseFrequency="${FILTER_WOBBLE_INK.baseFrequency}"
                     numOctaves="${FILTER_WOBBLE_INK.numOctaves}"
                     seed="${FILTER_WOBBLE_INK.seed}" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t"
                         scale="${FILTER_WOBBLE_INK.scale}"/>
    </filter>

    <!-- Parchment noise filter -->
    <filter id="parchmentNoise">
      <feTurbulence type="fractalNoise"
                     baseFrequency="${FILTER_PARCHMENT_NOISE.baseFrequency}"
                     numOctaves="${FILTER_PARCHMENT_NOISE.numOctaves}"
                     result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n"
                         scale="${FILTER_PARCHMENT_NOISE.scale}"/>
    </filter>

    <!-- Drop shadow (hex tiles) -->
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha"
                       stdDeviation="${FILTER_DROP_SHADOW.stdDeviation}"
                       result="blur"/>
      <feOffset dx="${FILTER_DROP_SHADOW.dx}" dy="${FILTER_DROP_SHADOW.dy}"
                result="offsetBlur"/>
      <feFlood flood-color="${SHADOW_COLOR}"
               flood-opacity="${FILTER_DROP_SHADOW.opacity}"/>
      <feComposite in2="offsetBlur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <!-- Tall shadow (faction bases, God's Knot) -->
    <filter id="tallShadow" x="-30%" y="-40%" width="160%" height="180%">
      <feGaussianBlur in="SourceAlpha"
                       stdDeviation="${FILTER_TALL_SHADOW.stdDeviation}"
                       result="blur"/>
      <feOffset dx="${FILTER_TALL_SHADOW.dx}" dy="${FILTER_TALL_SHADOW.dy}"
                result="offsetBlur"/>
      <feFlood flood-color="${SHADOW_COLOR}"
               flood-opacity="${FILTER_TALL_SHADOW.opacity}"/>
      <feComposite in2="offsetBlur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <!-- Mountain shadow -->
    <filter id="mountainShadow" x="-40%" y="-60%" width="180%" height="200%">
      <feGaussianBlur in="SourceAlpha"
                       stdDeviation="${FILTER_MOUNTAIN_SHADOW.stdDeviation}"
                       result="blur"/>
      <feOffset dx="${FILTER_MOUNTAIN_SHADOW.dx}"
                dy="${FILTER_MOUNTAIN_SHADOW.dy}"
                result="offsetBlur"/>
      <feFlood flood-color="${SHADOW_COLOR}"
               flood-opacity="${FILTER_MOUNTAIN_SHADOW.opacity}"/>
      <feComposite in2="offsetBlur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <!-- Parchment pattern -->
    <pattern id="parch" width="120" height="120" patternUnits="userSpaceOnUse">
      <rect width="120" height="120" fill="${PARCHMENT_BASE}"/>
      <circle cx="20" cy="30" r="1" fill="${PARCHMENT_SPECKLE1}"/>
      <circle cx="80" cy="90" r="1.2" fill="${PARCHMENT_SPECKLE2}"/>
    </pattern>

    <!-- Mountain texture pattern (colours remain hardcoded for now) -->
    <pattern id="mountainTex" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="#b7aa92"/>
      <path d="M5,35 L20,5 L35,35 Z" fill="#a89a84" opacity="0.4"/>
      <path d="M10,35 L20,15 L30,35 Z" fill="#9a8c76" opacity="0.3"/>
    </pattern>

    <!-- Tree gradient (uses existing theme constant but keeps structure) -->
    <linearGradient id="treeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#2f7e44"/>
      <stop offset="50%" stop-color="#4a9f5a"/>
      <stop offset="100%" stop-color="#6de98a"/>
    </linearGradient>

    <!-- Base gradient -->
    <linearGradient id="baseGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="${stop0.offset}" stop-color="${stop0.color}"/>
      <stop offset="${stop1.offset}" stop-color="${stop1.color}"/>
      <stop offset="${stop2.offset}" stop-color="${stop2.color}"/>
    </linearGradient>
  </defs>`;
}