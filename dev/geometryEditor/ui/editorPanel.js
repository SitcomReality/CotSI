/**
 * editorPanel.js — Editing controls for the geometry editor page.
 *
 * Renders a contextual inspector into `#inspector`: object-level fields
 * (cluster min/max, size min/max, emphasis behavior, placement mode + per-mode
 * params, material color, or the entity faction/archetype pickers) when no
 * part is selected, and the selected part's shape params + transform when one
 * is. The parts list (add / remove / reorder / select) lives in `#parts-edit`.
 * Every change mutates S.descriptor (normalized) in place, then calls onEdit()
 * so the preview rebuilds, and re-renders the panel.
 *
 * Shape params come straight from the SHAPE_TYPES registry, so the editor
 * always offers exactly the fields the generic builder understands.
 */
import { S } from '../state.js';
import {
  SHAPE_TYPES,
  EMPHASIS_BEHAVIORS,
  PLACEMENT_MODES,
  PART_TRANSFORM_DEFAULTS,
  validateDescriptor,
  normalizeDescriptor,
} from '../../../src/render/hexmap3d/features/descriptors/schema.js';
import { ENTITY_KINDS } from '../entityView.js';
import { FACTIONS } from '../../../src/game/rules/factionData.js';
import { listArchetypes, getArchetype } from '../../../src/game/rules/archetypes.js';

let els = null;
let onEdit = () => {};
let onLoaded = () => {};
let partCounter = 1;

// ── Tiny DOM helpers ────────────────────────────────────────────────────────

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function row(labelText, control) {
  const r = el('div', 'control-row');
  r.append(el('label', null, labelText), control);
  return r;
}

/** Small uppercase sub-heading used to group dynamic field sets. */
function subheading(labelText) {
  return el('div', 'section-title', labelText);
}

function numberInput(value, { min, step = 0.01, onChange }) {
  const input = el('input');
  input.type = 'number';
  input.value = String(value);
  input.step = String(step);
  if (min !== undefined) input.min = String(min);
  input.addEventListener('change', () => {
    const v = parseFloat(input.value);
    if (Number.isFinite(v)) onChange(v);
  });
  return input;
}

function intInput(value, { min, onChange }) {
  const input = el('input');
  input.type = 'number';
  input.value = String(value);
  input.step = '1';
  if (min !== undefined) input.min = String(min);
  input.addEventListener('change', () => {
    const v = parseInt(input.value, 10);
    if (Number.isInteger(v)) onChange(v);
  });
  return input;
}

/**
 * Dropdown. Options are plain strings (label = value) or { value, label }
 * pairs (e.g. biome ids with friendly labels).
 */
function selectInput(options, value, onChange) {
  const select = el('select');
  for (const opt of options) {
    const o = el('option', null, typeof opt === 'string' ? opt : opt.label);
    o.value = typeof opt === 'string' ? opt : opt.value;
    select.appendChild(o);
  }
  select.value = value;
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

/** Biome options for the preview-tile selector: none + every registered biome. */
function biomeSelectOptions() {
  return [
    { value: '', label: '— none (default colors)' },
    ...listArchetypes('biome').map((id) => ({ value: id, label: getArchetype(id)?.name ?? id })),
  ];
}

function colorInput(value, onChange) {
  const input = el('input');
  input.type = 'color';
  input.value = '#' + value.toString(16).padStart(6, '0');
  input.addEventListener('change', () => {
    const v = parseInt(input.value.slice(1), 16);
    if (Number.isInteger(v)) onChange(v);
  });
  return input;
}

function textInput(value, onChange) {
  const input = el('input');
  input.type = 'text';
  input.value = value;
  input.addEventListener('change', () => {
    const v = input.value.trim();
    if (v) onChange(v);
    else input.value = value; // empty names are invalid — restore
  });
  return input;
}

// ── Mutation flow ───────────────────────────────────────────────────────────

function mutate(fn) {
  fn();
  onEdit();
  renderAll();
}

// ── Object-level controls ───────────────────────────────────────────────────

/**
 * The variant the editor is currently inspecting. Entity kinds derive it from
 * the entity selection (faction/archetype); tile-driven objects use the
 * variant picker (S.variantId), falling back to the first variant.
 */
export function activeVariant() {
  const d = S.descriptor;
  const variants = d.variants ?? [];
  if (variants.length === 0) return null;
  if (ENTITY_KINDS.has(d.kind)) {
    const key = d.variantRule === 'faction' ? S.entity.faction : d.variantRule === 'archetype' ? S.entity.archetype : null;
    return variants.find((v) => v.id === key) ?? variants[0];
  }
  return variants.find((v) => v.id === S.variantId) ?? variants[0];
}

/**
 * The parts array the editor edits. Both the preview and the parts list use
 * the active variant's parts, so what you edit is what you see — this fixes
 * the grove/tree parts list showing only the fallback while the preview
 * renders the variant. Descriptors without variants fall back to `parts`.
 */
function activeParts() {
  const d = S.descriptor;
  return activeVariant()?.parts ?? d.parts;
}

/** Entity kinds: faction/archetype picker instead of cluster/size/placement. */
function renderEntityControls(container) {
  const d = S.descriptor;
  const rule = d.variantRule;
  const variants = d.variants ?? [];

  if (rule === 'archetype' && variants.length === 1 && variants[0].id === 'trader') {
    container.append(el('div', 'hint', 'Traders have a single fixed look — no variants to pick.'));
    return;
  }

  const factionOptions = FACTIONS.map((f) => f.short);
  container.append(row('Faction', selectInput(factionOptions, S.entity.faction, (v) => mutate(() => {
    S.entity.faction = v;
  }))));

  if (rule === 'archetype' && variants.length > 0) {
    const ids = variants.map((v) => v.id);
    const current = ids.includes(S.entity.archetype) ? S.entity.archetype : ids[0];
    container.append(row('Archetype', selectInput(ids, current, (v) => mutate(() => {
      S.entity.archetype = v;
    }))));
    container.append(el('div', 'hint', 'Archetype picks the shape variant; faction picks the palette colors.'));
  } else {
    container.append(el('div', 'hint', 'Faction picks the variant and the palette colors.'));
  }
}

function renderObjectControls(container) {
  const d = S.descriptor;

  // Name is editable for every object (samples included) — renames take effect
  // in the inspector header, the preview info, and the browser list right away.
  container.append(subheading('Object'));
  container.append(row('Name', textInput(d.displayName, (v) => mutate(() => {
    d.displayName = v;
    onLoaded(); // browser labels + custom pin re-render with the new name
  }))));

  if (ENTITY_KINDS.has(d.kind)) {
    container.append(el('div', 'mode-banner', `${d.kind} — entity-driven`));
    renderEntityControls(container);
    container.append(el('div', 'hint', 'Entities are singletons at the hex center — cluster/size/placement do not apply.'));
    container.append(subheading('Material'));
    container.append(row('Color', colorInput(d.material.color, (v) => mutate(() => { d.material.color = v; }))));
    return;
  }

  if ((d.variants ?? []).length > 0) {
    container.append(subheading('Variant'));
    const ids = d.variants.map((v) => v.id);
    const current = ids.includes(S.variantId) ? S.variantId : ids[0];
    container.append(row('Variant', selectInput(ids, current, (v) => mutate(() => { S.variantId = v; }))));
    container.append(el('div', 'hint', 'The parts list and preview edit this variant. In-game the tile hash picks one; here you choose which to inspect.'));
  }

  container.append(row('Biome', selectInput(biomeSelectOptions(), S.biomeId ?? '', (v) => mutate(() => { S.biomeId = v || null; }))));
  container.append(el('div', 'hint', 'Preview-tile biome: per-part biomeScale (stunted Tundra trees, small Painforest groves) and biome-color influence (Edenfall purple leaves).'));

  container.append(subheading('Cluster'));
  container.append(row('Rule', selectInput(['uniform', 'moisture'], d.cluster.rule, (v) => mutate(() => {
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
    container.append(row('Min', intInput(d.cluster.min, { min: 1, onChange: (v) => mutate(() => { d.cluster.min = v; }) })));
    container.append(row('Max', intInput(d.cluster.max, { min: 1, onChange: (v) => mutate(() => { d.cluster.max = Math.max(v, d.cluster.min); }) })));
  }

  container.append(subheading('Size'));
  container.append(row('Min', numberInput(d.size.min, { min: 0.01, onChange: (v) => mutate(() => { d.size.min = v; }) })));
  container.append(row('Max', numberInput(d.size.max, { min: 0.01, onChange: (v) => mutate(() => { d.size.max = Math.max(v, d.size.min); }) })));

  container.append(subheading('Placement'));
  container.append(row('Mode', selectInput(PLACEMENT_MODES, d.placement.mode, (v) => mutate(() => {
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
    container.append(row('Offset min', numberInput(d.placement.offsetMin, { min: 0, onChange: (v) => mutate(() => { d.placement.offsetMin = v; }) })));
    container.append(row('Offset max', numberInput(d.placement.offsetMax, { min: 0, onChange: (v) => mutate(() => { d.placement.offsetMax = v; }) })));
  }
  if (d.placement.mode === 'ring') {
    container.append(row('Ring min', numberInput(d.placement.ringMin, { min: 0.01, onChange: (v) => mutate(() => { d.placement.ringMin = v; }) })));
    container.append(row('Ring max', numberInput(d.placement.ringMax, { min: 0.01, onChange: (v) => mutate(() => { d.placement.ringMax = v; }) })));
    container.append(row('Lean min', numberInput(d.placement.leanMin, { min: 0, onChange: (v) => mutate(() => { d.placement.leanMin = v; }) })));
    container.append(row('Lean max', numberInput(d.placement.leanMax, { min: 0, onChange: (v) => mutate(() => { d.placement.leanMax = v; }) })));
  }
  if (d.placement.mode === 'jitter') {
    container.append(row('Offset', numberInput(d.placement.offset, { min: 0, onChange: (v) => mutate(() => { d.placement.offset = v; }) })));
    container.append(row('Tilt min', numberInput(d.placement.tiltMin, { min: 0, onChange: (v) => mutate(() => { d.placement.tiltMin = v; }) })));
    container.append(row('Tilt max', numberInput(d.placement.tiltMax, { min: 0, onChange: (v) => mutate(() => { d.placement.tiltMax = v; }) })));
    container.append(row('Tilt seed', intInput(d.placement.tiltSeed, { min: 0, onChange: (v) => mutate(() => { d.placement.tiltSeed = v; }) })));
  }

  container.append(subheading('Emphasis'));
  container.append(row('Behavior', selectInput(EMPHASIS_BEHAVIORS, d.emphasis.behavior, (v) => mutate(() => {
    d.emphasis.behavior = v;
  }))));

  container.append(subheading('Material'));
  container.append(row('Color', colorInput(d.material.color, (v) => mutate(() => { d.material.color = v; }))));
}

// ── Part list (add / remove / reorder / select) ─────────────────────────────

function renderPartsList(container) {
  container.textContent = '';
  const d = S.descriptor;
  const parts = activeParts();

  const addRow = el('div', 'control-row');
  const shapeSelect = selectInput(Object.keys(SHAPE_TYPES), Object.keys(SHAPE_TYPES)[0], () => {});
  const addBtn = el('button', null, '+ Add part');
  addBtn.addEventListener('click', () => {
    const shape = shapeSelect.value;
    mutate(() => {
      // Must carry a full transform — recordForPart reads part.transform and
      // normalizePart (schema.js) is what guarantees it for loaded JSON.
      parts.push({
        id: `part-${partCounter++}`,
        shape,
        params: { ...SHAPE_TYPES[shape].defaults },
        transform: { ...PART_TRANSFORM_DEFAULTS },
      });
    });
  });
  addRow.append(shapeSelect, addBtn);
  container.append(addRow);

  parts.forEach((part, i) => {
    const r = el('div', 'part-row' + (part.id === S.selectedPartId ? ' selected' : ''));
    const label = el('span', 'part-label', `${part.id} · ${part.shape}`);
    label.addEventListener('click', () => {
      S.selectedPartId = part.id;
      renderAll();
    });

    const up = el('button', null, '↑');
    const down = el('button', null, '↓');
    const remove = el('button', null, '✕');
    up.disabled = i === 0;
    down.disabled = i === parts.length - 1;
    remove.disabled = parts.length === 1;
    up.addEventListener('click', () => mutate(() => {
      [parts[i - 1], parts[i]] = [parts[i], parts[i - 1]];
    }));
    down.addEventListener('click', () => mutate(() => {
      [parts[i + 1], parts[i]] = [parts[i], parts[i + 1]];
    }));
    remove.addEventListener('click', () => mutate(() => {
      parts.splice(i, 1);
      if (S.selectedPartId === part.id) S.selectedPartId = null;
    }));

    r.append(label, up, down, remove);
    container.append(r);
  });
}

// ── Inspector (object-level OR selected-part fields) ────────────────────────

/** Inspector header for object-level editing: name + id/kind meta. */
function renderObjectHeader(container) {
  const d = S.descriptor;
  const head = el('div', 'inspector-head');
  head.append(el('div', 'inspector-title', d.displayName));
  head.append(el('div', 'inspector-meta', `${d.id} · ${d.kind}`));
  container.append(head);
}

/** Inspector header for part editing: breadcrumb back to the object. */
function renderPartHeader(container, part) {
  const d = S.descriptor;
  const head = el('div', 'inspector-head');
  const back = el('button', 'breadcrumb', `← ${d.displayName}`);
  back.type = 'button';
  back.title = 'Back to object-level controls';
  back.addEventListener('click', () => {
    S.selectedPartId = null;
    renderAll();
  });
  head.append(back);
  head.append(el('div', 'inspector-title', `${part.id} · ${part.shape}`));
  container.append(head);
}

function renderPartInspector(container, part) {
  const d = S.descriptor;
  renderPartHeader(container, part);
  const shape = SHAPE_TYPES[part.shape];

  for (const [key, rule] of Object.entries(shape.params)) {
    const current = part.params[key] ?? shape.defaults[key];
    if (rule.type === 'enum') {
      container.append(row(key, selectInput(rule.values, current, (v) => mutate(() => { part.params[key] = v; }))));
    } else if (rule.type === 'int') {
      container.append(row(key, intInput(current, { min: rule.min, onChange: (v) => mutate(() => { part.params[key] = v; }) })));
    } else {
      container.append(row(key, numberInput(current, { min: rule.min, onChange: (v) => mutate(() => { part.params[key] = v; }) })));
    }
  }

  container.append(subheading('Transform'));
  container.append(el('div', 'hint', 'Y / Lift are bottom heights — 0 = sitting on the ground. The part\'s lowest vertex lands at Y + Lift (+ localPos.y).'));
  const t = part.transform;
  container.append(row('Y (bottom height)', numberInput(t.y, { onChange: (v) => mutate(() => { t.y = v; }) })));
  container.append(row('Lift (bottom height)', numberInput(t.lift, { onChange: (v) => mutate(() => { t.lift = v; }) })));
  container.append(row('rotY (rad)', numberInput(t.rotY, { onChange: (v) => mutate(() => { t.rotY = v; }) })));

  container.append(subheading('Scale'));
  container.append(el('div', 'hint', 'Independent per-axis scale — stretch or squash the part on any axis (base 1).'));
  container.append(row('scaleX', numberInput(t.scaleX, { min: 0.01, onChange: (v) => mutate(() => { t.scaleX = v; }) })));
  container.append(row('scaleY', numberInput(t.scaleY, { min: 0.01, onChange: (v) => mutate(() => { t.scaleY = v; }) })));
  container.append(row('scaleZ', numberInput(t.scaleZ, { min: 0.01, onChange: (v) => mutate(() => { t.scaleZ = v; }) })));

  container.append(subheading('Rotation'));
  container.append(el('div', 'hint', 'localAxis + localAngle rotate the part around any axis in its own frame; tilt leans it in world space. Angles in radians.'));
  const localAxis = t.localAxis ?? { x: 0, y: 1, z: 0 };
  container.append(row('localAxis X', numberInput(localAxis.x, { onChange: (v) => mutate(() => { t.localAxis = { ...(t.localAxis ?? { y: 1 }), x: v }; }) })));
  container.append(row('localAxis Y', numberInput(localAxis.y, { onChange: (v) => mutate(() => { t.localAxis = { ...(t.localAxis ?? {}), y: v }; }) })));
  container.append(row('localAxis Z', numberInput(localAxis.z, { onChange: (v) => mutate(() => { t.localAxis = { ...(t.localAxis ?? {}), z: v }; }) })));
  container.append(row('localAngle (rad)', numberInput(t.localAngle ?? 0, { onChange: (v) => mutate(() => { t.localAngle = v; t.localAxis ??= { x: 0, y: 1, z: 0 }; }) })));
  const tiltAxis = t.tiltAxis ?? { x: 0, z: 1 };
  container.append(row('tiltAxis X', numberInput(tiltAxis.x, { onChange: (v) => mutate(() => { t.tiltAxis = { ...(t.tiltAxis ?? { z: 1 }), x: v }; }) })));
  container.append(row('tiltAxis Z', numberInput(tiltAxis.z, { onChange: (v) => mutate(() => { t.tiltAxis = { ...(t.tiltAxis ?? {}), z: v }; }) })));
  container.append(row('tilt (rad)', numberInput(t.tilt ?? 0, { onChange: (v) => mutate(() => { t.tilt = v; t.tiltAxis ??= { x: 0, z: 1 }; }) })));

  container.append(subheading('Stretch variation'));
  container.append(el('div', 'hint', 'Per-axis variation ranges for this part; "follow object" uses the object-level ranges, "fixed" pins the axis at 1.'));
  if (ENTITY_KINDS.has(d.kind)) {
    container.append(el('div', 'hint', 'Entity parts ignore stretch variation — entities have no per-tile hash draws.'));
  }
  const STRETCH_SEED_DEFAULTS = { x: 5, y: 4, z: 5 };
  for (const axis of ['x', 'y', 'z']) {
    const current = part.stretch?.[axis];
    const mode = current === false ? 'fixed' : current ? 'custom' : 'follow';
    const modeSelect = selectInput(['follow', 'fixed', 'custom'], mode, (m) => mutate(() => {
      if (m === 'fixed') part.stretch = { ...part.stretch, [axis]: false };
      else if (m === 'custom') part.stretch = { ...part.stretch, [axis]: { min: 0.9, max: 1.1, seed: STRETCH_SEED_DEFAULTS[axis] } };
      else {
        part.stretch = { ...part.stretch };
        delete part.stretch[axis];
        if (Object.keys(part.stretch).length === 0) delete part.stretch;
      }
    }));
    // Two-line layout: mode on the first line, the min/max/seed inputs below —
    // the row no longer overflows the 310px inspector column.
    const stretchRow = el('div', 'stretch-row');
    const modeLine = el('div', 'control-row');
    modeLine.append(el('label', null, `stretch ${axis}`), modeSelect);
    stretchRow.append(modeLine);
    if (current && current !== false) {
      const inputsLine = el('div', 'stretch-inputs');
      inputsLine.append(
        numberInput(current.min, { min: 0.01, onChange: (v) => mutate(() => { current.min = v; }) }),
        numberInput(current.max, { min: 0.01, onChange: (v) => mutate(() => { current.max = v; }) }),
        intInput(current.seed ?? STRETCH_SEED_DEFAULTS[axis], { min: 0, onChange: (v) => mutate(() => { current.seed = v; }) }),
      );
      stretchRow.append(inputsLine);
    }
    container.append(stretchRow);
  }
}

/**
 * Render the contextual inspector: the selected part's fields when one is
 * selected, otherwise the object-level design controls.
 */
function renderInspector(container) {
  container.textContent = '';
  const d = S.descriptor;
  if (!d) return;

  const part = activeParts().find((p) => p.id === S.selectedPartId);
  if (part) {
    renderPartInspector(container, part);
    return;
  }

  renderObjectHeader(container);
  renderObjectControls(container);
}

// ── Project save / load ─────────────────────────────────────────────────────

function bindProjectControls() {
  els.downloadBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(S.descriptor, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = `${S.descriptor.id}.descriptor.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  els.loadFile.addEventListener('change', () => {
    const file = els.loadFile.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        // Normalize first — legacy shape names (knot/snowperson) and the legacy
        // scaleXZ/stretchXZ fields resolve in normalizeDescriptor, so validation
        // runs on the canonical result and old downloads still load.
        const normalized = normalizeDescriptor(parsed);
        const errors = validateDescriptor(normalized);
        if (errors.length > 0) {
          els.loadError.textContent = `Invalid descriptor:\n${errors.join('\n')}`;
          return;
        }
        S.descriptor = normalized;
        S.selectedPartId = null;
        S.variantId = null;
        els.loadError.textContent = '';
        renderAll();
        onEdit();
        onLoaded(); // object browser shows the Custom (loaded) item
      } catch (err) {
        els.loadError.textContent = `Load failed: ${err.message}`;
      }
    };
    reader.readAsText(file);
    els.loadFile.value = '';
  });

  els.newFeatureBtn.addEventListener('click', () => createObject('feature'));
  els.newDecorBtn.addEventListener('click', () => createObject('decor'));
  els.newMobBtn.addEventListener('click', () => createObject('mob'));
}

// ── Create from template ────────────────────────────────────────────────────

let createCounter = 0;

/** A fresh part with the new cube/spheroid shapes and a full transform. */
function templatePart(id, shape, params, transform, color) {
  const part = {
    id,
    shape,
    params: { ...SHAPE_TYPES[shape].defaults, ...params },
    transform: { ...PART_TRANSFORM_DEFAULTS, ...transform },
  };
  if (color !== undefined) part.color = color;
  return part;
}

/**
 * A minimal, valid descriptor template for a new object of the given kind.
 * `normalizeDescriptor` fills the remaining optional fields (variation,
 * placement sub-fields, emphasis, material). The id is unique per session so
 * downloads never collide; displayName is editable via the inspector.
 */
function newObjectTemplate(kind) {
  createCounter += 1;
  const suffix = createCounter;

  if (kind === 'feature') {
    return {
      id: `new_feature_${suffix}`,
      kind: 'feature',
      displayName: 'New Feature',
      parts: [templatePart('body', 'cube', { size: 0.3 }, { y: 0.15 })],
      cluster: { min: 1, max: 1, rule: 'uniform' },
      size: { min: 1, max: 1 },
      placement: { mode: 'center' },
      emphasis: { behavior: 'none' },
      material: { color: 0x8a5a2b },
    };
  }
  if (kind === 'decor') {
    return {
      id: `new_decor_${suffix}`,
      kind: 'decor',
      displayName: 'New Decor',
      parts: [templatePart('body', 'spheroid', { radius: 0.2 }, { y: 0.2 })],
      cluster: { min: 1, max: 1, rule: 'uniform' },
      size: { min: 1, max: 1 },
      placement: { mode: 'jitter' },
      emphasis: { behavior: 'dispersed' },
      material: { color: 0x6b7a5a },
    };
  }
  // mob — entity-driven, one archetype variant; colored through the palette.
  return {
    id: `new_mob_${suffix}`,
    kind: 'mob',
    displayName: 'New Mob',
    variantRule: 'archetype',
    material: { color: 0xffffff },
    parts: [templatePart('newMobBody', 'spheroid', { radius: 0.15 }, { y: 0.15 }, 'factionBody')],
    variants: [{
      id: 'newmob',
      parts: [
        templatePart('newMobBody', 'spheroid', { radius: 0.15 }, { y: 0.15 }, 'factionBody'),
        templatePart('newMobHead', 'cube', { size: 0.08 }, { y: 0.32 }, 'factionAccent'),
      ],
    }],
  };
}

/** Swap the session descriptor for a fresh template and reset selection. */
function createObject(kind) {
  const template = normalizeDescriptor(newObjectTemplate(kind));
  const errors = validateDescriptor(template);
  if (errors.length > 0) {
    els.loadError.textContent = `Template error:\n${errors.join('\n')}`;
    return;
  }
  S.descriptor = template;
  S.selectedPartId = null;
  S.variantId = null;
  if (kind === 'mob') S.entity.archetype = template.variants[0].id; // keep picker + preview on the new variant
  els.loadError.textContent = '';
  renderAll();
  onEdit();
  onLoaded(); // object browser shows the Custom (loaded) item
}

// ── Public API ──────────────────────────────────────────────────────────────

function renderAll() {
  renderPartsList(els.partsEdit);
  renderInspector(els.inspector);
}

/**
 * Bind the editing panel to its DOM containers and the preview rebuild hook.
 * @param {object} elsRef - the editor's DOM refs (inspector, partsEdit, downloadBtn, loadFile, loadError)
 * @param {Function} onEditFn - () => void; rebuilds the preview from S.descriptor
 * @param {Function} onLoadedFn - () => void; called after a JSON load succeeds (re-renders the object browser)
 */
export function bindEditorPanel(elsRef, onEditFn, onLoadedFn = () => {}) {
  els = elsRef;
  onEdit = onEditFn;
  onLoaded = onLoadedFn;
  bindProjectControls();
  renderAll();
}

/** Re-render the panel (e.g. after selecting a different sample object). */
export function refreshEditorPanel() {
  renderAll();
}
