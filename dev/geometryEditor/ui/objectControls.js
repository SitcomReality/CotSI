/**
 * objectControls.js — Object-level design fields for the geometry editor.
 *
 * Renders into `#inspector-body` when no part is selected: name, variant /
 * entity pickers, biome, cluster, size, placement, emphasis and material.
 * Entity-driven objects swap the cluster/size/placement fields for a
 * faction/archetype picker. `ctx` supplies `mutate()` (and `onLoaded()` for
 * renames, which also refresh the object browser).
 */
import { S } from '../state.js';
import {
  el,
  row,
  subheading,
  textInput,
  selectInput,
  numberInput,
  intInput,
  colorInput,
} from './formControls.js';
import { inspectorHead } from './inspectorHead.js';
import { activeVariant } from './variantQuery.js';
import {
  EMPHASIS_BEHAVIORS,
  PLACEMENT_MODES,
} from '../../../src/render/hexmap3d/features/descriptors/schema.js';
import { ENTITY_KINDS } from '../entityView.js';
import { SAMPLE_OBJECTS } from '../sampleObjects.js';
import { FACTIONS } from '../../../src/game/rules/factionData.js';
import { listArchetypes, getArchetype } from '../../../src/game/rules/archetypes.js';

/** Biome options for the preview-tile selector: none + every registered biome. */
function biomeSelectOptions() {
  return [
    { value: '', label: '— none (default colors)' },
    ...listArchetypes('biome').map((id) => ({ value: id, label: getArchetype(id)?.name ?? id })),
  ];
}

/** Entity kinds: faction/archetype picker instead of cluster/size/placement. */
function renderEntityControls(container, ctx) {
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
  }))));

  if (rule === 'archetype' && variants.length > 0) {
    const ids = variants.map((v) => v.id);
    const current = ids.includes(S.entity.archetype) ? S.entity.archetype : ids[0];
    container.append(row('Archetype', selectInput(ids, current, (v) => ctx.mutate(() => {
      S.entity.archetype = v;
    }))));
    container.append(el('div', 'hint', 'Archetype picks the shape variant; faction picks the palette colors.'));
  } else {
    container.append(el('div', 'hint', 'Faction picks the variant and the palette colors.'));
  }
}

/** Inspector header for object-level editing: name + id/kind meta. */
export function renderObjectHeader(container) {
  const d = S.descriptor;
  container.append(inspectorHead(d.displayName, `${d.id} · ${d.kind}`));
}

/**
 * Render the object-level field sets into `container`. `ctx` supplies
 * `mutate(fn)` for every field change and `onLoaded()` for renames.
 */
export function renderObjectControls(container, ctx) {
  const d = S.descriptor;

  // Name is editable for every object (samples included) — renames take effect
  // in the inspector header, the preview info, and the browser list right away.
  container.append(subheading('Object'));
  container.append(row('Name', textInput(d.displayName, (v) => ctx.mutate(() => {
    d.displayName = v;
    ctx.onLoaded(); // browser labels + custom pin re-render with the new name
  }))));

  // ID — fixed for registered game objects (the save path derives file and
  // export name from it); editable for new/custom objects so they can be saved
  // under a real id. Sanitized to the schema's id pattern on commit.
  const isRegistered = SAMPLE_OBJECTS.some((o) => o.id === d.id);
  const idInput = el('input');
  idInput.type = 'text';
  idInput.value = d.id;
  idInput.disabled = isRegistered;
  idInput.addEventListener('change', () => {
    const clean = idInput.value.trim().replace(/[^A-Za-z0-9_-]/g, '_');
    if (clean && clean !== d.id) {
      ctx.mutate(() => { d.id = clean; });
      ctx.onLoaded(); // browser labels + custom pin re-render with the new id
    } else {
      idInput.value = d.id;
    }
  });
  container.append(row('ID', idInput));
  if (!isRegistered) {
    container.append(el('div', 'hint', 'New objects need a real id before saving to the game — letters, numbers, _ and -.'));
  }

  if (ENTITY_KINDS.has(d.kind)) {
    container.append(el('div', 'mode-banner', `${d.kind} — entity-driven`));
    renderEntityControls(container, ctx);
    container.append(el('div', 'hint', 'Entities are singletons at the hex center — cluster/size/placement do not apply.'));
    container.append(subheading('Material'));
    container.append(row('Color', colorInput(d.material.color, (v) => ctx.mutate(() => { d.material.color = v; }))));
    return;
  }

  if ((d.variants ?? []).length > 0) {
    container.append(subheading('Variant'));
    const ids = d.variants.map((v) => v.id);
    const current = ids.includes(S.variantId) ? S.variantId : ids[0];
    container.append(row('Variant', selectInput(ids, current, (v) => ctx.mutate(() => { S.variantId = v; }))));
    container.append(el('div', 'hint', 'The parts list and preview edit this variant. In-game the tile hash picks one; here you choose which to inspect.'));
  }

  container.append(row('Biome', selectInput(biomeSelectOptions(), S.biomeId ?? '', (v) => ctx.mutate(() => { S.biomeId = v || null; }))));
  container.append(el('div', 'hint', 'Preview-tile biome: per-part biomeScale (stunted Tundra trees, small Painforest groves) and biome-color influence (Edenfall purple leaves).'));

  container.append(subheading('Cluster'));
  container.append(row('Rule', selectInput(['uniform', 'moisture'], d.cluster.rule, (v) => ctx.mutate(() => {
    d.cluster.rule = v;
    if (v === 'moisture') {
      d.cluster.countsByTerrain ??= { forest: [3, 5], denseForest: [4, 7] };
      d.cluster.densityRange ??= [0.55, 0.85];
      d.cluster.jitter ??= 1;
    }
  }))));
  if (d.cluster.rule === 'moisture') {
    const counts = Object.entries(d.cluster.countsByTerrain)
      .map(([t, pair]) => `${t} ${pair[0]}–${pair[1]}`)
      .join(', ');
    container.append(el('div', 'hint', `Moisture-driven count (tiles without moisture default to mid-density). ${counts}.`));
  } else {
    container.append(row('Min', intInput(d.cluster.min, { min: 1, onChange: (v) => ctx.mutate(() => { d.cluster.min = v; }) })));
    container.append(row('Max', intInput(d.cluster.max, { min: 1, onChange: (v) => ctx.mutate(() => { d.cluster.max = Math.max(v, d.cluster.min); }) })));
  }

  container.append(subheading('Size'));
  container.append(row('Min', numberInput(d.size.min, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.size.min = v; }) })));
  container.append(row('Max', numberInput(d.size.max, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.size.max = Math.max(v, d.size.min); }) })));

  container.append(subheading('Placement'));
  container.append(row('Mode', selectInput(PLACEMENT_MODES, d.placement.mode, (v) => ctx.mutate(() => {
    d.placement.mode = v;
    if (v === 'scatter') {
      d.placement.offsetMin ??= 0.15;
      d.placement.offsetMax ??= 0.3;
    } else if (v === 'ring') {
      d.placement.ringMin ??= 0.18;
      d.placement.ringMax ??= 0.55;
      d.placement.leanMin ??= 0.045;
      d.placement.leanMax ??= 0.12;
    } else if (v === 'jitter') {
      d.placement.offset ??= 0.08;
      d.placement.tiltMin ??= 0;
      d.placement.tiltMax ??= 0;
      d.placement.tiltSeed ??= 1;
    }
  }))));

  if (d.placement.mode === 'scatter') {
    container.append(row('Offset min', numberInput(d.placement.offsetMin, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.offsetMin = v; }) })));
    container.append(row('Offset max', numberInput(d.placement.offsetMax, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.offsetMax = v; }) })));
  }
  if (d.placement.mode === 'ring') {
    container.append(row('Ring min', numberInput(d.placement.ringMin, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.placement.ringMin = v; }) })));
    container.append(row('Ring max', numberInput(d.placement.ringMax, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.placement.ringMax = v; }) })));
    container.append(row('Lean min', numberInput(d.placement.leanMin, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.leanMin = v; }) })));
    container.append(row('Lean max', numberInput(d.placement.leanMax, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.leanMax = v; }) })));
  }
  if (d.placement.mode === 'jitter') {
    container.append(row('Offset', numberInput(d.placement.offset, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.offset = v; }) })));
    container.append(row('Tilt min', numberInput(d.placement.tiltMin, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.tiltMin = v; }) })));
    container.append(row('Tilt max', numberInput(d.placement.tiltMax, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.tiltMax = v; }) })));
    container.append(row('Tilt seed', intInput(d.placement.tiltSeed, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.tiltSeed = v; }) })));
  }

  container.append(subheading('Emphasis'));
  container.append(row('Behavior', selectInput(EMPHASIS_BEHAVIORS, d.emphasis.behavior, (v) => ctx.mutate(() => {
    d.emphasis.behavior = v;
  }))));

  container.append(subheading('Material'));
  container.append(row('Color', colorInput(d.material.color, (v) => ctx.mutate(() => { d.material.color = v; }))));
}
