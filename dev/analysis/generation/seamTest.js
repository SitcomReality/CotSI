/**
 * seamTest.js — Chunk-seam invariant verification.
 *
 * Verifies that terrain generation produces consistent results:
 * every tile's elevationField, temperature, baseMoisture, slope, biomeId,
 * and terrain match what independent recomputation would produce.
 *
 * The test generates a full map via generateSingleSeed (which assembles
 * chunks), then recomputes fields for each tile via direct sampleBaseFields
 * calls and asserts they match the stored values.
 *
 * Fields tested:
 *   elevationField  — pure function of (seed, q, r) via sampleBaseFields
 *   temperature     — pure function of (seed, q, r) via sampleBaseFields
 *   baseMoisture    — pure function of (seed, q, r) via sampleBaseFields
 *   moisture        — adjusted: baseMoisture + coastal boost + river boost
 *   slope           — recomputed via computeSlope() from recomputed elevations
 *   biomeId         — recomputed via selectBiome() from recomputed fields
 *   terrain         — verify classifyTerrain(stored fields) === stored terrain
 *                     (skips champion-base tiles; catches connectivity-enforcement
 *                      or post-processing interference on non-base tiles)
 *
 * Not tested (neighbor-context-dependent post-processing, not pure per-tile):
 *   mountainType    — depends on neighbor terrain classification
 *   waterType       — depends on BFS to map edge
 *   isRiver         — trace result depends on full-map flow accumulation
 *   feature/debris  — random spawn rolls, not field-invariant
 *
 * Pure: no DOM, no state, no side effects beyond console.assert.
 *
 * Report formatters live in ./seamTestReport.js.
 */
import { generateSingleSeed } from './generate.js';
import { stringSeed } from '../../../src/engine/rules/seededRng.js';
import {
  sampleBaseFields, isProvisionalWater, getNoiseConfig,
  computeSlope, selectBiome, classifyTerrain,
} from '../../../src/game/rules/terrainGen/index.js';
import { getArchetype } from '../../../src/game/rules/archetypes.js';
import { hexesWithinRadius, coordKey } from '../../../src/engine/rules/hexGrid.js';
import { DEFAULT_TERRAIN_RULES, RIVER_MOISTURE_BOOST, RIVER_BOOST_RADIUS } from '../../../src/params/game/worldParams.js';

/** Supernatural biome IDs to skip during seam comparison (epicenter overrides break pure-function invariance). */
const SUPERNATURAL_BIOME_IDS = ['biome_brass_grave', 'biome_unfinished_lands'];

/** Default seed and radius (for backward compatibility). */
const DEFAULT_SEED = 'glut-17';
const DEFAULT_RADIUS = 21;

/**
 * Run the chunk-seam invariant test for a single (seed, radius) pair.
 *
 * Two-pass design:
 *   Pass 1 — recompute all base fields (elevation, moisture, temperature,
 *            regionBias) into a lookup map for slope computation.
 *   Pass 2 — verify every non-supernatural tile.
 *
 * @param {string} [seedText='glut-17']  - Seed string
 * @param {number} [radius=21]           - Map radius
 * @returns {{ passed: boolean, failures: object[], seed: string, radius: number }}
 *   Each failure: { q, r, field, stored, recomputed }
 */
export function runSeamTest(seedText = DEFAULT_SEED, radius = DEFAULT_RADIUS) {
  const failures = [];

  try {
    const result = generateSingleSeed(seedText, radius, null);
    const tiles = result.tiles;
    const baseSeed = stringSeed(seedText);

    const tileEntries = Object.values(tiles);
    if (tileEntries.length === 0) {
      return {
        passed: false,
        failures: [{ q: 0, r: 0, field: 'generation', stored: 'n/a', recomputed: 'no tiles generated' }],
        seed: seedText,
        radius,
      };
    }

    // ── Pass 1: Build recomputed-field map ────────────────────────────────
    const recomputed = new Map(); // coordKey -> { elevation, baseMoisture, temperature, regionBiasM, regionBiasT }
    for (const tile of tileEntries) {
      const { q, r } = tile;
      const fields = sampleBaseFields(baseSeed, q, r, getNoiseConfig(radius), radius);
      recomputed.set(coordKey(tile), fields);
    }

    // ── Pass 1b: Build river-key set for moisture-boost accounting ────────
    const riverKeySet = new Set();
    for (const tile of tileEntries) {
      if (tile.isRiver) riverKeySet.add(coordKey(tile));
    }

    // ── Pass 2: Verify each non-supernatural tile ──────────────────────────
    for (const tile of tileEntries) {
      const { q, r, elevationField, moisture, temperature, biomeId } = tile;

      const key = coordKey(tile);
      const fields = recomputed.get(key);
      if (!fields) continue; // should not happen

      // Skip tiles overridden by supernatural biomes — epicenter fieldModifiers
      // break the pure-function invariant against sampleBaseFields.
      if (SUPERNATURAL_BIOME_IDS.includes(biomeId)) continue;

      // ── 1. elevationField ──────────────────────────────────────────────
      if (Math.abs(elevationField - fields.elevation) > 1e-12) {
        failures.push({
          q, r, field: 'elevationField',
          stored: elevationField, recomputed: fields.elevation,
        });
        if (failures.length >= 10) break;
        continue;
      }

      // ── 2. temperature ─────────────────────────────────────────────────
      if (Math.abs(temperature - fields.temperature) > 1e-12) {
        failures.push({
          q, r, field: 'temperature',
          stored: temperature, recomputed: fields.temperature,
        });
        if (failures.length >= 10) break;
        continue;
      }

      // ── 3. baseMoisture ────────────────────────────────────────────────
      if (Math.abs(tile.baseMoisture - fields.baseMoisture) > 1e-12) {
        failures.push({
          q, r, field: 'baseMoisture',
          stored: tile.baseMoisture, recomputed: fields.baseMoisture,
        });
        if (failures.length >= 10) break;
        continue;
      }

      // ── 4. moisture (adjusted: base + coastal boost + river boost) ───────
      let waterCount = 0;
      for (const n of hexesWithinRadius(2)) {
        const nFields = sampleBaseFields(baseSeed, q + n.q, r + n.r, getNoiseConfig(radius), radius);
        if (isProvisionalWater(nFields.elevation, nFields.baseMoisture, DEFAULT_TERRAIN_RULES)) {
          waterCount++;
        }
      }
      // Coastal moisture boost (water neighbors within radius 2)
      const coastalMoisture = Math.min(1, Math.max(0, fields.baseMoisture + waterCount * 0.03));

      // biomeMoisture: the moisture value used for biome selection.
      // The pipeline selects biomes BEFORE river boost — a river valley
      // changes terrain locally but does not change the biome.
      const biomeMoisture = coastalMoisture;

      // River moisture boost (for terrain reclassification, not biome selection)
      let expectedMoisture = coastalMoisture;
      const riverCheckKey = coordKey({ q, r });
      if (riverKeySet.has(riverCheckKey)) {
        expectedMoisture = Math.min(1, Math.max(0, expectedMoisture + RIVER_MOISTURE_BOOST));
      } else {
        for (const n of hexesWithinRadius(RIVER_BOOST_RADIUS)) {
          if (riverKeySet.has(coordKey({ q: q + n.q, r: r + n.r }))) {
            expectedMoisture = Math.min(1, Math.max(0, expectedMoisture + RIVER_MOISTURE_BOOST));
            break;
          }
        }
      }

      if (Math.abs(moisture - expectedMoisture) > 1e-12) {
        failures.push({
          q, r, field: 'moisture',
          stored: moisture, recomputed: expectedMoisture,
        });
        if (failures.length >= 10) break;
        continue;
      }

      // ── 5. slope (via computeSlope from recomputed elevations) ──────────
      const elevationAt = (nq, nr) => {
        const f = recomputed.get(coordKey({ q: nq, r: nr }));
        return f ? f.elevation : 0;
      };
      const expectedSlope = computeSlope(q, r, elevationAt);

      if (Math.abs(tile.slope - expectedSlope) > 1e-12) {
        failures.push({
          q, r, field: 'slope',
          stored: tile.slope, recomputed: expectedSlope,
        });
        if (failures.length >= 10) break;
        continue;
      }

      // ── 6. biomeId (via selectBiome from recomputed fields) ─────────────
      // Use biomeMoisture (coastal boost only, no river boost). The pipeline
      // selects biomes during chunk generation before the river post-pass
      // boosts moisture — so biomeId reflects pre-river conditions.
      const expectedBiomeId = selectBiome(
        fields.elevation, biomeMoisture, fields.temperature,
        fields.regionBiasM, fields.regionBiasT
      );

      if (biomeId !== expectedBiomeId) {
        failures.push({
          q, r, field: 'biomeId',
          stored: biomeId, recomputed: expectedBiomeId,
        });
        if (failures.length >= 10) break;
        continue;
      }

      // ── 7. terrain (via classifyTerrain from stored fields + biome rules) ──
      // Use stored fields — all agree within 1e-12 (checked above), but exact
      // classification thresholds (e.g. hillElevationMin=0.32, hillSlopeMin=0.25,
      // forestMinMoisture=0.58) can flip on a 1e-15 ULP difference. The stored
      // values are the values the pipeline actually used.
      //
      // Skip champion base tiles — championFactory.js overrides their terrain to
      // 'plains' (regardless of what classifyTerrain would produce). This is an
      // intentional design decision, not a chunk-seam invariance failure.
      if (tile.feature?.kind === 'base') continue;
      const biomeDef = getArchetype(biomeId) || getArchetype('biome_default');
      const expectedTerrain = classifyTerrain(
        elevationField, moisture, temperature,
        tile.slope, biomeDef
      );

      if (tile.terrain !== expectedTerrain) {
        failures.push({
          q, r, field: 'terrain',
          stored: tile.terrain, recomputed: expectedTerrain,
        });
        if (failures.length >= 10) break;
      }
    }
  } catch (err) {
    return {
      passed: false,
      failures: [{ q: 0, r: 0, field: 'error', stored: err.message, recomputed: 'n/a' }],
      seed: seedText,
      radius,
    };
  }

  return {
    passed: failures.length === 0,
    failures,
    seed: seedText,
    radius,
  };
}

/**
 * Run the seam invariant across multiple seeds at a given radius.
 *
 * @param {string[]} seeds  - Array of seed strings
 * @param {number}   radius - Map radius
 * @returns {{ results: { seed: string, passed: boolean, failures: object[] }[], seedCount: number, radius: number }}
 */
export function runMultiSeedSeamTest(seeds, radius) {
  const results = seeds.map(s => runSeamTest(s, radius));
  return {
    results,
    seedCount: seeds.length,
    radius,
  };
}
