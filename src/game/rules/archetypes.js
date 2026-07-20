/**
 * archetypes.js — Pure data-driven archetype registry with inheritance.
 *
 * Archetypes are plain config objects registered by name. A variant can
 * declare a `parent` to inherit all properties and then override specific
 * fields. Deep merge is one level deep per property (no recursive merge
 * of nested objects — variants replace whole sub-objects).
 *
 * Usage:
 *   defineArchetype('mob_bear', { type:'mob', name:'Ink Bear', base:{hp:36}, ... });
 *   defineArchetype('mob_bear_elder', { parent:'mob_bear', name:'Elder Ink Bear', base:{hp:72}, ... });
 *   const def = getArchetype('mob_bear_elder');
 *   // → { type:'mob', name:'Elder Ink Bear', base:{hp:72}, ... }  (name & base overridden)
 */

const registry = new Map();

/**
 * Register an archetype definition.
 * If the definition has a `parent` field that matches a previously registered
 * archetype, all parent properties are inherited. The child's own properties
 * override the parent's at the top level.
 *
 * @param {string} name - Unique archetype identifier (e.g. 'mob_bear', 'biome_default')
 * @param {object} def  - Archetype definition. May include `parent` key for inheritance.
 * @throws {Error} If parent archetype is not found.
 * @throws {Error} If name is already registered.
 */
export function defineArchetype(name, def) {
  if (registry.has(name)) {
    throw new Error(`Archetype "${name}" is already defined.`);
  }
  if (def.parent && !registry.has(def.parent)) {
    throw new Error(
      `Cannot define archetype "${name}": parent "${def.parent}" not found.`
    );
  }
  registry.set(name, { ...def });
}

/**
 * Retrieve a fully-resolved archetype definition (parent properties merged).
 * The returned object is a shallow copy — mutation is safe.
 *
 * @param {string} name
 * @returns {object|null} Merged definition, or null if not found.
 */
export function getArchetype(name) {
  const def = registry.get(name);
  if (!def) return null;
  if (!def.parent) return { ...def };

  const parent = getArchetype(def.parent);
  if (!parent) return { ...def };

  // Shallow merge: parent properties are overridden by child properties.
  const merged = { ...parent };
  delete merged.parent;
  for (const key of Object.keys(def)) {
    if (key === 'parent') continue;
    merged[key] = def[key];
  }
  return merged;
}

/**
 * Convenience: define a variant of an existing archetype with overrides.
 * Equivalent to defineArchetype(name, { parent: parentName, ...overrides }).
 *
 * @param {string} name       - New archetype name
 * @param {string} parentName - Parent archetype name (must already be registered)
 * @param {object} overrides  - Properties to override on the parent
 */
export function createVariant(name, parentName, overrides) {
  defineArchetype(name, { parent: parentName, ...overrides });
}

/**
 * Return all registered archetype names, optionally filtered by type.
 *
 * @param {string} [typeFilter] - Optional type string (e.g. 'mob', 'biome')
 * @returns {string[]}
 */
export function listArchetypes(typeFilter) {
  const results = [];
  for (const [name, def] of registry) {
    if (!typeFilter || def.type === typeFilter) {
      results.push(name);
    }
  }
  return results;
}

/**
 * Return the resolved definitions for all archetypes, optionally filtered by type.
 *
 * @param {string} [typeFilter]
 * @returns {object[]}
 */
export function getArchetypesByType(typeFilter) {
  return listArchetypes(typeFilter).map(getArchetype);
}

/**
 * Remove all registered archetypes (useful for hot-reload / testing).
 */
export function clearArchetypes() {
  registry.clear();
}
