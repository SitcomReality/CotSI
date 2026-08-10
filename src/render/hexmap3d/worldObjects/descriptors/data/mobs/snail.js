/**
 * snail.js — Descriptor variant for the Snail Knight mob.
 *
 * The original baseline body from the table-driven mob.js, split into its own
 * file so each mob is authored independently. A half-shell sphere, faction
 * tinted (factionBody).
 */

export const SNAIL_VARIANT = {
  id: 'snail',
  parts: [
    {
      id: 'snailBody',
      shape: 'sphere',
      params: {
        radius: 0.16, wSegs: 8, hSegs: 6,
        phiStart: 0, phiLength: Math.PI, thetaStart: 0, thetaLength: Math.PI * 0.55,
      },
      color: 'factionBody',
    },
  ],
};
