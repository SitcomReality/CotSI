/**
 * format.js — Descriptor → JS source literal formatting.
 *
 * Renders a normalized descriptor object as the single-quoted, trailing-comma
 * module literal style used across descriptors/data/: colors as 0xRRGGBB hex,
 * numbers as shortest round-trip, small flat objects inline, arrays of objects
 * expanded one element per line. Shared by emitDescriptorModule and
 * emitVariantModule. Browser-safe — no DOM.
 */

/** Keys whose integer values are colors — rendered as 0xRRGGBB hex literals. */
const COLOR_KEYS = new Set(['color', 'materialColor', 'emissive']);

const isPrimitive = (v) => v === null || typeof v !== 'object';
const isPrimitiveArray = (v) => Array.isArray(v) && v.every(isPrimitive);

/** Whether a nested value reads fine inline (primitives, number arrays, small
 *  flat objects like { x: 1, y: 0, z: 0 } or { source: 'primary', influence: 0.8 }). */
function isInlineValue(v) {
  if (isPrimitive(v) || isPrimitiveArray(v)) return true;
  if (Array.isArray(v) || typeof v !== 'object') return false;
  return Object.values(v).every(isInlineValue);
}

/**
 * Whether an object renders on one line: at most 4 keys when every value is a
 * primitive / primitive array (params, material), otherwise at most 2 keys
 * (transform `{ localAxis: {...}, localAngle: 0.12 }`, stretch, biomeColor).
 * Anything larger expands across lines — matching the hand-authored data style.
 */
function canInline(entries) {
  const maxKeys = entries.every(([, v]) => isPrimitive(v) || isPrimitiveArray(v)) ? 4 : 2;
  return entries.length > 0 && entries.length <= maxKeys && entries.every(([, v]) => isInlineValue(v));
}

/** Render a primitive — numbers as shortest round-trip, colors as hex, strings
 *  in the project's single-quote style (escaped). */
function renderPrimitive(v, key) {
  if (typeof v === 'number') {
    if (COLOR_KEYS.has(key) && Number.isInteger(v)) return '0x' + v.toString(16).padStart(6, '0');
    return String(v);
  }
  if (typeof v === 'string') return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  return String(v);
}

/** Render an inline (single-line) value. `key` gives nested children their
 *  parent key so color fields inside objects format as hex. */
function renderInline(v, key) {
  if (Array.isArray(v)) return '[' + v.map((x) => renderInline(x)).join(', ') + ']';
  if (isPrimitive(v)) return renderPrimitive(v, key);
  return '{ ' + Object.entries(v).map(([k, val]) => `${k}: ${renderInline(val, k)}`).join(', ') + ' }';
}

/** Render an object — inline when small and flat, else expanded (one key per
 *  line, trailing commas). `indent` is the closing-brace column; entries are
 *  indented `indent + 2`. */
function formatObject(obj, indent) {
  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';
  if (canInline(entries)) return renderInline(obj);

  const pad = ' '.repeat(indent);
  const lines = entries.map(([k, v]) => `${pad}  ${k}: ${formatValue(v, indent + 2, k)},`);
  return '{\n' + lines.join('\n') + '\n' + pad + '}';
}

/** Render a value at the given indent. Arrays of objects expand, one element
 *  per line (the `parts` / `variants` lists). */
function formatValue(v, indent, key) {
  if (Array.isArray(v)) {
    if (v.every(isPrimitive)) return '[' + v.map((x) => renderInline(x)).join(', ') + ']';
    if (v.length === 0) return '[]';
    const pad = ' '.repeat(indent);
    const items = v.map((item) => pad + '  ' + formatObject(item, indent + 2)).join(',\n');
    return '[\n' + items + ',\n' + pad + ']';
  }
  if (isPrimitive(v)) return renderPrimitive(v, key);
  return formatObject(v, indent);
}

export { formatObject, formatValue };
