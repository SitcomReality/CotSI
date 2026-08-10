/**
 * witnessStone.js -- Descriptor data for "Witness Stone".
 */
export const WITNESS_STONE_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'witnessStone',
  kind: 'feature',
  displayName: 'Witness Stone',
  scale: 1.3,
  placement: { mode: 'center' },
  emphasis: { behavior: 'dispersed' },
  material: { emissive: 0x48cae4, emissiveIntensity: 0.1 },
  parts: [
    {
      id: 'stone-plinth',
      shape: 'box',
      params: { width: 0.36, height: 0.08, depth: 0.36 },
      color: 0x343a40,
    },
    {
      id: 'megalith-stele',
      shape: 'box',
      params: { width: 0.22, height: 0.65, depth: 0.16 },
      transform: { y: 0.08, localAxis: { x: 1, y: 0, z: 0 }, localAngle: -0.05 },
      color: 0x495057,
    },
    {
      id: 'eye-group',
      transform: { localPos: { x: 0, y: 0.48, z: 0.02 } },
      children: [
        {
          id: 'eye-socket',
          shape: 'box',
          params: { width: 0.12, height: 0.12, depth: 0.08 },
          transform: { localPos: { x: 0, y: 0, z: 0.06 } },
          color: 0x212529,
        },
        {
          id: 'witness-eye-keystone',
          shape: 'octahedron',
          params: { radius: 0.05 },
          transform: { localPos: { x: 0, y: 0, z: 0.09 } },
          color: 0x00b4d8,
        },
      ],
    },
    {
      id: 'fallen-stone-left',
      shape: 'box',
      params: { width: 0.12, height: 0.06, depth: 0.18 },
      transform: { y: 0, localPos: { x: -0.24, y: 0.02, z: 0.08 }, localAxis: { x: 0.2, y: 1, z: 0.4 }, localAngle: 0.6 },
      color: 0x6c757d,
    },
    {
      id: 'fallen-stone-right',
      shape: 'box',
      params: { width: 0.1, height: 0.05, depth: 0.14 },
      transform: { y: 0, localPos: { x: 0.22, y: 0.02, z: -0.1 }, localAxis: { x: -0.4, y: 1, z: 0.2 }, localAngle: 0.8 },
      color: 0x6c757d,
    },
  ],
};