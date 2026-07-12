import { HEX_SIZE } from './constants.js';

function hexCorners(cx, cy, size = HEX_SIZE) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return { x: cx + size * Math.cos(a), y: cy + size * Math.sin(a) };
  });
}

function hexPoints(cx, cy, size = HEX_SIZE) {
  return hexCorners(cx, cy, size)
    .map(p => `${p.x},${p.y}`)
    .join(' ');
}

export { hexCorners, hexPoints };