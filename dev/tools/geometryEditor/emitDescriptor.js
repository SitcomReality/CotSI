/**
 * emitDescriptor.js — Serialize descriptors into data-file modules.
 *
 * Turns a descriptor into the module source text used by the game's data files
 * (descriptors/data/): a single `export const NAME_DESCRIPTOR = {...};` literal,
 * minimized through denormalizeDescriptor so only non-default fields appear.
 * Shared by the geometry editor (Save to game) and the node tooling
 * (splitDescriptorFiles.mjs, saveServer.mjs). Browser-safe — no DOM.
 *
 * File naming follows the per-object convention documented in data/index.js:
 * descriptor id `knot` → file `knot.js`, export `KNOT_DESCRIPTOR`.
 */
import {
  normalizeDescriptor,
  denormalizeDescriptor,
} from '../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';

/**
 * The canonical export name for a descriptor id: camelCase/`-`/`_` →
 * SCREAMING_SNAKE, suffixed `_DESCRIPTOR` (`knot` → `KNOT_DESCRIPTOR`,
 * `plainsGrass` → `PLAINS_GRASS_DESCRIPTOR`, `new-feature` →
 * `NEW_FEATURE_DESCRIPTOR`).
 * @param {string} id - descriptor id (matches /^[A-Za-z0-9_-]+$/)
 * @returns {string} export name
 */
export function descriptorExportName(id) {
  return id
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_') + '_DESCRIPTOR';
}

// ── Formatting ──────────────────────────────────────────────────────────────

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

// ── Module emission ──────────────────────────────────────────────────────────

/**
 * Emit the full module source for one descriptor: a generated header comment
 * and a single named export in the minimal (denormalized) form. The input is
 * normalized first (idempotent) so legacy fields like `scaleXZ` / `stretch.xz`
 * resolve before emission — the file always carries the canonical v3 form.
 *
 * @param {object} def - descriptor (raw or normalized)
 * @param {string} [file=`${def.id}.js`] - the target file name (for the header);
 *   defaults to the per-object convention `data/<id>.js`
 * @returns {string} file source text
 */
export function emitDescriptorModule(def, file) {
  const d = denormalizeDescriptor(normalizeDescriptor(def));
  const exportName = descriptorExportName(d.id);
  const fileName = file ?? `${d.id}.js`;
  const body = formatObject(d, 0);
  const header =
    `/**\n` +
    ` * ${fileName} — Descriptor data for "${d.displayName}".\n` +
    ` *\n` +
    ` * Generated file: edit this object in the geometry editor\n` +
    ` * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.\n` +
    ` */\n`;
  return header + `export const ${exportName} = ${body};\n`;
}
