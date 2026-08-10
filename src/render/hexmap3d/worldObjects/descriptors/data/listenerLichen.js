/**
 * listenerLichen.js — Descriptor data for "Listener Lichen".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const LISTENER_LICHEN_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'listenerLichen',
  kind: 'feature',
  displayName: 'Listener Lichen',
  cluster: { max: 2 },
  placement: { mode: 'scatter', offsetMin: 0.05, offsetMax: 0.2 },
  emphasis: { behavior: 'dispersed' },
  variation: { colorJitter: 0.08 },
  parts: [
    {
      id: 'lichen-log',
      shape: 'cylinder',
      params: { topR: 0.07, height: 0.5 },
      transform: {
        y: -0.18,
        localAxis: { x: 0, y: 0, z: 1 },
        localAngle: 1.57,
      },
      color: 0x4d3319,
    },
    {
      id: 'ear-right-group',
      transform: {
        localPos: { x: 0.08, y: 0.09, z: -0.01 },
        localAxis: { x: -0.4, y: 1, z: 0.4 },
        localAngle: 0.7,
      },
      children: [
        {
          id: 'ear-base-r',
          shape: 'cylinder',
          params: { bottomR: 0.018, topR: 0.035, height: 0.07 },
          color: 0xcca091,
        },
        {
          id: 'ear-cup-r',
          shape: 'spheroid',
          params: { radius: 0.06 },
          transform: {
            scaleX: 1.2,
            scaleY: 0.25,
            scaleZ: 1.1,
            localPos: { x: 0, y: 0.06, z: 0 },
          },
          color: 0xd39ecb,
          biomeColor: { source: 'accent', influence: 0.5 },
        },
      ],
    },
  ],
};
