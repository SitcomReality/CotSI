### 6a. Create `src/game/session/refreshAll.js`

Take the **entire contents** of `src/game/gameOrchestrator.js` and copy it into a new file `src/game/session/refreshAll.js`, but **adjust every relative import path** because the file is now one directory deeper (inside `session/`):

| Current import in gameOrchestrator.js | New import (in session/) |
|---|---|
| `'./victory.js'` | `'../victory.js'` |
| `'./session/mapRefresh.js'` | `'./mapRefresh.js'` |
| `'../ui/panels/bindLeftPanel.js'` | `'../../ui/panels/bindLeftPanel.js'` |
| `'../ui/panels/bindRightPanel.js'` | `'../../ui/panels/bindRightPanel.js'` |
| `'../ui/bindHeader.js'` | `'../../ui/bindHeader.js'` |
| `'./session/rewardPrompt.js'` | `'./rewardPrompt.js'` |
| `'../ui/hud.js'` | `'../../ui/hud.js'` |
| `'../ui/mapView.js'` | `'../../ui/mapView.js'` |
| `'./turnController.js'` | `'../turnController.js'` |
| `'./session/liveGame.js'` | `'./liveGame.js'` |

Also drop the commented-out `//initHeptagramWidget('paleyMount');` line (it's already handled in `beginGame.js`). The function body stays identical.

### 6b. Update the 4 files that import `refreshAll`

Each of these currently imports from `./gameOrchestrator.js` (or similar). Change only their `refreshAll` import line:

- **`src/game/turnController.js`** — `./gameOrchestrator.js` → `./session/refreshAll.js`
- **`src/game/hexInteraction.js`** — `./gameOrchestrator.js` → `./session/refreshAll.js`
- **`src/ui/bootstrapUI.js`** — `../game/gameOrchestrator.js` → `../game/session/refreshAll.js`
- **`src/game/session/beginGame.js`** — `../gameOrchestrator.js` → `./refreshAll.js` (and remove the `// will move to ./refreshAll.js in Step 6` comment)

### 6c. Delete `src/game/gameOrchestrator.js`

The file now has zero importers. Delete it.

### 6d. Verify + smoke test

Run a grep for `gameOrchestrator` — only docs/comments should remain (you'll fix those in Step 7). Then run the 9-item smoke checklist. The game should behave identically.