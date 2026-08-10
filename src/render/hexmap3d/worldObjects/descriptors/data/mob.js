/**
 * mob.js — Barrel for the mob descriptor.
 *
 * Each mob archetype lives in its own file under `data/mobs/` (one file per
 * mob, exporting a `<NAME>_VARIANT` block: `{ id, parts, material? }`); this
 * module composes them into the tables the game consumes:
 *
 *   - MOB_VARIANTS — variant id → variant block. The key equals the mob's
 *     `archetypeName` (via variantRule 'archetype'); `default` is the
 *     unknown-shape fallback body.
 *   - MOB_DESCRIPTOR — the descriptor form, derived from those tables.
 *
 * Tier-2 variants were removed in the scorpelican/infernalpaca rework; all
 * mobs now render as their baseline archetype variant (tier is still carried
 * in game stats). The per-variant `material` field (infernalpaca's emissive
 * glow) is a schema-v5 extension resolved per part by meshAssembly.
 *
 * Colors resolve through the entity palette: the five baseline mobs use the
 * 'factionBody' token (the faction base color darkened by MOB_COLOR_DARKEN)
 * and may use 'factionAccent'; the hand-authored infernalpaca and scorpelican
 * use themed literal colors plus faction tokens. Values are JSON-safe (colors
 * as tokens or integers, angles in radians, lengths in world units where hex
 * radius = 1.0).
 */
import { INFERNALPACA_VARIANT } from './mobs/infernalpaca.js';
import { SCORPELICAN_VARIANT } from './mobs/scorpelican.js';
import { LEOPARD_VARIANT } from './mobs/leopard.js';
import { GOOSE_VARIANT } from './mobs/goose.js';
import { SNAIL_VARIANT } from './mobs/snail.js';
import { TAPIR_VARIANT } from './mobs/tapir.js';
import { MUSHROOM_VARIANT } from './mobs/mushroom.js';

/** The fallback body for unknown archetype shapes — y = 0, flush on the ground. */
const DEFAULT_BODY = {
  id: 'defaultBody',
  shape: 'cylinder',
  params: { bottomR: 0.1, topR: 0.14, height: 0.4, segments: 8 },
  color: 'factionBody',
};

/** Every mob variant. Variant id === the archetype shape key. */
export const MOB_VARIANTS = {
  default: { id: 'default', parts: [DEFAULT_BODY] },
  infernalpaca: INFERNALPACA_VARIANT,
  leopard: LEOPARD_VARIANT,
  goose: GOOSE_VARIANT,
  scorpelican: SCORPELICAN_VARIANT,
  snail: SNAIL_VARIANT,
  tapir: TAPIR_VARIANT,
  mushroom: MUSHROOM_VARIANT,
};

/** The mob descriptor — top-level parts are the unknown-shape fallback. */
export const MOB_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'mob',
  kind: 'mob',
  displayName: 'Mob',
  variantRule: 'archetype',
  parts: MOB_VARIANTS.default.parts,
  variants: Object.values(MOB_VARIANTS),
};
