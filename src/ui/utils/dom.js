/**
 * Create a real DOM element.
 * usage: h('div', { class: 'foo', dataAction: 'clickMe' },
 *          h('span', {}, 'Hello'), ' World')
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(props)) {
    if (key === 'class') el.className = val;
    else if (key === 'style' && typeof val === 'object') Object.assign(el.style, val);
    else if (key.startsWith('data')) el.setAttribute(key.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), val);
    else if (key.startsWith('on') && typeof val === 'function') el.addEventListener(key.slice(2), val);
    else el.setAttribute(key, val);
  }
  // Skip null/undefined/boolean children so `cond && h(...)` composition is safe
  // (0 and '' remain valid text children).
  el.append(...children.flat().filter((c) => c != null && typeof c !== 'boolean'));
  return el;
}