/**
 * chanceSection.js — Spawn-chance row of the part inspector: an optional
 * 0–1 probability rolled independently per placed item. Available on every
 * node kind (shape leaf, group, alternatives choice point). Empty input =
 * absent from the node (always present) — the key is REMOVED on clear so
 * denormalize/emit stays minimal.
 */
import { el, row, stepperWrap } from '../formControls/index.js';
import { section } from './sectionShell.js';

/** Inspector section: spawn chance (any node kind). */
export function renderChanceSection(container, node, ctx) {
  const sec = section('chance', container, () => {
    if (node.chance === undefined) return 'default';
    return `${Math.round(node.chance * 100)}%`;
  });
  const input = el('input');
  input.type = 'number';
  input.min = '0';
  input.max = '1';
  input.step = '0.05';
  input.placeholder = 'always';
  if (node.chance !== undefined) input.value = String(node.chance);
  const commit = () => {
    const v = parseFloat(input.value);
    ctx.mutate(() => {
      if (!Number.isFinite(v)) delete node.chance;
      else node.chance = Math.min(1, Math.max(0, v));
    });
  };
  input.addEventListener('change', commit);
  sec.append(row('Spawn chance', stepperWrap(input, commit),
    'Per-item present/absent roll (0–1). Empty = always present — clearing the field removes the key'));
}
