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

**Known exceptions (accepted debt):** `logHelpers.js` violates the banned "helpers" word
(renaming it is a code change — deferred), and five bare-domain dev-tooling files exist:
`dev/cheats/{combat,map,state}.js`, `dev/botControl/state.js`, `dev/analysis/state.js`
(the analysis tool is standalone and exempt from game naming rules). New code must not
follow these examples.

---

## 2. Banned Words

The following words are banned in file and directory names:

`utils`, `helpers`, `common`, `misc`, `lib`, `controller`, `handler`, `manager`, `logic`, `service`.

Name the thing by what it does: `hexGrid.js` not `hexUtils.js`, `endTurn.js` not `turnController.js`, `combatUiState.js` not `combatStateManager.js`, `turnActions.js` not `turnLogic.js`.

Never re-use terminology for two different purposes: `Verdant` is a faction so that word can never be used to describe terrain, `tokens` are an internal name for a UI element so `game pieces` are used for the small flat cylinders of mobs. See §6 for the full vocabulary rules.

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

---

## 6. Vocabulary — One Name Per Thing

Everything the player can see or interact with has exactly one canonical name, used in UI text and code alike. This is a hard rule, not a style preference.

- **One name per thing.** A thing's display name is its only name. Log lines, tooltips, dispatch reports, faction traits, tests, and docs all quote the canonical name verbatim. Code identifiers may stay technical (`fruitTree`), but user-facing text never invents synonyms.
- **Names are unique codebase-wide.** If a name is already in use, it is not available. `token` belongs to the CSS design-token system, so the game's flat markers are `game pieces` — and no game content may ever be called a token.
- **The archetype registry is the source of truth.** Display names live in the `defineArchetype(...)` `name` field (`feature_fruitTree` → "Moonberry Tree", `feature_knot` → "God's Knot"). Renderer descriptors and UI copy mirror these names. When a name changes, change the archetype, every quoted string, tests, and docs together — then finish with a repo-wide grep for the old name.
- **Words are owned by their strongest user.** `Verdant` is a faction, so no terrain is verdant. `Manuscript` was an early visual-theme word and is banned outright (extinguished Aug 2026): the plain grove tree is "Tree", and the heal-giving tree is "Moonberry Tree", whose fruit are *moonberries*.
