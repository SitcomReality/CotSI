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
