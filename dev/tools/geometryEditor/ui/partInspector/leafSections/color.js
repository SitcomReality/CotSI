/**
 * color.js — The merged "Color & tint" section (leaves only). One compact
 * stack: the part's base color (entity kinds pick faction tokens + custom
 * swatch; tile-driven parts a plain picker that edits the `states.empty`
 * keyframe in the empty growth state), then the biome-tint block — source
 * swatch select + influence slider (muted at — none).
 */
import { S } from '../../../state.js';
import { el, row, numberInput, selectInput, colorInput } from '../../formControls/index.js';
import { ENTITY_KINDS } from '../../../entityView.js';
import { section } from '../sectionShell.js';
import { editingEmptyState, emptyKeyframe } from '../stateKeyframes.js';

const SOURCE_TITLE = 'Swatch matching the material the part depicts: foliage leaves/grass, wood trunks/logs, soil dirt/sand, stone rocks, bloom flowers/fruits, exotic crystals/glows. Literal-color parts only; Untouched & Painforest tiles skip swatch tints (terrain still matches the ground)';

/** Color & tint — leaves only (groups are pure containers, no visuals). */
export function renderColorSection(container, part, ctx) {
  const d = S.descriptor;
  const empty = editingEmptyState();
  const sec = section('color', container, () => {
    const isToken = typeof part.color === 'string' && ['factionBase', 'factionAccent', 'factionBody'].includes(part.color);
    const value = empty ? (part.states?.empty?.color ?? part.color ?? 0xffffff) : (part.color ?? 0xffffff);
    const parts = [];
    if (isToken) parts.push(part.color);
    else if (value !== 0xffffff) parts.push(`■ #${value.toString(16).padStart(6, '0')}`);
    if (part.biomeColor?.source) {
      parts.push(`${part.biomeColor.source} ${Math.round((part.biomeColor.influence ?? 0.5) * 100)}%`);
    }
    return parts.length === 0 ? 'default' : parts.join(' · ');
  });
  if (empty) {
    sec.append(el('div', 'hint', 'Editing the EMPTY keyframe — this color lerps to the full-state color as the feature regrows.'));
  }

  // Base color.
  if (ENTITY_KINDS.has(d.kind)) {
    const TOKENS = ['factionBase', 'factionAccent', 'factionBody'];
    const isToken = typeof part.color === 'string' && TOKENS.includes(part.color);
    const current = isToken ? part.color : 'custom';
    sec.append(row('Color', selectInput([...TOKENS, 'custom'], current, (v) => ctx.mutate(() => {
      if (v === 'custom') part.color = typeof part.color === 'number' ? part.color : 0xffffff;
      else part.color = v;
    }))));
    if (!isToken) {
      sec.append(row('Custom color', colorInput(typeof part.color === 'number' ? part.color : 0xffffff, (v) => ctx.mutate(() => { part.color = v; }))));
    }
  } else {
    const value = empty ? (part.states?.empty?.color ?? part.color ?? 0xffffff) : (part.color ?? 0xffffff);
    sec.append(row('Color', colorInput(value, (v) => ctx.mutate(() => {
      if (empty) emptyKeyframe(part).color = v;
      else part.color = v;
    }))));
  }

  // Biome tint: source + influence. Source '' = skipped — the influence row
  // renders muted (disabled) rather than hiding, so the slider's home is stable.
  const biome = part.biomeColor;
  sec.append(row('Tint source', selectInput(
    [
      { value: '', label: '— none' },
      { value: 'foliage', label: 'foliage' },
      { value: 'wood', label: 'wood' },
      { value: 'soil', label: 'soil' },
      { value: 'stone', label: 'stone' },
      { value: 'bloom', label: 'bloom' },
      { value: 'exotic', label: 'exotic' },
      { value: 'terrain', label: 'terrain' },
    ],
    biome?.source ?? '',
    (v) => ctx.mutate(() => {
      if (!v) {
        if (part.biomeColor) delete part.biomeColor;
      } else {
        part.biomeColor = { source: v, influence: part.biomeColor?.influence ?? 0.5 };
      }
    }),
  ), SOURCE_TITLE));
  const setInfluence = (v) => ctx.mutate(() => {
    if (!part.biomeColor) return;
    part.biomeColor.influence = Math.max(0, Math.min(1, v));
  });
  const influenceRow = el('div', 'control-row range-row');
  const influenceLabel = el('label', null, 'Influence');
  influenceLabel.title = '0–1 — how strongly the tile\'s blended biome color pulls; Untouched & Painforest skip swatch tints';
  const range = el('input');
  range.type = 'range';
  range.min = '0';
  range.max = '1';
  range.step = '0.05';
  range.value = String(biome?.influence ?? 0.5);
  range.disabled = !biome?.source;
  range.addEventListener('input', () => {
    number.value = range.value;
    setInfluence(Number(range.value));
  });
  const number = numberInput(biome?.influence ?? 0.5, { min: 0, step: 0.1, onChange: (v) => {
    range.value = String(v);
    setInfluence(v);
  } });
  number.disabled = !biome?.source;
  influenceRow.append(influenceLabel, range, number);
  sec.append(influenceRow);
}
