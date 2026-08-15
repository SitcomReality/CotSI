/**
 * variantQuery.js — Which variant / parts array the editor currently edits.
 *
 * Both the preview and the parts list must agree on the active variant:
 * entity kinds derive it from the entity selection (faction/archetype),
 * tile-driven objects from the variant picker (S.variantId). Descriptors
 * without variants fall back to their top-level `parts`. v6 motif decors edit
 * ONE motif at a time — the editor's active motif is the "Force motif" picker
 * (S.variantId), falling back to the first motif.
 */
import { S } from '../state.js';
import { ENTITY_KINDS } from '../entityView.js';

/**
 * The variant the editor is currently inspecting. Entity kinds derive it from
 * the entity selection (faction/archetype); tile-driven objects use the
 * variant picker (S.variantId), falling back to the first variant.
 */
export function activeVariant() {
  const d = S.descriptor;
  const variants = d.variants ?? [];
  if (variants.length === 0) return null;
  if (ENTITY_KINDS.has(d.kind)) {
    const key = d.variantRule === 'faction' ? S.entity.faction : d.variantRule === 'archetype' ? S.entity.archetype : null;
    return variants.find((v) => v.id === key) ?? variants[0];
  }
  return variants.find((v) => v.id === S.variantId) ?? variants[0];
}

/**
 * The motif the editor currently edits (v6 decor composition). The "Force
 * motif" picker (S.variantId) names it; without a force, the first motif.
 */
export function activeMotif() {
  const d = S.descriptor;
  const motifs = d.motifs ?? [];
  if (motifs.length === 0) return null;
  return motifs.find((m) => m.id === S.variantId) ?? motifs[0];
}

/**
 * The parts array the editor edits. Both the preview and the parts list use
 * the active variant's parts, so what you edit is what you see — this fixes
 * the grove/tree parts list showing only the fallback while the preview
 * renders the variant. Descriptors without variants fall back to `parts`;
 * v6 motif decors edit the active motif's parts.
 */
export function activeParts() {
  const d = S.descriptor;
  if (d.motifs?.length) return activeMotif()?.parts ?? [];
  return activeVariant()?.parts ?? d.parts;
}
