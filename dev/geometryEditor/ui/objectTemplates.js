/**
 * objectTemplates.js — Fresh descriptor templates for new objects.
 *
 * Pure template builders for the "＋ Feature / Decor / Mob" buttons; the
 * session swap lives in projectControls.js. `normalizeDescriptor` fills any
 * remaining optional fields at creation time.
 */
import {
  SHAPE_TYPES,
  PART_TRANSFORM_DEFAULTS,
} from '../../../src/render/hexmap3d/features/descriptors/schema.js';

let createCounter = 0;

/** A fresh part with the new cube/spheroid shapes and a full transform. */
function templatePart(id, shape, params, transform, color) {
  const part = {
    id,
    shape,
    params: { ...SHAPE_TYPES[shape].defaults, ...params },
    transform: { ...PART_TRANSFORM_DEFAULTS, ...transform },
  };
  if (color !== undefined) part.color = color;
  return part;
}

/**
 * A minimal, valid descriptor template for a new object of the given kind.
 * `normalizeDescriptor` fills the remaining optional fields (variation,
 * placement sub-fields, emphasis, material). The id is unique per session so
 * downloads never collide; displayName is editable via the inspector.
 */
export function newObjectTemplate(kind) {
  createCounter += 1;
  const suffix = createCounter;

  if (kind === 'feature') {
    return {
      id: `new_feature_${suffix}`,
      kind: 'feature',
      displayName: 'New Feature',
      parts: [templatePart('body', 'cube', { size: 0.3 }, { y: 0.15 })],
      cluster: { min: 1, max: 1, rule: 'uniform' },
      size: { min: 1, max: 1 },
      placement: { mode: 'center' },
      emphasis: { behavior: 'none' },
      material: { color: 0x8a5a2b },
    };
  }
  if (kind === 'decor') {
    return {
      id: `new_decor_${suffix}`,
      kind: 'decor',
      displayName: 'New Decor',
      parts: [templatePart('body', 'spheroid', { radius: 0.2 }, { y: 0.2 })],
      cluster: { min: 1, max: 1, rule: 'uniform' },
      size: { min: 1, max: 1 },
      placement: { mode: 'jitter' },
      emphasis: { behavior: 'dispersed' },
      material: { color: 0x6b7a5a },
    };
  }
  // mob — entity-driven, one archetype variant; colored through the palette.
  return {
    id: `new_mob_${suffix}`,
    kind: 'mob',
    displayName: 'New Mob',
    variantRule: 'archetype',
    material: { color: 0xffffff },
    parts: [templatePart('newMobBody', 'spheroid', { radius: 0.15 }, { y: 0.15 }, 'factionBody')],
    variants: [{
      id: 'newmob',
      parts: [
        templatePart('newMobBody', 'spheroid', { radius: 0.15 }, { y: 0.15 }, 'factionBody'),
        templatePart('newMobHead', 'cube', { size: 0.08 }, { y: 0.32 }, 'factionAccent'),
      ],
    }],
  };
}
