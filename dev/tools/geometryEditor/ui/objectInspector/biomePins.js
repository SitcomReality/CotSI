/**
 * biomePins.js — Per-biome variant pins (the "Per-biome variants" section).
 *
 * The data-driven alternates that make a decor look different per biome
 * (e.g. the Painforest woods' gnarled variant). The first variant is the
 * default look; a pin swaps in an alternate. Different terrains are separate
 * decor objects, so there is no per-terrain picker.
 */
import { el, row, selectInput } from '../formControls/index.js';
import { S } from '../../state.js';
import { listArchetypes, getArchetype } from '../../../../../src/game/rules/archetypes.js';
import { section } from './sectionShell.js';

/** Set or clear one biome pin in `biomeVariants`. Empty value clears the pin;
 *  an empty map is dropped so denormalize emits no `{}` noise. */
function setBiomePin(d, biomeId, variantId) {
  if (variantId) {
    d.biomeVariants = { ...(d.biomeVariants ?? {}), [biomeId]: variantId };
  } else if (d.biomeVariants) {
    d.biomeVariants = { ...d.biomeVariants };
    delete d.biomeVariants[biomeId];
    if (Object.keys(d.biomeVariants).length === 0) delete d.biomeVariants;
  }
}

/** A per-biome select for every biome archetype, blank = default look. */
export function renderBiomeVariantPins(container, ctx) {
  const d = S.descriptor;
  const ids = d.variants.map((v) => v.id);

  const sec = section('biomePins', container, () => {
    const pins = Object.entries(d.biomeVariants ?? {}).filter(([, v]) => v);
    if (pins.length === 0) return 'default';
    return pins.map(([id, vid]) => `${getArchetype(id)?.name ?? id}: ${vid}`).join(' · ');
  });

  sec.append(el('div', 'hint', `Pin an alternate variant to a biome — the first variant (${ids[0]}) is the default look everywhere else. Variants: ${ids.join(', ')}.`));
  for (const biomeId of listArchetypes('biome')) {
    const options = [{ value: '', label: '— default look' }, ...ids.map((id) => ({ value: id, label: id }))];
    const current = d.biomeVariants?.[biomeId] ?? '';
    sec.append(row(getArchetype(biomeId)?.name ?? biomeId, selectInput(options, current, (v) => ctx.mutate(() => {
      setBiomePin(d, biomeId, v);
    }))));
  }
}
