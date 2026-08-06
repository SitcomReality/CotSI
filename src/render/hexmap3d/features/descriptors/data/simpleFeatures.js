/**
 * simpleFeatures.js — Descriptor data for the simple feature archetypes.
 *
 * Migrated 1:1 from FEATURE_VISUALS (featureVisuals.js): each entry is one
 * shape part (the feature's geometry decomposed into the primitive it is built
 * from), the FEATURE_VISUALS material color, and the FEATURE_VISUALS scale.
 * Placement uses the legacy scatter jitter ('scatter' mode), which the
 * recordBuilder replicates bit-for-bit from simpleFeatureMeshes.js — including
 * its per-tile size jitter, so `size` stays 1..1 here.
 *
 * Features are displaced to the shared corner anchor when an occupant claims
 * the hex center (emphasis 'dispersed'), matching simpleFeatureMeshes.js.
 *
 * Values are JSON-safe (colors as integers). Part ids match the archetype id.
 */

// Shared leaf shape — the tuft cone (bush, vine, bramble).
const TUFT_PART = {
  id: 'tuft',
  shape: 'cone',
  params: { bottomR: 0.04, height: 0.06, radialSegs: 3, heightSegs: 1 },
};
// Shared plant cone (vegetable lamb, scoria rose, …).
const PLANT_PART = {
  id: 'plant',
  shape: 'cone',
  params: { bottomR: 0.1, height: 0.18, radialSegs: 5, heightSegs: 1 },
};
// Shared slab box (palimpsest slab, errata slip).
const SLAB_PART = {
  id: 'slab',
  shape: 'box',
  params: { width: 0.25, height: 0.05, depth: 0.18 },
};
// Shared bigtree cone (peridexion tree, eden mushroom).
const BIGTREE_PART = {
  id: 'bigtree',
  shape: 'cone',
  params: { bottomR: 0.18, height: 0.3, radialSegs: 6, heightSegs: 1 },
};

/**
 * Build a single-part feature descriptor.
 * @param {string} id - feature kind (matches FEATURE_VISUALS keys)
 * @param {string} displayName - readable name for the editor
 * @param {object} part - the shape part (id/shape/params)
 * @param {number} color - material color
 * @param {number} scale - FEATURE_VISUALS per-instance scale
 */
function simpleFeature(id, displayName, part, color, scale) {
  return {
    schemaVersion: 1,
    id,
    kind: 'feature',
    displayName,
    scale,
    size: { min: 1, max: 1 },
    placement: { mode: 'scatter' },
    emphasis: { behavior: 'dispersed' },
    material: { color },
    parts: [{ ...part, id: 'body' }],
  };
}

/** Every simple feature archetype, keyed by its FEATURE_VISUALS kind. */
export const SIMPLE_FEATURE_DESCRIPTORS = [
  simpleFeature('bush', 'Scrub Bush', TUFT_PART, 0x4a7a3a, 1.5),
  simpleFeature('vine', 'Thorn Vine', TUFT_PART, 0x5a9a4a, 0.8),
  simpleFeature('redLetterBramble', 'Red-Letter Bramble', TUFT_PART, 0x1a1010, 1.3),

  simpleFeature('palimpsestSlab', 'Palimpsest Slab', SLAB_PART, 0xc8c0a8, 1.0),
  simpleFeature('errataSlip', 'Errata Slip', SLAB_PART, 0xf0e8d0, 1.2),

  simpleFeature('volvelle', 'Volvelle Disc', { id: 'body', shape: 'cylinder', params: { bottomR: 0.14, topR: 0.14, height: 0.03, segments: 8 } }, 0xd4b830, 0.9),
  simpleFeature('foolsFire', "Fool's Fire", { id: 'body', shape: 'sphere', params: { radius: 0.08, wSegs: 6, hSegs: 5 } }, 0x40d0e0, 0.7),
  simpleFeature('ouroborosLoop', 'Ouroboros Loop', { id: 'body', shape: 'torus', params: { radius: 0.1, tube: 0.02, radialSegs: 4, tubularSegs: 8, arc: Math.PI * 2 } }, 0xc8a020, 1.2),
  simpleFeature('saintsRib', "Saint's Rib", { id: 'body', shape: 'torus', params: { radius: 0.12, tube: 0.03, radialSegs: 4, tubularSegs: 8, arc: Math.PI } }, 0xe8e0d0, 2.0),

  simpleFeature('vegetableLamb', 'Vegetable Lamb', PLANT_PART, 0xc0d8a0, 1.1),
  simpleFeature('scoriaRose', 'Scoria Rose', PLANT_PART, 0xe87030, 0.8),
  simpleFeature('waxbloom', 'Waxbloom', PLANT_PART, 0xa0d8e8, 0.9),
  simpleFeature('screamroot', 'Screamroot', PLANT_PART, 0x682040, 1.0),
  simpleFeature('nullLily', 'Null Lily', PLANT_PART, 0xe0e0e8, 0.8),
  simpleFeature('cinderbloom', 'Cinderbloom', PLANT_PART, 0xe88040, 0.8),

  simpleFeature('gildedInitial', 'Gilded Initial', { id: 'body', shape: 'box', params: { width: 0.08, height: 0.22, depth: 0.08 } }, 0xd8b830, 1.5),
  simpleFeature('peridexionTree', 'Peridexion Tree', BIGTREE_PART, 0x1a5a0a, 1.6),
  simpleFeature('edenMushroom', 'Eden Mushroom', BIGTREE_PART, 0x7a2a8a, 2.5),

  simpleFeature('listenerLichen', 'Listener Lichen', { id: 'body', shape: 'dodecahedron', params: { radius: 0.08, detail: 0 } }, 0x80c0a0, 0.7),
  simpleFeature('edenShroomlet', 'Eden Shroomlet', { id: 'body', shape: 'dodecahedron', params: { radius: 0.08, detail: 0 } }, 0xa060c0, 1.2),
  simpleFeature('witnessStone', 'Witness Stone', { id: 'body', shape: 'dodecahedron', params: { radius: 0.1, detail: 0 } }, 0xb0a890, 1.3),

  simpleFeature('drownedCopyist', 'Drowned Copyist', { id: 'body', shape: 'cylinder', params: { bottomR: 0.04, topR: 0.06, height: 0.25, segments: 5 } }, 0x405868, 1.2),
  simpleFeature('censerSaint', 'Censer Saint', { id: 'body', shape: 'cone', params: { bottomR: 0.08, height: 0.14, radialSegs: 6, heightSegs: 1 } }, 0xb89840, 1.1),
  simpleFeature('halfDrawnObelisk', 'Half-Drawn Obelisk', { id: 'body', shape: 'cone', params: { bottomR: 0.04, height: 0.28, radialSegs: 4, heightSegs: 1 } }, 0xa0a098, 1.8),
  simpleFeature('brassLungVent', 'Brass-Lung Vent', { id: 'body', shape: 'cylinder', params: { bottomR: 0.1, topR: 0.06, height: 0.08, segments: 6 } }, 0xa08050, 1.0),

  simpleFeature('snowperson', 'Snowperson', { id: 'body', shape: 'snowperson', params: {} }, 0xf0f4f8, 1.0),
];
