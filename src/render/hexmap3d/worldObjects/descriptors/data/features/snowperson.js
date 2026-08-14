/**
 * snowperson.js — Descriptor data for "Snowperson".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
/**
 * snowperson.js — Descriptor data for "Snowperson".
 */
export const SNOWPERSON_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'snowperson',
  kind: 'feature',
  displayName: 'Snowperson',
  scale: 1.1,
  placement: { mode: 'center' },
  emphasis: { behavior: 'dispersed' },
  variation: { stretchY: [0.95, 1.05], stretchX: [0.9, 1.1], stretchZ: [0.9, 1.1], colorJitter: 0.02 },
  parts: [
    {
      id: 'base-snow',
      shape: 'sphere',
      params: { radius: 0.3 },
      color: 0xffffff,
    },
    {
      id: 'torso-snow',
      shape: 'sphere',
      params: { radius: 0.22 },
      transform: { lift: 0.45 },
      color: 0xffffff,
    },
    {
      id: 'head-snow',
      shape: 'sphere',
      params: { radius: 0.15 },
      transform: { lift: 0.75 },
      color: 0xffffff,
    },
    {
      id: 'nose',
      shape: 'cone',
      params: { bottomR: 0.025, height: 0.18 },
      transform: { localPos: { x: 0, y: 0.9, z: 0.14 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1.5708 },
      color: 0xff8c00,
    },
    {
      id: 'arm-left',
      shape: 'cylinder',
      params: { bottomR: 0.015, topR: 0.01, height: 0.35 },
      transform: { localPos: { x: -0.18, y: 0.65, z: 0 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: 1.2 },
      color: 0x4a3b2c,
    },
    {
      id: 'arm-right',
      shape: 'cylinder',
      params: { bottomR: 0.015, topR: 0.01, height: 0.35 },
      transform: { localPos: { x: 0.18, y: 0.65, z: 0 }, localAxis: { x: 0, y: 0, z: -1 }, localAngle: 1.2 },
      color: 0x4a3b2c,
    },
    {
      id: 'hat-brim',
      shape: 'cylinder',
      params: { bottomR: 0.18, topR: 0.18, height: 0.02 },
      transform: { lift: 1.0 },
      color: 0x222222,
    },
    {
      id: 'hat-top',
      shape: 'cylinder',
      params: { bottomR: 0.11, topR: 0.12, height: 0.18 },
      transform: { lift: 1.02 },
      color: 0x222222,
    }
  ],
};