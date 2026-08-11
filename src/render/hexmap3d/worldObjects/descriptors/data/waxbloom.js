/**
 * waxbloom.js — Descriptor data for "Waxbloom".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const WAXBLOOM_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'waxbloom',
  kind: 'feature',
  displayName: 'Waxbloom',
  scale: 1.25,
  placement: { mode: 'scatter', offsetMin: 0, offsetMax: 0.12 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'succulent-stem',
      shape: 'cylinder',
      params: { topR: 0.06, height: 0.3 },
      color: 0x386641,
    },
    {
      id: 'group-1',
      transform: { localPos: { x: 0, y: 0.13, z: 0 } },
      children: [
        {
          id: 'glowing-amber-core',
          shape: 'octahedron',
          params: { radius: 0.06 },
          transform: { localPos: { x: 0, y: 0.24, z: 0 } },
          color: 0xffb703,
        },
        {
          id: 'inner-cup',
          shape: 'spheroid',
          params: { radius: 0.11 },
          transform: { scaleY: 0.5, localPos: { x: 0, y: 0.14, z: 0 } },
          color: 0xffe3a8,
        },
        {
          id: 'outer-petal-3',
          shape: 'box',
          params: { width: 0.1, height: 0.03, depth: 0.22 },
          transform: {
            localPos: { x: 0.13135426071947504, y: 0.2064669175850676, z: 0.07604268203043923 },
            localAxis: { x: 0.09992700670039183, y: -0.9797977565877006, z: 0.1732366864079582 },
            localAngle: 2.1127611721002717,
          },
          color: 0xe76f51,
        },
        {
          id: 'outer-petal-2',
          shape: 'box',
          params: { width: 0.1, height: 0.03, depth: 0.22 },
          transform: {
            localPos: { x: -0.12955371961215179, y: 0.19048632391309758, z: 0.06496022811196778 },
            localAxis: { x: 0.100062514003938, y: 0.979784346310236, z: -0.17323431535534436 },
            localAngle: 2.111599818729829,
          },
          color: 0xe76f51,
        },
        {
          id: 'outer-petal-1',
          shape: 'box',
          params: { width: 0.1, height: 0.03, depth: 0.22 },
          transform: {
            localPos: { x: -0.005094732370120013, y: 0.18139443799436597, z: -0.1151174705124113 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 0.35,
          },
          color: 0xe76f51,
        },
      ],
    },
  ],
};
