export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(props)) {
    if (key === 'class') el.className = val;
    else if (key === 'style' && typeof val === 'object') {
      for (const [prop, v] of Object.entries(val)) {
        if (prop.startsWith('--')) {
          el.style.setProperty(prop, v);
        } else {
          el.style[prop] = v;
        }
      }
    }
    else if (key.startsWith('data')) el.setAttribute(key.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), val);
    else if (key.startsWith('on') && typeof val === 'function') el.addEventListener(key.slice(2), val);
    else if (typeof val === 'function') el.addEventListener(key, val);
    else el.setAttribute(key, val);
  }
  // Skip null/undefined/boolean children so `cond && h(...)` composition is safe
  // (0 and '' remain valid text children).
  el.append(...children.flat().filter((c) => c != null && typeof c !== 'boolean'));
  return el;
}