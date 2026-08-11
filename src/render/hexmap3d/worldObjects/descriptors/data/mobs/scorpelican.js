/**
 * scorpelican.js — Descriptor variant for the Scorpelican mob.
 *
 * Recovered from the hand-authored experiment `data/scorpelican.js` (see
 * dev/docs/mobGeometryAndAnimation.md) and re-authored as a mob variant block:
 * geometry only — the experimental declarative animation-clip spec (the bare
 * JSON block that also made the original file a syntax error) is dropped until
 * the declarative animation system lands.
 *
 * A pelican on a venomous tail-chassis: hinged neck/head with a lower-beak
 * pouch, two swept-back wings, and an articulated FK tail chain ending in a
 * poison sac + stinger. Body/neck/skull use the mob faction tokens
 * (factionBody — NOT factionBase, which resolves to undefined for mobs); the
 * wings carry the faction accent; legs, beak, and tail are literal themed
 * colors. Joint groups (children, no shape) are the animation pivots.
 */

export const SCORPELICAN_VARIANT = {
  id: 'scorpelican',
  parts: [
    // ── Root body (the anchor) ──────────────────────────────────────────────
    {
      id: 'body-core',
      shape: 'spheroid',
      params: { radius: 0.22 },
      transform: {
        y: 0.22, // Grounded at the base of the belly
        scaleY: 0.9,
        scaleZ: 1.2, // Elongated bird-like body
      },
      color: 'factionBody', // Dynamic base color (feathered look)
    },

    // ── Legs (hinged at the hips) ───────────────────────────────────────────
    {
      id: 'leg-left-joint',
      transform: {
        localPos: { x: -0.09, y: 0.16, z: -0.02 }, // Root joint near the lower torso
      },
      children: [
        {
          id: 'thigh-l',
          shape: 'cylinder',
          params: { bottomR: 0.02, topR: 0.035, height: 0.12 },
          color: 0xff8c00, // Bright orange legs
        },
        {
          id: 'foot-l',
          shape: 'box',
          params: { width: 0.06, height: 0.015, depth: 0.09 },
          transform: { localPos: { x: 0, y: -0.06, z: 0.03 } },
          color: 0xff8c00,
        },
      ],
    },
    {
      id: 'leg-right-joint',
      transform: {
        localPos: { x: 0.09, y: 0.16, z: -0.02 },
      },
      children: [
        {
          id: 'thigh-r',
          shape: 'cylinder',
          params: { bottomR: 0.02, topR: 0.035, height: 0.12 },
          color: 0xff8c00,
        },
        {
          id: 'foot-r',
          shape: 'box',
          params: { width: 0.06, height: 0.015, depth: 0.09 },
          transform: { localPos: { x: 0, y: -0.06, z: 0.03 } },
          color: 0xff8c00,
        },
      ],
    },

    // ── Head & beak assembly (hinged at the neck base) ──────────────────────
    {
      id: 'neck-joint',
      transform: {
        localPos: { x: 0, y: 0.35, z: 0.14 }, // Mounted on the front-top of the body
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: 0.2, // Alert forward lean
      },
      children: [
        {
          id: 'neck-stem',
          shape: 'cylinder',
          params: { bottomR: 0.04, topR: 0.03, height: 0.18 },
          color: 'factionBody',
        },
        // Head group (hinged at the top of the neck)
        {
          id: 'head-joint',
          transform: {
            localPos: { x: 0, y: 0.16, z: 0.02 },
          },
          children: [
            {
              id: 'skull',
              shape: 'sphere',
              params: { radius: 0.07 },
              color: 'factionBody',
            },
            {
              id: 'pelican-eye-l',
              shape: 'sphere',
              params: { radius: 0.015 },
              transform: { localPos: { x: -0.05, y: 0.02, z: 0.03 } },
              color: 0x111111,
            },
            {
              id: 'pelican-eye-r',
              shape: 'sphere',
              params: { radius: 0.015 },
              transform: { localPos: { x: 0.05, y: 0.02, z: 0.03 } },
              color: 0x111111,
            },
            // Fixed upper beak
            {
              id: 'upper-beak',
              shape: 'box',
              params: { width: 0.06, height: 0.04, depth: 0.2 },
              transform: { localPos: { x: 0, y: -0.01, z: 0.12 } },
              color: 0xff8c00,
            },
            // Lower beak pouch (hinged to drop open!)
            {
              id: 'lower-beak-hinge',
              transform: {
                localPos: { x: 0, y: -0.03, z: 0.04 },
                localAxis: { x: 1, y: 0, z: 0 },
                localAngle: 0.05, // Slight open yawn by default
              },
              children: [
                {
                  id: 'pouch-sag',
                  shape: 'cone',
                  params: { bottomR: 0.045, height: 0.16 },
                  transform: {
                    localPos: { x: 0, y: -0.04, z: 0.08 },
                    localAxis: { x: 1, y: 0, z: 0 },
                    localAngle: 1.4, // Rotated forward
                    scaleX: 0.7,
                  },
                  color: 0xd2691e, // Deep organic leather orange
                },
              ],
            },
          ],
        },
      ],
    },

    // ── Wings (flapping hinges) ─────────────────────────────────────────────
    {
      id: 'wing-left-hinge',
      transform: {
        localPos: { x: -0.16, y: 0.3, z: -0.05 },
        localAxis: { x: 0, y: 0, z: 1 },
        localAngle: 0.3, // Outward rest angle
      },
      children: [
        {
          id: 'wing-feather-l',
          shape: 'box',
          params: { width: 0.28, height: 0.03, depth: 0.16 },
          transform: {
            localPos: { x: -0.12, y: 0, z: -0.02 },
            localAxis: { x: 0, y: 1, z: 0 },
            localAngle: -0.25, // Swept back
          },
          color: 'factionAccent', // Secondary plumage color
        },
      ],
    },
    {
      id: 'wing-right-hinge',
      transform: {
        localPos: { x: 0.16, y: 0.3, z: -0.05 },
        localAxis: { x: 0, y: 0, z: 1 },
        localAngle: -0.3, // Outward rest angle
      },
      children: [
        {
          id: 'wing-feather-r',
          shape: 'box',
          params: { width: 0.28, height: 0.03, depth: 0.16 },
          transform: {
            localPos: { x: 0.12, y: 0, z: -0.02 },
            localAxis: { x: 0, y: 1, z: 0 },
            localAngle: 0.25, // Swept back
          },
          color: 'factionAccent',
        },
      ],
    },

    // ── Articulated stinger tail (FK joint chain) ───────────────────────────
    {
      id: 'tail-joint-1',
      transform: {
        localPos: { x: 0, y: 0.28, z: -0.16 }, // Base of the posterior spine
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: -0.5, // Arching back and up
      },
      children: [
        {
          id: 'tail-segment-1',
          shape: 'cylinder',
          params: { bottomR: 0.05, topR: 0.045, height: 0.14 },
          color: 0x5c2c77, // Venomous purple
        },
        // Joint 2
        {
          id: 'tail-joint-2',
          transform: {
            localPos: { x: 0, y: 0.12, z: -0.02 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 0.4,
          },
          children: [
            {
              id: 'tail-segment-2',
              shape: 'cylinder',
              params: { bottomR: 0.045, topR: 0.04, height: 0.14 },
              color: 0x6a3289,
            },
            // Joint 3
            {
              id: 'tail-joint-3',
              transform: {
                localPos: { x: 0, y: 0.12, z: 0.01 },
                localAxis: { x: 1, y: 0, z: 0 },
                localAngle: 0.6, // Continuing the recurved loop
              },
              children: [
                {
                  id: 'tail-segment-3',
                  shape: 'cylinder',
                  params: { bottomR: 0.04, topR: 0.032, height: 0.14 },
                  color: 0x7c3a9e,
                },
                // The bulbous poison sac & stinger (end of the chain)
                {
                  id: 'tail-bulb-group',
                  transform: {
                    localPos: { x: 0, y: 0.13, z: 0.04 },
                  },
                  children: [
                    {
                      id: 'poison-sac',
                      shape: 'sphere',
                      params: { radius: 0.052 },
                      color: 0x9400d3,
                    },
                    {
                      id: 'stinger-needle',
                      shape: 'cone',
                      params: { bottomR: 0.018, height: 0.08 },
                      transform: {
                        localPos: { x: 0, y: 0.05, z: 0.03 },
                        localAxis: { x: 1, y: 0, z: 0 },
                        localAngle: 1.1, // Pointed forward and down
                      },
                      color: 0x331144, // Near-black purple tip
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
