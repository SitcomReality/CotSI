### Step 7: Cleanup — Remove Dead 3D Artifacts

**Modified files:**
- `src/render/hexmap3d/unitGeometries.js` — remove `getChampionRingGeo()`, cached `championRingGeo`
- `src/render/hexmap3d/unitMeshes.js` — remove `championRingInstances` collection and the ring InstancedMesh block (~15 lines)
- `src/render/hexmap3d/unitAnimations.js` — remove the `rings.filter(...)` pulse loop; this file may become nearly empty (keep the skeleton for future bob animations)
- `src/render/hexmap3d/fogOfWar.js` — remove `buildExploredMistMesh`, `MIST_COLOR`, `MIST_OPACITY`, `MIST_OFFSET` constants (keep `buildUnexploredMesh`)
