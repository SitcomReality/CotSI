/**
 * editorPanel.js — Editing controls for the geometry editor page.
 *
 * Renders the object-level fields (cluster min/max, size min/max, emphasis
 * behavior, placement mode + per-mode params, material color), the part list
 * (add / remove / reorder / select), and an inspector for the selected part
 * (shape params + transform). Every change mutates S.descriptor (normalized)
 * in place, then calls onEdit() so the preview rebuilds, and re-renders the
 * panel.
 *
 * Shape params come straight from the SHAPE_TYPES registry, so the editor
 * always offers exactly the fields the generic builder understands.
 */
import { S } from '../state.js';
import {
  SHAPE_TYPES,
  EMPHASIS_BEHAVIORS,
  PLACEMENT_MODES,
  validateDescriptor,
  normalizeDescriptor,
} from '../../../src/render/hexmap3d/features/descriptors/schema.js';

let els = null;
let onEdit = () => {};
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

function selectInput(options, value, onChange) {
  const select = el('select');
  for (const opt of options) {
    const o = el('option', null, opt);
    o.value = opt;
    select.appendChild(o);
  }
  select.value = value;
  select.addEventListener('change', () => onChange(select.value));
  return select;
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

// ── Mutation flow ───────────────────────────────────────────────────────────

function mutate(fn) {
  fn();
  onEdit();
  renderAll();
}

// ── Object-level controls ───────────────────────────────────────────────────

function renderObjectControls(container) {
  container.textContent = '';
  const d = S.descriptor;

  container.append(row('Cluster rule', selectInput(['uniform', 'moisture'], d.cluster.rule, (v) => mutate(() => {
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
    container.append(row('Cluster min', intInput(d.cluster.min, { min: 1, onChange: (v) => mutate(() => { d.cluster.min = v; }) })));
    container.append(row('Cluster max', intInput(d.cluster.max, { min: 1, onChange: (v) => mutate(() => { d.cluster.max = Math.max(v, d.cluster.min); }) })));
  }
  container.append(row('Size min', numberInput(d.size.min, { min: 0.01, onChange: (v) => mutate(() => { d.size.min = v; }) })));
  container.append(row('Size max', numberInput(d.size.max, { min: 0.01, onChange: (v) => mutate(() => { d.size.max = Math.max(v, d.size.min); }) })));

  container.append(row('Emphasis', selectInput(EMPHASIS_BEHAVIORS, d.emphasis.behavior, (v) => mutate(() => {
    d.emphasis.behavior = v;
  }))));

  container.append(row('Placement', selectInput(PLACEMENT_MODES, d.placement.mode, (v) => mutate(() => {
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

  container.append(row('Material', colorInput(d.material.color, (v) => mutate(() => { d.material.color = v; }))));
}

// ── Part list (add / remove / reorder / select) ─────────────────────────────

function renderPartsList(container) {
  container.textContent = '';
  const d = S.descriptor;

  const addRow = el('div', 'control-row');
  const shapeSelect = selectInput(Object.keys(SHAPE_TYPES), Object.keys(SHAPE_TYPES)[0], () => {});
  const addBtn = el('button', null, '+ Add part');
  addBtn.addEventListener('click', () => {
    const shape = shapeSelect.value;
    mutate(() => {
      d.parts.push({ id: `part-${partCounter++}`, shape, params: { ...SHAPE_TYPES[shape].defaults } });
    });
  });
  addRow.append(shapeSelect, addBtn);
  container.append(addRow);

  d.parts.forEach((part, i) => {
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
    down.disabled = i === d.parts.length - 1;
    remove.disabled = d.parts.length === 1;
    up.addEventListener('click', () => mutate(() => {
      [d.parts[i - 1], d.parts[i]] = [d.parts[i], d.parts[i - 1]];
    }));
    down.addEventListener('click', () => mutate(() => {
      [d.parts[i + 1], d.parts[i]] = [d.parts[i], d.parts[i + 1]];
    }));
    remove.addEventListener('click', () => mutate(() => {
      d.parts.splice(i, 1);
      if (S.selectedPartId === part.id) S.selectedPartId = null;
    }));

    r.append(label, up, down, remove);
    container.append(r);
  });
}

// ── Part inspector (shape params + transform) ───────────────────────────────

function renderInspector(container) {
  container.textContent = '';
  const d = S.descriptor;
  const part = d.parts.find((p) => p.id === S.selectedPartId);
  if (!part) {
    container.append(el('div', 'hint', 'Select a part to edit its shape params and transform.'));
    return;
  }

  container.append(el('div', 'info', `${part.id} — ${part.shape}`));
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

  container.append(el('h3', 'section-title', 'Transform'));
  const t = part.transform;
  container.append(row('Y', numberInput(t.y, { onChange: (v) => mutate(() => { t.y = v; }) })));
  container.append(row('Lift', numberInput(t.lift, { onChange: (v) => mutate(() => { t.lift = v; }) })));
  container.append(row('rotY (rad)', numberInput(t.rotY, { onChange: (v) => mutate(() => { t.rotY = v; }) })));
  container.append(row('scaleXZ', numberInput(t.scaleXZ, { min: 0.01, onChange: (v) => mutate(() => { t.scaleXZ = v; }) })));
  container.append(row('scaleY', numberInput(t.scaleY, { min: 0.01, onChange: (v) => mutate(() => { t.scaleY = v; }) })));

  container.append(el('h3', 'section-title', 'Stretch variation'));
  container.append(el('div', 'hint', 'Per-axis variation ranges for this part; "follow object" uses the object-level ranges, "fixed" pins the axis at 1.'));
  for (const axis of ['y', 'xz']) {
    const current = part.stretch?.[axis];
    const mode = current === false ? 'fixed' : current ? 'custom' : 'follow';
    const modeSelect = selectInput(['follow', 'fixed', 'custom'], mode, (m) => mutate(() => {
      if (m === 'fixed') part.stretch = { ...part.stretch, [axis]: false };
      else if (m === 'custom') part.stretch = { ...part.stretch, [axis]: { min: 0.9, max: 1.1, seed: axis === 'y' ? 4 : 5 } };
      else {
        part.stretch = { ...part.stretch };
        delete part.stretch[axis];
        if (Object.keys(part.stretch).length === 0) delete part.stretch;
      }
    }));
    const rowEl = el('div', 'control-row');
    rowEl.append(el('label', null, `stretch ${axis}`), modeSelect);
    if (current && current !== false) {
      rowEl.append(
        numberInput(current.min, { min: 0.01, onChange: (v) => mutate(() => { current.min = v; }) }),
        numberInput(current.max, { min: 0.01, onChange: (v) => mutate(() => { current.max = v; }) }),
        intInput(current.seed ?? (axis === 'y' ? 4 : 5), { min: 0, onChange: (v) => mutate(() => { current.seed = v; }) }),
      );
    }
    container.append(rowEl);
  }
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
        const errors = validateDescriptor(parsed);
        if (errors.length > 0) {
          els.loadError.textContent = `Invalid descriptor:\n${errors.join('\n')}`;
          return;
        }
        S.descriptor = normalizeDescriptor(parsed);
        S.selectedPartId = null;
        els.objectSelect.value = ''; // no longer a built-in sample
        els.loadError.textContent = '';
        renderAll();
        onEdit();
      } catch (err) {
        els.loadError.textContent = `Load failed: ${err.message}`;
      }
    };
    reader.readAsText(file);
    els.loadFile.value = '';
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

function renderAll() {
  renderObjectControls(els.objectEdit);
  renderPartsList(els.partsEdit);
  renderInspector(els.partInspector);
}

/**
 * Bind the editing panel to its DOM containers and the preview rebuild hook.
 * @param {object} elsRef - the editor's DOM refs (objectEdit, partsEdit, partInspector, downloadBtn, loadFile, loadError)
 * @param {Function} onEditFn - () => void; rebuilds the preview from S.descriptor
 */
export function bindEditorPanel(elsRef, onEditFn) {
  els = elsRef;
  onEdit = onEditFn;
  bindProjectControls();
  renderAll();
}

/** Re-render the panel (e.g. after selecting a different sample object). */
export function refreshEditorPanel() {
  renderAll();
}
