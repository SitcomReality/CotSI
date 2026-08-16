/**
 * shape.js — Shape-params section (leaves only): enum/int/number rows driven
 * by the SHAPE_TYPES registry. Groups are pure containers (no visuals of
 * their own), so this field never appears for group nodes.
 */
import { row, selectInput, intInput, numberInput } from '../../formControls/index.js';
import { SHAPE_TYPES } from '../../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { section } from '../sectionShell.js';

/** Shape params (leaves only): enum/int/number rows from the SHAPE_TYPES registry. */
export function renderShapeSection(container, part, ctx) {
  const sec = section('shape', container);
  const shape = SHAPE_TYPES[part.shape];
  for (const [key, rule] of Object.entries(shape.params)) {
    const current = part.params[key] ?? shape.defaults[key];
    if (rule.type === 'enum') {
      sec.append(row(key, selectInput(rule.values, current, (v) => ctx.mutate(() => { part.params[key] = v; }))));
    } else if (rule.type === 'int') {
      sec.append(row(key, intInput(current, { min: rule.min, onChange: (v) => ctx.mutate(() => { part.params[key] = v; }) })));
    } else {
      sec.append(row(key, numberInput(current, { min: rule.min, onChange: (v) => ctx.mutate(() => { part.params[key] = v; }) })));
    }
  }
}
