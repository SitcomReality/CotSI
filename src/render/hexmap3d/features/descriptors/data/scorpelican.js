/**
 * scorpelican.js -- Rigged descriptor data for the whimsical "Scorpelican".
 *
 * Designed with a hierarchical joint tree to support skeletal animations.
 */
export const SCORPELICAN_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'scorpelican',
  kind: 'mob',
  displayName: 'Scorpelican',
  scale: 1.2,
  // Entity-driven positioning puts this monster right in the center of its hex
  placement: { mode: 'center' },
  emphasis: { behavior: 'none' },
  parts: [
    // --- ROOT BODY (The Anchor) ---
    {
      id: 'body-core',
      shape: 'spheroid',
      params: { radius: 0.22 },
      transform: {
        y: 0.22, // Grounded perfectly at the base of the belly
        scaleY: 0.9,
        scaleZ: 1.2, // Elongated bird-like body
      },
      color: 'factionBase', // Dynamic base color (e.g., white/gray feathering)
    },

    // --- LEGS (Hinged at hips) ---
    {
      id: 'leg-left-joint',
      transform: {
        y: 0.16, // Root leg joint grounded near lower torso
        localPos: { x: -0.09, y: 0, z: -0.02 },
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
        y: 0.16,
        localPos: { x: 0.09, y: 0, z: -0.02 },
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

    // --- HEAD & BEAK ASSEMBLY (Hinged at Neck Base) ---
    {
      id: 'neck-joint',
      transform: {
        y: 0.35, // Mounted on front-top of body
        localPos: { x: 0, y: 0, z: 0.14 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: 0.2, // Default alert forward lean
      },
      children: [
        {
          id: 'neck-stem',
          shape: 'cylinder',
          params: { bottomR: 0.04, topR: 0.03, height: 0.18 },
          color: 'factionBase',
        },
        // Head Group (Hinged at top of neck)
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
              color: 'factionBase',
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
            // Lower Beak Pouch (Hinged to drop open!)
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

    // --- WINGS (Flapping Hinges) ---
    {
      id: 'wing-left-hinge',
      transform: {
        y: 0.3,
        localPos: { x: -0.16, y: 0, z: -0.05 },
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
        y: 0.3,
        localPos: { x: 0.16, y: 0, z: -0.05 },
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

    // --- ARTICULATED SCORPION TAIL (FK Joint Chain) ---
    {
      id: 'tail-joint-1',
      transform: {
        y: 0.28,
        localPos: { x: 0, y: 0, z: -0.16 }, // Base of posterior spine
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: -0.5, // Arching back up
      },
      children: [
        {
          id: 'tail-segment-1',
          shape: 'cylinder',
          params: { bottomR: 0.05, topR: 0.045, height: 0.14 },
          color: 0x5c2c77, // Venomous Purple
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
                // The Bulbous Poison Bulb & Stinger (End of chain)
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


{
  "scorpelicanAnimations": {
    "idle": [
      {
        "comment": "Subtle, breathing head bob",
        "targetId": "neck-joint",
        "property": "localAngle",
        "func": "sine",
        "frequency": 1.8,
        "amplitude": 0.04,
        "phase": 0.0
      },
      {
        "comment": "Rhythmic wing folding rest",
        "targetId": "wing-left-hinge",
        "property": "localAngle",
        "func": "sine",
        "frequency": 0.9,
        "amplitude": 0.05,
        "phase": 0.0
      },
      {
        "targetId": "wing-right-hinge",
        "property": "localAngle",
        "func": "sine",
        "frequency": 0.9,
        "amplitude": -0.05,
        "phase": 0.0
      },
      {
        "comment": "The threat display tail bob",
        "targetId": "tail-joint-3",
        "property": "localAngle",
        "func": "sine",
        "frequency": 2.4,
        "amplitude": 0.08,
        "phase": 1.2
      }
    ],
    "walk": [
      {
        "comment": "Left leg stride cycle",
        "targetId": "leg-left-joint",
        "property": "localAngle",
        "func": "sine",
        "frequency": 5.0,
        "amplitude": 0.4,
        "phase": 0.0
      },
      {
        "comment": "Right leg stride cycle (perfectly offset by half a loop)",
        "targetId": "leg-right-joint",
        "property": "localAngle",
        "func": "sine",
        "frequency": 5.0,
        "amplitude": 0.4,
        "phase": 3.14159
      },
      {
        "comment": "Intense counter-balance wing balancing during run",
        "targetId": "wing-left-hinge",
        "property": "localAngle",
        "func": "sine",
        "frequency": 5.0,
        "amplitude": 0.12,
        "phase": 1.5
      },
      {
        "targetId": "wing-right-hinge",
        "property": "localAngle",
        "func": "sine",
        "frequency": 5.0,
        "amplitude": -0.12,
        "phase": 1.5
      }
    ],
    "attack": [
      {
        "comment": "Rapid stinger jab forward",
        "targetId": "tail-joint-1",
        "property": "localAngle",
        "func": "sawtooth",
        "frequency": 4.0,
        "amplitude": 0.8,
        "phase": 0.0
      },
      {
        "comment": "Hissing scream - jaw drops open matching tail strike",
        "targetId": "lower-beak-hinge",
        "property": "localAngle",
        "func": "sine",
        "frequency": 4.0,
        "amplitude": 0.4,
        "phase": -1.0
      }
    ]
  }
}