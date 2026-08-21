/**
 * layout.js — DOM layout primitives: element creation, labelled control rows,
 * and the section sub-heading. Pure DOM construction — no state.
 */

/** Create an element with an optional class name and text content. */
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A labelled control row: label on the left, the control on the right.
 *  `labelTitle` puts a hover tooltip on the label — the Phase 2 home for
 *  non-obvious units/gotchas that used to be inline hint paragraphs. */
export function row(labelText, control, labelTitle) {
  const r = el('div', 'control-row');
  const label = el('label', null, labelText);
  if (labelTitle) label.title = labelTitle;
  r.append(label, control);
  return r;
}

/** Small uppercase sub-heading used to group dynamic field sets. */
export function subheading(labelText) {
  return el('div', 'section-title', labelText);
}
