/**
 * previewState.js — Pure helpers for an alternatives choice point's preview state.
 *
 * Every choice point is in one of two preview states:
 *   - 'natural' — no entry in S.previewOptions → the preview rolls the tile hash,
 *                 showing a real random config (the re-roll button shuffles it).
 *   - 'pinned'  — S.previewOptions[choiceId] = optionId → the preview forces that
 *                 option until cleared.
 *
 * These helpers centralize reading and writing that Map. Pure (no DOM, no editor
 * state) so they are unit-testable in Node.
 */

/**
 * Read a choice point's preview state.
 * @param {Map<string,string>} map - S.previewOptions (choiceId → optionId)
 * @param {string} choiceId - the alternatives node's id
 * @returns {{mode:'natural'}} | {{mode:'pinned', optionId:string}}
 */
export function previewStateFor(map, choiceId) {
  const optionId = map.get(choiceId);
  if (optionId === undefined) return { mode: 'natural' };
  return { mode: 'pinned', optionId };
}

/**
 * Set (optionId given) or clear (optionId null/undefined) a choice point's preview
 * pin, returning a NEW map (S.previewOptions is replaced immutably elsewhere; the
 * caller's map is left untouched).
 * @param {Map<string,string>} map - S.previewOptions
 * @param {string} choiceId - the alternatives node's id
 * @param {string|null} [optionId] - option to pin; null/undefined clears the pin
 * @returns {Map<string,string>} the new map
 */
export function setPinnedOption(map, choiceId, optionId) {
  const next = new Map(map);
  if (optionId == null) next.delete(choiceId);
  else next.set(choiceId, optionId);
  return next;
}
