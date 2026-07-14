## Phase 3: Global grep for remaining stale imports
- [ ] Run `grep -r "from.*hexmap3d/terrain" src/` — should only be the barrel or the terrain dir itself
- [ ] Run `grep -r "from.*hexmap3d/camera3d" src/` — should be empty
- [ ] Run `grep -r "from.*hexmap3d/unitUtils" src/` — should be empty
- [ ] Run `grep -r "from.*hexmap3d/features" src/` — should only be the barrel or features-index
- [ ] Run `grep -r "from.*hexmap3d/interaction" src/` — should only be interaction-index or barrel