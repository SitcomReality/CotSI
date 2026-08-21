/**
 * entitySection.js — Entity-driven objects: faction/archetype pickers instead
 * of cluster/size/placement. Faction picks the palette colors; archetype
 * (when the variant rule is archetype) picks the shape variant. Traders have
 * a single fixed look and just get a note.
 */
import { el, row, selectInput } from '../formControls/index.js';
import { S } from '../../state.js';
import { FACTIONS } from '../../../../../src/game/rules/factionData.js';

/** Entity kinds: faction/archetype picker instead of cluster/size/placement. */
export function renderEntityControls(container, ctx) {
  const d = S.descriptor;
  const rule = d.variantRule;
  const variants = d.variants ?? [];

  if (rule === 'archetype' && variants.length === 1 && variants[0].id === 'trader') {
    container.append(el('div', 'hint', 'Traders have a single fixed look — no variants to pick.'));
    return;
  }

  const factionOptions = FACTIONS.map((f) => f.short);
  container.append(row('Faction', selectInput(factionOptions, S.entity.faction, (v) => ctx.mutate(() => {
    S.entity.faction = v;
  })), rule === 'archetype' ? 'Picks the palette colors' : 'Picks the variant and the palette colors'));

  if (rule === 'archetype' && variants.length > 0) {
    const ids = variants.map((v) => v.id);
    const current = ids.includes(S.entity.archetype) ? S.entity.archetype : ids[0];
    container.append(row('Archetype', selectInput(ids, current, (v) => ctx.mutate(() => {
      S.entity.archetype = v;
    })), 'Picks the shape variant'));
  }
}
