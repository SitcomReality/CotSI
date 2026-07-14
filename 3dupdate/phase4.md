## Phase 4: Fog of War

**Goal**: Unexplored hexes render as face-down tiles (dark, blank tops). Explored-but-not-visible hexes get a semi-transparent dark overlay. Fog updates when vision changes.

**`src/render/hexmap3d/fogOfWar.js`** — Has been created. Two merged meshes: unexplored face-down tiles and explored dark mist

### Files to edit

**`src/render/hexmap3d/index.js`** — Add fog mesh management:

In `renderHexMap3D()`, after building terrain, build fog meshes:

```javascript src/render/hexmap3d/index.js
import { buildUnexploredMesh, buildExploredMistMesh } from './fogOfWar.js';

// Track fog meshes
let unexploredMesh = null;
let mistMesh = null;

export function renderHexMap3D(state) {
  if (!ctx) return;
  const humanView = getHumanView(state);

  // Dispose old terrain + fog
  disposeMesh(terrainMesh);
  disposeMesh(unexploredMesh);
  disposeMesh(mistMesh);

  // Build terrain
  terrainMesh = buildTerrainMesh(state, humanView.visible, humanView.explored);
  ctx.scene.add(terrainMesh);

  // Build fog
  unexploredMesh = buildUnexploredMesh(state.tiles, humanView.explored);
  if (unexploredMesh) ctx.scene.add(unexploredMesh);

  mistMesh = buildExploredMistMesh(state.tiles, humanView.explored, humanView.visible);
  if (mistMesh) ctx.scene.add(mistMesh);
}

function disposeMesh(mesh) {
  if (mesh) {
    mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
    ctx.scene.remove(mesh);
  }
}
```

### What you'll see
- Unexplored hexes are covered by dark brown face-down tiles
- Explored-but-not-visible hexes have a dark semi-transparent mist overlay
- Visible hexes show terrain normally
- Fog updates when you move your champion (vision changes)
- Still no 3D features (trees, mountains) or units

---