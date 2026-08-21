/**
 * materialSection.js — Material section (tile-driven kinds, Look group): the
 * object-level `material.emissive` glow + intensity (knots, cinderblooms,
 * fool's fires). Intensity stays muted until an emissive color is set; the
 * × clears the glow (and the map when empty).
 */
import { el, row, numberInput, colorInput } from '../formControls/index.js';
import { section, fmt } from './sectionShell.js';

/** Delete `material.emissive` (+ intensity, + the map when empty). */
function clearEmissive(d) {
  if (!d.material) return;
  delete d.material.emissive;
  delete d.material.emissiveIntensity;
  if (Object.keys(d.material).length === 0) delete d.material;
}

/** Material: emissive color + intensity — tile-driven kinds only. */
export function renderMaterialSection(container, d, ctx) {
  const sec = section('material', container, () => {
    const e = d.material?.emissive;
    if (e === undefined) return 'default';
    const i = d.material?.emissiveIntensity;
    return `■ #${e.toString(16).padStart(6, '0')}${i !== undefined ? ` · ${fmt(i)}` : ''}`;
  });

  const emissiveRow = el('div', 'control-row');
  emissiveRow.append(el('label', null, 'Emissive'));
  emissiveRow.append(colorInput(d.material?.emissive ?? 0x000000, (v) => ctx.mutate(() => {
    d.material ??= {};
    d.material.emissive = v;
  })));
  if (d.material?.emissive !== undefined) {
    const clear = el('button', null, '×');
    clear.type = 'button';
    clear.title = 'Clear the emissive glow';
    clear.addEventListener('click', () => ctx.mutate(() => clearEmissive(d)));
    emissiveRow.append(clear);
  }
  sec.append(emissiveRow);

  // Intensity: muted until the glow exists (same pattern as tint Influence).
  const hasEmissive = d.material?.emissive !== undefined;
  const intensityRow = el('div', 'control-row range-row');
  const label = el('label', null, 'Intensity');
  label.title = 'Glow strength — 0 = recolored only, 0.1–0.8 typical';
  const range = el('input');
  range.type = 'range';
  range.min = '0';
  range.max = '2';
  range.step = '0.05';
  range.value = String(d.material?.emissiveIntensity ?? 1);
  range.disabled = !hasEmissive;
  range.addEventListener('input', () => {
    number.value = range.value;
    ctx.mutate(() => { if (d.material) d.material.emissiveIntensity = Number(range.value); });
  });
  const number = numberInput(d.material?.emissiveIntensity ?? 1, { min: 0, step: 0.1, onChange: (v) => {
    range.value = String(v);
    ctx.mutate(() => { if (d.material) d.material.emissiveIntensity = v; });
  } });
  number.disabled = !hasEmissive;
  intensityRow.append(label, range, number);
  sec.append(intensityRow);
}
