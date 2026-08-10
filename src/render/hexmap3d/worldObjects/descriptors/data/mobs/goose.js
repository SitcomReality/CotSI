/**
 * goose.js — Descriptor variant for the Marginal Goose mob.
 *
 * The original baseline body from the table-driven mob.js, split into its own
 * file so each mob is authored independently. Faction-tinted (factionBody).
 */

export const GOOSE_VARIANT = {
  id: 'goose',
  parts: [
    {
      id: 'gooseBody',
      shape: 'cone',
      params: { bottomR: 0.07, height: 0.5, radialSegs: 4, heightSegs: 1 },
      color: 'factionBody',
    },
  ],
};
