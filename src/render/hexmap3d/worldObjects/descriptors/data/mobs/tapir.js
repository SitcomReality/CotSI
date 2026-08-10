/**
 * tapir.js — Descriptor variant for the Solar Tapir mob.
 *
 * The original baseline body from the table-driven mob.js, split into its own
 * file so each mob is authored independently. Faction-tinted (factionBody).
 */

export const TAPIR_VARIANT = {
  id: 'tapir',
  parts: [
    {
      id: 'tapirBody',
      shape: 'cylinder',
      params: { bottomR: 0.08, topR: 0.18, height: 0.42, segments: 7 },
      color: 'factionBody',
    },
  ],
};
