/**
 * biomeScale.js — Per-biome size section (leaves only): a biome × factor grid
 * editing the part's `biomeScale` map — the per-biome size multiplier
 * (stunted Tundra trees, small Painforest groves). Absent ≡ scale 1
 * everywhere; typing 1 clears the biome's override (the motif grid's
 * convention), and rows with a non-default factor are highlighted so the
 * biome stunts read at a glance.
 */
import { el, numberInput } from '../../formControls/index.js';
import { listArchetypes, getArchetype } from '../../../../../../src/game/rules/archetypes.js';
import { section, fmt } from '../sectionShell.js';

/** Per-biome size factors — leaves only. */
export function renderBiomeScaleSection(container, part, ctx) {
  const sec = section('biomeScale', container, () => {
    const overrides = Object.entries(part.biomeScale ?? {}).filter(([, v]) => v !== 1);
    if (overrides.length === 0) return 'default';
    return overrides.map(([id, v]) => {
      const name = getArchetype(id)?.name ?? id;
      return `${name} ${fmt(v)}`;
    }).join(' · ');
  });
  sec.append(el('div', 'hint', 'Multiplies this part\'s size on tiles of each biome (stunted Tundra trees, small Painforest groves). Absent = scale 1 everywhere; type 1 to clear a biome\'s override.'));
  const grid = el('table', 'biome-scale-grid');
  const head = el('tr');
  head.append(el('th', null, 'Biome'), el('th', null, 'Scale'));
  grid.append(head);
  for (const biomeId of listArchetypes('biome')) {
    const name = getArchetype(biomeId)?.name ?? biomeId;
    const factor = part.biomeScale?.[biomeId] ?? 1;
    const tr = el('tr', factor === 1 ? null : 'overridden');
    const nameCell = el('td', 'biome-scale-name', name);
    nameCell.title = biomeId; // names truncate — hover for the full id
    const factorCell = el('td', 'biome-scale-factor');
    const input = numberInput(factor, {
      min: 0.01, step: 0.05, stepper: false,
      onChange: (v) => ctx.mutate(() => {
        if (v === 1) {
          if (part.biomeScale) {
            delete part.biomeScale[biomeId];
            if (Object.keys(part.biomeScale).length === 0) delete part.biomeScale;
          }
        } else {
          part.biomeScale ??= {};
          part.biomeScale[biomeId] = v;
        }
      }),
    });
    input.title = `${biomeId} — ×${factor} size on ${name} tiles${factor === 1 ? ' (default)' : ''}; 1 clears the override`;
    factorCell.append(input);
    tr.append(nameCell, factorCell);
    grid.append(tr);
  }
  sec.append(grid);
}
