# Music System

How the procedural music and one-shot SFX work in CotSI, and how to extend
them. Replaces the deleted `gameIntegrationGuide.md` (Canopy studio export
format).

---

## Architecture

| Piece | Location | Role |
|---|---|---|
| Tone.js (vendored) | `src/vendor/tone/` | ESM build of tone 15.1.22 + its deps (`tslib/`, `standardized-audio-context/`, `automation-events/`). Bare imports were rewritten to relative paths; extensionless imports fixed. Treat like `three.module.js`: do not edit |
| Score modules | `src/game/music/scores/*.score.js` | Self-contained Canopy studio exports: embedded song data (`export const score`) + synth graph builder + 16-step sequencer + reactive-dynamics core. **Do not hand-edit below the `score` object** — regenerate from the studio. The only sanctioned edit is the top `Tone` import path |
| Music director | `src/runtime/audio/musicDirector.js` | Decides *when* the score API runs: game start, combat transitions, victory, mute, track switching. One score plays at a time (module-level state) |
| Mute state | `src/shared/muteState.js` | Global mute singleton; future SFX must reuse it instead of keeping its own switch |
| Mute button | `src/ui/muteButton.js` + `#muteBtn` in `gameLayout.inc` | Registers `toggleMute`; glyph follows mute state; persists via `persistSettings` |

## Score public API (stable, per Canopy schema v4)

```js
import { startScore, stopScore, setGameMusicState, musicEvent, disposeScore }
  from '<score>.score.js';
```

- `startScore()` — async; unlock AudioContext, build graph, start looping.
- `stopScore()` — stop transport, reset to bar 0. Graph stays warm for fast restart.
- `setGameMusicState({ threat = 0, inCombat = false })` — steer context: `inCombat || threat > 0.7` → `combat`, `threat > 0.3` → `unease`, else `explore`. Queued; applied at the next bar boundary (~2 bars latency at slow tempos is intentional).
- `musicEvent('victory')` — rising arpeggio flourish at the next bar; resolves back to explore.
- `disposeScore()` — free all Web Audio nodes; required before switching tracks.

## CotSI wiring (who calls what)

- `presentGame()` (`runtime/beginGame.js`) → `startMusic()` — fire-and-forget after the Start click (browser gesture unlock). Idempotent; also covers load-a-save.
- `startCombat()` / `closeCombat()` (`runtime/combat/combatLifecycle.js`) → `musicCombat(true/false)` → `setGameMusicState`.
- `refreshAll()` victory branch → `musicVictory(G.winnerId)` (fires once per winner id).
- Mute changes (`shared/muteState.js`) → director sets `Tone.Destination.mute`, so music and any future SFX sharing Tone are silenced together.
- Persistence: settings document carries `audio: { muted }` (`settingsDocument.js` + `runtime/settingsStore.js`).

## Adding a new track

1. Export from Canopy → drop `<name>.score.js` into `src/game/music/scores/` (camelCase file name).
2. Run `node dev/scripts/import_score.mjs <path-to-file>` (or `./dev/scripts/import_score.mjs`).
   It rewrites the `Tone` import to the repo-relative path, stamps a `GENERATED`
   provenance header (`contentSha256` of the module body), and runs the read-only
   `scoreTiming` guard. If the guard fails the export is stale — re-export from the
   studio that carries the per-voice ordering / collision fixes rather than
   hand-patching. `--check` verifies an already-imported file read-only.
3. Register it in `SCORE_MODULES` in `src/runtime/audio/musicDirector.js` (and optionally make it `DEFAULT_TRACK_ID`).
4. Extend the API-contract test in `dev/tests/game/music/scores.test.js` if adding fields.

Switch at runtime with `setMusicTrack(trackId)` — disposes the old score first and restarts if music was playing.

## SFX

| Piece | Location | Role |
|---|---|---|
| Presets | `src/params/audio/sfxParams.js` | Pure data: each named preset is a list of voices (`synth` / `noise` / `membrane`) with Tone constructor options, dB volume, and `notes` of `[note, offsetSeconds, duration]` (noise voices use `null` in the note slot) |
| Director | `src/runtime/audio/sfxDirector.js` | `playSfx(name)` fires a preset; voices are built lazily per name+index and reused. Shares the vendored Tone module and `Tone.Destination` with music — the global mute silences both |
| Unlock | `runtime/bootstrap.js` | First `pointerdown` calls `unlockSfx()`; music start also unlocks the shared context |

Wired triggers (all in `src/runtime/`):

- UI press on any `[data-action]` element → `uiClick`, via `initClickFeedback()` injection into `shared/actionBus.js` (its own `_getGameState` injection pattern).
- Turn committed (`endTurn.js`, both confirm and immediate paths) → `turnWhoosh`.
- Combat round damage (`combat/combatRoundEnd.js`) → `combatHit`; victory → `spoils`; dungeon completed → `dungeonConquered`; champion death → `championDown`.
- Generic reward modal (`rewardPrompt.js`: dig loot etc.) → `reward`.

### Adding an SFX

1. Add a preset to `SFX_PRESETS` in `sfxParams.js` (camelCase name).
2. Call `playSfx(name)` from the runtime code that owns the event.
3. Extend the contract test in `dev/tests/params/audio/sfxParams.test.js`.

## Known limits

- Games cannot drive axes directly — only the three context presets via `setGameMusicState` (a future `setGameAxes` is planned upstream).
- Only the `"victory"` event exists; other names are ignored.
- One score instance per page (module-level state in each score).
- No pause/resume API; use `stopMusic()`/`startMusic()`, or `Tone.getTransport().pause()/start()` for mid-loop suspension.
- All sounds are synthesized; first `startScore()` pays ~100 ms reverb impulse generation. Pre-warm during loading if needed.

## Same-time collision guard

Tone requires each voice's start times to strictly increase in *call* order
and rejects violations with "The time must be greater than or equal to the
last scheduled time". Two layers of defense:

- The generated scores avoid authoring collisions (fill kick vs straight
  downbeat kick, melody fill at base+40 ms, snare roll clear of the 0.02
  accent and the 0.065/0.11 doubles).
- The playback loop resolves each event's target voice (snare accents fall
  back to the hat synth) and stable-sorts events per voice by time before
  triggering, so emission order can never invert times on a voice.

`dev/tests/game/music/scoreTiming.test.js` pins both against future
re-exports — if a fresh studio export fails that test, port the fixes into
the studio's `dynamics.js` / playback loop rather than hand-patching here
long-term.
