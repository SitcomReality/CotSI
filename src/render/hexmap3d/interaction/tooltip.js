let tooltipEl = null;

function getTooltipEl() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'hexTooltip3d';
    // All static styles now live in overlays.css
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

/**
 * Show the tooltip with the given DOM node as content.
 * Uses replaceChildren to avoid innerHTML round-trip.
 */
export function showTooltip(x, y, node) {
  const el = getTooltipEl();
  el.replaceChildren(node);
  el.style.display = 'block';
  // Offset so cursor isn't covering text
  el.style.left = (x + 12) + 'px';
  el.style.top  = (y + 12) + 'px';
}

export function hideTooltip() {
  const el = getTooltipEl();
  el.style.display = 'none';
}

/**
 * Automatically hide the tooltip when the mouse leaves the given container element.
 * Call this once with your 3D canvas or the container that wraps the canvas.
 */
export function bindTooltipToContainer(container) {
  container.addEventListener('mouseleave', hideTooltip);
}
