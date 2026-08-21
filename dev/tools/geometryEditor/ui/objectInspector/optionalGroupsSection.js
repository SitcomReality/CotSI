/**
 * optionalGroupsSection.js — Optional groups (tile-driven kinds, last in the
 * object panel, collapsed scaffolding): `{ id, chance?, parts }` groups whose
 * parts a seeded roll may omit together. `parts` stays read-only here — one
 * muted line per group; inline part-tree editing is deferred.
 */
import { S } from '../../state.js';
import { el, row, numberInput, textInput } from '../formControls/index.js';
import { section } from './sectionShell.js';

/** A fresh group id unique among the current list. */
function freshGroupId(groups) {
  const stem = 'optional-group';
  if (!groups.some((g) => g.id === stem)) return stem;
  let n = 2;
  while (groups.some((g) => g.id === `${stem}-${n}`)) n++;
  return `${stem}-${n}`;
}

/** Optional groups — the random-omission scaffolding. */
export function renderOptionalGroupsSection(container, ctx) {
  const d = S.descriptor;
  const groups = d.optionalGroups ?? [];
  const sec = section('optionalGroups', container, () => {
    if (groups.length === 0) return 'default';
    const chanced = groups.filter((g) => g.chance !== undefined).length;
    return `${groups.length} group${groups.length === 1 ? '' : 's'}${chanced ? ` · ${chanced} chanced` : ''}`;
  });

  if (groups.length === 0) {
    sec.append(el('div', 'hint', 'Groups that randomly omit a set of parts.'));
  }
  groups.forEach((group, gi) => {
    const grow = el('div', 'optional-group-row');
    const idInput = textInput(group.id, (v) => {
      const clean = v.trim().replace(/[^A-Za-z0-9_-]/g, '_');
      if (!clean || clean === group.id) return;
      if (groups.some((g) => g.id === clean)) {
        window.alert(`Group id "${clean}" already exists — pick a different name.`);
        idInput.value = group.id;
        return;
      }
      ctx.mutate(() => { group.id = clean; });
    });
    idInput.title = 'Group id';
    grow.append(idInput);
    // Chance: 0–1; absent chance ≡ always present — writing 1 deletes the key.
    const chance = numberInput(group.chance ?? 1, { min: 0, step: 0.05, onChange: (v) => ctx.mutate(() => {
      if (v >= 1) delete group.chance;
      else group.chance = Math.max(0, Math.min(1, v));
    }) });
    chance.title = 'Chance the group\'s parts appear at all — blank/1 = always';
    grow.append(chance);
    const up = el('button', null, '↑');
    up.type = 'button';
    up.disabled = gi === 0;
    up.title = 'Move up';
    up.addEventListener('click', () => ctx.mutate(() => {
      d.optionalGroups.splice(gi - 1, 0, d.optionalGroups.splice(gi, 1)[0]);
    }));
    grow.append(up);
    const del = el('button', null, '✕');
    del.type = 'button';
    del.title = 'Delete this group';
    del.addEventListener('click', () => ctx.mutate(() => {
      d.optionalGroups.splice(gi, 1);
      if (d.optionalGroups.length === 0) delete d.optionalGroups;
    }));
    grow.append(del);
    sec.append(grow);
    sec.append(el('div', 'hint', `${group.parts.length} parts — inline editing later`));
  });

  const addBtn = el('button', 'create-btn', '＋ Add group');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => ctx.mutate(() => {
    d.optionalGroups ??= [];
    d.optionalGroups.push({ id: freshGroupId(d.optionalGroups), parts: [] });
  }));
  sec.append(addBtn);
}
