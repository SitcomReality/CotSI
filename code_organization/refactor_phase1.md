## Phase 1: Internal import path updates

### scene/
- [ ] scene/scene.js: `./camera3d.js` → `./camera.js`
- [ ] scene/scene.js: any other sibling imports → `./...` (check)
- [ ] scene/camera.js: update any imports (should only import from scene/ or top-level hexUtils.js)
- [ ] scene/materials.js: update any imports (probably none)

### terrain/
- [ ] terrain/terrain.js: `./materials.js` → `../scene/materials.js`
- [ ] terrain/terrain.js: `./hexUtils.js` → `../hexUtils.js`
- [ ] terrain/fogOfWar.js: `./hexUtils.js` → `../hexUtils.js`, `./terrain.js` → `./terrain.js` (same dir, fine)

### features/
All features files import hexUtils and terrain. Update each:
- [ ] features/trees.js: `./hexUtils.js` → `../../hexUtils.js`, `./terrain.js` → `../terrain/terrain.js`
- [ ] features/mountains.js: same as above
- [ ] features/knots.js: same as above
- [ ] features/bases.js: same as above
- [ ] features/featureGeometries.js: update if any imports (probably none)
- [ ] features-index.js: update imports to match new paths

### units/
- [ ] units/unitMeshes.js: `./hexUtils.js` → `../../hexUtils.js`, `./terrain.js` → `../terrain/terrain.js`, etc.
- [ ] units/unitAnimations.js: same (if imports hexUtils/terrain)
- [ ] units/unitGeometries.js: probably none
- [ ] units/unitUtils.js: `./hexUtils.js` → `../../hexUtils.js`, `./terrain.js` → `../terrain/terrain.js`
- [ ] units-index.js: update imports to new paths

### interaction/
- [ ] interaction/pan.js: `./camera3d.js` → `../scene/camera.js`, `./panUtils.js` → `./panUtils.js` (same dir)
- [ ] interaction/hover.js: `./picking.js` → `./picking.js`, `./tooltip.js` → `./tooltip.js`, `./camera3d.js` → `../scene/camera.js`
- [ ] interaction/click.js: `./picking.js` → `./picking.js` (same dir), check for camera3d → ../scene/camera.js
- [ ] interaction/zoom.js: `./camera3d.js` → `../scene/camera.js`
- [ ] interaction/touch.js: `./camera3d.js` → `../scene/camera.js`, `./panUtils.js` → `./panUtils.js`
- [ ] interaction/picking.js: `./hexUtils.js` → `../hexUtils.js`? (top-level hexUtils)  Actually, picking.js likely imports hexUtils (tile coords). In the plan, hexUtils remains at top level, so `../hexUtils.js` is correct from interaction/.
- [ ] interaction/tooltip.js: no imports likely
- [ ] interaction/panUtils.js: `./camera3d.js` → `../scene/camera.js` if it uses camera; likely needs hexUtils → `../hexUtils.js`
- [ ] interaction-index.js: update imports of all above modules accordingly

### Top-level barrel (hexmap3d-index.js)
- [ ] Update all imports to point to new subdirectory locations (e.g., `./scene/scene.js`, `./terrain/terrain.js`, `./features/features-index.js`, etc.)
- [ ] Re‑export symbols that external consumers need: `tileTopY`, `hexCenter`, `hexCornersXZ`, `hexCenter3D`, `resetCamera`, `zoomCamera`, etc.