/**
 * objectControls.js — Object-level design fields for the geometry editor.
 *
 * Renders into `#inspector-body` when no part is selected: name, variant /
 * entity pickers, cluster, size, placement and emphasis.
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
  degreeInput,
} from './formControls.js';
import { inspectorHead } from './inspectorHead.js';
import { activeVariant } from './variantQuery.js';
import {
  EMPHASIS_BEHAVIORS,
  PLACEMENT_MODES,
  ITEM_SLOTS,
  PORTRAIT_DEFAULTS,
} from '../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { ENTITY_KINDS } from '../entityView.js';
import { SAMPLE_OBJECTS } from '../sampleObjects.js';
import { FACTIONS } from '../../../../src/game/rules/factionData.js';
import { listArchetypes, getArchetype } from '../../../../src/game/rules/archetypes.js';

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

// ── Collapsible sections ────────────────────────────────────────────────────
//
// The object-level fields live in foldable <details> sections (the same
// pattern partInspector/sectionShell.js uses for part fields), so the design
// fields stay scannable — the long per-biome pin list folds away by default.
// Which sections the user has open is session state, kept across re-renders.

/** Section registry: `key` → title + default open state. */
const SECTIONS = {
  variant: { title: 'Variant', open: true },
  biomePins: { title: 'Per-biome variants', open: false },
  cluster: { title: 'Cluster', open: true },
  size: { title: 'Size', open: true },
  placement: { title: 'Placement', open: true },
  emphasis: { title: 'Emphasis', open: true },
  portrait: { title: 'Portrait', open: false },
  item: { title: 'Item', open: true },
  entity: { title: 'Entity', open: true },
};
/** Which sections the user has open (session state, persisted across renders). */
const openSections = new Set(
  Object.entries(SECTIONS).filter(([, s]) => s.open).map(([key]) => key),
);

/** A collapsible `<details>` section appended to `container`; its open state
 *  is tracked in `openSections` so re-renders keep the user's layout. */
function section(key, container) {
  const det = el('details', 'inspector-section');
  det.open = openSections.has(key);
  det.addEventListener('toggle', () => {
    if (det.open) openSections.add(key);
    else openSections.delete(key);
  });
  det.append(el('summary', 'section-title', SECTIONS[key].title));
  container.append(det);
  return det;
}

/** Per-biome variant pins — the data-driven alternates that make a decor look
 *  different per biome (e.g. the Painforest woods' gnarled variant). The first
 *  variant is the default look; a pin swaps in an alternate. Different
 *  terrains are separate decor objects, so there is no per-terrain picker. */
function renderBiomeVariantPins(container, ctx) {
  const d = S.descriptor;
  const ids = d.variants.map((v) => v.id);

  container.append(el('div', 'hint', `Pin an alternate variant to a biome — the first variant (${ids[0]}) is the default look everywhere else. Variants: ${ids.join(', ')}.`));
  for (const biomeId of listArchetypes('biome')) {
    const options = [{ value: '', label: '— default look' }, ...ids.map((id) => ({ value: id, label: id }))];
    const current = d.biomeVariants?.[biomeId] ?? '';
    container.append(row(getArchetype(biomeId)?.name ?? biomeId, selectInput(options, current, (v) => ctx.mutate(() => {
      setBiomePin(d, biomeId, v);
    }))));
  }
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

/** Effective portrait framing value — the authored field or the shared default. */
function portraitField(d, key) {
  return d.portrait?.[key] ?? PORTRAIT_DEFAULTS[key];
}

/** Camera-framing controls for the object's UI icon/portrait (all kinds). */
function renderPortraitControls(container, ctx) {
  const d = S.descriptor;
  const set = (key) => (v) => ctx.mutate(() => {
    d.portrait ??= {};
    d.portrait[key] = v;
  });
  container.append(row('Pitch', degreeInput(portraitField(d, 'pitch'), { step: 2, onChange: set('pitch') })));
  container.append(row('Yaw', degreeInput(portraitField(d, 'yaw'), { step: 2, onChange: set('yaw') })));
  container.append(row('Pad', numberInput(portraitField(d, 'pad'), { min: 0.5, step: 0.05, onChange: set('pad') })));
  container.append(row('Raise', numberInput(portraitField(d, 'raise'), { step: 0.02, onChange: set('raise') })));
  container.append(el('div', 'hint', 'How this object frames its icon/portrait — leave at defaults for the auto-frame isometric view.'));
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

  if (d.kind === 'item') {
    container.append(el('div', 'mode-banner', 'item — UI icon'));
    const itemSection = section('item', container);
    itemSection.append(row('Slot', selectInput(ITEM_SLOTS, d.slot, (v) => ctx.mutate(() => {
      d.slot = v;
      ctx.onLoaded(); // the slot moves the item between the weapon/armor browser categories
    }))));
    renderPortraitControls(section('portrait', container), ctx);
    container.append(el('div', 'hint', 'Items render as a single centered icon — cluster/size/placement do not apply.'));
    return;
  }

  if (ENTITY_KINDS.has(d.kind)) {
    container.append(el('div', 'mode-banner', `${d.kind} — entity-driven`));
    renderEntityControls(section('entity', container), ctx);
    renderPortraitControls(section('portrait', container), ctx);
    container.append(el('div', 'hint', 'Entities are singletons at the hex center — cluster/size/placement do not apply.'));
    return;
  }

  if ((d.variants ?? []).length > 0) {
    const variantSection = section('variant', container);
    const ids = d.variants.map((v) => v.id);
    const current = ids.includes(S.variantId) ? S.variantId : ids[0];
    variantSection.append(row('Variant', selectInput(ids, current, (v) => ctx.mutate(() => { S.variantId = v; }))));
    variantSection.append(el('div', 'hint', 'The parts list and preview edit this variant. In-game the first variant is the default look; per-biome pins swap in alternates.'));
    renderBiomeVariantPins(section('biomePins', container), ctx);
  }

  const clusterSection = section('cluster', container);
  clusterSection.append(row('Rule', selectInput(['uniform', 'moisture'], d.cluster.rule, (v) => ctx.mutate(() => {
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
    clusterSection.append(el('div', 'hint', `Moisture-driven count (tiles without moisture default to mid-density). ${counts}.`));
  } else {
    clusterSection.append(row('Min', intInput(d.cluster.min, { min: 1, onChange: (v) => ctx.mutate(() => { d.cluster.min = v; }) })));
    clusterSection.append(row('Max', intInput(d.cluster.max, { min: 1, onChange: (v) => ctx.mutate(() => { d.cluster.max = Math.max(v, d.cluster.min); }) })));
  }

  const sizeSection = section('size', container);
  sizeSection.append(row('Min', numberInput(d.size.min, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.size.min = v; }) })));
  sizeSection.append(row('Max', numberInput(d.size.max, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.size.max = Math.max(v, d.size.min); }) })));

  const placementSection = section('placement', container);
  placementSection.append(row('Mode', selectInput(PLACEMENT_MODES, d.placement.mode, (v) => ctx.mutate(() => {
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
    placementSection.append(row('Offset min', numberInput(d.placement.offsetMin, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.offsetMin = v; }) })));
    placementSection.append(row('Offset max', numberInput(d.placement.offsetMax, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.offsetMax = v; }) })));
    placementSection.append(row('Separation', numberInput(d.placement.separation ?? 0, { min: 0, step: 0.05, onChange: (v) => ctx.mutate(() => {
      if (v > 0) d.placement.separation = v;
      else delete d.placement.separation;
    }) })));
    placementSection.append(el('div', 'hint', 'Min world-unit distance between cluster members; 0 = off.'));
  }
  if (d.placement.mode === 'ring') {
    placementSection.append(row('Ring min', numberInput(d.placement.ringMin, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.placement.ringMin = v; }) })));
    placementSection.append(row('Ring max', numberInput(d.placement.ringMax, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.placement.ringMax = v; }) })));
    placementSection.append(row('Lean min', numberInput(d.placement.leanMin, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.leanMin = v; }) })));
    placementSection.append(row('Lean max', numberInput(d.placement.leanMax, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.leanMax = v; }) })));
  }
  if (d.placement.mode === 'jitter') {
    placementSection.append(row('Offset', numberInput(d.placement.offset, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.offset = v; }) })));
    placementSection.append(row('Separation', numberInput(d.placement.separation ?? 0, { min: 0, step: 0.05, onChange: (v) => ctx.mutate(() => {
      if (v > 0) d.placement.separation = v;
      else delete d.placement.separation;
    }) })));
    placementSection.append(el('div', 'hint', 'Min world-unit distance between cluster members; 0 = off.'));
    placementSection.append(row('Tilt min', numberInput(d.placement.tiltMin, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.tiltMin = v; }) })));
    placementSection.append(row('Tilt max', numberInput(d.placement.tiltMax, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.tiltMax = v; }) })));
    placementSection.append(row('Tilt seed', intInput(d.placement.tiltSeed, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.tiltSeed = v; }) })));
  }

  const emphasisSection = section('emphasis', container);
  emphasisSection.append(row('Behavior', selectInput(EMPHASIS_BEHAVIORS, d.emphasis.behavior, (v) => ctx.mutate(() => {
    d.emphasis.behavior = v;
  }))));

  renderPortraitControls(section('portrait', container), ctx);
}
