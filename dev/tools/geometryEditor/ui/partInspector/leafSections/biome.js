/**
 * biome.js — Biome-tint section (leaves only): the source selector
 * (primary / accent / terrain) and the influence slider.
 */
import { el, row, numberInput, selectInput } from '../../formControls/index.js';
import { section } from '../sectionShell.js';

/** Biome tint — leaves only. */
export function renderBiomeSection(container, part, ctx) {
  const sec = section('biome', container);
  sec.append(el('div', 'hint', 'Tints this part toward the tile\'s blended biome color. Applies only to parts with a literal color; Untouched and Painforest tiles skip signature (primary/accent) tints — terrain still matches the ground.'));
  const biome = part.biomeColor;
  const source = biome?.source ?? '';
  sec.append(row('Source', selectInput(
    [{ value: '', label: '— none' }, { value: 'primary', label: 'primary' }, { value: 'accent', label: 'accent' }, { value: 'terrain', label: 'terrain' }],
    source,
    (v) => ctx.mutate(() => {
      if (!v) {
        if (part.biomeColor) delete part.biomeColor;
      } else {
        part.biomeColor = { source: v, influence: part.biomeColor?.influence ?? 0.5 };
      }
    }),
  )));
  if (biome?.source) {
    sec.append(row('Influence', numberInput(biome.influence ?? 0.5, { min: 0, step: 0.1, onChange: (v) => ctx.mutate(() => { biome.influence = Math.max(0, Math.min(1, v)); }) })));
  }
}
