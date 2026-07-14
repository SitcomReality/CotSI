## Phase 2: External consumer updates
- [ ] src/render/effects/fogMistLayer.js: `'../hexmap3d/terrain.js'` → `'../hexmap3d/hexmap3d-index.js'`, import `tileTopY`
- [ ] src/render/effects/selectionRingLayer.js: `'../hexmap3d/unitUtils.js'` → `'../hexmap3d/hexmap3d-index.js'`, import `hexCenter3D`, `tileTopY`
- [ ] src/game/gameOrchestrator.js: `'../render/hexmap3d/camera3d.js'` → `'../render/hexmap3d/hexmap3d-index.js'`, import `resetCamera`
- [ ] src/ui/gameUIBindings.js: `'../render/hexmap3d/camera3d.js'` → `'../render/hexmap3d/hexmap3d-index.js'`, import `zoomCamera`, `resetCamera`