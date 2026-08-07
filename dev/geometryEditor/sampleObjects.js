/**
 * sampleObjects.js — Built-in descriptors for the editor preview.
 *
 * Every migrated game object (see descriptors/data/) — all simple feature
 * archetypes, tree groves, solitary + elder trees, hill mounds, mountains,
 * knots, and the entity descriptors (bases, champions, mobs, traders) —
 * normalized for the editor. Editing one of these and exporting the JSON
 * produces a descriptor the generic game builder can consume.
 *
 * Mobs are listed as one row per type (MOB_ROWS) with the friendly names from
 * the game's archetype registry — the single generic mob descriptor is hidden
 * behind those rows, which load it with the selected archetype variant.
 * Traders stay under Creatures.
 */
import { normalizeDescriptor } from '../../src/render/hexmap3d/features/descriptors/schema.js';
import { ALL_DESCRIPTORS } from '../../src/render/hexmap3d/features/descriptors/data/index.js';
import { MOB_TIER2_VARIANTS } from '../../src/render/hexmap3d/features/descriptors/data/mobs.js';
import { listArchetypes, getArchetype } from '../../src/game/rules/archetypes.js';
// Side-effect import: registers the mob archetypes the rows below enumerate.
import '../../src/game/rules/archetypeData/mobs.js';

/** All migrated descriptors, normalized. */
export const SAMPLE_OBJECTS = ALL_DESCRIPTORS.map(normalizeDescriptor);

/**
 * One browser row per mob type — all 7 base archetypes + the 2 tier-2
 * variants — labeled with the game-side friendly name. `variantId` is the
 * descriptor-side archetype variant id ('bear', 'bear-elder', ...); tier-2
 * shapes resolve through MOB_TIER2_VARIANTS.
 *
 * Note: listArchetypes('mob') only matches raw `type` fields, and tier-2
 * variants inherit theirs via `parent` — enumerate everything and filter on
 * the resolved definition instead.
 */
export const MOB_ROWS = Object.freeze(
  listArchetypes()
    .map((id) => ({ id, def: getArchetype(id) }))
    .filter(({ def }) => def?.type === 'mob')
    .map(({ id, def }) => ({
      id,
      displayName: def.name ?? id,
      variantId: (def.baseStats?.tier ?? 1) > 1
        ? MOB_TIER2_VARIANTS[def.archetypeShape] ?? def.archetypeShape
        : def.archetypeShape,
    }))
    .filter((row) => row.variantId)
    .sort((a, b) => a.displayName.localeCompare(b.displayName)),
);

/** Browser rows the picker can show: samples, minus the generic mob
 *  descriptor (MOB_ROWS replaces it with per-type rows). */
export const BROWSABLE_TOTAL = SAMPLE_OBJECTS.length - 1 + MOB_ROWS.length;

/**
 * Presentation-level categories for the object picker. Reflects the mechanical
 * roles in gameBuilder.js, not the raw schema kind values (which are still in
 * flux): features claim the hex center and are usually collectible; decor is
 * visual-only terrain dressing (mountains are terrain-mandated — see
 * gameBuilder.js); mobs are entity-driven units, listed per type; faction/
 * creature kinds are entity-driven.
 *
 * `kinds` lists the descriptor.kind values that land in each category. The
 * data files and OBJECT_KINDS are untouched — adjust this table instead.
 * The mob category is rendered specially from MOB_ROWS, not SAMPLE_OBJECTS.
 */
export const OBJECT_CATEGORIES = [
  { id: 'feature', label: 'Features', kinds: ['feature'] },
  { id: 'decor', label: 'Terrain Decor', kinds: ['decor', 'mountain'] },
  { id: 'mob', label: 'Mobs', kinds: ['mob'] },
  { id: 'faction', label: 'Faction', kinds: ['base', 'champion'] },
  { id: 'creature', label: 'Creatures', kinds: ['trader'] },
];

/** The category a descriptor belongs to (falls back to Features). */
export function categoryOf(descriptor) {
  return OBJECT_CATEGORIES.find((c) => c.kinds.includes(descriptor.kind)) ?? OBJECT_CATEGORIES[0];
}
