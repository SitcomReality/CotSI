/**
 * leopard.js — Descriptor variant for the Lunar Leopard mob.
 *
 * The original baseline body from the table-driven mob.js, split into its own
 * file so each mob is authored independently. Faction-tinted (factionBody).
 */

export const LEOPARD_VARIANT = {
  id: 'leopard',
  parts: [
    {
      id: 'leopardBody',
      shape: 'cylinder',
      params: { bottomR: 0.07, topR: 0.1, height: 0.5, segments: 6 },
      color: 'factionBody',
    },
  ],
};
