/**
 * descriptor.mjs — The GET /save/descriptor handler: the CURRENT on-disk
 * source for a descriptor (or one of its variants) — fresh import → normalize
 * → emit, so the editor's save-review diff shows exactly what a save would
 * change in the emitted form.
 */
import { emitDescriptorModule, emitVariantModule } from '../emitDescriptor/index.js';
import { ID_PATTERN, TABLE_DRIVEN } from './paths.mjs';
import { importBarrel } from './write.mjs';
import { json } from './http.mjs';

/**
 * Handle GET /save/descriptor?id=<id>[&variant=<variant>]: emit the on-disk
 * descriptor (or the given variant) as module source. 404 when the id is not
 * registered or the variant does not exist.
 */
export async function handleDescriptorGet(res, url) {
  const id = url.searchParams.get('id');
  const variant = url.searchParams.get('variant') ?? null;
  if (!id || !ID_PATTERN.test(id)) {
    return json(res, 400, { error: 'missing or invalid "id" query param' });
  }
  try {
    const barrel = await importBarrel();
    const def = barrel.ALL_DESCRIPTORS.find((d) => d.id === id);
    if (!def) return json(res, 404, { error: `no registered descriptor "${id}"` });
    if (variant !== null) {
      if (!ID_PATTERN.test(variant)) return json(res, 400, { error: 'invalid "variant" query param' });
      const variantTarget = TABLE_DRIVEN.get(`${id}.js`);
      if (!variantTarget) return json(res, 400, { error: `"${id}" is not table-driven — no per-variant file` });
      const relFile = `${variantTarget.dir}/${variantTarget.fileFor(variant)}`;
      let source;
      try {
        source = emitVariantModule(def, variant, relFile);
      } catch {
        return json(res, 404, { error: `no variant "${variant}" in descriptor "${id}"` });
      }
      return json(res, 200, { ok: true, id, file: relFile, source });
    }
    const file = `${id}.js`;
    return json(res, 200, { ok: true, id, file, source: emitDescriptorModule(def, file) });
  } catch (err) {
    console.error('[save/descriptor] failed:', err);
    return json(res, 500, { error: `failed: ${err.message}` });
  }
}
