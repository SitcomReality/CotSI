/**
 * save.mjs — The POST /save handler: validate the descriptor, write the
 * object's file (whole-descriptor for tile-driven kinds, VARIANT-SCOPED for
 * the table-driven entity files), register brand-new ids in the barrel, and
 * refresh the golden descriptor snapshot so saving never leaves the test
 * suite red.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { SCHEMA_VERSION, validateDescriptor } from '../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { emitDescriptorModule, emitVariantModule, descriptorExportName } from '../emitDescriptor/index.js';
import { DATA_DIR, ID_PATTERN, TABLE_DRIVEN, subfolderFor } from './paths.mjs';
import { atomicWrite, importBarrel, registerInBarrel } from './write.mjs';
import { json } from './http.mjs';

/**
 * Handle POST /save: write `payload.descriptor` into descriptors/data/.
 * Table-driven entity objects (mob/base/champion) save ONLY the active
 * variant to its own file; tile-driven objects save the whole descriptor.
 */
export async function handleSave(res, body) {
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return json(res, 400, { error: 'request body must be valid JSON' });
  }
  const def = payload?.descriptor;
  if (!def || typeof def !== 'object' || Array.isArray(def)) {
    return json(res, 400, { error: 'missing "descriptor" object' });
  }

  // A long-running server caches schema.js from when it started. If the editor
  // (a fresh browser load) ships a newer schema than this process knows, the
  // validator below rejects new fields cryptically — say so plainly instead.
  if (typeof def.schemaVersion === 'number' && def.schemaVersion > SCHEMA_VERSION) {
    return json(res, 400, {
      error: `this descriptor is schema v${def.schemaVersion} but the save server only knows v${SCHEMA_VERSION} — restart saveServer.sh to load the current schema`,
    });
  }

  const errors = validateDescriptor(def);
  if (errors.length > 0) {
    return json(res, 400, { error: 'invalid descriptor', errors });
  }
  const id = def.id;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    return json(res, 400, { error: `id must match /^[A-Za-z0-9_-]+$/ (got "${id}")` });
  }

  const barrel = await importBarrel();
  const knownIds = new Set(barrel.ALL_DESCRIPTORS.map((d) => d.id));
  const isNew = !knownIds.has(id);
  const subfolder = subfolderFor(def.kind);
  const file = subfolder ? `${subfolder}/${id}.js` : `${id}.js`;

  const variantTarget = TABLE_DRIVEN.get(file);
  if (variantTarget) {
    // Table-driven entity object: write ONLY the active variant's file. The
    // barrel (data/mob.js / base.js / champion.js) hand-composes these files
    // by export name and is never rewritten here.
    const activeVariant = payload?.activeVariant;
    if (typeof activeVariant !== 'string' || !ID_PATTERN.test(activeVariant)) {
      return json(res, 400, {
        error: `${file} is table-driven — saving requires "activeVariant" (the variant being edited: an archetype for mobs, a faction short for bases/champions)`,
      });
    }
    if (file === 'mob.js' && activeVariant === 'default') {
      return json(res, 400, {
        error: 'the "default" mob fallback body is authored inline in data/mob.js — pick a real archetype to save',
      });
    }
    const variantIds = new Set((def.variants ?? []).map((v) => v.id));
    if (!variantIds.has(activeVariant)) {
      return json(res, 400, {
        error: `descriptor "${id}" has no variant "${activeVariant}" (variants: ${[...variantIds].join(', ') || 'none'})`,
      });
    }
    const relFile = `${variantTarget.dir}/${variantTarget.fileFor(activeVariant)}`;
    let content;
    try {
      content = emitVariantModule(def, activeVariant, relFile);
    } catch (err) {
      return json(res, 500, { error: `emitting variant failed: ${err.message}` });
    }
    await atomicWrite(path.join(DATA_DIR, variantTarget.dir, variantTarget.fileFor(activeVariant)), content);
    // The barrel is hand-composed: a variant the barrel doesn't import yet is
    // written but invisible to the game until its import line is added by hand.
    const barrelVariants = new Set(
      (barrel.ALL_DESCRIPTORS.find((d) => d.id === id)?.variants ?? []).map((v) => v.id),
    );
    const unregistered = !barrelVariants.has(activeVariant);
    console.log(`[save] updated ${id} variant ${activeVariant} → data/${relFile}`);
    return json(res, 200, {
      ok: true,
      file: relFile,
      wasNew: false,
      ...(unregistered ? { unregistered: true } : {}),
    });
  }
  if (isNew && existsSync(path.join(DATA_DIR, file))) {
    return json(res, 409, {
      error: `data/${file} already exists but id "${id}" is not registered — pick a different id`,
    });
  }
  if (!isNew && !existsSync(path.join(DATA_DIR, file))) {
    return json(res, 409, {
      error: `descriptor "${id}" is registered but data/${file} is missing — restore it first`,
    });
  }

  const content = emitDescriptorModule(def, file);
  await atomicWrite(path.join(DATA_DIR, file), content);

  if (isNew) {
    await registerInBarrel(id, descriptorExportName(id), subfolder);
    console.log(`[save] registered new object ${id} → data/${file}`);
  } else {
    console.log(`[save] updated ${id} → data/${file}`);
  }

  // The golden descriptor snapshot (dev/tests/render/fixtures/) pins
  // data/ → record determinism. A save legitimately changes the saved object's
  // records, so refresh the fixture right here — editing geometry and saving
  // must never leave the test suite red. Entity saves (table-driven) return
  // above; entities aren't in the tile snapshot. The dynamic import with a
  // cache-buster re-evaluates schema/recordBuilder from disk, so a long-lived
  // server refreshes the fixture with the same code the game and tests load.
  try {
    const { writeDescriptorSnapshot } = await import('../../../tests/render/descriptorSnapshot.js?snapshot=' + Date.now());
    // importBarrel() re-evaluates data/index.js but its static imports of the
    // data files stay cached from the first load — substitute a fresh import
    // of the file we just wrote so the snapshot reflects the saved geometry.
    const fresh = await import(pathToFileURL(path.join(DATA_DIR, file)).href + '?snap=' + Date.now());
    const freshDef = fresh[descriptorExportName(id)];
    const descriptors = barrel.ALL_DESCRIPTORS.map((d) => (d.id === id ? freshDef : d));
    const refreshed = await writeDescriptorSnapshot(descriptors);
    console.log(refreshed ? '[save] refreshed golden snapshot' : '[save] golden snapshot unchanged');
  } catch (err) {
    console.error('[save] golden snapshot refresh failed:', err);
  }
  return json(res, 200, { ok: true, file, wasNew: isNew });
}
