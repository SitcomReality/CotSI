You’re not crazy — the “systems feel disconnected” feeling is coming straight from the architecture, not just from having 3 placeholder biomes. The good news: your bones (seeded FBM, chunk-seamless global coords, multi-pass tagging, archetype thresholds) are solid. The bad news: **biome, height, and moisture are mostly three parallel random fields that only meet at the end in a flat if-else.**

Here’s what I’d tell you as a fellow dev.

---

## The core problem

Right now the dependency graph looks like this:

```
elevation noise  ──┐
moisture noise   ──┼──► classifyTerrain() ──► label
biome noise      ──┘         ▲
                             │
                    biome only tweaks thresholds
                    + adds moistureBias
```

So you get situations like:

- A hex is “arid biome” but rolled high moisture → forest inside an arid region  
- A hex is “lush” but low moisture → desert patch inside lush  
- Mountains ignore moisture entirely (always mountain/peak once elevation clears a bar)  
- Biome boundaries are unrelated to coasts, ridges, or wet/dry patterns  

`moistureBias` and per-biome thresholds try to paper over that, but they’re fighting independent noise instead of *deriving* climate from it.

**Natural worlds feel coherent when moisture and temperature/height *cause* biomes — not when biome is a third coin flip.**

---

## What’s working (keep this)

1. **Global (q,r) noise sampling** — seamless chunks are the right call.  
2. **Storing `rawElev` / `rawMoist`** — you’ll want these for rendering and second passes.  
3. **Archetype-driven thresholds/features** — good fantasy hook (god-scarred regions can change the rules).  
4. **Separate passes** for classify → mountain tag → water tag → features.  
5. **Pure functional chunk gen** — easy to evolve.

---

## Highest-impact fixes (in order)

### 1. Stop choosing biome from its own noise alone

This is the big one:

```js
hexBiomeId = biomeForRoll(hexFbm2D(q, r, seed + 1999, NOISE_BIOME));
```

That makes biome a **territory stamp**, not a climate outcome.

**Two viable designs** (pick one; both beat the current hybrid):

| Approach | Best when | How |
|----------|-----------|-----|
| **A. Climate-first (realistic / “sim” feel)** | You want mountains → alpine, coasts → wet, rain shadows, etc. | Biome/terrain = function of `(elevation, moisture[, temperature])`. No `NOISE_BIOME` as primary. |
| **B. Region-first (fantasy realms)** | You want “Godfall Crater vs Quiet Sea” style macro regions | Low-frequency region noise picks *archetype* (rulebook). Inside the region, elev+moist still drive terrain. |

You’re building a divine-war fantasy game — **B is probably your sweet spot**, but only if region noise is *much* lower frequency than elev/moist, and terrain inside a region is still climate-driven.

**Anti-pattern (what you have now):** same-scale biome noise + elev + moist, all peers.

---

### 2. Add a real climate model (even a tiny one)

Minimum viable “these systems affect each other”:

```text
temperature = f(latitude-or-fake, elevation)   // lapse rate: higher = colder
moisture    = baseMoisture noise
              + coastal/water proximity (pass 2)
              - elevation * drynessFactor      // uplands drier (or wetter windward — your call)
terrain/biome = lookup(elevation, moisture, temperature)
```

Even crude versions read as “designed”:

```js
// sketch — not drop-in
const temperature = clamp01(0.85 - elevation * 0.7 + latBias);
const moisture = clamp01(rawMoist + moistureBias - elevation * 0.25);
```

Then classify with **both axes**, e.g. conceptually:

```text
low elev + high moist          → marsh / water edge
mid elev + high moist          → forest / dense forest
mid elev + mid moist           → plains
mid elev + low moist           → desert / scrub
high elev + low temp           → peak / snow
high elev + mid moist          → alpine slope
very high elev                 → peak
```

Right now `classifyTerrain` is mostly:

1. height gates (floating/peak/mountain/water)  
2. then moisture-only gates (dense/forest/desert)  
3. then one combined marsh check  

So **height and moisture rarely co-author the result.**

---

### 3. Two-pass moisture (huge perceived coherence)

Single-pass moisture noise cannot know where oceans/lakes ended up.

**Pass structure that suddenly feels “alive”:**

1. **Elevation field** (and continent mask — see below)  
2. **Provisional water** from elevation (+ maybe moisture)  
3. **Resample / adjust moisture**:  
   - boost near water  
   - optional rain-shadow: march samples “upwind,” subtract if high terrain blocks  
4. **Final classify** terrain + biome  

You already have multi-pass infrastructure; this fits cleanly after Pass 1 / before features.

---

### 4. Separate noise *scales* (macro vs micro)

Even with great formulas, if all FBM calls use similar frequency, everything looks like camouflage blotches.

Aim for explicit roles:

| Field | Frequency | Role |
|-------|-----------|------|
| Continent / ocean mask | Very low | Big landmasses, bays |
| Region / “divine domain” | Very low | Which archetype rules apply |
| Elevation detail | Med + high | Hills, ranges |
| Mountain ridges | Ridged, med | Chains, not popcorn mountains |
| Moisture | Low–med | Climate bands; warp with elev |
| Features / debris | High | Local garnish only |

If `NOISE_BIOME` isn’t dramatically broader than `NOISE_ELEVATION`, multi-biome mode will always feel noisy and arbitrary.

---

### 5. Elevation: one mask × detail beats one FBM

A simple upgrade over “one elev noise, threshold to water/mountain”:

```js
const continent = fbm(q, r, seed, CONTINENT_PARAMS);      // low freq
const detail    = fbm(q, r, seed, DETAIL_PARAMS);         // higher
const ridges    = ridgedFbm(q, r, seed, RIDGE_PARAMS);    // optional

const elevation = clamp01(
  continent * 0.65 +
  detail * 0.25 +
  ridges * 0.15 * continent   // mountains prefer land
);
```

Why it helps: oceans feel like oceans, mountains cluster into ranges on land, islands make sense. Your water BFS already treats map-edge as ocean — a continent mask makes the *interior* match that story.

---

### 6. Make `classifyTerrain` a table, not a priority pile-up

The current chain encodes hidden policy (e.g. dense forest beats desert regardless of height; mountains ignore aridity). That’s fine if intentional — but it’s opaque and hard to tune per biome.

Prefer something you can stare at and balance:

```js
// Pseudocode: first match wins, rules defined per archetype
const rules = [
  { when: (e,m,t) => e > T.float,           out: 'floatingIsland' },
  { when: (e,m,t) => e > T.peak,            out: 'peak' },
  { when: (e,m,t) => e > T.mt,              out: 'mountain' },
  { when: (e,m,t) => e < T.water && m > T.wMoist, out: 'water' },
  { when: (e,m,t) => m > T.marshM && e < T.marshE, out: 'marsh' },
  { when: (e,m,t) => m > T.dense && e < T.treeLine, out: 'denseForest' },
  // ...
  { when: () => true, out: 'plains' },
];
```

Per-biome archetypes then supply **different rule params** (or different rule lists) — that’s how “Ichor Fens” vs “Litany Desert” become systemic, not just tint + bias.

Also consider a **tree line**: forests shouldn’t win on peaks just because moisture noise was high.

---

### 7. Features should read the same climate story

Pass 4–5 spawn from independent rolls + terrain class. Upgrade path:

- Tree density scales with `rawMoist` and falls off with elevation  
- Rocks more common on slopes / low moisture  
- Fruit trees need moist + not-mountain  
- Knots / resources cluster with ridge noise or biome region, not pure white noise  

Same fields → same narrative.

---

### 8. Small concrete bugs / smells in the current code

- **`fallbackT` for neighbor approx** uses default biome while multi-biome hexes use their own `T`. Mountain/water tagging across chunk edges can disagree with what the neighbor chunk actually generated for that hex. Prefer recomputing neighbor biome the same way (same `NOISE_BIOME` roll at `nq,nr`) — still local, still seamless.  
- **`tagMountainType` can set `mountainType = 'peak'` while `terrain` stays `'mountain'`** — overlapping vocabulary (`terrain: peak` vs `mountainType: peak`) will confuse later systems.  
- **Displayed `elevation: resolveElevation(terrain)`** collapses continuous noise to a per-type constant. Fine for gameplay placeholders; for “feel,” render height from `rawElev` (or blended) and keep type separate.  
- **`BIOME_DISTRIBUTION` hard limits (0.4 / 0.7 / 1.0)** on raw FBM are hard to author. If you keep region noise, use few large regions + archetype table, not equal noise bands.  
- **Water needs elev+moist, but forests don’t care about elev** — asymmetric coupling is a big part of the “disconnected” vibe.

---

## A target pipeline (fits your chunk design)

```text
For each hex (global q,r):
  1. regionId   = lowFreq region noise → archetype (fantasy domains)
  2. elev       = continentMask * (detail + ridges)
  3. baseMoist  = moisture noise (+ archetype bias)
  4. temp       = baseTemp - elev*lapse (+ optional lat)
  [end pass 1 per chunk]

Optional global-ish pass 2 (or lazy neighbor lookups):
  5. provisional water from elev (+ moist)
  6. moist'     = baseMoist + nearWaterBoost - rainShadow(elev, wind)

Final:
  7. terrain    = classify(elev, moist', temp, archetype.rules)
  8. tags       = mountain/water structural tags
  9. features   = spawn(elev, moist', temp, terrain, archetype)
```

Still seamless if every sample is a pure function of `(seed, q, r)`.

---

## What I would *not* do yet

- Full hydraulic erosion (fun, expensive, painful with chunks).  
- Real watershed simulation for v1.  
- 15 biomes before the climate graph works — **3 biomes will already feel better** once they’re outputs of elev+moist(+region rules).  
- More independent noise channels (“magic”, “corruption”) until the first three talk to each other. Add them as *modifiers* on moist/temp/elev later.

---

## Practical refactor order (minimal thrash)

1. **Fix neighbor lookup** to use per-hex biome noise (correctness).  
2. **Split frequencies** — region/continent low, detail high (feel).  
3. **Derive temperature from elevation**; feed into classify (coupling).  
4. **Rewrite `classifyTerrain`** as explicit multi-axis rules + tree line (authorability).  
5. **Two-pass moisture near water** (coherence punch-up).  
6. **Drive features from moist/elev**, not only terrain enum.  
7. Only then expand biome list / divine-scar archetypes.

---

## Mental model one-liner

> **Noise should create *physical fields*. Biomes should be *conclusions*. Archetypes should be *alternate laws of physics* for how those conclusions are drawn — not another field competing with them.**

---

If you want to go further next, I can:

- sketch a drop-in `classifyTerrain` + climate helper that matches your archetype shape, or  
- propose specific `worldParams` frequency scales / channel layout, or  
- design how your god-war biomes (from earlier) plug in as archetypes without wrecking climate coherence.

But if you only take one thing from this: **make biome an output of (and/or a low-frequency rulebook over) elevation+moisture, not a peer noise roll.** That’s the difference between “three layers of static” and “a world.”