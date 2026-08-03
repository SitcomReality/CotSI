# CotSI — Naming Conventions

This document covers naming and style rules for the CotSI codebase. For architecture, layer taxonomy, and the complete file tree, see `dev/systemArchitecture.md`.

---

## 1. File Naming

- `camelCase.js`, lowercase first letter. No hyphens, no underscores, no `sim` prefixes.
- **Every file name is self-explanatory without its directory path.** Assume the reader sees the name in an editor tab with no context.
- **No bare domains.** Never a file named `combat.js`, `map.js`, `turn.js`, `player.js`, `world.js`, `state.js`, `camera.js`. Always qualify: `combatState.js`, `hexGrid.js`, `turnActions.js`, `cameraState.js`.
- **Verbs for actions/mutations** (`advanceTurn.js`, `resolveRoundDamage`); **nouns for data, queries, and components** (`factionData.js`, `entityQueries.js`, `headerPanel.js`).
- **`index.js` only as a zero-logic barrel.** If it contains a single function body, it needs a real name (e.g. `combatModal.js`, not `combatui-index.js`).
- View-models: `nounViewModel.js` (`championViewModel.js`).

---

## 2. Banned Words

The following words are banned in file and directory names:

`utils`, `helpers`, `common`, `misc`, `lib`, `controller`, `handler`, `manager`, `logic`, `service`.

Name the thing by what it does: `hexGrid.js` not `hexUtils.js`, `endTurn.js` not `turnController.js`, `combatUiState.js` not `combatStateManager.js`, `turnActions.js` not `turnLogic.js`.

Never re-use terminology for two different purposes: `Verdant` is a faction so that word can never be used to describe terrain, `tokens` are an internal name for a UI element so `game pieces` are used for the small flat cylinders of mobs.

---

## 3. Directory Naming

- Plural for collections (`rules/`, `panels/`, `modals/`, `overlays/`); singular for concepts (`state/`, `runtime/`, `render/`, `engine/`).
- **Domain subdirectories are allowed** under a layer directory: `game/state/combat/`, `ui/combat/`, `render/hexmap3d/features/`. The layer path is the qualifier, and every file inside is still fully qualified (`combatScoring.js`, never `scoring.js`). This is the resolution of the "combat virus" problem: the virus was unqualified *files* and directories at the *top* level, not domain folders inside a layer.

---

## 4. Code Identifiers

| Category  | Convention | Examples |
|-----------|-----------|----------|
| Variables | camelCase | `hexGrid`, `activeChampion` |
| Functions | camelCase, verb-first | `resolveCombat()`, `getEntitiesAtHex()` |
| Booleans  | `is`/`has`/`can`/`should` prefix | `isActive`, `hasMoved`, `canAttack` |
| Classes   | PascalCase | `HexGrid`, `CombatState` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_HEALTH`, `GRID_SIZE` |
| Module-private | `_` prefix | `_pendingChoice`, `_getGameState` |

---

## 5. Interaction Pattern (target state)

Every user-initiated action flows through this pipeline:

```
1. CAPTURE   ui/ or render/ detects the action (click, keypress, drag)
2. DISPATCH  intent via shared/actionBus.js ([data-action]) or a callback
3. ROUTE     runtime/ receives it, routes to game/state/ mutation
4. MUTATE    game/state/ applies the change (using game/rules/ for pure math)
5. NOTIFY    runtime/ re-renders: refreshAll()
6. RENDER    render/ redraws from the new state
7. BIND      ui/ rebinds from view-models
```

No step is skippable in new code. The UI never calls `game/state/` directly; render never imports `game/state/`. All coordination goes through `runtime/`.

**Honest status:** the current codebase does not fully comply — see `dev/systemArchitecture.md` §6 Boundary Debt. New code must follow the pipeline; existing violations are paid down over time.
