## Phase 6: Units — Miniature Figurines

**Goal**: Champions, mobs, and traders become tiny 3D figurines on the board. The active champion gets a glowing base ring. HP bars are small colored planes.

**`src/render/hexmap3d/units3d.js`** — Has been created with unit figurine InstancedMeshes.

### Files to edit

**`src/render/hexmap3d/index.js`** — Add unit mesh management:

```javascript src/render/hexmap3d/index.js
import { buildUnitMeshes } from './units3d.js';

let unitMeshes = [];

export function renderHexMap3D(state) {
  // ... existing dispose ...
  for (const um of unitMeshes) disposeMesh(um);
  unitMeshes = [];

  // ... rebuild terrain, fog, features ...

  unitMeshes = buildUnitMeshes(state, humanView.visible);
  for (const um of unitMeshes) ctx.scene.add(um);
}
```

### What you'll see
- Champions as pawn-shaped figurines in faction colors
- Active champion has a glowing golden ring at its base
- Mobs as darker pawn shapes
- Traders as green hooded cone shapes
- Units appear, disappear, and reposition as the game state changes
- **The game is fully playable in 3D!**

---