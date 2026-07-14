## Phase 5: 3D Features — Trees, Mountains, Knots, Bases

**Goal**: Terrain features become actual 3D objects. Trees are low-poly cone-stacks, mountains are pyramids, knots are glowing octahedra, bases are tiny towers.

### Files created:

**`src/render/hexmap3d/features3d.js`** — Has been created with instancedMesh-based feature rendering.

### Files still to edit

**`src/render/hexmap3d/index.js`** — Add feature mesh management:

```javascript src/render/hexmap3d/index.js
import { buildFeatureMeshes } from './features3d.js';

let featureMeshes = [];

export function renderHexMap3D(state) {
  if (!ctx) return;
  const humanView = getHumanView(state);

  // Dispose old meshes
  disposeMesh(terrainMesh);
  disposeMesh(unexploredMesh);
  disposeMesh(mistMesh);
  for (const fm of featureMeshes) disposeMesh(fm);
  featureMeshes = [];

  // Rebuild
  terrainMesh = buildTerrainMesh(state, humanView.visible, humanView.explored);
  ctx.scene.add(terrainMesh);

  unexploredMesh = buildUnexploredMesh(state.tiles, humanView.explored);
  if (unexploredMesh) ctx.scene.add(unexploredMesh);

  mistMesh = buildExploredMistMesh(state.tiles, humanView.explored, humanView.visible);
  if (mistMesh) ctx.scene.add(mistMesh);

  featureMeshes = buildFeatureMeshes(state, humanView.visible);
  for (const fm of featureMeshes) ctx.scene.add(fm);
}
```

### What you'll see
- 3D trees (cylinder trunk + cone canopy) scattered on forest hexes
- 3D mountains (pyramids) on mountain hexes
- Glowing purple octahedra on God's Knot hexes
- Tiny faction-colored towers on base hexes
- Still no units (champions, mobs, traders)

---