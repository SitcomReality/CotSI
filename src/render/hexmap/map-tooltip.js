// Singleton tooltip element for hex hover info

let tooltipEl = null;

/**
 * Create (or reuse) the DOM tooltip element.
 * Returns an object with { show, hide, destroy } methods.
 */
export function createTooltip(getContent) {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'mapTooltip';
    tooltipEl.style.cssText =
      `position:fixed;z-index:80;background:#fff7dfe8;border:1px solid #b99b6a;` +
      `padding:7px 9px;border-radius:9px;font-size:12px;color:#3a2310;` +
      `pointer-events:none;max-width:260px;box-shadow:0 10px 30px #0002;font-family:Georgia,serif`;
    document.body.appendChild(tooltipEl);
  }

  return {
    show(clientX, clientY, key) {
      const content = getContent(key);
      if (!content) return;
      tooltipEl.innerHTML = content;
      tooltipEl.style.left = (clientX + 14) + 'px';
      tooltipEl.style.top = (clientY + 14) + 'px';
      tooltipEl.style.display = 'block';
    },

    hide() {
      if (tooltipEl) tooltipEl.style.display = 'none';
    },

    destroy() {
      tooltipEl?.remove();
      tooltipEl = null;
    }
  };
}