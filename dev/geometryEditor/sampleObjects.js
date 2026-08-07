/**
 * sampleObjects.js — Built-in descriptors for the editor preview.
 *
 * Every migrated game object (see descriptors/data/) — all simple feature
 * archetypes, tree groves, solitary + elder trees, hill mounds, mountains,
 * knots, and the entity descriptors (bases, champions, mobs, traders) —
 * normalized for the editor. Editing one of these and exporting the JSON
 * produces a descriptor the generic game builder can consume.
 */
import { normalizeDescriptor } from '../../src/render/hexmap3d/features/descriptors/schema.js';
import { ALL_DESCRIPTORS } from '../../src/render/hexmap3d/features/descriptors/data/index.js';

/** All migrated descriptors, normalized. */
export const SAMPLE_OBJECTS = ALL_DESCRIPTORS.map(normalizeDescriptor);

/**
 * Presentation-level categories for the object picker. Reflects the mechanical
 * roles in gameBuilder.js, not the raw schema kind values (which are still in
 * flux): features claim the hex center and are usually collectible; decor is
 * visual-only terrain dressing (mountains are terrain-mandated — see
 * gameBuilder.js); faction/creature kinds are entity-driven.
 *
 * `kinds` lists the descriptor.kind values that land in each category. The
 * data files and OBJECT_KINDS are untouched — adjust this table instead.
 */
export const OBJECT_CATEGORIES = [
  { id: 'feature', label: 'Features', kinds: ['feature'] },
  { id: 'decor', label: 'Terrain Decor', kinds: ['decor', 'mountain'] },
  { id: 'faction', label: 'Faction', kinds: ['base', 'champion'] },
  { id: 'creature', label: 'Creatures', kinds: ['mob', 'trader'] },
];

/** The category a descriptor belongs to (falls back to Features). */
export function categoryOf(descriptor) {
  return OBJECT_CATEGORIES.find((c) => c.kinds.includes(descriptor.kind)) ?? OBJECT_CATEGORIES[0];
}
