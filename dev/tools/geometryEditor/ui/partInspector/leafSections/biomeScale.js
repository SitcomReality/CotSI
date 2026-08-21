/**
 * biomeScale.js — Per-biome size section (leaves only): a sparse override
 * list editing the part's `biomeScale` map — the per-biome size multiplier
 * (stunted Tundra trees, small Painforest groves). Absent ≡ scale 1
 * everywhere, so only overridden biomes get a row; `+ override` adds one
 * from a picker of the biomes not yet listed, and typing 1 or pressing ×
 * clears the biome's override.
 */
import { el, numberInput, selectInput } from '../../formControls/index.js';
import { listArchetypes, getArchetype } from '../../../../../../src/game/rules/archetypes.js';
import { section, fmt } from '../sectionShell.js';

/** Delete `biomeId` from `part.biomeScale`, dropping the map when empty. */
function clearBiome(part, biomeId) {
  if (!part.biomeScale) return;
  delete part.biomeScale[biomeId];
  if (Object.keys(part.biomeScale).length === 0) delete part.biomeScale;
}

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

  const overrides = part.biomeScale ?? {};
  const entries = Object.entries(overrides);
  // One row per overridden biome: name, factor input, clear.
  const grid = el('table', 'biome-scale-grid override-list');
  for (const [biomeId, factor] of entries) {
    const name = getArchetype(biomeId)?.name ?? biomeId;
    const tr = el('tr', 'overridden');
    const nameCell = el('td', 'biome-scale-name', name);
    nameCell.title = biomeId; // names truncate — hover for the full id
    const factorCell = el('td', 'biome-scale-factor');
    const input = numberInput(factor, {
      min: 0.01, step: 0.05, stepper: false,
      onChange: (v) => ctx.mutate(() => {
        if (v === 1) clearBiome(part, biomeId);
        else part.biomeScale[biomeId] = v;
      }),
    });
    input.title = `${biomeId} — ×${fmt(factor)} size on ${name} tiles; 1 or × clears the override`;
    factorCell.append(input);
    const clearBtn = el('button', null, '×');
    clearBtn.type = 'button';
    clearBtn.title = `Clear the ${name} override`;
    clearBtn.addEventListener('click', () => ctx.mutate(() => clearBiome(part, biomeId)));
    factorCell.append(clearBtn);
    tr.append(nameCell, factorCell);
    grid.append(tr);
  }
  if (entries.length > 0) sec.append(grid);

  // The picker: biomes not yet overridden. A fresh override starts at 0.5 —
  // 1 is the "clear" sentinel and would delete itself.
  const remaining = listArchetypes('biome').filter((id) => !(id in overrides));
  if (remaining.length > 0) {
    const addRow = el('div', 'override-add-row');
    addRow.append(el('span', null, '+ override'));
    const select = selectInput(
      remaining.map((id) => ({ value: id, label: getArchetype(id)?.name ?? id })),
      '',
      (v) => {
        if (!v) return;
        ctx.mutate(() => { part.biomeScale ??= {}; part.biomeScale[v] = 0.5; });
      },
    );
    addRow.append(select);
    sec.append(addRow);
  }
  if (overrides.length === 0 && remaining.length === 0) return;
  sec.append(el('div', 'hint', 'Multiplies this part\'s size on tiles of each biome — absent = scale 1. Type 1 or press × to clear an override.'));
}
