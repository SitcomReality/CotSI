let tooltipEl = null;

function getTooltipEl() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'hexTooltip3d';
    tooltipEl.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 1000;
      background: rgba(0,0,0,0.75);
      color: #f0e0c0;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.4;
      display: none;
      white-space: nowrap;
    `;
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

export function showTooltip(x, y, html) {
  const el = getTooltipEl();
  el.innerHTML = html;
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
