import { clamp01 } from '../fields/slopeComputation.js';
import { getArchetype } from '../../archetypes.js';

/** Natural biomes — climate-driven, in specificity order. biome_default is last (catch-all). */
const BIOME_PRIORITY_ORDER = [
  'biome_sere_wastes',      // hot + dry (most specific)
  'biome_scorch',           // hot transitional — between sere_wastes and painforest
  'biome_frigid_silence',   // cold, dry-to-mid (maxMoist 0.55) — before temperate generalists
  'biome_mourning_marsh',   // very cold + wet (maxTemp 0.35, minMoist 0.58) — extreme cold before tundra
  'biome_tundra',           // cold + wet (maxTemp 0.52, minMoist 0.50) — catches cool-wet after extreme cold
  'biome_dustbleed',        // low-elevation drylands
  'biome_edenfall',         // temperate mid-moisture — wide ceiling catches painforest boundary
  'biome_painforest',       // wet + warm
  'biome_default',          // catch-all — last, always matches
];

/** Supernatural biomes — placed by jittered-grid epicenter pass (A8), never by climate. */
const SUPERNATURAL_BIOMES = [
  'biome_titanstain',
  'biome_unfinished_lands',
];

export { BIOME_PRIORITY_ORDER, SUPERNATURAL_BIOMES };

/**
 * Select a natural biome ID from climate fields + regional bias.
 *
 * Iterates BIOME_PRIORITY_ORDER in sequence. First biome whose climateRange
 * constraints ALL match wins. Biomes without climateRange (not yet classified)
 * are skipped — they fall through to biome_default at the end.
 *
 * Regional bias applies small per-axis jitter (±5% per field) so biome
 * boundaries are softened by low-frequency noise, not hard climate cuts.
 *
 * @param {number} elevation   - [0, 1] elevation field
 * @param {number} moisture    - [0, 1] raw moisture field
 * @param {number} temperature - [0, 1] temperature field
 * @param {number} regionBiasM - [0, 1] moisture bias field
 * @param {number} regionBiasT - [0, 1] temperature bias field
 * @returns {string} biome archetype ID
 */
export function selectBiome(elevation, moisture, temperature, regionBiasM, regionBiasT) {
  const m = clamp01(moisture    + (regionBiasM - 0.5) * 0.10);
  const t = clamp01(temperature + (regionBiasT - 0.5) * 0.10);

  for (const biomeId of BIOME_PRIORITY_ORDER) {
    const def = getArchetype(biomeId);
    if (!def) continue;

    const R = def.climateRange;

    // Biomes without climateRange haven't been classified. Skip —
    // they fall through to biome_default at the end.
    if (!R) continue;

    // All specified constraints must be satisfied
    if (R.minElevation   !== undefined && elevation   < R.minElevation)   continue;
    if (R.maxElevation   !== undefined && elevation   > R.maxElevation)   continue;
    if (R.minMoisture    !== undefined && m            < R.minMoisture)    continue;
    if (R.maxMoisture    !== undefined && m            > R.maxMoisture)    continue;
    if (R.minTemperature !== undefined && t            < R.minTemperature) continue;
    if (R.maxTemperature !== undefined && t            > R.maxTemperature) continue;

    return biomeId;
  }

  return 'biome_default';
}
