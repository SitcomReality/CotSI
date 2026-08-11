/**
 * variantQuery.js — Which variant / parts array the editor currently edits.
 *
 * Both the preview and the parts list must agree on the active variant:
 * entity kinds derive it from the entity selection (faction/archetype),
 * tile-driven objects from the variant picker (S.variantId). Descriptors
 * without variants fall back to their top-level `parts`.
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
 * The parts array the editor edits. Both the preview and the parts list use
 * the active variant's parts, so what you edit is what you see — this fixes
 * the grove/tree parts list showing only the fallback while the preview
 * renders the variant. Descriptors without variants fall back to `parts`.
 */
export function activeParts() {
  const d = S.descriptor;
  return activeVariant()?.parts ?? d.parts;
}
