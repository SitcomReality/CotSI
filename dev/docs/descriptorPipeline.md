# Descriptor Pipeline

How descriptors become rendered meshes, and where every concern lives.
Extracted from [descriptorAuthoring.md](descriptorAuthoring.md).

---

## 6. How rendering works

The renderer needs no geometry code from you. The full pipeline:

```
descriptor (+ tile / entity)
  → recordsForDescriptor / recordsForEntity   (recordBuilder.js — pure data)
  → records: { partId, x, y, z, scale, scaleY, scaleZ?, rotY?,
               lift? / localPos?, localAxis? + localAngle?,
               tiltAxis? + tilt?, color? }    // root leaves
             { partId, matrix, color? }       // nested leaves ([§4.5](descriptorSchema.md))
  → buildDescriptorMeshes                       (meshAssembly.js)
  → one InstancedMesh per part geometry         (meshBuilder.js)
```

- **Geometry:** `geometryForShape(shape, params)` maps a part onto its THREE
  constructor (cached per shape+params). `mountain` and `lathe` use bespoke
  game geometries.
- **Material:** `materialForPart` returns a **shared white toon material** —
  all color is per-instance via `setColorAt(record.color)`. Object-level
  `emissive`/`emissiveIntensity` (resource nodes) pass through; `mountain`
  enables vertex colors.
- **Instance matrix:** `T · R(rotY · tilt) · Lift(localPos) · Local(axis·angle) · S(scaleX/Y/Z)`.
  The local axis and tilt axis are normalized here, which is why their
  magnitude is meaningless in the data. A nested-leaf record carries a
  precomputed world `matrix` instead — `buildInstanced` applies it directly
  (the matrix already includes every ancestor group frame).

In-game dispatch (gameBuilder.js): each tile resolves to its feature (by
`tile.feature.kind` → descriptor id) plus its terrain decoration (mountains,
forest/deepWood, hill mounds, and one ground decor per
marsh/plateau/plains/desert/beach — the decor's id IS the terrain's id).
Decorations resolve in their unoccupied
state while the tile is out of sight; occupants/features gate displacement.

## 10. Where things live (quick map)

| Concern | File |
|---|---|
| Descriptor schema, shapes, defaults, validation, normalization | `src/render/hexmap3d/worldObjects/descriptors/schema.js` (barrel; implementation in `shapeTypes.js`, `descriptorDefaults.js`, `validateShapes.js`, `validateParts.js`, `descriptorValidation.js`, `descriptorNormalize.js`, `descriptorDenormalize.js`) |
| Record generation (randomization) | `src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js` (barrel; implementation in `clusterCount.js`, `variantSelection.js`, `itemPlacement.js`, `partScale.js`, `partColor.js`, `partFrames.js`, `tileRecords.js`, `entityRecords.js`, `motifDraw.js`) |
| Records → InstancedMeshes | `src/render/hexmap3d/worldObjects/descriptors/meshAssembly.js`, `../meshBuilder.js` |
| Shape/material factories (THREE) | `src/render/hexmap3d/worldObjects/descriptors/shapeFactories.js` |
| Neighbor-blended biome colors | `src/render/hexmap3d/worldObjects/biomeTint.js` |
| In-game tile dispatch | `src/render/hexmap3d/worldObjects/descriptors/gameBuilder.js` |
| Descriptor data | `src/render/hexmap3d/worldObjects/descriptors/data/` |
| Editor emit/format rules | `dev/tools/geometryEditor/emitDescriptor/` |
| Deterministic hashes | `src/render/hexmap3d/worldObjects/tileHash.js` |
| Dispersal/sinking | `src/render/hexmap3d/worldObjects/decorEmphasis.js` |
