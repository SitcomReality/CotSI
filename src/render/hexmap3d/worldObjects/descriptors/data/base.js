/**
 * base.js — Barrel/composer for the base descriptor.
 *
 * Each faction's variant lives in its own file under data/bases/ (a
 * <FACTION>_VARIANT block: `{ id, parts }`); this module composes them into
 * the tables the game consumes:
 *
 *   - BASE_VARIANTS — faction short → parts array. The key equals the
 *     variant's id (via variantRule 'faction').
 *   - BASE_DESCRIPTOR — the descriptor form, derived from those tables.
 *
 * Each faction's citadel is fully authored (see the per-faction files): all
 * part ids are unique across every variant (cruF..., revF..., ...) so part
 * grouping in meshAssembly never mixes two different geometries under one id.
 * The geometry editor saves ONLY the active faction to data/bases/<faction>.js;
 * this barrel is never rewritten by a save.
 *
 * Faction identity comes from architectural silhouette + accent
 * (aestheticConventions §4): main structures use the 'factionBase' token,
 * signature elements the 'factionAccent' token, with dark iron/stone literals
 * for the foundations. Material stays white — instance colors drive the look.
 */
import { CRU_VARIANT } from './bases/cru.js';
import { REV_VARIANT } from './bases/rev.js';
import { VER_VARIANT } from './bases/ver.js';
import { ARC_VARIANT } from './bases/arc.js';
import { HRT_VARIANT } from './bases/hrt.js';
import { MSK_VARIANT } from './bases/msk.js';
import { HOL_VARIANT } from './bases/hol.js';

/** Every faction variant. Variant id === the faction short name. */
export const BASE_VARIANTS = {
  CRU: CRU_VARIANT.parts,
  REV: REV_VARIANT.parts,
  VER: VER_VARIANT.parts,
  ARC: ARC_VARIANT.parts,
  HRT: HRT_VARIANT.parts,
  MSK: MSK_VARIANT.parts,
  HOL: HOL_VARIANT.parts,
};

/** The base descriptor — top-level parts are the CRU fallback. */
export const BASE_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'base',
  kind: 'base',
  displayName: 'Faction Base',
  variantRule: 'faction',
  parts: BASE_VARIANTS.CRU,
  variants: Object.entries(BASE_VARIANTS).map(([id, parts]) => ({ id, parts })),
};
