/**
 * history.js — Undo history for the geometry editor.
 *
 * Snapshots the editor state worth undoing (deep-copied descriptor plus the
 * selection / variant / preview toggles) before every panel mutation; undo()
 * restores the most recent snapshot and the panel re-renders. Only panel
 * edits go through the mutate() flow, so object switches and loads are not
 * part of the history. No local project imports — a true leaf module.
 */
import { S } from './state.js';

const MAX_UNDO = 50;
const stack = [];

/** Deep-copy the editor state worth undoing. */
function snapshot() {
  return {
    descriptor: S.descriptor ? JSON.parse(JSON.stringify(S.descriptor)) : null,
    variantId: S.variantId,
    selectedPartId: S.selectedPartId,
    entity: { ...S.entity },
    canonical: S.canonical,
    displaced: S.displaced,
    biomeId: S.biomeId,
    tileH: S.tileH,
  };
}

/** Record the pre-mutation state (call before the edit). */
export function pushUndo() {
  stack.push(snapshot());
  if (stack.length > MAX_UNDO) stack.shift();
}

/** Pop the most recent snapshot, or null when the history is empty. */
export function popUndo() {
  return stack.pop() ?? null;
}

/** Restore editor state from a snapshot produced by pushUndo(). */
export function restoreUndo(snap) {
  if (!snap) return;
  S.descriptor = snap.descriptor;
  S.variantId = snap.variantId;
  S.selectedPartId = snap.selectedPartId;
  S.entity = snap.entity;
  S.canonical = snap.canonical;
  S.displaced = snap.displaced;
  S.biomeId = snap.biomeId;
  S.tileH = snap.tileH;
}
