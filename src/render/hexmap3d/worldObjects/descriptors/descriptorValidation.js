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
import { validatePartsList } from './validateParts.js';

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
  'slot', 'portrait', 'biomeVariants',
];

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

  validatePartsList(def.parts, 'descriptor', errors);

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

  if (def.variantRule !== undefined && !VARIANT_RULES.includes(def.variantRule)) {
    errors.push(`descriptor.variantRule: must be one of ${VARIANT_RULES.join(', ')}`);
  }

  if (def.biomeVariants !== undefined) {
    if (!isPlainObject(def.biomeVariants)) {
      errors.push('descriptor.biomeVariants: must be an object of biomeId → variantId');
    } else {
      const variantIds = new Set((def.variants ?? []).map((v) => v?.id));
      for (const [biomeId, variantId] of Object.entries(def.biomeVariants)) {
        if (typeof variantId !== 'string' || !variantId) {
          errors.push(`descriptor.biomeVariants["${biomeId}"]: variantId must be a non-empty string`);
        } else if (!variantIds.has(variantId)) {
          errors.push(`descriptor.biomeVariants["${biomeId}"]: unknown variant "${variantId}"`);
        }
      }
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
