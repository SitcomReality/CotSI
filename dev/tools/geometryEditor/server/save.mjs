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

import { SCHEMA_VERSION, validateDescriptor, validateMotifBlock } from '../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { emitDescriptorModule, emitVariantModule, descriptorExportName, motifExportName, emitMotifModule } from '../emitDescriptor/index.js';
import { DATA_DIR, ID_PATTERN, TABLE_DRIVEN, subfolderFor, MOTIF_DIR, subfolderForMotif } from './paths.mjs';
import { atomicWrite, importBarrel, importMotifBarrel, registerInBarrel, registerMotifInBarrel } from './write.mjs';
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
  // above; entities aren't in the tile snapshot. The dynamic imports below
  // carry unique query strings (cache-busters), so a long-lived server
  // re-evaluates everything from disk with the same code the game and tests
  // load.
  try {
    const snapshot = await import('../../../tests/render/descriptorSnapshot.js?snapshot=' + Date.now());
    const { writeDescriptorSnapshot, SNAPSHOT_ENTITY_KINDS } = snapshot;
    // The barrel's static imports of the data files stay cached from the
    // server's first load, so refreshing only the just-saved file would mix
    // fresh + stale geometry into the fixture (a save of any other object
    // then bakes in the stale copy). Re-import every tile-driven data file
    // from disk — the snapshot must always match what's on disk.
    const descriptors = await Promise.all(
      barrel.ALL_DESCRIPTORS
        .filter((d) => !SNAPSHOT_ENTITY_KINDS.has(d.kind))
        .map(async (d) => {
          const sub = subfolderFor(d.kind);
          const rel = sub ? `${sub}/${d.id}.js` : `${d.id}.js`;
          const mod = await import(pathToFileURL(path.join(DATA_DIR, rel)).href + '?snap=' + Date.now());
          return mod[descriptorExportName(d.id)];
        }),
    );
    const refreshed = await writeDescriptorSnapshot(descriptors);
    console.log(refreshed ? '[save] refreshed golden snapshot' : '[save] golden snapshot unchanged');
  } catch (err) {
    console.error('[save] golden snapshot refresh failed:', err);
  }
  return json(res, 200, { ok: true, file, wasNew: isNew });
}

/**
 * Handle POST /save/motif: write a shared library motif into
 * data/motifs/<id>.js and register it in the ALL_MOTIFS barrel. A motif is a
 * parts BLOCK (`{ id, size?, placement?, parts }`), not a descriptor — it never
 * touches the icon atlas or the golden descriptor snapshot.
 */
export async function handleMotifSave(res, body) {
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return json(res, 400, { error: 'request body must be valid JSON' });
  }
  const motif = payload?.motif;
  if (!motif || typeof motif !== 'object' || Array.isArray(motif)) {
    return json(res, 400, { error: 'missing "motif" object' });
  }
  const id = motif.id;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    return json(res, 400, { error: `motif.id must match /^[A-Za-z0-9_-]+$/ (got "${id}")` });
  }
  const errors = validateMotifBlock(motif, { checkId: false });
  if (errors.length > 0) {
    return json(res, 400, { error: 'invalid motif block', errors });
  }

  const subfolder = subfolderForMotif();
  const file = `${subfolder}/${id}.js`;

  const content = emitMotifModule(motif, file);
  await atomicWrite(path.join(DATA_DIR, file), content);

  const motifBarrel = await importMotifBarrel();
  const knownIds = new Set(motifBarrel.ALL_MOTIFS.map((m) => m.id));
  const wasNew = !knownIds.has(id);
  if (wasNew) {
    await registerMotifInBarrel(id, motifExportName(id));
    console.log(`[save/motif] registered new motif ${id} → data/${file}`);
  } else {
    console.log(`[save/motif] updated motif ${id} → data/${file}`);
  }
  return json(res, 200, { ok: true, file, wasNew });
}
