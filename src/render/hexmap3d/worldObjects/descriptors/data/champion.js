/**
 * champion.js — Barrel/composer for the champion descriptor.
 *
 * Each faction's variant lives in its own file under data/champions/ (a
 * <FACTION>_VARIANT block: `{ id, parts }`); this module composes them into
 * the tables the game consumes:
 *
 *   - CHAMPION_VARIANTS — faction short → parts array. The key equals the
 *     variant's id (via variantRule 'faction').
 *   - CHAMPION_DESCRIPTOR — the descriptor form, derived from those tables.
 *
 * The shared body/head/accents building blocks live in champions/shared.js —
 * the committed faction files compose from them (see the editor-overwrite
 * caveat there). The geometry editor saves ONLY the active faction to
 * data/champions/<faction>.js; this barrel is never rewritten by a save.
 *
 * Per the design brief, each faction gets a SLIGHT variation on the same body
 * — a small head accent in the faction accent color ('factionAccent'), the
 * same idea as the base decorations. The accents are ordinary descriptor
 * parts, so anyone can author richer faction looks in the geometry editor.
 */
import { CRU_VARIANT } from './champions/cru.js';
import { REV_VARIANT } from './champions/rev.js';
import { VER_VARIANT } from './champions/ver.js';
import { ARC_VARIANT } from './champions/arc.js';
import { HRT_VARIANT } from './champions/hrt.js';
import { MSK_VARIANT } from './champions/msk.js';
import { HOL_VARIANT } from './champions/hol.js';

/** Every faction variant. Variant id === the faction short name. */
export const CHAMPION_VARIANTS = {
  CRU: CRU_VARIANT.parts,
  REV: REV_VARIANT.parts,
  VER: VER_VARIANT.parts,
  ARC: ARC_VARIANT.parts,
  HRT: HRT_VARIANT.parts,
  MSK: MSK_VARIANT.parts,
  HOL: HOL_VARIANT.parts,
};

/** The champion descriptor — top-level parts are the CRU fallback. */
export const CHAMPION_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'champion',
  kind: 'champion',
  displayName: 'Champion',
  variantRule: 'faction',
  parts: CHAMPION_VARIANTS.CRU,
  variants: Object.entries(CHAMPION_VARIANTS).map(([id, parts]) => ({ id, parts })),
};
