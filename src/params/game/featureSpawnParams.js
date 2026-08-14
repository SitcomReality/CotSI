/** featureSpawnParams.js — Feature sprinkling, density, tiering, and knot-amount constants. */

/** Noise channel index for feature sprinkling. */
export const NOISE_CHANNEL_FEATURES = 4;
/** Noise channel base for tiered feature-placement gating (per-rule salt = base + rule index). */
export const NOISE_CHANNEL_FEATURE_TIER = 5;

/** Base knot amount before variation. */
export const KNOT_BASE_AMOUNT = 2;
/** Scale factor for knot-amount variation formula. */
export const KNOT_AMOUNT_VARIATION_SCALE = 100;
/** Modulo bound for knot-amount variation. */
export const KNOT_AMOUNT_VARIATION_MOD = 3;

// ---------------------------------------------------------------------------
// Feature density (featureDensity.js)
// Tree/fruit feature density shaping. The moisture values here form one
// family with DEFAULT_TERRAIN_RULES.forestMinMoisture (0.58):
//   moistRamp 0.72            — tree density ramps up only above the
//                               dense-forest moisture, well past the forest floor.
//   blessedFontMinMoisture 0.60 — Blessed Fonts need moisture above the forest floor
//                                  but below the dense-forest ramp.
// Re-derive the family together if the moisture distribution shifts.
// ---------------------------------------------------------------------------

export const FEATURE_DENSITY = {
  baseline:            0.5,  // plains baseline density
  moistRamp:           0.72, // tree density ramp start (moisture)
  moistSpan:           0.28, // ramp width: moisture 0.72 → 1.0 maps factor 0 → 1
  treeLineHalf:        0.5,  // elevation penalty starts above half the tree line
  treeDensityScale:    0.8,  // tree density scale (× elevFactor)
  treeDensityMin:      0.2,  // tree density floor
  plainsMoistFactor:   0.6,  // plains/hill density: moisture × this
  plainsOffset:        0.1,  // plains/hill density: + this
  marshMoistFactor:    0.4,  // marsh density: moisture × this
  desertMoistFactor:   0.15, // desert density: moisture × this
  blessedFontMinMoisture: 0.60, // Blessed Font climate gate
};

// ---------------------------------------------------------------------------
// Tiered + banded feature placement (featureSpawning.js; featureDesign.md §3)
// Better features are more frequent toward the map center. Each tier gates its
// features by distance from the map center:
//   gate  — acceptance probability at the map edge (0 = never at the edge);
//           ramps linearly to 1.0 at the center.
//   inner — fraction of the map radius inside which the tier can spawn at all
//           (1.0 = everywhere). Outside `inner` the gate is 0.
// T1 is uniform (gate 1.0); T2 ramps mildly; T3 ramps strongly; T4 spawns
// only inside the inner half of the map. Rules without a `tier` field are T1.
// ---------------------------------------------------------------------------

export const FEATURE_TIERS = {
  T1: { gate: 1.0, inner: 1.0 },
  T2: { gate: 0.55, inner: 1.0 },
  T3: { gate: 0.2, inner: 1.0 },
  T4: { gate: 0.0, inner: 0.5 },
};
