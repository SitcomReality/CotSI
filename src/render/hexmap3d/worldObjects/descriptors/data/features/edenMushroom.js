/**
 * features/edenMushroom.js — Descriptor data for "Eden Mushroom".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const EDEN_MUSHROOM_DESCRIPTOR = {
  schemaVersion: 6,
  id: 'edenMushroom',
  kind: 'feature',
  displayName: 'Eden Mushroom',
  scale: 2.5,
  placement: { mode: 'scatter', separation: 0.65 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'part-1',
      shape: 'spheroid',
      params: { radius: 0.2 },
      transform: {
        scaleX: 1.2,
        scaleY: 0.5,
        scaleZ: 1.2,
        localPos: { x: 0, y: 0.3, z: 0 },
      },
      color: 0xc900f3,
      stretch: {
        x: { min: 0.9, max: 1.3, seed: 5 },
        z: { min: 0.9, max: 1.3, seed: 5 },
        y: { min: 0.96, max: 1.04, seed: 4 },
      },
      biomeColor: { source: 'terrain', influence: 0.2 },
    },
    {
      id: 'part-2',
      shape: 'cylinder',
      params: { height: 0.32 },
      transform: { y: 0, lift: 0 },
      color: 0x813d9c,
      biomeColor: { source: 'terrain', influence: 0.2 },
    },
    {
      id: 'part-3-choice-1',
      seed: 100,
      default: 'part-3-choice-1-option-2',
      alternatives: [
        {
          id: 'part-3-choice-1-option-2',
          weight: 0.3,
          parts: [
            {
              id: 'part-3-config-1',
              shape: 'octahedron',
              params: { radius: 0.1 },
              transform: {
                y: 0,
                lift: 0,
                localPos: { x: 0, y: 0.35, z: 0 },
              },
              color: 0xffffff,
            },
          ],
        },
        { id: 'part-3-choice-1-option-1', weight: 0.5, parts: [] },
      ],
    },
  ],
  cluster: { max: 2 },
  size: { min: 0.5 },
};
