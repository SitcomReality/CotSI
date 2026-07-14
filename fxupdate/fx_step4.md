### Step 4: Move Selection Ring to 2D Canvas

**Modified file: `src/render/hexmap3d/unitMeshes.js`** — remove all champion ring InstancedMesh creation.

**Modified file: `src/render/hexmap3d/unitAnimations.js`** — remove the torus-pulse `setScalar` animation block.

**New file: `src/render/effects/selectionRingLayer.js`** — has been created and is ready to use.

**Changes to `unitGeometries.js`:**
- Remove `getChampionRingGeo()` and the cached `championRingGeo` variable (no longer used)
