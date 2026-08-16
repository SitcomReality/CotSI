/**
 * tileSections.js — Cluster / size / placement / emphasis field sets for
 * tile-driven objects (the fields that don't apply to item icons and entity
 * singletons). Each renderer appends its rows into the section `container`
 * it is handed; `d` is the descriptor, `ctx` supplies `mutate()`.
 */
import { el, row, selectInput, numberInput, intInput } from '../formControls/index.js';
import { EMPHASIS_BEHAVIORS, PLACEMENT_MODES } from '../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { TERRAIN } from '../../../../../src/game/rules/terrainTypes.js';

const TERRAIN_OPTIONS = Object.keys(TERRAIN).map((t) => ({ value: t, label: t }));

/** One editable row of the moisture count table: terrain → [min, max]. */
function countsRow(d, terrain, pair, ctx) {
  const r = el('div', 'cluster-terrain-row');
  const sel = selectInput(TERRAIN_OPTIONS, terrain, (v) => ctx.mutate(() => {
    d.cluster.countsByTerrain ??= {};
    if (v === terrain || v in d.cluster.countsByTerrain) {
      sel.value = terrain; // a terrain already listed — keep this row where it is
      return;
    }
    delete d.cluster.countsByTerrain[terrain];
    d.cluster.countsByTerrain[v] = pair; // the pair array moves — edits keep working
  }));
  const min = numberInput(pair[0], { min: 1, step: 1, stepper: false, onChange: (v) => ctx.mutate(() => {
    pair[0] = v;
    if (pair[1] < v) pair[1] = v;
  }) });
  const max = numberInput(pair[1], { min: 1, step: 1, stepper: false, onChange: (v) => ctx.mutate(() => {
    pair[1] = v;
    if (pair[0] > v) pair[0] = v;
  }) });
  const remove = el('button', null, '✕');
  remove.type = 'button';
  remove.title = 'Remove this terrain row';
  remove.disabled = Object.keys(d.cluster.countsByTerrain ?? {}).length === 1;
  remove.addEventListener('click', () => ctx.mutate(() => {
    delete (d.cluster.countsByTerrain ?? {})[terrain];
  }));
  r.append(sel, min, max, remove);
  return r;
}

/** Cluster: uniform min/max counts, or moisture-driven counts by terrain. */
export function renderClusterSection(container, d, ctx) {
  container.append(row('Rule', selectInput(['uniform', 'moisture'], d.cluster.rule, (v) => ctx.mutate(() => {
    d.cluster.rule = v;
    if (v === 'moisture') {
      d.cluster.countsByTerrain ??= { forest: [3, 5], denseForest: [4, 7] };
      d.cluster.densityRange ??= [0.55, 0.85];
      d.cluster.jitter ??= 1;
    }
  }))));
  if (d.cluster.rule === 'moisture') {
    container.append(el('div', 'hint', 'Count scales with the tile\'s moisture between the terrain\'s min–max; tiles without moisture default to mid-density. Terrains not listed fall back to forest, then the first row, then 3–5.'));
    const list = el('div', 'cluster-terrains');
    for (const [terrain, pair] of Object.entries(d.cluster.countsByTerrain ?? {})) {
      list.append(countsRow(d, terrain, pair, ctx));
    }
    container.append(list);
    const addBtn = el('button', null, '+ Add terrain');
    addBtn.type = 'button';
    addBtn.disabled = Object.keys(d.cluster.countsByTerrain ?? {}).length >= Object.keys(TERRAIN).length;
    addBtn.addEventListener('click', () => ctx.mutate(() => {
      d.cluster.countsByTerrain ??= {};
      const free = Object.keys(TERRAIN).find((t) => !(t in d.cluster.countsByTerrain));
      if (free) d.cluster.countsByTerrain[free] = [3, 5];
    }));
    container.append(addBtn);
  } else {
    container.append(row('Min', intInput(d.cluster.min, { min: 1, onChange: (v) => ctx.mutate(() => { d.cluster.min = v; }) })));
    container.append(row('Max', intInput(d.cluster.max, { min: 1, onChange: (v) => ctx.mutate(() => { d.cluster.max = Math.max(v, d.cluster.min); }) })));
  }
}

/** Size: per-instance scale range (min/max). */
export function renderSizeSection(container, d, ctx) {
  container.append(row('Min', numberInput(d.size.min, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.size.min = v; }) })));
  container.append(row('Max', numberInput(d.size.max, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.size.max = Math.max(v, d.size.min); }) })));
}

/**
 * Variation: the object-level per-instance color jitter (partColor.js — every
 * tile instance scales its parts' brightness by a hash-derived ±colorJitter).
 * 0 disables; the forest/desert decors use 0.05–0.08.
 */
export function renderVariationSection(container, d, ctx) {
  container.append(row('Color jitter', numberInput(d.variation.colorJitter ?? 0, { min: 0, step: 0.01, onChange: (v) => ctx.mutate(() => { d.variation.colorJitter = v; }) })));
  container.append(el('div', 'hint', 'Per-tile brightness spread on every part — 0 = every instance identical (default), 0.05–0.08 typical.'));
}

/** Placement: mode picker plus the per-mode offset/separation/tilt fields. */
export function renderPlacementSection(container, d, ctx) {
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
    container.append(row('Separation', numberInput(d.placement.separation ?? 0, { min: 0, step: 0.05, onChange: (v) => ctx.mutate(() => {
      if (v > 0) d.placement.separation = v;
      else delete d.placement.separation;
    }) })));
    container.append(el('div', 'hint', 'Min world-unit distance between cluster members; 0 = off.'));
  }
  if (d.placement.mode === 'ring') {
    container.append(row('Ring min', numberInput(d.placement.ringMin, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.placement.ringMin = v; }) })));
    container.append(row('Ring max', numberInput(d.placement.ringMax, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.placement.ringMax = v; }) })));
    container.append(row('Lean min', numberInput(d.placement.leanMin, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.leanMin = v; }) })));
    container.append(row('Lean max', numberInput(d.placement.leanMax, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.leanMax = v; }) })));
  }
  if (d.placement.mode === 'jitter') {
    container.append(row('Offset', numberInput(d.placement.offset, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.offset = v; }) })));
    container.append(row('Separation', numberInput(d.placement.separation ?? 0, { min: 0, step: 0.05, onChange: (v) => ctx.mutate(() => {
      if (v > 0) d.placement.separation = v;
      else delete d.placement.separation;
    }) })));
    container.append(el('div', 'hint', 'Min world-unit distance between cluster members; 0 = off.'));
    container.append(row('Tilt min', numberInput(d.placement.tiltMin, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.tiltMin = v; }) })));
    container.append(row('Tilt max', numberInput(d.placement.tiltMax, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.tiltMax = v; }) })));
    container.append(row('Tilt seed', intInput(d.placement.tiltSeed, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.tiltSeed = v; }) })));
  }
}

/** Emphasis: the draw emphasis behavior picker. */
export function renderEmphasisSection(container, d, ctx) {
  container.append(row('Behavior', selectInput(EMPHASIS_BEHAVIORS, d.emphasis.behavior, (v) => ctx.mutate(() => {
    d.emphasis.behavior = v;
  }))));
}
