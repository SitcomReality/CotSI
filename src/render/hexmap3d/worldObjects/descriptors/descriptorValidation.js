/**
 * descriptorValidation.js — Descriptor-level validation.
 *
 * `validateDescriptor` is the entry point: it checks the object-level fields
 * (id, kind, scale, cluster, size, variation, placement, emphasis, material,
 * variants) and delegates parts validation to validateParts.js. The per-field
 * validators for the object-level sections live here too.
 */
import { OBJECT_KINDS, ITEM_SLOTS, EMPHASIS_BEHAVIORS, PLACEMENT_MODES, VARIANT_RULES } from './descriptorDefaults.js';
import {
  isPlainObject, isFiniteNumber, isNonNegativeNumber, isPositiveNumber,
  isColorInt, ID_PATTERN,
} from './typeChecks.js';
import { validatePartsList, validatePart } from './validateParts.js';
import { listArchetypes } from '../../../../game/rules/archetypes.js';
import { motifById } from './data/motifs/index.js';

const CLUSTER_KEYS = ['min', 'max', 'rule', 'countsByTerrain', 'densityRange', 'jitter'];
const CLUSTER_RULES = ['uniform', 'moisture'];

function validateCluster(cluster, path, errors) {
  if (cluster === undefined) return;
  if (!isPlainObject(cluster)) {
    errors.push(`${path}: must be an object { min, max, rule? }`);
    return;
  }
  for (const key of Object.keys(cluster)) {
    if (!CLUSTER_KEYS.includes(key)) errors.push(`${path}: unknown field "${key}"`);
  }
  if (cluster.min !== undefined && !(Number.isInteger(cluster.min) && cluster.min >= 1)) {
    errors.push(`${path}.min: must be an integer >= 1`);
  }
  if (cluster.max !== undefined && !(Number.isInteger(cluster.max) && cluster.max >= 1)) {
    errors.push(`${path}.max: must be an integer >= 1`);
  }
  if (cluster.min !== undefined && cluster.max !== undefined && cluster.min > cluster.max) {
    errors.push(`${path}: min must be <= max`);
  }
  if (cluster.rule !== undefined && !CLUSTER_RULES.includes(cluster.rule)) {
    errors.push(`${path}.rule: must be one of ${CLUSTER_RULES.join(', ')}`);
  }
  if (cluster.rule === 'moisture') {
    if (cluster.countsByTerrain !== undefined) {
      if (!isPlainObject(cluster.countsByTerrain)) {
        errors.push(`${path}.countsByTerrain: must be an object of terrain → [min, max] pairs`);
      } else {
        for (const [terrain, pair] of Object.entries(cluster.countsByTerrain)) {
          const pairPath = `${path}.countsByTerrain.${terrain}`;
          if (!Array.isArray(pair) || pair.length !== 2) {
            errors.push(`${pairPath}: must be a [min, max] pair`);
            continue;
          }
          if (!(Number.isInteger(pair[0]) && pair[0] >= 1)) errors.push(`${pairPath}[0]: must be an integer >= 1`);
          if (!(Number.isInteger(pair[1]) && pair[1] >= 1)) errors.push(`${pairPath}[1]: must be an integer >= 1`);
          if (Number.isInteger(pair[0]) && Number.isInteger(pair[1]) && pair[0] > pair[1]) {
            errors.push(`${pairPath}: min must be <= max`);
          }
        }
      }
    }
    validateRangePair(cluster.densityRange, `${path}.densityRange`, errors);
    if (cluster.jitter !== undefined && !(Number.isInteger(cluster.jitter) && cluster.jitter >= 0)) {
      errors.push(`${path}.jitter: must be a non-negative integer`);
    }
  }
}

const SIZE_BUCKET_KEYS = ['peak', 'slope', 'normal'];

function validateSize(size, path, errors) {
  if (size === undefined) return;
  if (!isPlainObject(size)) {
    errors.push(`${path}: must be an object { min, max }`);
    return;
  }
  for (const key of Object.keys(size)) {
    if (key !== 'min' && key !== 'max' && key !== 'byMountainType') {
      errors.push(`${path}: unknown field "${key}"`);
    }
  }
  if (size.min !== undefined && !isPositiveNumber(size.min)) errors.push(`${path}.min: must be a positive number`);
  if (size.max !== undefined && !isPositiveNumber(size.max)) errors.push(`${path}.max: must be a positive number`);
  if (size.min !== undefined && size.max !== undefined && size.min > size.max) {
    errors.push(`${path}: min must be <= max`);
  }
  if (size.byMountainType !== undefined) {
    if (!isPlainObject(size.byMountainType)) {
      errors.push(`${path}.byMountainType: must be an object of { peak, slope, normal } buckets`);
    } else {
      for (const [bucket, pair] of Object.entries(size.byMountainType)) {
        const bucketPath = `${path}.byMountainType.${bucket}`;
        if (!SIZE_BUCKET_KEYS.includes(bucket)) {
          errors.push(`${bucketPath}: unknown bucket (known: ${SIZE_BUCKET_KEYS.join(', ')})`);
          continue;
        }
        if (!isPlainObject(pair)) {
          errors.push(`${bucketPath}: must be an object { min, max }`);
          continue;
        }
        if (!isPositiveNumber(pair.min)) errors.push(`${bucketPath}.min: must be a positive number`);
        if (!isPositiveNumber(pair.max)) errors.push(`${bucketPath}.max: must be a positive number`);
        if (isPositiveNumber(pair.min) && isPositiveNumber(pair.max) && pair.min > pair.max) {
          errors.push(`${bucketPath}: min must be <= max`);
        }
      }
    }
  }
}

function validateRangePair(pair, path, errors) {
  if (pair === undefined) return;
  if (!Array.isArray(pair) || pair.length !== 2) {
    errors.push(`${path}: must be a [min, max] pair`);
    return;
  }
  if (!isPositiveNumber(pair[0])) errors.push(`${path}[0]: must be a positive number`);
  if (!isPositiveNumber(pair[1])) errors.push(`${path}[1]: must be a positive number`);
  if (isPositiveNumber(pair[0]) && isPositiveNumber(pair[1]) && pair[0] > pair[1]) {
    errors.push(`${path}: min must be <= max`);
  }
}

const VARIATION_KEYS = ['stretchY', 'stretchX', 'stretchZ', 'stretchXZ', 'colorJitter'];

function validateVariation(variation, path, errors) {
  if (variation === undefined) return;
  if (!isPlainObject(variation)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  for (const key of Object.keys(variation)) {
    if (!VARIATION_KEYS.includes(key)) errors.push(`${path}: unknown field "${key}"`);
  }
  validateRangePair(variation.stretchY, `${path}.stretchY`, errors);
  validateRangePair(variation.stretchX, `${path}.stretchX`, errors);
  validateRangePair(variation.stretchZ, `${path}.stretchZ`, errors);
  validateRangePair(variation.stretchXZ, `${path}.stretchXZ`, errors);
  if (variation.colorJitter !== undefined && !isNonNegativeNumber(variation.colorJitter)) {
    errors.push(`${path}.colorJitter: must be >= 0`);
  }
}

const PLACEMENT_KEYS = ['mode', 'offsetMin', 'offsetMax', 'separation', 'ringMin', 'ringMax', 'leanMin', 'leanMax', 'offset', 'tiltMin', 'tiltMax', 'tiltSeed'];

function validatePlacement(placement, path, errors) {
  if (placement === undefined) return;
  if (!isPlainObject(placement)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  for (const key of Object.keys(placement)) {
    if (!PLACEMENT_KEYS.includes(key)) errors.push(`${path}: unknown field "${key}"`);
  }
  if (placement.mode !== undefined && !PLACEMENT_MODES.includes(placement.mode)) {
    errors.push(`${path}.mode: must be one of ${PLACEMENT_MODES.join(', ')}`);
  }
  if (placement.mode === 'scatter') {
    if (placement.offsetMin !== undefined && !isNonNegativeNumber(placement.offsetMin)) errors.push(`${path}.offsetMin: must be >= 0`);
    if (placement.offsetMax !== undefined && !isNonNegativeNumber(placement.offsetMax)) errors.push(`${path}.offsetMax: must be >= 0`);
    if (placement.offsetMin !== undefined && placement.offsetMax !== undefined && placement.offsetMin > placement.offsetMax) {
      errors.push(`${path}: offsetMin must be <= offsetMax`);
    }
    if (placement.separation !== undefined && !isNonNegativeNumber(placement.separation)) errors.push(`${path}.separation: must be >= 0`);
  }
  if (placement.mode === 'ring') {
    if (placement.ringMin !== undefined && !isPositiveNumber(placement.ringMin)) errors.push(`${path}.ringMin: must be > 0`);
    if (placement.ringMax !== undefined && !isPositiveNumber(placement.ringMax)) errors.push(`${path}.ringMax: must be > 0`);
    if (placement.ringMin !== undefined && placement.ringMax !== undefined && placement.ringMin > placement.ringMax) {
      errors.push(`${path}: ringMin must be <= ringMax`);
    }
    if (placement.leanMin !== undefined && !isNonNegativeNumber(placement.leanMin)) errors.push(`${path}.leanMin: must be >= 0`);
    if (placement.leanMax !== undefined && !isNonNegativeNumber(placement.leanMax)) errors.push(`${path}.leanMax: must be >= 0`);
    if (placement.leanMin !== undefined && placement.leanMax !== undefined && placement.leanMin > placement.leanMax) {
      errors.push(`${path}: leanMin must be <= leanMax`);
    }
  }
  if (placement.mode === 'jitter') {
    if (placement.offset !== undefined && !isNonNegativeNumber(placement.offset)) errors.push(`${path}.offset: must be >= 0`);
    if (placement.tiltMin !== undefined && !isNonNegativeNumber(placement.tiltMin)) errors.push(`${path}.tiltMin: must be >= 0`);
    if (placement.tiltMax !== undefined && !isNonNegativeNumber(placement.tiltMax)) errors.push(`${path}.tiltMax: must be >= 0`);
    if (placement.tiltMin !== undefined && placement.tiltMax !== undefined && placement.tiltMin > placement.tiltMax) {
      errors.push(`${path}: tiltMin must be <= tiltMax`);
    }
    if (placement.tiltSeed !== undefined && !(Number.isInteger(placement.tiltSeed) && placement.tiltSeed >= 0)) {
      errors.push(`${path}.tiltSeed: must be a non-negative integer`);
    }
    if (placement.separation !== undefined && !isNonNegativeNumber(placement.separation)) errors.push(`${path}.separation: must be >= 0`);
  }
}

function validateEmphasis(emphasis, path, errors) {
  if (emphasis === undefined) return;
  if (!isPlainObject(emphasis)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  for (const key of Object.keys(emphasis)) {
    if (key !== 'behavior') errors.push(`${path}: unknown field "${key}"`);
  }
  if (emphasis.behavior !== undefined && !EMPHASIS_BEHAVIORS.includes(emphasis.behavior)) {
    errors.push(`${path}.behavior: must be one of ${EMPHASIS_BEHAVIORS.join(', ')}`);
  }
}

const MATERIAL_KEYS = ['emissive', 'emissiveIntensity'];

function validateMaterial(material, path, errors) {
  if (material === undefined) return;
  if (!isPlainObject(material)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  for (const key of Object.keys(material)) {
    if (!MATERIAL_KEYS.includes(key)) errors.push(`${path}: unknown field "${key}"`);
  }
  if (material.emissive !== undefined && !isColorInt(material.emissive)) errors.push(`${path}.emissive: must be an integer 0..0xFFFFFF`);
  if (material.emissiveIntensity !== undefined && !isNonNegativeNumber(material.emissiveIntensity)) {
    errors.push(`${path}.emissiveIntensity: must be >= 0`);
  }
}

const PORTRAIT_KEYS = ['pitch', 'yaw', 'pad', 'raise'];

function validatePortrait(portrait, path, errors) {
  if (portrait === undefined) return;
  if (!isPlainObject(portrait)) {
    errors.push(`${path}: must be an object { pitch?, yaw?, pad?, raise? }`);
    return;
  }
  for (const key of Object.keys(portrait)) {
    if (!PORTRAIT_KEYS.includes(key)) errors.push(`${path}: unknown field "${key}"`);
  }
  if (portrait.pitch !== undefined && !isFiniteNumber(portrait.pitch)) errors.push(`${path}.pitch: must be a number (radians)`);
  if (portrait.yaw !== undefined && !isFiniteNumber(portrait.yaw)) errors.push(`${path}.yaw: must be a number (radians)`);
  if (portrait.pad !== undefined && !isPositiveNumber(portrait.pad)) errors.push(`${path}.pad: must be a positive number`);
  if (portrait.raise !== undefined && !isFiniteNumber(portrait.raise)) errors.push(`${path}.raise: must be a number`);
}

const OBJECT_KEYS = [
  'schemaVersion', 'id', 'kind', 'displayName', 'parts', 'variants', 'variantRule',
  'scale', 'cluster', 'size', 'variation', 'placement', 'emphasis', 'material',
  'slot', 'portrait', 'biomeVariants', 'optionalGroups', 'motifs', 'repeatPenalty',
];

const MOTIF_KEYS = ['id', 'motif', 'weight', 'biomeWeight', 'size', 'placement', 'parts'];

/**
 * The registered biome id list, when the archetype registry is populated (the
 * game and the geometry editor load it; bare Node runs may not). A `biomeWeight`
 * key that is not registered must not silently no-op (unlike biomeScale /
 * biomeVariants keys today) — reject it whenever we can see the registry.
 */
function registeredBiomeIds() {
  return new Set(listArchetypes('biome'));
}

/**
 * Validate a decor's `motifs` — the weighted per-slot table replacing
 * `variants` on the decor path (decorComposition.md §2.1). Each entry is one
 * of two forms:
 *   - reference  `{ motif: '<libraryId>', weight?, biomeWeight?, size?, placement? }`
 *     — resolves shared geometry from the motif library; `size`/`placement`
 *     override the library defaults. `parts` is optional: a normalize pass
 *     materializes the shared parts onto the entry (they must equal the
 *     library), while raw/denormalized refs carry none.
 *   - inline     `{ id, weight?, biomeWeight?, size?, placement?, parts }`
 *     — legacy/local geometry authored in place.
 * Motif ids are unique; `weight` >= 0 (default 1); `biomeWeight` is a sparse
 * per-biome multiplier (absent key ≡ 1, present 0 ≡ excluded) whose keys must
 * be registered biome ids; `size`/`placement` are per-entry overrides (absent
 * fields inherit the decor-level or library defaults); inline `parts` is a
 * regular parts list (groups + alternatives allowed, non-empty).
 */
function validateMotifs(motifs, path, errors, seen) {
  if (!Array.isArray(motifs) || motifs.length === 0) {
    errors.push(`${path}: must be a non-empty array of motif references or inline motifs (see decorComposition.md §2.1)`);
    return;
  }
  const biomeIds = registeredBiomeIds();
  const seenMotifIds = new Set();
  motifs.forEach((motif, mi) => {
    const mpath = `${path}[${mi}]`;
    if (!isPlainObject(motif)) {
      errors.push(`${mpath}: motif must be an object { motif?|id?, weight?, biomeWeight?, size?, placement?, parts? }`);
      return;
    }
    const isRef = typeof motif.motif === 'string';
    if (isRef) {
      if (!ID_PATTERN.test(motif.motif)) {
        errors.push(`${mpath}.motif: must match /^[A-Za-z0-9_-]+$/`);
      } else if (!motifById(motif.motif)) {
        errors.push(`${mpath}.motif: unknown shared motif "${motif.motif}" in the motif library`);
      }
      if (seenMotifIds.has(motif.motif)) errors.push(`${mpath}: duplicate motif id "${motif.motif}"`);
      seenMotifIds.add(motif.motif);
    } else if (typeof motif.id !== 'string' || !motif.id) {
      errors.push(`${mpath}: missing motif id`);
    } else {
      if (!ID_PATTERN.test(motif.id)) errors.push(`${mpath}.id: must match /^[A-Za-z0-9_-]+$/`);
      if (seenMotifIds.has(motif.id)) errors.push(`${mpath}: duplicate motif id "${motif.id}"`);
      seenMotifIds.add(motif.id);
    }
    for (const key of Object.keys(motif)) {
      if (!MOTIF_KEYS.includes(key)) errors.push(`${mpath}: unknown field "${key}"`);
    }
    if (motif.weight !== undefined && (typeof motif.weight !== 'number' || !Number.isFinite(motif.weight) || motif.weight < 0)) {
      errors.push(`${mpath}.weight: must be a number >= 0`);
    }
    if (motif.biomeWeight !== undefined) {
      if (!isPlainObject(motif.biomeWeight)) {
        errors.push(`${mpath}.biomeWeight: must be an object of biome id → multiplier (absent ≡ 1, 0 ≡ excluded)`);
      } else {
        for (const [biomeId, factor] of Object.entries(motif.biomeWeight)) {
          if (typeof factor !== 'number' || !Number.isFinite(factor) || factor < 0) {
            errors.push(`${mpath}.biomeWeight.${biomeId}: must be a number >= 0`);
          }
          if (biomeIds.size > 0 && !biomeIds.has(biomeId)) {
            errors.push(`${mpath}.biomeWeight: unknown biome id "${biomeId}" (registered: ${[...biomeIds].join(', ')})`);
          }
        }
      }
    }
    validateSize(motif.size, `${mpath}.size`, errors);
    validatePlacement(motif.placement, `${mpath}.placement`, errors);
    if (isRef) {
      // A reference's parts are optional — a normalize pass materializes the
      // shared parts (validated so a bad edit can't hide), a raw/denormalized
      // ref carries none.
      if (Array.isArray(motif.parts) && motif.parts.length > 0) {
        motif.parts.forEach((part, pi) => validatePart(part, `${mpath}.parts[${pi}]`, errors, seen));
      }
    } else if (!Array.isArray(motif.parts) || motif.parts.length === 0) {
      errors.push(`${mpath}.parts: required non-empty array`);
    } else {
      motif.parts.forEach((part, pi) => validatePart(part, `${mpath}.parts[${pi}]`, errors, seen));
    }
  });

  // Dev-time warning: a biome whose filter excludes EVERY motif falls back to
  // base weights at draw time — usually a typo that zeroed the whole table and
  // must not ship silently (decorComposition.md §2.1).
  if (motifs.length > 0 && biomeIds.size > 0) {
    for (const biomeId of biomeIds) {
      const total = motifs.reduce((sum, m) => sum + (m.weight ?? 1) * (m.biomeWeight?.[biomeId] ?? 1), 0);
      if (total <= 0) {
        // eslint-disable-next-line no-console
        console.warn(`[descriptor] biome "${biomeId}" excludes every motif of "${motifs[0]?.id ?? path}" — the table falls back to base weights at draw time`);
      }
    }
  }
}

const MOTIF_BLOCK_KEYS = ['id', 'size', 'placement', 'parts'];

/**
 * Validate a standalone shared-library motif block — the hand-authored shape in
 * `data/motifs/` (`{ id, size?, placement?, parts }`, sharedMotifLibrary.md).
 * Distinct from `validateDescriptor`: a motif is a parts block, NOT a
 * descriptor — it carries no `kind`/`displayName` and is never registered in the
 * object browser. Part ids must be unique across the block (meshAssembly keys
 * meshes by bare partId from the merged partById map), so a motif that mixes
 * with other motifs in a decor can never collide.
 * @param {object} motif - the motif block
 * @param {object} [opts]
 * @param {boolean} [opts.checkId=false] - also validate the block's `id` field
 *        (the editor's save path checks it; in-memory library blocks already
 *        have a known id)
 * @returns {string[]} errors ([] = valid)
 */
export function validateMotifBlock(motif, opts = {}) {
  const errors = [];
  if (!isPlainObject(motif)) return ['motif must be an object'];
  for (const key of Object.keys(motif)) {
    if (!MOTIF_BLOCK_KEYS.includes(key)) errors.push(`motif: unknown field "${key}"`);
  }
  if (opts.checkId !== false) {
    if (typeof motif.id !== 'string' || !ID_PATTERN.test(motif.id)) {
      errors.push('motif.id: required, must match /^[A-Za-z0-9_-]+$/');
    }
  }
  validateSize(motif.size, 'motif.size', errors);
  validatePlacement(motif.placement, 'motif.placement', errors);
  const seen = new Set();
  validatePartsList(motif.parts, 'motif', errors, seen);
  return errors;
}

/**
 * Validate a descriptor. Accepts raw (un-normalized) descriptors — optional
 * fields may be absent; `normalizeDescriptor` fills their defaults.
 * @param {object} def - descriptor
 * @returns {string[]} errors ([] = valid)
 */
export function validateDescriptor(def) {
  const errors = [];
  if (!isPlainObject(def)) return ['descriptor must be an object'];

  if (typeof def.id !== 'string' || !ID_PATTERN.test(def.id)) {
    errors.push('descriptor.id: required, must match /^[A-Za-z0-9_-]+$/');
  }
  if (typeof def.displayName !== 'string' || !def.displayName.trim()) {
    errors.push('descriptor.displayName: required non-empty string');
  }
  if (!OBJECT_KINDS.includes(def.kind)) {
    errors.push(`descriptor.kind: must be one of ${OBJECT_KINDS.join(', ')}`);
  }

  // One part-id namespace across the trees that RENDER TOGETHER — the
  // descriptor's `parts`, every motif's parts (incl. nested alternatives), and
  // every optional group share one set, because one tile renders all of them
  // and meshAssembly keys meshes by bare partId from a merged partById map.
  // Variant parts keep per-variant scoping: only ONE variant renders per item,
  // and entity/feature barrels rely on the fallback convention that `parts`
  // re-declares variants[0]'s ids (spec: entity kinds and mountain are
  // untouched). Cross-variant id reuse is a content hazard the decor migration
  // uniquifies (forest.js's `trunk`), not a validator rejection.
  const seen = new Set();

  // The fallback `parts` list is OPTIONAL on the decor path (v6 motifs replace
  // it — decorComposition.md §2.3); every other kind still requires it.
  // An empty array is treated as absent (normalizeDescriptor fills `parts: []`
  // for decor files that author none).
  if (def.kind === 'decor') {
    if (Array.isArray(def.parts) && def.parts.length > 0) validatePartsList(def.parts, 'descriptor', errors, seen);
  } else {
    validatePartsList(def.parts, 'descriptor', errors, seen);
  }

  if (def.variants !== undefined) {
    if (!Array.isArray(def.variants) || def.variants.length === 0) {
      errors.push('descriptor.variants: must be a non-empty array of { id, parts, material? }');
    } else {
      const seenVariants = new Set();
      def.variants.forEach((variant, vi) => {
        const vpath = `descriptor.variants[${vi}]`;
        if (!isPlainObject(variant)) {
          errors.push(`${vpath}: variant must be an object { id, parts, material? }`);
          return;
        }
        if (typeof variant.id !== 'string' || !variant.id) {
          errors.push(`${vpath}: missing variant id`);
        } else if (seenVariants.has(variant.id)) {
          errors.push(`${vpath}: duplicate variant id "${variant.id}"`);
        }
        seenVariants.add(variant.id);
        validatePartsList(variant.parts, vpath, errors);
        validateMaterial(variant.material, `${vpath}.material`, errors);
      });
    }
  }

  // v6 decor composition: `motifs` is the decor path's weighted slot table and
  // is mutually exclusive with `variants` — a descriptor carrying both is
  // rejected outright, and the record path never falls through to `parts`.
  // (Transitional v5 decor files may carry `variants` without `motifs`; the
  // in-memory shim in normalizeDescriptor gives every decor `motifs` before
  // the record path runs — decorComposition.md §2.1 / §3.3.)
  if (def.kind === 'decor') {
    if (def.motifs !== undefined && def.variants !== undefined) {
      errors.push('descriptor: decor kind may carry `motifs` OR legacy `variants`, never both');
    }
    if (def.motifs === undefined && !Array.isArray(def.variants) && !Array.isArray(def.parts)) {
      errors.push('descriptor: decor kind needs content — `motifs`, legacy `variants`, or `parts`');
    }
  }
  if (def.motifs !== undefined) {
    validateMotifs(def.motifs, 'descriptor.motifs', errors, seen);
  }  if (def.repeatPenalty !== undefined && (typeof def.repeatPenalty !== 'number' || !Number.isFinite(def.repeatPenalty) || def.repeatPenalty < 0 || def.repeatPenalty > 1)) {
    errors.push('descriptor.repeatPenalty: must be a number in [0, 1] (1 = independent draws, 0 = without replacement)');
  }

  if (def.variantRule !== undefined && !VARIANT_RULES.includes(def.variantRule)) {
    errors.push(`descriptor.variantRule: must be one of ${VARIANT_RULES.join(', ')}`);
  }

  /**
   * Validate `biomeVariants` — a biomeId → variantId pin map: every value must
   * name a variant the descriptor defines, so a pin can never silently point
   * nowhere. Under v6 the pin names a MOTIF id on the decor path (the decor
   * migration converts variants → motifs with the same ids, so both namespaces
   * must be accepted).
   */
  if (def.biomeVariants !== undefined) {
    if (!isPlainObject(def.biomeVariants)) {
      errors.push('descriptor.biomeVariants: must be an object of biomeId → variantId');
    } else {
      const pinIds = new Set([
        ...(def.variants ?? []).map((v) => v?.id),
        ...(def.motifs ?? []).map((m) => m?.motif ?? m?.id),
      ]);
      for (const [biomeId, variantId] of Object.entries(def.biomeVariants)) {
        if (typeof variantId !== 'string' || !variantId) {
          errors.push(`descriptor.biomeVariants["${biomeId}"]: variantId must be a non-empty string`);
        } else if (!pinIds.has(variantId)) {
          errors.push(`descriptor.biomeVariants["${biomeId}"]: unknown variant "${variantId}"`);
        }
      }
    }
  }

  if (def.optionalGroups !== undefined) {
    if (!Array.isArray(def.optionalGroups)) {
      errors.push('descriptor.optionalGroups: must be an array of { id, chance?, parts }');
    } else {
      const seenGroupIds = new Set();
      def.optionalGroups.forEach((group, gi) => {
        const gpath = `descriptor.optionalGroups[${gi}]`;
        if (!isPlainObject(group)) {
          errors.push(`${gpath}: group must be an object { id, chance?, parts }`);
          return;
        }
        if (typeof group.id !== 'string' || !group.id) {
          errors.push(`${gpath}: missing group id`);
        } else if (seenGroupIds.has(group.id)) {
          errors.push(`${gpath}: duplicate group id "${group.id}"`);
        }
        seenGroupIds.add(group.id);
        if (group.chance !== undefined && (typeof group.chance !== 'number' || group.chance < 0 || group.chance > 1)) {
          errors.push(`${gpath}.chance: must be a number in [0, 1]`);
        }
        validatePartsList(group.parts, gpath, errors, seen);
      });
    }
  }

  if (def.scale !== undefined && !isPositiveNumber(def.scale)) errors.push('descriptor.scale: must be a positive number');
  validateCluster(def.cluster, 'descriptor.cluster', errors);
  validateSize(def.size, 'descriptor.size', errors);
  validateVariation(def.variation, 'descriptor.variation', errors);
  validatePlacement(def.placement, 'descriptor.placement', errors);
  validateEmphasis(def.emphasis, 'descriptor.emphasis', errors);
  validateMaterial(def.material, 'descriptor.material', errors);
  validatePortrait(def.portrait, 'descriptor.portrait', errors);

  // `slot` is the item's equipment slot (weapon/armor/…). Required for item
  // kind, meaningless elsewhere — keep the two kinds from drifting.
  if (def.kind === 'item') {
    if (typeof def.slot !== 'string' || !ITEM_SLOTS.includes(def.slot)) {
      errors.push(`descriptor.slot: item kind requires one of ${ITEM_SLOTS.join(', ')}`);
    }
  } else if (def.slot !== undefined) {
    errors.push('descriptor.slot: only the "item" kind uses a slot');
  }

  for (const key of Object.keys(def)) {
    if (!OBJECT_KEYS.includes(key)) errors.push(`descriptor: unknown field "${key}"`);
  }

  return errors;
}
