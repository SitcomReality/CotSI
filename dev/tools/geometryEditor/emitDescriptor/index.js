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
import { denormalizePart } from '../../../../src/render/hexmap3d/worldObjects/descriptors/descriptorDenormalize.js';
import { formatObject, formatValue, quantizeForEmit } from './format.js';

import { descriptorExportName, variantExportName, motifExportName } from './exportNames.js';
export { descriptorExportName, variantExportName, motifExportName };
export { quantizeForEmit } from './format.js';

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
  const d = quantizeForEmit(denormalizeDescriptor(normalizeDescriptor(def)));
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
  const block = quantizeForEmit({ id: variant.id, parts: variant.parts });
  if (variant.material) block.material = quantizeForEmit(variant.material);
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

/**
 * Emit a shared-library motif module (data/motifs/<id>.js): `export const
 * <ID>_MOTIF = { id, size?, placement?, parts };` in the minimal (denormalized)
 * form — matching the hand-authored data/motifs/*.js style. A motif is a parts
 * BLOCK, not a descriptor: it carries no `kind`/`displayName`, and its parts go
 * through `denormalizePart` (NOT descriptor normalize — a bare motif has no
 * descriptor wrapper to normalize). The `size`/`placement` are the library
 * defaults a referencing decor inherits when it doesn't override them.
 *
 * @param {object} motif - a motif block (raw or normalized parts)
 * @param {string} [file=`${motif.id}.js`] - the target file name (for the header)
 * @returns {string} file source text
 */
export function emitMotifModule(motif, file) {
  if (!motif || typeof motif.id !== 'string') throw new Error('emitMotifModule needs a motif block with an id');
  const exportName = motifExportName(motif.id);
  // A motif block deliberately OMITS default `size`/`placement` — decors
  // inherit their own values for them, and materializing the defaults here
  // would pin every referencing decor to scale 1 / center placement.
  const block = quantizeForEmit({
    id: motif.id,
    ...(motif.size && !(motif.size.min === 1 && motif.size.max === 1) ? { size: motif.size } : {}),
    ...(motif.placement && motif.placement.mode !== 'center' ? { placement: motif.placement } : {}),
    parts: (Array.isArray(motif.parts) ? motif.parts : []).map((p) => denormalizePart(p)),
  });
  const fileName = file ?? `${motif.id}.js`;
  const body = formatObject(block, 0);
  const header =
    `/**\n` +
    ` * ${fileName} — Shared motif: "${motif.id}".\n` +
    ` *\n` +
    ` * Hand-authored geometry source of truth. A decor's motif table references\n` +
    ` * it by id (\`{ motif: '${motif.id}', weight, biomeWeight, ... }\`);\n` +
    ` * normalizeDescriptor materializes the shared parts, inheriting the\n` +
    ` * size/placement defaults here. Generated by the geometry editor\n` +
    ` * (dev/tools/geometryEditor.html) — hand edits are overwritten.\n` +
    ` */\n`;
  return header + `export const ${exportName} = ${body};\n`;
}
