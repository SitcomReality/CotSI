/**
 * peridexionTree.js — Descriptor data for "Peridexion Tree".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const PERIDEXION_TREE_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'peridexionTree',
  kind: 'feature',
  displayName: 'Peridexion Tree',
  scale: 1.35,
  emphasis: { behavior: 'dispersed' },
  variation: { stretchY: [0.95, 1.1], colorJitter: 0.04 },
  parts: [
    {
      id: 'silver-trunk',
      shape: 'cylinder',
      params: { bottomR: 0.14, topR: 0.09, height: 0.6 },
      color: 0xd8f3dc,
    },
    {
      id: 'crown-group',
      transform: { localPos: { x: 0, y: 0.55, z: 0 } },
      children: [
        {
          id: 'canopy-lower',
          shape: 'sphere',
          params: { radius: 0.38, hSegs: 5 },
          transform: { scaleY: 0.7, localPos: { x: 0, y: 0.05, z: 0 } },
          color: 0x2d6a4f,
          biomeColor: { source: 'primary', influence: 0.5 },
        },
        {
          id: 'canopy-mid',
          shape: 'sphere',
          params: { radius: 0.32, hSegs: 5 },
          transform: { scaleY: 0.75, localPos: { x: 0, y: 0.22, z: 0 } },
          color: 0x52b788,
          biomeColor: { source: 'primary', influence: 0.5 },
        },
        {
          id: 'canopy-top',
          shape: 'sphere',
          params: { radius: 0.22 },
          transform: { scaleY: 0.8, localPos: { x: 0, y: 0.38, z: 0 } },
          color: 0x74c69d,
          biomeColor: { source: 'primary', influence: 0.5 },
        },
        {
          id: 'sweet-fruit-1',
          shape: 'dodecahedron',
          params: { radius: 0.045 },
          transform: { localPos: { x: 0.2, y: 0.5095492505920869, z: 0.15 } },
          color: 0xffb703,
        },
        {
          id: 'sweet-fruit-2',
          shape: 'dodecahedron',
          params: { radius: 0.04 },
          transform: { localPos: { x: -0.16741687136577313, y: 0.5600057005521863, z: -0.18 } },
          color: 0xf72585,
        },
        {
          id: 'sweet-fruit-3',
          shape: 'dodecahedron',
          params: { radius: 0.042 },
          transform: { localPos: { x: -0.22, y: 0.5082262213180648, z: 0.12 } },
          color: 0xffb703,
        },
        {
          id: 'guardian-dove',
          shape: 'spheroid',
          params: { radius: 0.045 },
          transform: {
            scaleX: 0.6,
            scaleY: 1.2,
            scaleZ: 0.7,
            localPos: { x: 0.08, y: 0.42, z: 0.05 },
            localAxis: { x: 0, y: 1, z: 0 },
            localAngle: 0.8,
          },
          color: 0xfffffc,
        },
      ],
    },
  ],
};
