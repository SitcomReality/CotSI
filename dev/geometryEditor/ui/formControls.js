/**
 * formControls.js — Generic form-control builders for the geometry editor.
 *
 * Pure DOM construction: every function takes values + an onChange callback and
 * returns a ready element. No project state or imports — the rows, inputs,
 * steppers and dropdowns built here are reused by the object controls, the
 * part inspector and the parts list.
 */

/** Create an element with an optional class name and text content. */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A labelled control row: label on the left, the control on the right. */
function row(labelText, control) {
  const r = el('div', 'control-row');
  r.append(el('label', null, labelText), control);
  return r;
}

/** Small uppercase sub-heading used to group dynamic field sets. */
function subheading(labelText) {
  return el('div', 'section-title', labelText);
}

/**
 * A number input wrapped in the custom −/+ stepper shell (see stepperWrap).
 * The wrapper is what rows append; manual typing still works and both paths
 * fire the same onChange, so the mutate() flow applies to stepper edits too.
 */
function numberInput(value, { min, step = 0.01, onChange }) {
  const input = el('input');
  input.type = 'number';
  input.value = String(value);
  input.step = String(step);
  if (min !== undefined) input.min = String(min);
  const commit = () => {
    const v = parseFloat(input.value);
    if (Number.isFinite(v)) onChange(v);
  };
  input.addEventListener('change', commit);
  return stepperWrap(input, commit);
}

/** Integer variant of numberInput — steps by 1, parses with parseInt. */
function intInput(value, { min, onChange }) {
  const input = el('input');
  input.type = 'number';
  input.value = String(value);
  input.step = '1';
  if (min !== undefined) input.min = String(min);
  const commit = () => {
    const v = parseInt(input.value, 10);
    if (Number.isInteger(v)) onChange(v);
  };
  input.addEventListener('change', commit);
  return stepperWrap(input, commit);
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * A radians-stored number input that displays and steps in degrees — the
 * inspector's rotation fields. `value` is radians, `onChange` fires with the
 * converted radians, so callers keep storing/consuming radians (the schema and
 * render never change); only the editor's number entry is in degrees. The
 * displayed value is rounded to 2 decimals so e.g. 0.12 rad reads as 6.88°.
 */
function degreeInput(value, { step = 5, onChange }) {
  const displayed = Math.round(value * RAD_TO_DEG * 100) / 100;
  return numberInput(displayed, { step, onChange: (deg) => onChange(deg * DEG_TO_RAD) });
}

/**
 * Wrap a number input in a .num-step shell with − / + buttons. Stepping uses
 * the input's `step` (default 1), clamps to min/max, and fires the same change
 * path as manual editing. The bound button (at min / max) is disabled, and
 * both buttons follow the input's disabled state.
 */
function stepperWrap(input, commit) {
  const wrap = el('div', 'num-step');
  const minus = el('button', 'num-step-btn', '−');
  const plus = el('button', 'num-step-btn', '+');
  minus.type = 'button';
  plus.type = 'button';
  minus.setAttribute('aria-label', 'Decrease value');
  plus.setAttribute('aria-label', 'Increase value');

  const step = (dir) => {
    if (input.disabled) return;
    const min = input.min === '' ? null : parseFloat(input.min);
    const max = input.max === '' ? null : parseFloat(input.max);
    const stepSize = parseFloat(input.step) || 1;
    const decimals = (String(stepSize).split('.')[1] || '').length;
    const base = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : (min ?? 0);
    let next = base + dir * stepSize;
    if (min !== null && next < min) next = min;
    if (max !== null && next > max) next = max;
    input.value = String(Number(next.toFixed(decimals)));
    syncButtons();
    commit();
  };

  const syncButtons = () => {
    const value = input.valueAsNumber;
    const min = input.min === '' ? null : parseFloat(input.min);
    const max = input.max === '' ? null : parseFloat(input.max);
    minus.disabled = input.disabled || (Number.isFinite(value) && min !== null && value <= min);
    plus.disabled = input.disabled || (Number.isFinite(value) && max !== null && value >= max);
  };

  minus.addEventListener('click', () => step(-1));
  plus.addEventListener('click', () => step(1));
  input.addEventListener('input', syncButtons);
  input.addEventListener('change', syncButtons);
  syncButtons();

  wrap.append(minus, input, plus);
  return wrap;
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

export {
  el,
  row,
  subheading,
  numberInput,
  intInput,
  degreeInput,
  DEG_TO_RAD,
  stepperWrap,
  selectInput,
  colorInput,
  textInput,
};
