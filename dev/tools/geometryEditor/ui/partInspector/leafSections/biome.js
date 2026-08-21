/**
 * biome.js — Biome-tint section (leaves only): the source selector
 * (foliage / wood / soil / stone / bloom / exotic / terrain) and the
 * influence slider.
 */
import { el, row, numberInput, selectInput } from '../../formControls/index.js';
import { section, fmt } from '../sectionShell.js';

/** Biome tint — leaves only. */
export function renderBiomeSection(container, part, ctx) {
  const sec = section('biome', container, () => {
    const source = part.biomeColor?.source ?? '';
    const influence = part.biomeColor?.influence ?? 0.5;
    if (!source) return 'default';
    return `${source} · ${fmt(influence)}`;
  });
  sec.append(el('div', 'hint', 'Tints this part toward the tile\'s blended biome color. Pick the swatch matching the material the part depicts: foliage for leaves/grass, wood for trunks/logs, soil for dirt/sand, stone for rocks, bloom for flowers/fruits, exotic for crystals/glows. Applies only to parts with a literal color; Untouched and Painforest tiles skip swatch tints — terrain still matches the ground.'));
  const biome = part.biomeColor;
  const source = biome?.source ?? '';
  sec.append(row('Source', selectInput(
    [
      { value: '', label: '— none' },
      { value: 'foliage', label: 'foliage' },
      { value: 'wood', label: 'wood' },
      { value: 'soil', label: 'soil' },
      { value: 'stone', label: 'stone' },
      { value: 'bloom', label: 'bloom' },
      { value: 'exotic', label: 'exotic' },
      { value: 'terrain', label: 'terrain' },
    ],
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
