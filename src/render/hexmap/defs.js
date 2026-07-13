// SVG <defs> block: filters, gradients, and patterns for the parchment-fantasy look

export function renderDefs() {
  return `
  <defs>
    <filter id="wobbleInk">
      <feTurbulence baseFrequency="0.018" numOctaves="2" seed="11" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="1.15"/>
    </filter>
    <filter id="parchmentNoise">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="0.4"/>
    </filter>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur"/>
      <feOffset dx="1.5" dy="3" result="offsetBlur"/>
      <feFlood flood-color="#1a140a" flood-opacity="0.35"/>
      <feComposite in2="offsetBlur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="tallShadow" x="-30%" y="-40%" width="160%" height="180%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
      <feOffset dx="2" dy="6" result="offsetBlur"/>
      <feFlood flood-color="#1a140a" flood-opacity="0.28"/>
      <feComposite in2="offsetBlur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="mountainShadow" x="-40%" y="-60%" width="180%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur"/>
      <feOffset dx="3" dy="10" result="offsetBlur"/>
      <feFlood flood-color="#1a140a" flood-opacity="0.22"/>
      <feComposite in2="offsetBlur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <pattern id="parch" width="120" height="120" patternUnits="userSpaceOnUse">
      <rect width="120" height="120" fill="#ead6a8"/>
      <circle cx="20" cy="30" r="1" fill="#d4b87a44"/>
      <circle cx="80" cy="90" r="1.2" fill="#bfa06633"/>
    </pattern>
    <pattern id="mountainTex" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="#b7aa92"/>
      <path d="M5,35 L20,5 L35,35 Z" fill="#a89a84" opacity="0.4"/>
      <path d="M10,35 L20,15 L30,35 Z" fill="#9a8c76" opacity="0.3"/>
    </pattern>
    <linearGradient id="treeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#2f7e44"/>
      <stop offset="50%" stop-color="#4a9f5a"/>
      <stop offset="100%" stop-color="#6de98a"/>
    </linearGradient>
    <linearGradient id="baseGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#8a6740"/>
      <stop offset="100%" stop-color="#b88728"/>
    </linearGradient>
  </defs>`;
}