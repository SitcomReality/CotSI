/**
 * mushroom.js — Descriptor variant for the Abusive Mushroom mob.
 *
 * The original baseline body from the table-driven mob.js, split into its own
 * file so each mob is authored independently. A squat cap, faction tinted
 * (factionBody).
 */

export const MUSHROOM_VARIANT = {
  id: 'mushroom',
  parts: [
    {
      id: 'mushroomBody',
      shape: 'cone',
      params: { bottomR: 0.2, height: 0.14, radialSegs: 8, heightSegs: 1 },
      color: 'factionBody',
    },
  ],
};
