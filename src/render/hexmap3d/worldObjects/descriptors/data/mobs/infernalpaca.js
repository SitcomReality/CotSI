/**
 * infernalpaca.js — Descriptor variant for the Infernalpaca mob.
 *
 * Recovered from the hand-authored experiment `data/infernalpaca.js` (see
 * dev/docs/mobGeometryAndAnimation.md) and re-authored as a mob variant block:
 * geometry only — the experimental imperative animation runtime
 * (INFERNALPACA_ANIMATIONS / applyAnimation) is intentionally dropped until
 * the declarative animation system lands.
 *
 * The look is deliberately non-faction: an obsidian-fleeced llama burning with
 * internal magma. Colors are literals (not the factionBody/factionAccent
 * tokens) and the whole variant carries an emissive glow via the variant-level
 * `material` field — the mob barrel (`data/mob.js`) composes this into
 * MOB_DESCRIPTOR, and meshAssembly resolves variant material per part.
 *
 * Joint groups (children, no shape) are the animation pivots: neck-group,
 * head-group, ear groups, tail-group, and one root group per leg. Rest pose
 * uses localPos + localAxis/localAngle; no per-frame re-rotation yet.
 */

export const INFERNALPACA_VARIANT = {
  id: 'infernalpaca',
  material: { emissive: 0xff3e00, emissiveIntensity: 0.35 },
  parts: [
    // ── Main torso & fluff ──────────────────────────────────────────────────
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

    // ── Neck & head assembly (hierarchical joint chain) ─────────────────────
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

        // Head group (parented to the neck)
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

            // Horns
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

            // Ears — independent joint groups (twitch targets later)
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

    // ── Tail assembly ───────────────────────────────────────────────────────
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

    // ── Legs (4 × hip joint groups) ─────────────────────────────────────────
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
