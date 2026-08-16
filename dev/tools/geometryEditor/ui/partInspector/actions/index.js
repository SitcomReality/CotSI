/**
 * actions/index.js — Part inspector header + id row.
 *
 * renderPartHeader renders the breadcrumb back to the object-level controls;
 * renderIdEdit renders the editable id row. The structural tree actions
 * (nest/move/ungroup/copy-transform/convert-to-alternatives) now live in the
 * parts-list actions bar (ui/partList/actionsBar.js → structureActions.js),
 * not in the Fields sidebar.
 */
export { renderPartHeader } from './header.js';
