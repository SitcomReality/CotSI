/**
 * terrainParams.js — Terrain elevation, color values, and shared world-space constants.
 */

/** World-space hex radius (shared with hexWorldSpace.js). */
export const HEX_RADIUS = 1.0;

/** Hex tile thickness (board-game-piece edge height). */
export const HEX_THICKNESS = 1.25;
/** Side-face darken factor. */
export const SIDE_DARKEN_FACTOR = 0.5;

/** Lake color multipliers (applied to water tile base color). */
export const LAKE_COLOR_MODULATION = { r: 0.7, g: 0.85, b: 0.9 };

/**
 * Biome edge blending strength. Each top-face corner is pulled toward the
 * average color of the tiles sharing that corner (0 = no blending, 1 = corner
 * becomes the full average). Blends adjacent biomes into a soft gradient.
 * Water never participates: water tiles render on their own mesh with no corner
 * blending, and land corners skip water neighbors (see cornerBlend.js).
 */
export const TERRAIN_BLEND_FACTOR = 0.8;

/**
 * Water surface ripple (vertex-shader animation, see buildWaterMesh.js).
 * Displaces water vertices by sin(uTime * SPEED + phase) * amp, where phase and
 * amp are per-corner attributes: most corners have amp 0 (still water), a
 * scattered COVERAGE fraction bobs slightly so the surface is never perfectly
 * still. All GPU-side — one uTime uniform per frame.
 */
export const WATER_RIPPLE_SPEED = 2.0;
export const WATER_RIPPLE_AMP = 0.03;
export const WATER_RIPPLE_COVERAGE = 0.3;

/**
 * Water surface chop (fragment-shader shading animation, see materials.js).
 * Four sine trains perturb the water fragment normals. To avoid the "perfect
 * stripes scrolling in one absolute direction" look, the field is sampled at a
 * DOMAIN-WARPED position (crest lines bend, no straight world-aligned bands),
 * trains 2 & 4 travel the opposite way (crossing chop, not a single roll), the
 * frequencies are incommensurate, and a slow BREATHE modulation swells
 * amplitude in patches. Pure per-pixel math; no geometry/draw-call changes.
 */
export const WATER_CHOP_FREQ_1 = 0.9;    // rad per world unit, train 1
export const WATER_CHOP_DIR_1 = [0.90, 0.35];
export const WATER_CHOP_FREQ_2 = 2.7;
export const WATER_CHOP_DIR_2 = [-0.40, 0.85];
export const WATER_CHOP_FREQ_3 = 3.7;
export const WATER_CHOP_DIR_3 = [0.50, -0.80];
export const WATER_CHOP_FREQ_4 = 4.3;    // high octave — micro-ripples the specular sparkle rides
export const WATER_CHOP_DIR_4 = [0.72, 0.61];
export const WATER_CHOP_SPEED = 1.1;     // phase speed multiplier (uTime)
export const WATER_CHOP_STRENGTH = 1.35; // normal-perturb strength (view-space) — calm enough that the swell reads clearly
// Domain warp: low-freq value noise offsets where the chop is sampled, bending
// crest lines so they don't read as a rigid grid of straight stripes. Strength
// is in world units (about half a hex radius produces a clear bend).
export const WATER_CHOP_WARP_FREQ = 0.82;     // warp-field scale (per world unit)
export const WATER_CHOP_WARP_STRENGTH = 1.5;  // warp bend amount (world units)
// Slow in-place swell modulation (0..1): patches of the surface swell rather
// than translate as a sheet, breaking the uniform scroll.
export const WATER_CHOP_BREATHE_STRENGTH = 0.7;

/**
 * Swell that rolls toward the map center (the seamless coast-aligned model).
 * Broken water always hugs the map edge, so a low-frequency wave train rolls
 * toward the map center: its crest lines run perpendicular to that radial
 * direction and it dominates the local chop (ISO_SUPPRESS fades the isotropic
 * dapple). Because the direction is a continuous function of world position
 * (toward the map center), adjacent tiles are seamless — the only "turn" is the
 * smooth rotation near the map corners. The swell is active across essentially
 * ALL broken water: INNER..OUTER is only a tiny guard band near the exact
 * center (where there is no water), so it never drops out on the visible
 * near-shore water and the direction reads as the swell, not the fixed chop.
 */
export const WATER_SHORE_FREQ = 2.6;        // rad per world unit — broad, readable rolls
export const WATER_SHORE_SPEED = 1.0;       // travel speed toward the center
export const WATER_SHORE_AMP = 2.5;         // swell dominance
export const WATER_SHORE_ISO_SUPPRESS = 0.85; // 0..1 — fade the isotropic chop where the swell dominates
export const WATER_SHORE_INNER = 0.05;      // fraction of map radius where the fade-in guard starts
export const WATER_SHORE_OUTER = 0.18;      // fraction of map radius where the swell is fully dominant

/**
 * Seamless waterline froth (buildWaterMesh.js aWaterline). A 0..1 per-vertex
 * value driven by the distance to the nearest land surface, so a thin froth
 * band hugs the waterline and fades over WATER_FROTH_WIDTH world units. Because
 * it is computed at each vertex's world position, coincident vertices across a
 * shared hex edge match — no per-tile seams. The shader brightens this band and
 * flickers it with the swell.
 */
export const WATER_FROTH_WIDTH = 0.08;       // world units the froth fades over
export const WATER_FROTH_STRENGTH = 0.1;   // froth brightness
export const WATER_FROTH_COLOR = [0.82, 0.94, 1]; // cool froth

/** Full river blue for carved channel floors (rendered on the water mesh). */
export const RIVER_COLOR = [0.176, 0.529, 0.902];

/**
 * Shallow-water depth ramp (waterMaterial fragment shader). `aWaterDepth` (see
 * buildWaterMesh.js) carries the true unclamped distance to nearest land; the
 * shader lerps the water color from a bright teal rim near shore toward the
 * deep water color over WATER_DEPTH_RAMP world units. This gives the coastline
 * its tonal transition — the single biggest readability win for an otherwise
 * flat dark water body, at zero extra draw-call/texture cost.
 */
export const WATER_DEPTH_RAMP = 2.5;                  // world units over which shallow → deep resolves
export const WATER_DEPTH_SHALLOW = [0.20, 0.62, 0.78]; // teal rim flush against land
export const WATER_CREST_TINT = [0.6, 0.85, 1.0];      // subtle cyan added on sun-facing crests
export const WATER_CREST_BRIGHTNESS = 0.08;            // crest luminance coefficient

/** River flow wave (vertex-shader, downstream-traveling) controls. */
export const WATER_FLOW_SPEED = 2.5;
export const WATER_FLOW_WAVE_LENGTH = 2.5;
export const WATER_FLOW_AMP = 0.04;

/** Damp-bank tint for land side faces adjacent to water or a river channel. */
export const SIDE_WATER_TINT_COLOR = [0.10, 0.28, 0.42];
export const SIDE_WATER_TINT_WEIGHT = 0.55;

/**
 * Water specular sun glints — a shader term inside waterMaterial (materials.js).
 * Glints ride the SUN-FACING wave crests: gated by dot(normal, lightDir) — the
 * SAME sun-only quantity that creates the bright/dark wave shading — so a glint
 * sits on the bright crest consistently everywhere, independent of the camera.
 * (The old Blinn half-vector lobe was view-dependent, so the glint drifted
 * relative to the waves across the map: north glints sat on dark patches,
 * south glints between them. Tying glints to the sun-facing slope removes
 * that.) A high-threshold crest mask keeps glints off shadowed troughs, a
 * value-noise mask breaks them into flecks, and a mild fresnel term gently
 * gathers them at grazing distance. The glint is additionally gated by the
 * sun's shadow map (inside waterMaterial) so it never sparkles inside object
 * shadows. Rivers mask themselves out via their flow
 * amplitude; bank walls never glint.
 */
export const WATER_SPEC_STRENGTH = 0.9;          // peak sparkle color contribution
export const WATER_SPEC_COLOR = [0.93, 0.97, 1.0]; // slightly cool white at peak
export const WATER_SPEC_CREST_LO = 0.45;        // dot(normal, lightDir) where glints begin (bright side)
export const WATER_SPEC_CREST_HI = 0.75;        // dot(normal, lightDir) where glints are fully on
export const WATER_FRESNEL_POWER = 2.4;         // grazing-angle exponent
export const WATER_FRESNEL_BASE = 0.7;          // glint base level (keeps steep/near-camera water lit)
export const WATER_FRESNEL_STRENGTH = 0.4;      // mild grazing gather (avoids a strong locational bias)
export const WATER_SPARKLE_FREQ = 7.0;          // value-noise sparkle cell density (cells per world unit)
export const WATER_SPARKLE_ONSET = 0.66;        // value-noise level where a sparkle cell ignites (0..1)

/**
 * Terrain fill colors (RGB 0-1 tuples for vertex color attributes).
 * Base color per terrain type; biomes can override per-tile via palette.
 */
export const TERRAIN_COLOR = {
  plains:        [0.455, 0.678, 0.365],  // #74ad5d — vibrant meadow green
  forest:        [0.294, 0.557, 0.255],  // #4b8e41 — deep vivid forest
  deepWood:   [0.176, 0.420, 0.137],  // #2d6b23 — dark rich green
  desert:        [0.839, 0.694, 0.357],  // #d6b15b — warm golden sand
  marsh:         [0.506, 0.600, 0.404],  // #819967 — murky vibrant marsh
  mountain:      [0.529, 0.486, 0.416],  // #877c6a — rocky warm gray
  water:         [0.157, 0.376, 0.545],  // #285f8b — deep ocean blue
  ice:           [0.649, 0.820, 0.957],  // #a6d1f4 — pale ice blue
  beach:         [0.910, 0.847, 0.627],  // #e8d8a0 — warm sand
  river:         [0.176, 0.529, 0.902],  // RIVER_COLOR — flowing channel blue
};

/**
 * Terrain elevation values (Y offset for each terrain type).
 * Applied during terrain mesh generation.
 */
export const TERRAIN_ELEVATION = {
  plains: 0,
  forest: 0.15,
  deepWood: 0.20,
  desert: 0,
  marsh: -0.05,
  beach: -0.05,
  hill: 0.25,
  plateau: 0.70,
  mountain: 0.85,
  water: -0.15,
  ice: -0.12,
  // River's table value is transient — carveRiverBeds() sets the real channel
  // elevation below the banks. This entry only keeps resolveElevation() quiet.
  river: -0.05,
};

/**
 * Hit-test tolerance (fraction of hex radius) for terrain picking.
 * Used in hexPicking.js
 */
export const PICK_TOLERANCE_FRACTION = 0.9;

/**
 * Twinkle pulse for feature-FX star accents (featureFx.js — knot / fruit
 * glints via fxStarMaterial). These are deliberate "magic marker" stars on
 * features, distinct from the water glints above.
 */
export const SPARKLE_TWINKLE_SPEED = 3.0;
export const SPARKLE_TWINKLE_AMP = 0.45;
