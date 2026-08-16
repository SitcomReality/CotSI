# Map Generation Analysis Tool (`dev/tools/analysis`)

A **standalone map-gen analysis page** — not part of the game UI and not governed
by the game's layer-boundary rules. It is used to inspect and tune procedural
terrain generation: browse single-seed maps, run batch analysis across many seeds,
derive calibration thresholds/LUTs, and run invariant/coverage/snapshot checks
(seam tests, climate coverage, noise-frequency verification).

This README is the tool's own reference and file inventory. It lives beside the
code so the tool stays self-contained.

## Running

- Open `dev/tools/analysis.html` in a browser **served from the same origin**
  (ES modules require an origin — opening from disk fails). The game's dev save
  server (`dev/tools/geometryEditor/saveServer.sh`) serves the repo root and works
  for this page too.
- **Import hygiene:** `python3 dev/scripts/check_analysis_imports.py` verifies
  every relative import in this tree resolves and every named import matches a
  real export, including cross-references into `src/`. It does **not** check layer
  boundaries — those rules only apply to `src/`.

## Relationship to the game

The tool **reuses** the game's pure terrain-gen and entity sources instead of
owning its own copies: `src/engine/rules/` (hexGrid, noise, seededRng),
`src/game/rules/terrainGen/` (the whole pipeline via its barrel) plus
`archetypes`/`factionData`/`terrainTypes`, `src/game/state/entities/`
(championFactory, entityFactory, spawnPosition) and `src/params/game/terrainGenParams`.
Its own `generation/` modules orchestrate those shared sources and add the
calibration/LUT/stats machinery specific to tuning.

Layer-boundary rules for the game are in `dev/docs/systemArchitecture.md` §2;
terrain-gen design context is in `dev/docs/terrainGenNotes.md`; example calibration
output lives at `dev/calibration_v1.json`.

## File inventory

| File | Purpose |
|------|---------|
| `state.js` | Shared mutable state (camera, view mode, cycle state) |
| `domRefs.js` | DOM element cache (`els` object) |
| `ui/main.js` | Entry point: wires DOM controls to all subsystems |
| `ui/batchPanel.js` | Batch analysis orchestration and LUT/report download controls |
| `ui/canvas.js` | Canvas setup, resize, and mouse-drag interaction |
| `ui/cycle.js` | Random-seed cycling (play/stop/speed controls) and seed navigation |
| `ui/seedStepper.js` | Seed string parsing and numeric-step computation (pure) |
| `ui/export.js` | PNG and JSON export of the current map view |
| `generation/generate.js` | Pure map generation pipeline (terrain + entities) |
| `generation/thresholdDerivation.js` | Calibration pipeline: histogram pooling, LUTs, threshold derivation |
| `generation/slopeDeltas.js` | Raw per-tile slope delta collection for SLOPE_NORMALIZATION |
| `generation/calibrationExport.js` | Calibration JSON serialization and text report formatting |
| `generation/seamTest.js` | Chunk-seam invariant test runners |
| `generation/seamTestReport.js` | Seam test text report formatting |
| `generation/frequencyVerification.js` | Noise frequency measurement via zero-crossing counting |
| `generation/quantileLUT.js` | Quantile LUT construction and field normalization |
| `generation/histograms.js` | Histogram collection and percentile queries |
| `generation/noiseConfig.js` | Noise field configuration and seed offsets |
| `generation/climateCoverage.js` | Climate coverage test and report formatting |
| `generation/snapshotTest.js` | Snapshot test and report formatting |
| `render/camera.js` | Camera model: zoom, pan, screen/world transforms |
| `render/hexMath.js` | Hex geometry: axial-to-pixel, hex path drawing |
| `render/colorMaps.js` | Elevation and moisture color mapping |
| `render/renderMap.js` | Canvas2D hex-map renderer (terrain, entities, overlays) |
| `render/orchestrate.js` | Render orchestration: canvas sizing, options, delegate draw |
| `render/renderDistributions.js` | Canvas2D histogram panel renderer |
| `render/theme.js` | Visual theme constants (biome colours, river colours) |
| `render/entityMarkers.js` | Entity marker drawing (champion, mob, trader, base) |
| `render/featureMarkers.js` | Feature marker drawing (trees, bushes, vines) |
| `render/terrainFill.js` | Terrain colour fill and overlay rendering |
| `stats/stats.js` | Barrel: re-exports tile, entity, aggregation, and concentration stats |
| `stats/tileStats.js` | Per-tile distributions (biome, terrain, features, mountains, water) |
| `stats/entityStats.js` | Entity statistics (champions, mobs, traders) |
| `stats/aggregation.js` | Multi-seed aggregation (terrain distribution mean/stddev) |
| `stats/concentration.js` | Gini coefficient, passable-tile count, heatmap concentration |
| `stats/spatialStats.js` | Flood-fill patch analysis and connected-component metrics |
| `stats/correlations.js` | Cross-field Pearson correlations and 2D joint histograms |
| `stats/spatialFormatting.js` | Display formatting for spatial/correlation/histogram results |
| `stats/statsDisplay.js` | Formats and updates the stats panel DOM |
| `stats/batchReport.js` | Batch report orchestrator and JSON calibration export |
| `stats/reportBaseFormat.js` | Batch report config/terrain-rule section formatting |
| `stats/reportHeatmapFormat.js` | Batch report heatmap section formatting (parameterized) |
| `legend/legend.js` | Legend dispatcher: bucket-gradient and passability builders |
| `legend/terrainLegend.js` | Terrain palette legend builder (sorted by TERRAIN_ORDER) |
| `legend/biomeLegend.js` | Biome-region legend builder (coloured by BIOME_COLORS) |
| `legend/riversLegend.js` | Rivers legend builder (river path, boost halo, unaffected counts) |
| `batch/batchRunner.js` | Batch analysis orchestrator: per-seed loop, per-radius aggregation |
| `batch/seedProcessor.js` | Per-seed data collection for batch analysis |
| `batch/aggregators.js` | Multi-seed heatmap and correlation aggregation |
| `batch/progressBar.js` | DOM progress bar creation and update |
| `batch/fingerprint.js` | Per-seed noise config fingerprint generation |
| `styles/index.css` | Barrel: imports all analysis page stylesheets |
| `styles/reset.css` | Global reset and base element styles |
| `styles/layout.css` | Page grid and major panel positioning |
| `styles/controls.css` | Control panel headings, inputs, buttons, toggles, loading |
| `styles/sidebar.css` | Right sidebar container and entity toggle controls |
| `styles/legend.css` | Legend: colour gradient bars and discrete swatches |
| `styles/entityKey.css` | Entity key swatches in toggle labels |
| `styles/statsPanel.css` | Stats panel highlights and metric display |
| `styles/scrolling.css` | Custom scrollbar styling for panels |
| `styles/cycle.css` | Random cycle button state styles |
| `styles/batch.css` | Batch analysis panel layout and progress styles |