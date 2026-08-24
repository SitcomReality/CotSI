# Doc Drift Audit — 2026-08-24

One-pass review of every MD file in `dev/docs/` plus root `AGENTS.md` against the
codebase. Factual/convention drift was fixed directly in the docs (see git diff);
items below were **flagged instead of decided** because they need a design call,
a code change, or can't be verified from code alone.

## Needs a decision

1. **Missing descriptor for `dustbleedCrystal`** — `src/render/hexmap3d/terrain/biomeDustbleed.js:38`
   references feature kind `'dustbleedCrystal'`, but there is no
   `descriptors/data/features/dustbleedCrystal.js`. Code gap, not doc drift:
   either add the descriptor or remove/rename the reference.

2. **New systems absent from architecture/mechanics docs** — inventory rows were
   added to `sourceTree.md`, but these systems have no prose coverage anywhere:
   - Save/load game slots (`src/runtime/saveLoadActions.js`, `gameSaveSlot.js`,
     `src/game/state/persistence/saveDocument.js`) — worth a section in
     `systemArchitecture.md` or a dedicated doc when the design settles.
   - Capture/recording devtool (`src/devtools/capture/screenRecorder.js`,
     `src/devtools/actionWiring/capture.js`).
   - Equipment durability + Forge repairs (`src/game/rules/equipment.js`,
     `src/game/state/features/forgeSystem.js`) — `futureWork.md` now mentions
     the layer; a mechanics write-up is still open.

3. **Water-chop shader system undocumented** — `WATER_CHOP_*` params
   (`src/params/render/terrainParams.js:43-50`) implement a fragment-shader
   water effect; `context/biomesAndTerrain.md` §2 describes only the vertex
   ripple. Add or decide it's out of scope for that doc.

4. **Descriptor snapshot script pointer** — `descriptorExamples.md` (ex-`descriptorAuthoring.md` §9) now
   points at `dev/scripts/regenerate_descriptor_snapshot.mjs`; its inline
   hand-rolled recipe could be trimmed to just the script if you prefer less
   duplication.

## Not verifiable from code (left untouched)

- `aestheticConventions.md` — aspirational by design; token values were checked,
  intent sections weren't judged.
- `mobGeometryAndAnimation.md` — historical claims about deleted experiment
  files are unfalsifiable and were not flagged.
- `futureWork.md` — "some items may be based on out-of-date design ideas";
  only its factual claims (file existence, param names) were verified.

## Verified accurate as-is

`namingConventions.md`, `commonTasks.md`, `clockScheduler.md`,
`context/factions.md`.
