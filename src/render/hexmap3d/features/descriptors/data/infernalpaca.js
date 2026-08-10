/**
 * infernalpaca.js -- Descriptor data for "Infernalpaca".
 */
export const INFERNALPACA_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'infernalpaca',
  kind: 'mob',
  displayName: 'Infernalpaca',
  scale: 1.1,
  placement: { mode: 'center' },
  emphasis: { behavior: 'dispersed' },
  material: { emissive: 0xff3e00, emissiveIntensity: 0.35 },
  parts: [
    // ------------------------------------------------------------------------
    // MAIN TORSO & FLUFF
    // ------------------------------------------------------------------------
    {
      id: 'torso-main',
      shape: 'spheroid',
      params: { radius: 0.28, wSegs: 6, hSegs: 5 },
      transform: { y: 0.26, scaleX: 0.9, scaleY: 0.85, scaleZ: 1.25 },
      color: 0x1f1f24, // Obsidian dark wool
    },
    {
      id: 'torso-magma-fluff-under',
      shape: 'spheroid',
      params: { radius: 0.22, wSegs: 6, hSegs: 4 },
      transform: { y: 0.22, scaleX: 0.82, scaleY: 0.7, scaleZ: 1.1 },
      color: 0xff5400, // Magma underbelly glow
    },

    // ------------------------------------------------------------------------
    // NECK & HEAD ASSEMBLY (Hierarchical Joint Chain)
    // ------------------------------------------------------------------------
    {
      id: 'neck-group',
      transform: {
        localPos: { x: 0, y: 0.38, z: 0.24 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: -0.15, // Slight forward neck angle
      },
      children: [
        {
          id: 'neck-magma-core',
          shape: 'cylinder',
          params: { bottomR: 0.13, topR: 0.09, height: 0.42, segments: 6 },
          transform: { localPos: { x: 0, y: 0.18, z: 0 } },
          color: 0xff7b00,
        },
        {
          id: 'neck-obsidian-fleece',
          shape: 'spheroid',
          params: { radius: 0.15, wSegs: 6, hSegs: 5 },
          transform: { scaleX: 0.95, scaleY: 1.3, scaleZ: 0.95, localPos: { x: 0, y: 0.18, z: 0 } },
          color: 0x2b2b36,
        },

        // HEAD GROUP (Parented to neck)
        {
          id: 'head-group',
          transform: {
            localPos: { x: 0, y: 0.38, z: 0.02 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 0.2, // Pitch head forward horizontally
          },
          children: [
            {
              id: 'head-base',
              shape: 'spheroid',
              params: { radius: 0.12, wSegs: 6, hSegs: 5 },
              transform: { scaleX: 0.85, scaleY: 0.9, scaleZ: 1.1 },
              color: 0x2b2b36,
            },
            {
              id: 'snout',
              shape: 'box',
              params: { width: 0.1, height: 0.08, depth: 0.14 },
              transform: { localPos: { x: 0, y: -0.02, z: 0.1 } },
              color: 0x1a1a1e,
            },
            {
              id: 'magma-mouth-glow',
              shape: 'box',
              params: { width: 0.08, height: 0.02, depth: 0.1 },
              transform: { localPos: { x: 0, y: -0.05, z: 0.11 } },
              color: 0xff0000,
            },
            {
              id: 'eye-left',
              shape: 'octahedron',
              params: { radius: 0.03 },
              transform: { localPos: { x: -0.08, y: 0.03, z: 0.05 } },
              color: 0xffea00,
            },
            {
              id: 'eye-right',
              shape: 'octahedron',
              params: { radius: 0.03 },
              transform: { localPos: { x: 0.08, y: 0.03, z: 0.05 } },
              color: 0xffea00,
            },

            // HORNS
            {
              id: 'horn-left',
              shape: 'cone',
              params: { bottomR: 0.035, height: 0.22, radialSegs: 5 },
              transform: {
                localPos: { x: -0.07, y: 0.1, z: -0.02 },
                localAxis: { x: -0.3, y: 0.2, z: -0.8 },
                localAngle: 0.6,
              },
              color: 0x111115,
            },
            {
              id: 'horn-right',
              shape: 'cone',
              params: { bottomR: 0.035, height: 0.22, radialSegs: 5 },
              transform: {
                localPos: { x: 0.07, y: 0.1, z: -0.02 },
                localAxis: { x: -0.3, y: -0.2, z: -0.8 },
                localAngle: 0.6,
              },
              color: 0x111115,
            },

            // EARS (Independent joint groups for animation!)
            {
              id: 'ear-left-group',
              transform: {
                localPos: { x: -0.09, y: 0.06, z: -0.04 },
                localAxis: { x: 0, y: 0, z: 1 },
                localAngle: 0.5,
              },
              children: [
                {
                  id: 'ear-left-mesh',
                  shape: 'cone',
                  params: { bottomR: 0.03, height: 0.16, radialSegs: 4 },
                  transform: { scaleX: 0.4, localPos: { x: 0, y: 0.07, z: 0 } },
                  color: 0xff3e00,
                },
              ],
            },
            {
              id: 'ear-right-group',
              transform: {
                localPos: { x: 0.09, y: 0.06, z: -0.04 },
                localAxis: { x: 0, y: 0, z: -1 },
                localAngle: 0.5,
              },
              children: [
                {
                  id: 'ear-right-mesh',
                  shape: 'cone',
                  params: { bottomR: 0.03, height: 0.16, radialSegs: 4 },
                  transform: { scaleX: 0.4, localPos: { x: 0, y: 0.07, z: 0 } },
                  color: 0xff3e00,
                },
              ],
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------------------
    // TAIL ASSEMBLY
    // ------------------------------------------------------------------------
    {
      id: 'tail-group',
      transform: {
        localPos: { x: 0, y: 0.32, z: -0.3 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: -0.6,
      },
      children: [
        {
          id: 'tail-flame-main',
          shape: 'cone',
          params: { bottomR: 0.08, height: 0.28, radialSegs: 5 },
          transform: { localPos: { x: 0, y: 0.12, z: 0 } },
          color: 0xff5400,
        },
        {
          id: 'tail-flame-tip',
          shape: 'cone',
          params: { bottomR: 0.05, height: 0.2, radialSegs: 4 },
          transform: { localPos: { x: 0, y: 0.24, z: 0 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: 0.2 },
          color: 0xffae00,
        },
      ],
    },

    // ------------------------------------------------------------------------
    // LEGS (4 x Hip Joints)
    // ------------------------------------------------------------------------
    // Front Left Leg
    {
      id: 'leg-fl-group',
      transform: { localPos: { x: -0.13, y: 0.22, z: 0.2 } },
      children: [
        {
          id: 'leg-fl-stem',
          shape: 'cylinder',
          params: { bottomR: 0.03, topR: 0.045, height: 0.24, segments: 5 },
          transform: { localPos: { x: 0, y: -0.12, z: 0 } },
          color: 0x1f1f24,
        },
        {
          id: 'leg-fl-hoof',
          shape: 'box',
          params: { width: 0.04, height: 0.05, depth: 0.05 },
          transform: { localPos: { x: 0, y: -0.22, z: 0.01 } },
          color: 0xff3e00,
        },
      ],
    },
    // Front Right Leg
    {
      id: 'leg-fr-group',
      transform: { localPos: { x: 0.13, y: 0.22, z: 0.2 } },
      children: [
        {
          id: 'leg-fr-stem',
          shape: 'cylinder',
          params: { bottomR: 0.03, topR: 0.045, height: 0.24, segments: 5 },
          transform: { localPos: { x: 0, y: -0.12, z: 0 } },
          color: 0x1f1f24,
        },
        {
          id: 'leg-fr-hoof',
          shape: 'box',
          params: { width: 0.04, height: 0.05, depth: 0.05 },
          transform: { localPos: { x: 0, y: -0.22, z: 0.01 } },
          color: 0xff3e00,
        },
      ],
    },
    // Back Left Leg
    {
      id: 'leg-bl-group',
      transform: { localPos: { x: -0.13, y: 0.22, z: -0.2 } },
      children: [
        {
          id: 'leg-bl-stem',
          shape: 'cylinder',
          params: { bottomR: 0.03, topR: 0.045, height: 0.24, segments: 5 },
          transform: { localPos: { x: 0, y: -0.12, z: 0 } },
          color: 0x1f1f24,
        },
        {
          id: 'leg-bl-hoof',
          shape: 'box',
          params: { width: 0.04, height: 0.05, depth: 0.05 },
          transform: { localPos: { x: 0, y: -0.22, z: 0.01 } },
          color: 0xff3e00,
        },
      ],
    },
    // Back Right Leg
    {
      id: 'leg-br-group',
      transform: { localPos: { x: 0.13, y: 0.22, z: -0.2 } },
      children: [
        {
          id: 'leg-br-stem',
          shape: 'cylinder',
          params: { bottomR: 0.03, topR: 0.045, height: 0.24, segments: 5 },
          transform: { localPos: { x: 0, y: -0.12, z: 0 } },
          color: 0x1f1f24,
        },
        {
          id: 'leg-br-hoof',
          shape: 'box',
          params: { width: 0.04, height: 0.05, depth: 0.05 },
          transform: { localPos: { x: 0, y: -0.22, z: 0.01 } },
          color: 0xff3e00,
        },
      ],
    },
  ],
};

/**
 * Animation clip definitions targeted at Descriptor Group IDs.
 */
export const INFERNALPACA_ANIMATIONS = {
  // --------------------------------------------------------------------------
  // IDLE: Subtle breathing, swaying neck, tail flick, and ear twitching
  // --------------------------------------------------------------------------
  idle: {
    loopDuration: 3.0,
    tracks: [
      // Breathing vertical body sway
      {
        targetId: 'neck-group',
        property: 'localAngle',
        mode: 'add',
        evaluate: (t) => Math.sin(t * 2.0) * 0.04,
      },
      // Head nodding
      {
        targetId: 'head-group',
        property: 'localAngle',
        mode: 'add',
        evaluate: (t) => Math.cos(t * 2.0) * 0.03,
      },
      // Tail swaying left/right
      {
        targetId: 'tail-group',
        property: 'rotY',
        mode: 'add',
        evaluate: (t) => Math.sin(t * 3.5) * 0.25,
      },
      // Left ear twitching periodically
      {
        targetId: 'ear-left-group',
        property: 'localAngle',
        mode: 'add',
        evaluate: (t) => Math.pow(Math.max(0, Math.sin(t * 2.5)), 12) * 0.3,
      },
      // Right ear twitching offset
      {
        targetId: 'ear-right-group',
        property: 'localAngle',
        mode: 'add',
        evaluate: (t) => Math.pow(Math.max(0, Math.sin((t + 1.2) * 2.5)), 12) * 0.3,
      },
    ],
  },

  // --------------------------------------------------------------------------
  // WALK CYCLE: Diagonal gait leg swinging + head bobbing
  // --------------------------------------------------------------------------
  walk: {
    loopDuration: 1.0,
    tracks: [
      // Leg pair 1: Front-Left & Back-Right swing forward together
      {
        targetId: 'leg-fl-group',
        property: 'localAxis',
        value: { x: 1, y: 0, z: 0 },
      },
      {
        targetId: 'leg-fl-group',
        property: 'localAngle',
        mode: 'add',
        evaluate: (t) => Math.sin(t * 6.28) * 0.45,
      },
      {
        targetId: 'leg-br-group',
        property: 'localAxis',
        value: { x: 1, y: 0, z: 0 },
      },
      {
        targetId: 'leg-br-group',
        property: 'localAngle',
        mode: 'add',
        evaluate: (t) => Math.sin(t * 6.28) * 0.45,
      },

      // Leg pair 2: Front-Right & Back-Left swing opposite phase (PI offset)
      {
        targetId: 'leg-fr-group',
        property: 'localAxis',
        value: { x: 1, y: 0, z: 0 },
      },
      {
        targetId: 'leg-fr-group',
        property: 'localAngle',
        mode: 'add',
        evaluate: (t) => Math.sin(t * 6.28 + Math.PI) * 0.45,
      },
      {
        targetId: 'leg-bl-group',
        property: 'localAxis',
        value: { x: 1, y: 0, z: 0 },
      },
      {
        targetId: 'leg-bl-group',
        property: 'localAngle',
        mode: 'add',
        evaluate: (t) => Math.sin(t * 6.28 + Math.PI) * 0.45,
      },

      // Head rhythmically bobs forward/back with walk cadence
      {
        targetId: 'neck-group',
        property: 'localAngle',
        mode: 'add',
        evaluate: (t) => Math.sin(t * 12.56) * 0.08,
      },
    ],
  },
};

/**
 * Applies an animation clip frame to a descriptor object at time `t`.
 */
export function applyAnimation(descriptor, animClip, time) {
  const animated = structuredClone(descriptor);
  const partMap = new Map();

  // Helper to index all parts and groups by ID
  function indexNodes(nodes) {
    for (const node of nodes) {
      partMap.set(node.id, node);
      if (node.children) indexNodes(node.children);
    }
  }
  indexNodes(animated.parts);

  // Apply track evaluators
  for (const track of animClip.tracks) {
    const node = partMap.get(track.targetId);
    if (!node) continue;

    node.transform = node.transform || {};
    const val = track.evaluate ? track.evaluate(time) : track.value;

    if (track.mode === 'add') {
      node.transform[track.property] = (node.transform[track.property] || 0) + val;
    } else {
      node.transform[track.property] = val;
    }
  }

  return animated;
}