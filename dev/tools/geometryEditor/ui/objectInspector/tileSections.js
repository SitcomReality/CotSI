/**
 * tileSections.js — Cluster / size / placement / emphasis field sets for
 * tile-driven objects (the fields that don't apply to item icons and entity
 * singletons). Each renderer builds its collapsible section (via `section`)
 * and appends its rows; `d` is the descriptor, `ctx` supplies `mutate()`.
 */
import { el, row, selectInput, numberInput, intInput, tupleRow } from '../formControls/index.js';
import { EMPHASIS_BEHAVIORS, PLACEMENT_MODES } from '../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { TERRAIN } from '../../../../../src/game/rules/terrainTypes.js';
import { section } from './sectionShell.js';

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
  const sec = section('cluster', container, () => {
    if (d.cluster.rule !== 'uniform') {
      const n = Object.keys(d.cluster.countsByTerrain ?? {}).length;
      return `moisture (${n}${n === 1 ? ' terrain' : ' terrains'})`;
    }
    if (d.cluster.min === 1 && d.cluster.max === 1) return 'default';
    return `${d.cluster.min}–${d.cluster.max}`;
  });
  sec.append(row('Rule', selectInput(['uniform', 'moisture'], d.cluster.rule, (v) => ctx.mutate(() => {
    d.cluster.rule = v;
    if (v === 'moisture') {
      d.cluster.countsByTerrain ??= { forest: [3, 5], deepWood: [4, 7] };
      d.cluster.densityRange ??= [0.55, 0.85];
      d.cluster.jitter ??= 1;
    }
  })), 'Moisture: count scales with the tile\'s moisture between the terrain\'s min–max; unlisted terrains fall back to forest, then the first row, then 3–5'));
  if (d.cluster.rule === 'moisture') {
    const list = el('div', 'cluster-terrains');
    for (const [terrain, pair] of Object.entries(d.cluster.countsByTerrain ?? {})) {
      list.append(countsRow(d, terrain, pair, ctx));
    }
    sec.append(list);
    const addBtn = el('button', null, '+ Add terrain');
    addBtn.type = 'button';
    addBtn.disabled = Object.keys(d.cluster.countsByTerrain ?? {}).length >= Object.keys(TERRAIN).length;
    addBtn.addEventListener('click', () => ctx.mutate(() => {
      d.cluster.countsByTerrain ??= {};
      const free = Object.keys(TERRAIN).find((t) => !(t in d.cluster.countsByTerrain));
      if (free) d.cluster.countsByTerrain[free] = [3, 5];
    }));
    sec.append(addBtn);
    sec.append(tupleRow('Density', [
      { input: numberInput(d.cluster.densityRange?.[0] ?? 0.55, { min: 0, max: 1, step: 0.05, onChange: (v) => ctx.mutate(() => {
        d.cluster.densityRange ??= [0.55, 0.85];
        d.cluster.densityRange[0] = Math.min(v, d.cluster.densityRange[1]);
      }) }), micro: 'min' },
      { input: numberInput(d.cluster.densityRange?.[1] ?? 0.85, { min: 0, max: 1, step: 0.05, onChange: (v) => ctx.mutate(() => {
        d.cluster.densityRange ??= [0.55, 0.85];
        d.cluster.densityRange[1] = Math.max(v, d.cluster.densityRange[0]);
      }) }), micro: 'max' },
    ], 'Moisture→count curve tightness (0–1) — how far tiles drift from mid-density'));
    sec.append(row('Jitter', intInput(d.cluster.jitter ?? 1, { min: 0, onChange: (v) => ctx.mutate(() => { d.cluster.jitter = v; }) }), 'Positional jitter strength — 0 = exact grid'));
  } else {
    sec.append(tupleRow('Count', [
      { input: intInput(d.cluster.min, { min: 1, onChange: (v) => ctx.mutate(() => { d.cluster.min = v; }) }), micro: 'min' },
      { input: intInput(d.cluster.max, { min: 1, onChange: (v) => ctx.mutate(() => { d.cluster.max = Math.max(v, d.cluster.min); }) }), micro: 'max' },
    ], 'Instances per tile (uniform)'));
  }
}

/** Size: instance scale, per-instance spawn size range, and — mountain decors
 *  only — the per-bucket height ranges keyed by the tile's mountainType. */
export function renderSizeSection(container, d, ctx) {
  const sec = section('size', container, () => {
    const parts = [];
    if (d.scale !== 1 && d.scale !== undefined) parts.push(`inst ${d.scale}`);
    if (!(d.size.min === 1 && d.size.max === 1)) parts.push(`${d.size.min}–${d.size.max}`);
    for (const [bucket, pair] of Object.entries(d.size.byMountainType ?? {})) {
      parts.push(`${bucket} ${pair.min}–${pair.max}`);
    }
    return parts.length === 0 ? 'default' : parts.join(' · ');
  });
  sec.append(row('Instance scale', numberInput(d.scale ?? 1, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.scale = v; }) }), 'Multiplies every part of this object'));
  sec.append(tupleRow('Spawn size', [
    { input: numberInput(d.size.min, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.size.min = v; }) }), micro: 'min' },
    { input: numberInput(d.size.max, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.size.max = Math.max(v, d.size.min); }) }), micro: 'max' },
  ], 'Per-instance scale range (world units)'));

  // By-mountain buckets — sparse overrides (Phase 1 pattern): only authored
  // buckets get a row; `+ bucket` adds one at 1–1. Only the mountain decor
  // consumes these (partScale.js reads size.byMountainType).
  if (d.id === 'mountain' || d.size.byMountainType !== undefined) {
    const BUCKETS = ['peak', 'slope', 'normal'];
    const byType = d.size.byMountainType ?? {};
    const clearBucket = (bucket) => ctx.mutate(() => {
      if (!d.size.byMountainType) return;
      delete d.size.byMountainType[bucket];
      if (Object.keys(d.size.byMountainType).length === 0) delete d.size.byMountainType;
    });
    for (const bucket of Object.keys(byType)) {
      const pair = byType[bucket];
      const bucketRow = el('div', 'bucket-row');
      bucketRow.append(tupleRow(bucket, [
        { input: numberInput(pair.min, { min: 0.01, onChange: (v) => ctx.mutate(() => { pair.min = v; }) }), micro: 'min' },
        { input: numberInput(pair.max, { min: 0.01, onChange: (v) => ctx.mutate(() => { pair.max = Math.max(v, pair.min); }) }), micro: 'max' },
      ], `${bucket} scaleY range on ${bucket}-tagged tiles`));
      const clear = el('button', null, '×');
      clear.type = 'button';
      clear.title = `Clear the ${bucket} bucket`;
      clear.addEventListener('click', () => clearBucket(bucket));
      bucketRow.append(clear);
      sec.append(bucketRow);
    }
    const remaining = BUCKETS.filter((b) => !(b in byType));
    if (remaining.length > 0) {
      const addRow = el('div', 'override-add-row');
      addRow.append(el('span', null, '+ bucket'));
      const select = selectInput(remaining.map((b) => ({ value: b, label: b })), '', (v) => {
        if (!v) return;
        ctx.mutate(() => {
          d.size.byMountainType ??= {};
          d.size.byMountainType[v] = { min: 1, max: 1 };
        });
      });
      select.title = 'Add a height range for tiles tagged with this mountain type';
      addRow.append(select);
      sec.append(addRow);
    }
  }
}

/**
 * Variation: the object-level per-instance color jitter (partColor.js — every
 * tile instance scales its parts' brightness by a hash-derived ±colorJitter)
 * plus the object-level stretch ranges (partScale.js — per-axis min–max drawn
 * per instance; parts may pin/override via their own stretch section).
 */
export function renderVariationSection(container, d, ctx) {
  const sec = section('variation', container, () => {
    const parts = [];
    const j = d.variation.colorJitter ?? 0;
    if (j !== 0) parts.push(`jitter ${j}`);
    for (const axis of ['X', 'Y', 'Z']) {
      const pair = d.variation[`stretch${axis}`];
      if (pair && !(pair[0] === 1 && pair[1] === 1)) parts.push(`${axis} ${pair[0]}–${pair[1]}`);
    }
    return parts.length === 0 ? 'default' : parts.join(' · ');
  });
  sec.append(row('Color jitter', numberInput(d.variation.colorJitter ?? 0, { min: 0, step: 0.01, onChange: (v) => ctx.mutate(() => { d.variation.colorJitter = v; }) }), 'Per-tile brightness spread on every part — 0 = identical instances, 0.05–0.08 typical'));
  // Object-level stretch is always a range (no modes). Writing [1,1] deletes
  // the key — denormalize treats the default pair as absent.
  for (const axis of ['x', 'y', 'z']) {
    const key = `stretch${axis}`;
    const write = (slot, v) => ctx.mutate(() => {
      const pair = d.variation[key] ?? [1, 1];
      pair[slot] = v;
      if (pair[0] === 1 && pair[1] === 1) delete d.variation[key];
      else d.variation[key] = pair;
    });
    const pair = d.variation[key] ?? [1, 1];
    sec.append(tupleRow(`stretch ${axis}`, [
      { input: numberInput(pair[0], { min: 0.01, step: 0.05, onChange: (v) => write(0, v) }), micro: 'min' },
      { input: numberInput(pair[1], { min: 0.01, step: 0.05, onChange: (v) => write(1, v) }), micro: 'max' },
    ], 'Per-instance scale range on this axis — 1–1 = off'));
  }
}

/** Placement: mode picker plus the per-mode offset/separation/tilt fields. */
export function renderPlacementSection(container, d, ctx) {
  const sec = section('placement', container, () => {
    return d.placement.mode === 'center' ? 'default' : d.placement.mode;
  });
  sec.append(row('Mode', selectInput(PLACEMENT_MODES, d.placement.mode, (v) => ctx.mutate(() => {
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
    sec.append(row('Offset min', numberInput(d.placement.offsetMin, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.offsetMin = v; }) })));
    sec.append(row('Offset max', numberInput(d.placement.offsetMax, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.offsetMax = v; }) })));
    sec.append(row('Separation', numberInput(d.placement.separation ?? 0, { min: 0, step: 0.05, onChange: (v) => ctx.mutate(() => {
      if (v > 0) d.placement.separation = v;
      else delete d.placement.separation;
    }) }), 'Min world-unit distance between cluster members; 0 = off'));
  }
  if (d.placement.mode === 'ring') {
    sec.append(row('Ring min', numberInput(d.placement.ringMin, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.placement.ringMin = v; }) })));
    sec.append(row('Ring max', numberInput(d.placement.ringMax, { min: 0.01, onChange: (v) => ctx.mutate(() => { d.placement.ringMax = v; }) })));
    sec.append(row('Lean min', numberInput(d.placement.leanMin, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.leanMin = v; }) })));
    sec.append(row('Lean max', numberInput(d.placement.leanMax, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.leanMax = v; }) })));
  }
  if (d.placement.mode === 'jitter') {
    sec.append(row('Offset', numberInput(d.placement.offset, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.offset = v; }) })));
    sec.append(row('Separation', numberInput(d.placement.separation ?? 0, { min: 0, step: 0.05, onChange: (v) => ctx.mutate(() => {
      if (v > 0) d.placement.separation = v;
      else delete d.placement.separation;
    }) }), 'Min world-unit distance between cluster members; 0 = off'));
    sec.append(row('Tilt min', numberInput(d.placement.tiltMin, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.tiltMin = v; }) })));
    sec.append(row('Tilt max', numberInput(d.placement.tiltMax, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.tiltMax = v; }) })));
    sec.append(row('Tilt seed', intInput(d.placement.tiltSeed, { min: 0, onChange: (v) => ctx.mutate(() => { d.placement.tiltSeed = v; }) })));
  }
}

/** Emphasis: the draw emphasis behavior picker. */
export function renderEmphasisSection(container, d, ctx) {
  const sec = section('emphasis', container, () => {
    return d.emphasis.behavior === 'none' ? 'default' : d.emphasis.behavior;
  });
  sec.append(row('Behavior', selectInput(EMPHASIS_BEHAVIORS, d.emphasis.behavior, (v) => ctx.mutate(() => {
    d.emphasis.behavior = v;
  }))));
}