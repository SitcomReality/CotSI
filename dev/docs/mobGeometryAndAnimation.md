# Mob Geometry & Animation — design notes

Mined from two hand-authored experiment descriptors (both deleted after this
doc was written, so the ideas survive without the unregistered files):
`data/infernalpaca.js` (429 lines, schema-clean, included an imperative
animation runtime) and `data/scorpelican.js` (378 lines, ended in a bare JSON
block = syntax error, carried a declarative animation-clip spec). A third
deleted file, `data/waterDecor.js`, was a small unused water-decor experiment
(see §6).

This doc records what the experiments taught us so future mob work can build
on established conventions instead of re-deriving them.

---

## 1. Where mobs live today

Mobs are **entity descriptors, one file per archetype**:

- Each archetype lives in its own file under
  `src/render/hexmap3d/worldObjects/descriptors/data/mobs/` (e.g.
  `infernalpaca.js`, `scorpelican.js`), exporting a `<NAME>_VARIANT` block:
  `{ id, parts, material? }`. The variant id must equal the mob's
  `archetypeName` (resolved via variantRule 'archetype'). A variant may carry
  its own `material` (emissive only) — the infernalpaca glows, the others
  don't.
- `data/mob.js` is a thin barrel: it imports the variant blocks and composes
  `MOB_VARIANTS` (variant id → variant) plus `MOB_DESCRIPTOR`
  (`variantRule: 'archetype'`, `parts: MOB_VARIANTS.default.parts`, `variants`
  from the table).
- The roster is exactly: mushroom, infernalpaca, leopard, goose, scorpelican,
  snail, tapir (plus the `default` fallback). Tier-2 variants were removed in
  the scorpelican/infernalpaca rework — `MOB_TIER2_VARIANTS` is gone and all
  mobs render their baseline archetype variant (tier is still carried in game
  stats).

Because the barrel is composed from tables imported by game code, the editor's
save writes only the active variant — `data/mobs/<archetype>.js` for mobs,
`data/bases/<faction>.js` / `data/champions/<faction>.js` for the entity kinds —
and never rewrites the barrel itself. A variant the barrel does not import
saves fine but stays unregistered in-game until its import is added by hand.
Remaining deferred geometry-editor content: `dev/docs/futureWork.md` §4.

**Adding a new mob archetype = one new `<NAME>_VARIANT` file in `data/mobs/`**
(the variant id must equal the mob's `archetypeName`) + a line in the
`data/mob.js` barrel.

## 2. The joint-group convention (already supported by schema v5)

The descriptor schema already provides everything needed to author
poseable geometry — no new schema work required:

- A **group** (a node with `children` and no `shape`) is a pivot/joint.
- `localPos` places the joint origin relative to its parent.
- `localAxis` + `localAngle` (radians) set the rest pose rotation about that
  axis — e.g. a neck group with `localAxis {1,0,0}`, `localAngle -0.15` is a
  slight forward pitch.
- Groups must use `localPos` (not root-only `y`/`lift`): `normalizeDescriptor`
  folds stray root-only fields into `localPos.y` rather than rejecting them,
  but authored code should just write `localPos`.

`recordBuilder.js` `groupFrameMatrix` (~line 501) composes each frame as
`T(localPos) · R(localAxis/localAngle) · R_y(rotY) · S(scale)`, and
`collectPart` accumulates ancestor frames so a nested leaf's fully baked
world matrix is the product of every joint above it. Nested leaves bake their
bottom anchor **after** rotation, **before** scale, so a leaf's lowest vertex
lands exactly at its `localPos` point.

Net effect: a bone chain renders correctly today — what's missing is only
per-frame re-rotation at runtime (§5).

## 3. FK chain patterns (from scorpelican)

**Tailed chain (recurved stinger arc).** Root group `tail-joint-1`
(`localAxis {1,0,0}`, `localAngle -0.5`, arches back/up) holds a segment
cylinder bottom-anchored at the joint origin; the next joint nests as a child
with `localPos` at the segment's top, pitching further (`0.4`, then `0.6`),
each carrying its own segment. The chain ends in a bulb group (poison sac +
stinger needle pointing forward/down). Taper the radii down the chain
(`0.05 → 0.045 → 0.04 → 0.032`) and ramp the colors up; the accumulated
pitch makes the tail curl over itself.

**Hinged lower beak.** `lower-beak-hinge` nested in `head-joint`, holding a
pouch/beak shape hanging off it; the hinge is the natural animation target
for a jaw-drop attack.

**Legs.** A root group per leg (`localPos` at the hip, offset outward) holding
thigh + foot shapes — exactly the pivot a gait animation needs.

## 4. Animation approaches explored

The two files explored opposite runtimes for the same problem: mutating joint
transforms per frame. Both target nodes by `id` across the whole tree
(groups and leaves alike).

### A. Imperative runtime (infernalpaca)

Exports `INFERNALPACA_ANIMATIONS` + `applyAnimation(descriptor, clip, time)`.

```js
// Clip shape
{ loopDuration: number, tracks: [
  { targetId, property: 'localAngle' | 'rotY' | 'localAxis' | ...,
    mode: 'add',                        // additive: transform += evaluate(t)
    evaluate: (t) => number,
  },
  { targetId, property: 'localAxis',    // assignment: transform = value
    value: { x, y, z } },
] }
```

`applyAnimation` `structuredClone`s the descriptor, indexes nodes by id, and
mutates each track's target transform, returning the clone. Note: `loopDuration`
was declared but unused — `time` is consumed raw, so looping must wrap
externally.

**Idle clip** (5 additive tracks, `loopDuration: 3.0`): neck/head sine wobbles
(`sin(t·2.0)·0.04`, `cos(t·2.0)·0.03`), tail yaw (`sin(t·3.5)·0.25`), and an
ear-twitch via a **12th-power half-wave rectified sine**
(`Math.pow(Math.max(0, sin(t·2.5)), 12) · 0.3`) — a sharp periodic spike —
with the right ear lagging the left by 1.2 s.

**Walk clip — diagonal (trot) gait** (`loopDuration: 1.0`): each leg group
first gets an **axis assignment** (`localAxis {1,0,0}`) — essential, since
the swing plane isn't authored on the leg groups — then an additive
`localAngle = sin(t·6.28)·0.45`. Opposite corners move in phase
(`leg-fl` + `leg-br`), the other pair at `sin(t·6.28 + π)·0.45`; a head bob
at 2× cadence (`sin(t·12.56)·0.08`). Frequency 6.28 rad/s = one stride per
second; amplitude 0.45 rad ≈ 25.8°.

### B. Declarative clip spec (scorpelican)

A pure data spec — a runtime would evaluate
`value(t) = func(frequency · t + phase) · amplitude`:

```js
{ targetId, property: 'localAngle',
  func: 'sine' | 'sawtooth', frequency, amplitude, phase }
```

Three clips: **idle** (breathing head bob, symmetric wing fold, tail bob at
`frequency 2.4`, `phase 1.2`), **walk** (legs at `frequency 5.0`, opposite
legs `phase`-offset by π, wings counter-balancing), and **attack** — the
interesting one — `tail-joint-1` `localAngle` as a **sawtooth**
(`freq 4.0`, `amp 0.8`) to whip the whole chain in a rapid stinger jab, plus
`lower-beak-hinge` sine (`phase -1.0`) for a hissing jaw-drop.

Frequencies are angular rates (rad/s), phase in radians; sign of `amplitude`
encodes direction. The spec defines **no loop-duration field** — worth adding
in a real implementation.

### C. Verdict for a real implementation

The declarative spec (B) is the better kernel: it's data, so it can live in
descriptors and be authored/validated like geometry; the imperative runtime
(A) shows the hard parts — swing-plane axis assignment, diagonal-gait phase
math, half-wave rectified twitches — which are expressible as declarative
tracks (`sine`, `sawtooth`) plus a `delay`/`phase` field. Keep A's
`applyAnimation` node-indexing structure (clone → index → mutate → return).
Add explicit `loopDuration` handling.

## 5. The missing runtime piece

Descriptor records bake **static matrices at build time** (`recordsForEntity`
→ per-part records with complete baked matrices; `buildDescriptorMeshes`
writes `InstancedMesh` matrices once). There is no per-frame re-derivation
hook in the descriptor pipeline.

The opening is `units/unitMeshes.js`: **mob meshes are already rebuilt every
render pass** (line ~31: "Unit meshes are rebuilt every render pass; these
materials are built once and marked shared so the per-frame disposal skips
them"). An animation hook slots between record derivation and mesh build:

1. per frame, take the animated entity, `applyAnimation`-style clone with the
   active clip's tracks applied at `t`;
2. re-derive records for the mutated descriptor;
3. rebuild the InstancedMeshes; dispose the old ones (shared materials skip
   disposal via the `shapeFactories` cache).

Cost = clone + record re-derivation + InstancedMesh rebuild per animated
frame — which is exactly the existing per-pass perf model (the shared-material
cache exists for it). `movementAnimator` is champion-only (parents a
snapshotted mesh at interpolated world positions) and unrelated to descriptor
matrices.

## 6. Other bits worth keeping

- **Faction-token colors.** Descriptor colors may be `'factionBase'` /
  `'factionAccent'` strings. The **mob palette supplies `factionBody` +
  `factionAccent`** (bodies darkened via `MOB_COLOR_DARKEN`) — `factionBase`
  is champion-only. Use the mob tokens in mob descriptors; `factionBase`
  there resolves to `undefined` (the scorpelican experiment used it in 3
  places and would have rendered those parts uncolored).
- **Emissive glow.** Object-level `material: { emissive, emissiveIntensity }`
  in a descriptor is passed through by `shapeFactories.materialForPart` — any
  mob gets an all-parts glow for free (infernalpaca used `0xff3e00 @ 0.35`).
  Since the mob rework, a **variant-level `material`** is also supported:
  `meshAssembly` resolves `variant.material` per part, so one multi-variant
  descriptor (the mob barrel) can glow a single variant
  (`data/mobs/infernalpaca.js`) without glowing the others. No per-part
  emissive (yet).
- **waterDecor** was a discarded water-surface decor idea (torus ripple ring
  + `lilyPad` / `seafoam` / `kelpFrond` variants, `kind: 'decor'`, never
  registered). Revive from git history if water-surface decor is ever wanted.
