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