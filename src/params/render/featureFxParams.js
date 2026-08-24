/**
 * featureFxParams.js — Feature FX tuning (see worldObjects/featureFx.js).
 *
 * Ambient accents (knot rainbow sparkles, peridexion fruit sparkles, Blessed
 * Font charge glow) and one-shot collect bursts (knot sparkle puff, treasure
 * chest coin flourish). All heights are offsets above hillFloorY(tile).
 */

/** God's Knot — ambient rainbow sparkles hovering around the knot. */
export const KNOT_SPARKLE_COUNT = 5;
export const KNOT_SPARKLE_Y_OFFSET = 0.9;
export const KNOT_SPARKLE_SCATTER = 0.35;
export const KNOT_SPARKLE_SIZE = 0.09;

/** Peridexion Tree — ripe-fruit glints near the crown. */
export const FRUIT_SPARKLE_COUNT = 3;
export const FRUIT_SPARKLE_Y_OFFSET = 2.4;
export const FRUIT_SPARKLE_SCATTER = 0.55;
export const FRUIT_SPARKLE_SIZE = 0.08;

/** Blessed Font — soft additive glow ring above the font while charged. */
export const FONT_GLOW_Y_OFFSET = 1.15;
export const FONT_GLOW_INNER_RADIUS = 0.22;
export const FONT_GLOW_OUTER_RADIUS = 0.55;

/** Collect bursts — one-shot particle puffs (knot) / coin flourishes (chest). */
export const KNOT_BURST_PARTICLE_COUNT = 14;
export const COIN_FLOURISH_COUNT = 10;
export const BURST_DURATION_MS = 900;
export const BURST_PARTICLE_SPEED = 1.6;
export const BURST_UP_BIAS = 1.2;
