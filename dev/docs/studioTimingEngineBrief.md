# Canopy Studio Timing Engine — Agent Brief

You are implementing a **single centralized timing engine** for Canopy Studio,
replacing the current arrangement of per-layer timers, independent schedulers,
and ad-hoc fixes. This brief is self-contained: follow it directly and read the
attached reference files where pointed to. It assumes you are working in the
studio repo (`canopy-generative-score-studio/`), not in the CotSI repo the
references were copied from.

---

## 1. Problem statement

The studio currently has many components running their own timers/schedules
(`Tone.Transport.scheduleRepeat`, repeated `Tone.Draw.schedule`, per-layer loop
objects, rAF-coalesced UI batching, the recording AudioWorklet). Observed
failures:

- Layers drift apart over the course of playback.
- Simply muting or unmuting a layer in the player throws the whole timing out.
- Every new feature adds its own timer, compounding the desync.

**Root cause pattern to eliminate:** playback position is being derived from
accumulated callback invocations or per-layer timer counts, and toggle handlers
respond by cancelling/restarting/rescheduling loops. Both make musical position
a *side effect* of control flow instead of a pure function of elapsed audio
time.

Concretely, in today's studio the failure lives in two specific spots — the
agent must root them out, not paper over them:

1. **The step counter is shared mutable state.** The sequencer keeps an internal
   `stepIndex` and increments it per `scheduleRepeat` callback, and
   `engine-host.js` documents the exact bug this brief removes: disposing
   mid-transport leaves the shared Tone transport running while its callback is
   cleared, and restarting it *desyncs the step counter*. Position must be
   recomputed from audio time, never carried forward in a counter.
2. **Mute is a data mutation, not a gate.** `toggleMute` flips `layer.muted` in
   the project, and the dynamics core re-reads it next step to *omit* those
   events. Because muted layers stop consuming the seeded RNG stream, muting or
   unmuting one layer silently re-rolls every other layer's subsequent
   humanize/variation draws — the audible "everything shifts" symptom. The
   layer's place in the deterministic stream must be unaffected by whether it is
   audible.

---

## 2. Goal and hard rules

Build **one** scheduling engine that owns all timing for the entire app. Then:

1. **Exactly one time authority.** Every timed thing in the codebase routes
   through the engine. Zero raw `setTimeout`/`setInterval`/`rAF`/
   `Transport.schedule` calls anywhere else (keep the internal engine ticker
   as the only allowed site; it becomes a grep-enforceable rule). This includes
   UI animation coalescing — route frame batching through the engine's ticker
   rather than a second rAF loop.
2. **The time base is the audio clock**, i.e. `AudioContext.currentTime`
   (reached via `Tone.context.currentTime` / `Tone.now()`), **not**
   `performance.now()`, not `Date.now()`, not rAF frames, and never accumulated
   interval counts.
3. **Musical position is a pure function of audio time.** Given a baseline
   `(audioOrigin, musicalOrigin, musicalRate)`, position at time *t* is
   arithmetic. No component may advance "the beat" by incrementing counters in
   callbacks. `musicalRate` is beats-per-second — it is part of the baseline
   because the mapping slope changes with tempo (see §5.3); the tuple is never
   just `(audioStart, musicalStart)`.
4. **Toggling a layer (mute / solo / enable) must be a gating operation only**
   — it filters whether events hand off to their voices at the emission
   boundary. It must never cancel, restart, rebuild, re-anchor, or alter what
   events are *generated*. Playback keeps flowing identically through every
   toggle.
5. **Errors never stop the clock.** A throwing layer callback or timer is
   caught, logged, and skipped; all other due work in the same pass still runs.

If a proposed change would violate any of these five, stop and reconsider it.

---

## 3. What to take from the CotSI references — and what NOT to

Attached reference material (copied into the studio's `dev/timingUpdate/` from
the Champions of the Supernal Interregnum repo):

| File | Take | Why |
|---|---|---|
| `clockScheduler.js` | The overall shape: one singleton clock, one owned loop, id-based handles, try/catch isolation around every dispatched callback, `dispose()` doing full teardown | This is the proven "single authority" skeleton |
| `timerQueue.js` | The task-queue pattern: tasks carry an **absolute** fire time, cancel-by-flag (never splice mid-iteration), lazy sort right before expiry checking, `reschedule()` producing the next cycle | Clean bookkeeping for due-event selection |
| `speedGroup.js` | Only the *idea* of "each slot owns `{ now, paused, … }` and advances arithmetically" | You will have **one** clock, not five groups |
| `clockScheduler.md` | The documentation style and the "Rules" section format (including the rule about where raw timers are forbidden) | Deliverable template for your engine's doc |
| `musicSystem.md` → *"Same-time collision guard"* | Tone rejects non-increasing start times *per voice*; defense = author no collisions + stable-sort events per voice by time before triggering + fallback voice routing for accents | This rule still applies inside each layer's voices |

### Adaptations that are mandatory (do not copy blindly)

CotSI's clock is a **game-logic clock**: rAF-driven, `performance.now()`-based,
with per-group virtual clocks for pause/speed. For a musical scheduler that is
exactly wrong. Required deviations:

- **No speed groups, no master-pause-in-five-groups machinery.** One clock, one
  slot. The one meaningful exception is already scoped out separately below.
- **Audio-clock time base with a lookahead scheduler.** Inside the engine only,
  run a coarse ticker (`setInterval` ~25 ms; rAF also acceptable) and, each
  pass, schedule/dispatch all events whose target time falls in
  `[now, now + lookahead]` (~0.1 s). Events are handed to voices **ahead** of
  time with exact audio timestamps, so main-thread jitter, dropped frames, or a
  busy GUI can never retime notes.
- **Never derive note times from ticker invocation counts.** The ticker only
  observes; it computes windows from `audioNow()`.
- **Pause must revoke in-flight schedules.** Because events are pushed up to a
  lookahead into the future, pausing means: stop ticking, then cancel/release
  every already-scheduled-but-not-yet-sounded event or voice (see §5), then on
  resume re-baseline the audio↔musical mapping and continue. Resuming must
  land back on the correct musical position.
- **Keep the good bits unchanged:** id-based cancel, absolute fire times,
  cancel-by-flag, lazy sorting, per-callback error isolation, idempotent
  `start()`, thorough `dispose()`.

---

## 4. Suggested architecture

Two cooperating halves in **one engine module** (vanilla ES module, matching
whatever naming/layout conventions the studio project uses — there they are
double-quoted, semicolon, camelCase, single-purpose modules that split into a
same-named directory past ~200 lines):

**(a) The general timer service** — replaces all `setTimeout` /
`setInterval` / one-off waits elsewhere in the app. A single monotonic `now()`
derived from the audio clock feeding a task queue (the `timerQueue` pattern).
This is also where UI frame-batching coalesces, so the app has one tick source.

**(b) The musical event pipeline** — the scheduler proper:

```js
// Sketch only — refine freely, keep the responsibilities.
const eng = getScheduler();

eng.registerLayer('lead', {
  // Called in ascending-time order whenever events fall in a lookahead
  // window. Receives ABSOLUTE audio-context timestamps.
  onEvents(events) {
    for (const ev of events) {
      if (!this.enabled) continue;   // gating only — timing untouched
      const handle = this.voice.triggerAttackRelease(
        ev.note, ev.duration, ev.time, ev.velocity);
      this.pending.push(handle);      // revocable on pause (§5)
    }
  },
});

eng.setTempo(96);
eng.play();            // anchor = { audioOrigin: Tone.now(), musicalOrigin: 0, musicalRate: ... }
eng.setLayerEnabled('lead', false);  // gates next emission; zero timing impact
eng.pause(); eng.resume();           // re-anchors; no lost/duplicated steps
eng.dispose();                        // full teardown for track switches
```

Responsibilities split:

| Concern | Owner |
|---|---|
| Computing grid step times from BPM, generating lookahead windows, guaranteeing ascending dispatch per layer, position queries (`bar/beat/step` from audio time), looping by modulo, re-anchoring on pause/tempo/seek | **Engine** |
| Holding actual Tone voices/synths, deciding how to realize an event, resolving same-voice collisions (fallback routing per the collision guard), owning revocable handles, driving audio-timed gain automation (dim/level/velocity) | **Layer adapters** |

**Solo** composes from mutes (effective-gate = enabled ∧ ¬otherSoloed) — but it
is still *only* a gate; nothing else may react to it.

**The layer-adapter seam is the future pure-data boundary.** The studio already
has a clean split that anticipates this: `src/music/dynamics.js` (the
`computeStepFrame` / `orderEvents` core) is pure and Tone-free, and is spliced
verbatim into the exported `.score.js` runtime. Make the *timing* half of the
engine equally pure so that "data describes events, engine schedules them, layer
adapters realize them" holds end to end. Song-data access must stay behind this
seam so the later export-format swap (§8) is mechanical. The current
`computeStepFrame(project, …)` signature reads `layer.muted` directly — that is
exactly the kind of coupling the engine is meant to move to the gate stage.

---

## 5. Edge cases you must handle explicitly

1. **Toggle storms.** Rapid mute/unmute/solo clicks during dense playback:
   audibly nothing may shift, and voice start-times per voice remain strictly
   increasing. Importantly, toggling a layer must **not change the RNG draw
   sequence seen by any layer** (the current `muted` check inside
   `computeStepFrame` does exactly that) — a muted layer keeps consuming its
   share of the stream as if it were sounding.
2. **Play-head re-entry.** Start/stop/start cycles always land on-grid.
   Distinguish **stop** (clear the baseline, return to musical origin, reset
   long-form state) from **pause** (hold position, revoke lookahead) —
   they are different operations with different teardown, even though both
   silence the output.
3. **Tempo change.** Apply at a musical boundary (bar boundary is consistent
   and safe): capture `(t, pos)` at that boundary, set the new `musicalRate`,
   and recompute `audioOrigin` so `pos` stays continuous. Defer the *scheduled*
   re-anchor to the boundary rather than jumping immediately, and decide what
   happens to already-emitted lookahead notes past the upcoming change (recompute
   or bound them — document the choice). Note: the current engine ramps
   `transport.bpm.rampTo(bpm, 0.6)` mid-playback, which contradicts this rule —
   replace it with the boundary re-anchor.
4. **Tab suspension / long GC stalls.** The lookahead window absorbs gaps; a
   gap longer than lookahead means some events fire late-and-clumped or are
   skipped by policy — pick *skip* (musical position comes from the audio
   clock, so playback self-heals) and document it. Never compensate by
   counting lost ticks.
5. **Looping.** The score is a finite 16-step × bar template; confirm with the
   maintainer whether looping is `engine-level` (modulo re-anchor) or
   `template-level` (data describes a one-shot). Whichever, exactly one owner
   knows the loop point — the layer adapters must never special-case wrap-around.
6. **Track disposal and switch.** `dispose()` must free voices, clear queues,
   release the ticker, remove loop/seek/tempo edges, and leave no dangling
   listeners or scheduled Tone events. Switching scores starts from a cold
   engine. This must be safe even if a previous `dispose` was interrupted by a
   throwing callback, and must not race an in-flight `triggerAttackRelease`
   (which can resolve asynchronously in Tone).
7. **First gesture unlock.** AudioContext resume-on-gesture stays outside
   timing logic: unlock, *then* anchor baselines. Anchor after resume, never
   before, and treat `AudioContext.currentTime` as **undefined while the context
   is `suspended`** (it does not advance until running) — never read it to
   anchor, and never schedule an event from it, until the context reports
   `running`.

---

## 6. Working method

This codebase is messy — measure before cutting.

1. **Inventory first (report before implementing):** grep for
   `setTimeout|setInterval|requestAnimationFrame|scheduleRepeat|schedule\(|new Tone\.(Loop|Transport)|Transport\.(start|stop|pause|position)|performance\.now|Date\.now|Tone\.now|setTargetAtTime|setValueAtTime|linearRampTo|exponentialRampTo|Tone\.Draw`
   and produce a table of every hit → what it drives → new home (engine API X /
   deleted). Include the UI rAF batching (`src/ui/render-batch.js`) and the
   recording worklet in the table even though the latter will be intentionally
   scoped out (§8). Tone API calls that carry an explicit audio `time` (e.g.
   `triggerAttackRelease(note, dur, when, vel)`) are the *consumers* your engine
   feeds, not rogue timers — the determiners in this table are the un-`time`d
   calls. Flag any case that genuinely cannot live on one clock, with reasoning.
2. **Separate the pure timing core from the audio host.** The engine's
   scheduling arithmetic (baseline mapping, window generation, due-event
   selection, pause/loop/tempo re-anchor math, gate evaluation) must take an
   **injected clock/ticker** so it runs under `node:test` with no Tone present —
   the same discipline already applied to `src/music/dynamics.js`. A thin
   audio-host wrapper supplies the real `Tone.now()` / ticker.
3. **Write the engine's own unit tests before migrating call sites.** The
   studio has a `node:test` suite (`npm test`, pure modules only) with
   `dev/tests/dynamics-parity.test.js` as the model. Map §5 edge cases 1–6 to
   test cases against the injected clock: window borders, toggle-storm stability,
   pause revocation, tempo re-anchor continuity, stop-vs-pause, looping wrap.
   Keep the existing `dev/tests/score-timing.test.js` green — it pins the
   per-voice ordering guard the engine must preserve.
4. Implement the engine module + its doc (style of `clockScheduler.md`,
   including a Rules section banning raw timers outside the engine).
5. Migrate every inventory row; delete superseded code rather than leaving it
   dormant. Pay particular attention to `engine-host.js`'s documented
   dispose/restart desync and `audio-engine.js`'s `scheduleRepeat` step loop —
   these are the two sites named in §1 and must be gone, not wrapped.
6. Wire player controls (play/stop/pause, mute/solo, tempo) exclusively to
   engine APIs.

---

## 7. Success criteria — all must hold

1. Fresh playback: all layers aligned from the first downbeat.
2. During continuous playback, toggling any layer's mute/solo/enable — slowly
   or rapid-fire — produces **no** shift, hiccup, restart, or drift in any
   layer (including the toggled one rejoining perfectly in-phase), and no
   change to any other layer's deterministic variation/humanize sequence.
3. Ten-plus minutes of runtime: zero cumulative drift between layers;
   positions still agree with wall-clock BPM math.
4. Pause mid-bar, resume: musical position is exact; no stuck notes from the
   revoked lookahead window; no double-triggered events.
5. Tempo change takes effect cleanly at the agreed boundary; position is
   continuous (no glitch at the boundary).
6. Force-throwing layer callback: error logged, all other layers and the
   transport unaffected.
7. No `"Start time must be strictly greater than previous start time"` from
   Tone under stress (criteria 2–4 combined, all layers densest state).
8. Grep audit: the only raw timer / clock-generating sites in the repo are
   inside the engine module (plus the explicitly-scoped recording worklet).
9. `npm test` exits 0, including the engine's own tests and the untouched
   `score-timing.test.js` / `dynamics-parity.test.js`.
10. One documented public API; no caller reaches past it into time internals.

---

## 8. Scope guardrails

- Do **not** redesign the synthesis graph, effects, or the reactive-dynamics
  logic beyond what the collision guard and event piping require. The
  `computeStepFrame` / `orderEvents` core is already pure and correct — treat it
  as fixed input, move only its *timing* and *gating* responsibilities into the
  engine.
- A separate upcoming effort converts score exports to **pure data** (no
  embedded script, no manual Tone import). You are building the playback
  target for that format: the boundary "data describes events, engine
  schedules them, layer adapters realize them" is deliberate. Keep song-data
  access behind the layer-adapter seam so the later swap is mechanical.
- **Explicitly out of scope:** the MP3/WAV recording path (`src/audio/recorder.js`
  and its inline AudioWorklet) captures PCM on the audio thread and is
  intentionally *not* folded into the engine's timer authority — leave it
  functioning untouched and note it as the one intentional exception in your
  inventory table and doc Rules section.
- Seek/scrub has no UI today; confirm with the maintainer whether it should be
  blocked off for a later pass or included. If included, it is a re-anchor to
  an arbitrary musical position via the same baseline mechanism as tempo/pause —
  do not add a second clock for it.
- Match the studio project's own conventions for file names, style, and
  module layout — the ones mentioned here (camelCase modules, single-authority
  clock, banned-name lists) describe the *reference* repo unless yours shares
  them.

---

## 9. Report back

Deliver along with the code: the §6.1 inventory table (before/after, with the
recording worklet flagged as the intentional exception), the engine's own test
results mapped to §5, any points where this brief was silent and a judgment
call was made, and the engine's API doc (Rules section included).