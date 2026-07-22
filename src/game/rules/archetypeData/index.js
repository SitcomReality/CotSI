/**
 * archetypeData/index.js — Barrel import that triggers all archetype registrations.
 *
 * Import this module for its side effects: it populates the archetype registry
 * in archetypes.js with all mob, feature, and biome definitions.
 *
 * Weather archetypes are not yet defined here — see weatherScript.js.
 */

import './mobs.js';
import './features.js';
import './biomes.js';
