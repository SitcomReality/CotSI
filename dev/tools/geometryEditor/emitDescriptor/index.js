/**
 * emitDescriptor/index.js — Serialize descriptors into data-file modules.
 *
 * Turns a descriptor into the module source text used by the game's data files
 * (descriptors/data/): a single `export const NAME_DESCRIPTOR = {...};` literal,
 * minimized through denormalizeDescriptor so only non-default fields appear.
 * Shared by the geometry editor (Save to game) and the node tooling
 * (splitDescriptorFiles.mjs, saveServer). Browser-safe — no DOM.
 *
 * File naming follows the per-object convention documented in data/index.js:
 * descriptor id `knot` → file `knot.js`, export `KNOT_DESCRIPTOR`.
 *
 * Split across focused modules in emitDescriptor/: exportNames.js (id →
 * SCREAMING_SNAKE export-name conventions) and format.js (the JS-literal
 * formatter); this barrel re-exports the original public API unchanged.
 */
import {
  normalizeDescriptor,
  denormalizeDescriptor,
} from '../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { formatObject, formatValue } from './format.js';

import { descriptorExportName, variantExportName } from './exportNames.js';
export { descriptorExportName, variantExportName };

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

/**
 * Emit a per-variant module (mobs/<archetype>.js, bases/<faction>.js,
 * champions/<faction>.js): `export const <NAME>_VARIANT = { id, parts,
 * material? };` in the minimal (denormalized) form — the same part-minimizing
 * pass emitDescriptorModule runs, so a re-save only rewrites what changed.
 * The variant block is self-contained by design: the table-driven barrels
 * (data/mob.js, data/base.js, data/champion.js) import these files by export
 * name, so the file's shape never changes no matter how the variant evolves.
 *
 * @param {object} def - descriptor (raw or normalized) containing the variant
 * @param {string} variantId - the variant to emit (must exist in `def.variants`)
 * @param {string} [file=`${variantId}.js`] - the target file name (for the header)
 * @returns {string} file source text
 */
export function emitVariantModule(def, variantId, file) {
  const d = denormalizeDescriptor(normalizeDescriptor(def));
  const variant = (d.variants ?? []).find((v) => v.id === variantId);
  if (!variant) throw new Error(`variant "${variantId}" not found in descriptor "${d.id}"`);
  const exportName = variantExportName(variant.id);
  const block = { id: variant.id, parts: variant.parts };
  if (variant.material) block.material = variant.material;
  const fileName = file ?? `${variant.id}.js`;
  const body = formatObject(block, 0);
  const header =
    `/**\n` +
    ` * ${fileName} — Descriptor variant for "${d.displayName}" (${variant.id}).\n` +
    ` *\n` +
    ` * Generated file: edit this object in the geometry editor\n` +
    ` * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.\n` +
    ` */\n`;
  return header + `export const ${exportName} = ${body};\n`;
}
