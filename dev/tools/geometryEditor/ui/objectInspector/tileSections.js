/**
 * tileSections.js — Cluster / size / placement / emphasis field sets for
 * tile-driven objects (the fields that don't apply to item icons and entity
 * singletons). Each renderer appends its rows into the section `container`
 * it is handed; `d` is the descriptor, `ctx` supplies `mutate()`.
 */
import { el, row, selectInput, numberInput, intInput } from '../formControls.js';
import { EMPHASIS_BEHAVIORS, PLACEMENT_MODES } from '../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';

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
    const counts = Object.entries(d.cluster.countsByTerrain)
      .map(([t, pair]) => `${t} ${pair[0]}–${pair[1]}`)
      .join(', ');
    container.append(el('div', 'hint', `Moisture-driven count (tiles without moisture default to mid-density). ${counts}.`));
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
