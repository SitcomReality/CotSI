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
 * Each faction's miniature is fully authored (see the per-faction files):
 * every part id is unique to its faction (cruX, revX, ...) except the shared
 * PEDESTAL stand from champions/shared.js, which is identical in all seven
 * variants so meshAssembly merges every champion's stand into one
 * InstancedMesh. The geometry editor saves ONLY the active faction to
 * data/champions/<faction>.js; this barrel is never rewritten by a save.
 *
 * Faction identity comes from silhouette + accent (aestheticConventions §4):
 * each miniature is colored primarily via the 'factionBase' token, its
 * signature element via 'factionAccent', with warm dark/bone literals for
 * metal, wood and stone detail.
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
