import * as Tone from "../../../vendor/tone/index.js";

export const score = {
  "version": 4,
  "name": "Neon Asphalt",
  "bpm": 82,
  "key": "C#",
  "scale": "Dorian",
  "progression": [
    0,
    3,
    4,
    3
  ],
  "progressionName": "Shadow Drift",
  "reverb": 68,
  "swing": 5,
  "journey": {
    "shape": "tide",
    "length": 16,
    "depth": 42
  },
  "axes": {
    "intensity": {
      "label": "Intensity"
    },
    "tension": {
      "label": "Tension"
    },
    "brightness": {
      "label": "Brightness"
    }
  },
  "contexts": [
    {
      "id": "explore",
      "label": "Dawn Fog",
      "targets": {
        "intensity": 0.2,
        "tension": 0.25,
        "brightness": 0.3
      }
    },
    {
      "id": "unease",
      "label": "Neon Shadows",
      "targets": {
        "intensity": 0.5,
        "tension": 0.65,
        "brightness": 0.45
      }
    },
    {
      "id": "combat",
      "label": "Alleyway Chase",
      "targets": {
        "intensity": 0.9,
        "tension": 0.85,
        "brightness": 0.2
      }
    }
  ],
  "bindings": [
    {
      "target": "tempo.offset",
      "axis": "intensity",
      "domain": [
        0,
        24
      ]
    }
  ],
  "variationSeed": 42,
  "layers": [
    {
      "id": "fog-pad",
      "name": "Slick Wetness",
      "detail": "Slow-filtering atmosphere chords",
      "role": "harmony",
      "color": "#4a7a96",
      "muted": false,
      "instrument": "Velvet pad",
      "density": 50,
      "variation": 10,
      "humanize": 5,
      "restWindow": 0,
      "energyRole": "recessive",
      "activity": null,
      "fills": null,
      "automation": [
        {
          "param": "velocity",
          "axis": "intensity",
          "domain": [
            0.22,
            0.35
          ]
        },
        {
          "param": "duration",
          "axis": "tension",
          "domain": [
            "1m",
            "2n"
          ]
        }
      ],
      "steps": [
        true,
        false,
        false,
        false,
        true,
        false,
        false,
        false,
        true,
        false,
        false,
        false,
        true,
        false,
        false,
        false
      ]
    },
    {
      "id": "neon-arpeggio",
      "name": "Neon Spark",
      "detail": "Glassy reflections on puddles",
      "role": "motif",
      "color": "#f72585",
      "muted": false,
      "instrument": "Glocken chime",
      "density": 45,
      "variation": 40,
      "humanize": 20,
      "restWindow": 0,
      "energyRole": "forward",
      "activity": {
        "axis": "tension",
        "range": [
          0.35,
          1
        ]
      },
      "fills": null,
      "automation": [
        {
          "param": "velocity",
          "axis": "brightness",
          "domain": [
            0.15,
            0.45
          ]
        },
        {
          "param": "density",
          "axis": "tension",
          "domain": [
            0.4,
            0.85
          ]
        }
      ],
      "steps": [
        null,
        2,
        4,
        5,
        null,
        4,
        2,
        0,
        null,
        2,
        4,
        7,
        6,
        null,
        4,
        null
      ]
    },
    {
      "id": "lead-synth",
      "name": "The Rider",
      "detail": "Sullen melodic motif",
      "role": "motif",
      "color": "#72efdd",
      "muted": false,
      "instrument": "Warm reed",
      "density": 62,
      "variation": 30,
      "humanize": 12,
      "restWindow": 0,
      "energyRole": "balanced",
      "activity": null,
      "fills": [
        {
          "at": [
            7,
            15
          ],
          "axis": "tension",
          "threshold": 0.6
        }
      ],
      "automation": [
        {
          "param": "velocity",
          "axis": "intensity",
          "domain": [
            0.38,
            0.62
          ]
        },
        {
          "param": "duration",
          "axis": "intensity",
          "domain": [
            "2n",
            "8n"
          ]
        },
        {
          "param": "octave",
          "axis": "tension",
          "domain": [
            3,
            4
          ]
        }
      ],
      "steps": [
        0,
        null,
        2,
        3,
        2,
        null,
        0,
        null,
        4,
        null,
        3,
        2,
        1,
        2,
        null,
        0
      ]
    },
    {
      "id": "sub-pulse",
      "name": "Engine Thrum",
      "detail": "Heavy low-end tires",
      "role": "bass",
      "color": "#3f37c9",
      "muted": false,
      "instrument": "Deep root",
      "density": 85,
      "variation": 5,
      "humanize": 8,
      "restWindow": 0,
      "energyRole": "balanced",
      "activity": null,
      "fills": [
        {
          "at": [
            7,
            15
          ],
          "axis": "intensity",
          "threshold": 0.5
        }
      ],
      "automation": [
        {
          "param": "velocity",
          "axis": "intensity",
          "domain": [
            0.35,
            0.65
          ]
        },
        {
          "param": "duration",
          "axis": "tension",
          "domain": [
            "4n",
            "8n"
          ]
        }
      ],
      "steps": [
        true,
        false,
        false,
        true,
        true,
        false,
        false,
        true,
        true,
        false,
        false,
        true,
        true,
        false,
        true,
        false
      ]
    },
    {
      "id": "cyber-drums",
      "name": "Asphalt Beat",
      "detail": "Drum machine pulse",
      "role": "percussion",
      "color": "#4cc9f0",
      "muted": false,
      "instrument": "Soft pluck",
      "density": 75,
      "variation": 10,
      "humanize": 10,
      "restWindow": 6,
      "energyRole": "recessive",
      "activity": {
        "axis": "intensity",
        "range": [
          0.4,
          1
        ]
      },
      "fills": [
        {
          "at": [
            8,
            11,
            14
          ],
          "axis": "intensity",
          "threshold": 0.5
        },
        {
          "at": [
            12
          ],
          "axis": "intensity",
          "threshold": 0.75
        }
      ],
      "automation": [
        {
          "param": "kickProps",
          "axis": "intensity",
          "domain": [
            {
              "midi": "D1",
              "vel": 0.28
            },
            {
              "midi": "C1",
              "vel": 0.72
            }
          ]
        },
        {
          "param": "kick.velocity",
          "axis": "intensity",
          "domain": [
            0.28,
            0.72
          ]
        },
        {
          "param": "hat.velocity",
          "axis": "intensity",
          "domain": [
            0.12,
            0.28
          ]
        },
        {
          "param": "hat.variation",
          "axis": "intensity",
          "domain": [
            0,
            0.45
          ]
        }
      ],
      "steps": [
        true,
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        true,
        false
      ]
    }
  ]
};

const INSTRUMENTS = {"Glass bell":{"motif":{"oscillator":{"type":"sine"},"envelope":{"attack":0.04,"decay":0.3,"sustain":0.22,"release":2.8}},"harmony":{"oscillator":{"type":"sine"},"envelope":{"attack":1.3,"decay":1.5,"sustain":0.5,"release":4.5}},"bass":{"oscillator":{"type":"sine"},"envelope":{"attack":0.03,"decay":0.3,"sustain":0.24,"release":0.8},"filterEnvelope":{"attack":0.02,"decay":0.25,"sustain":0.2,"release":0.4,"baseFrequency":90,"octaves":2.6}},"percussion":{"kick":{"pitchDecay":0.05,"octaves":6,"envelope":{"attack":0.001,"decay":0.32,"sustain":0,"release":0.2}},"hat":{"noise":{"type":"pink"},"envelope":{"attack":0.001,"decay":0.06,"sustain":0,"release":0.02}}}},"Warm reed":{"motif":{"oscillator":{"type":"square8"},"envelope":{"attack":0.12,"decay":0.22,"sustain":0.3,"release":1.8}},"harmony":{"oscillator":{"type":"square8"},"envelope":{"attack":0.9,"decay":1.2,"sustain":0.45,"release":3.2}},"bass":{"oscillator":{"type":"square8"},"envelope":{"attack":0.05,"decay":0.25,"sustain":0.26,"release":0.7},"filterEnvelope":{"attack":0.03,"decay":0.28,"sustain":0.18,"release":0.4,"baseFrequency":80,"octaves":2.8}},"percussion":{"kick":{"pitchDecay":0.04,"octaves":5,"envelope":{"attack":0.002,"decay":0.26,"sustain":0,"release":0.15}},"hat":{"noise":{"type":"brown"},"envelope":{"attack":0.001,"decay":0.09,"sustain":0,"release":0.03}}}},"Soft pluck":{"motif":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.008,"decay":0.45,"sustain":0.08,"release":1.4}},"harmony":{"oscillator":{"type":"triangle8"},"envelope":{"attack":0.6,"decay":1,"sustain":0.35,"release":2.6}},"bass":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.008,"decay":0.4,"sustain":0.12,"release":0.6},"filterEnvelope":{"attack":0.01,"decay":0.3,"sustain":0.14,"release":0.4,"baseFrequency":100,"octaves":2.4}},"percussion":{"kick":{"pitchDecay":0.03,"octaves":7,"envelope":{"attack":0.001,"decay":0.22,"sustain":0,"release":0.12}},"hat":{"noise":{"type":"white"},"envelope":{"attack":0.001,"decay":0.04,"sustain":0,"release":0.02}}}},"Velvet pad":{"motif":{"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.5,"decay":0.6,"sustain":0.4,"release":3.4}},"harmony":{"oscillator":{"type":"sawtooth"},"envelope":{"attack":1.8,"decay":1.4,"sustain":0.55,"release":5.2}},"bass":{"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.25,"decay":0.3,"sustain":0.3,"release":1},"filterEnvelope":{"attack":0.2,"decay":0.35,"sustain":0.22,"release":0.6,"baseFrequency":70,"octaves":2.2}},"percussion":{"kick":{"pitchDecay":0.09,"octaves":4,"envelope":{"attack":0.004,"decay":0.45,"sustain":0,"release":0.3}},"hat":{"noise":{"type":"pink"},"envelope":{"attack":0.01,"decay":0.18,"sustain":0,"release":0.08}}}},"Hollow mallet":{"motif":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.002,"decay":0.6,"sustain":0.02,"release":1.9}},"harmony":{"oscillator":{"type":"triangle8"},"envelope":{"attack":0.4,"decay":0.9,"sustain":0.18,"release":2.4}},"bass":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.004,"decay":0.5,"sustain":0.06,"release":0.7},"filterEnvelope":{"attack":0.01,"decay":0.4,"sustain":0.1,"release":0.4,"baseFrequency":110,"octaves":2}},"percussion":{"kick":{"pitchDecay":0.02,"octaves":8,"envelope":{"attack":0.001,"decay":0.18,"sustain":0,"release":0.1}},"hat":{"noise":{"type":"white"},"envelope":{"attack":0.001,"decay":0.11,"sustain":0,"release":0.04}}}},"Deep root":{"motif":{"oscillator":{"type":"sine"},"envelope":{"attack":0.06,"decay":0.4,"sustain":0.3,"release":2.2}},"harmony":{"oscillator":{"type":"sine"},"envelope":{"attack":1.5,"decay":1.6,"sustain":0.5,"release":4.8}},"bass":{"oscillator":{"type":"sine"},"envelope":{"attack":0.02,"decay":0.35,"sustain":0.34,"release":0.9},"filterEnvelope":{"attack":0.02,"decay":0.3,"sustain":0.24,"release":0.5,"baseFrequency":60,"octaves":2.4}},"percussion":{"kick":{"pitchDecay":0.07,"octaves":6,"envelope":{"attack":0.001,"decay":0.4,"sustain":0,"release":0.24}},"hat":{"noise":{"type":"brown"},"envelope":{"attack":0.001,"decay":0.07,"sustain":0,"release":0.03}}}},"Glocken chime":{"motif":{"voice":"fm","oscillator":{"type":"sine"},"envelope":{"attack":0.002,"decay":0.6,"sustain":0.02,"release":1.8},"harmonicity":3.01,"modulationIndex":6.5,"modulation":{"type":"sine"},"modulationEnvelope":{"attack":0.002,"decay":0.25,"sustain":0,"release":0.2}},"harmony":{"voice":"fm","oscillator":{"type":"sine"},"envelope":{"attack":0.01,"decay":1.2,"sustain":0.15,"release":3.2},"harmonicity":2.01,"modulationIndex":2.4,"modulation":{"type":"sine"},"modulationEnvelope":{"attack":0.01,"decay":0.5,"sustain":0,"release":0.4}},"bass":{"oscillator":{"type":"sine"},"envelope":{"attack":0.02,"decay":0.3,"sustain":0.2,"release":0.7},"filterEnvelope":{"attack":0.02,"decay":0.25,"sustain":0.18,"release":0.4,"baseFrequency":100,"octaves":2.4}},"percussion":{"kick":{"pitchDecay":0.03,"octaves":7,"envelope":{"attack":0.001,"decay":0.24,"sustain":0,"release":0.14}},"hat":{"noise":{"type":"white"},"envelope":{"attack":0.001,"decay":0.05,"sustain":0,"release":0.02}},"hatFilter":7000,"snare":{"noise":{"type":"white"},"envelope":{"attack":0.001,"decay":0.12,"sustain":0,"release":0.04}},"snareFilter":1800}},"Kalimba dusk":{"motif":{"voice":"pluck","oscillator":{"type":"triangle"},"envelope":{"attack":0.002,"decay":0.4,"sustain":0.04,"release":1.2},"pluck":{"attackNoise":0.6,"dampening":2200,"resonance":0.92,"volume":-9}},"harmony":{"oscillator":{"type":"triangle8"},"envelope":{"attack":0.5,"decay":0.9,"sustain":0.28,"release":2.4}},"bass":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.008,"decay":0.35,"sustain":0.14,"release":0.6},"filterEnvelope":{"attack":0.01,"decay":0.3,"sustain":0.14,"release":0.4,"baseFrequency":95,"octaves":2.2}},"percussion":{"kick":{"pitchDecay":0.012,"octaves":3,"envelope":{"attack":0.001,"decay":0.18,"sustain":0,"release":0.1}},"hat":{"noise":{"type":"brown"},"envelope":{"attack":0.001,"decay":0.08,"sustain":0,"release":0.03}},"hatFilter":4200,"snare":{"noise":{"type":"pink"},"envelope":{"attack":0.001,"decay":0.05,"sustain":0,"release":0.02}},"snareFilter":2600}},"Vine guitar":{"motif":{"voice":"pluck","oscillator":{"type":"triangle"},"envelope":{"attack":0.002,"decay":0.6,"sustain":0.06,"release":1.6},"pluck":{"attackNoise":1.1,"dampening":3400,"resonance":0.94,"volume":-9}},"harmony":{"oscillator":{"type":"triangle8"},"envelope":{"attack":0.35,"decay":1.1,"sustain":0.3,"release":2.8}},"bass":{"voice":"pluck","oscillator":{"type":"triangle"},"envelope":{"attack":0.002,"decay":0.5,"sustain":0.08,"release":0.8},"pluck":{"attackNoise":0.9,"dampening":1100,"resonance":0.92,"volume":-11}},"percussion":{"kick":{"pitchDecay":0.05,"octaves":5,"envelope":{"attack":0.001,"decay":0.3,"sustain":0,"release":0.18}},"hat":{"noise":{"type":"white"},"envelope":{"attack":0.001,"decay":0.06,"sustain":0,"release":0.02}},"hatFilter":6500,"snare":{"noise":{"type":"white"},"envelope":{"attack":0.001,"decay":0.14,"sustain":0,"release":0.05}},"snareFilter":1500}},"Jungle steel":{"motif":{"voice":"fm","oscillator":{"type":"sine"},"envelope":{"attack":0.003,"decay":0.45,"sustain":0.08,"release":1.4},"harmonicity":1.5,"modulationIndex":11,"modulation":{"type":"sine"},"modulationEnvelope":{"attack":0.003,"decay":0.2,"sustain":0,"release":0.2}},"harmony":{"voice":"fm","oscillator":{"type":"sine"},"envelope":{"attack":0.02,"decay":1,"sustain":0.2,"release":2.8},"harmonicity":1.5,"modulationIndex":4.5,"modulation":{"type":"sine"},"modulationEnvelope":{"attack":0.02,"decay":0.45,"sustain":0,"release":0.4}},"bass":{"oscillator":{"type":"sine"},"envelope":{"attack":0.015,"decay":0.35,"sustain":0.26,"release":0.85},"filterEnvelope":{"attack":0.015,"decay":0.3,"sustain":0.2,"release":0.4,"baseFrequency":75,"octaves":2.4}},"percussion":{"kick":{"pitchDecay":0.035,"octaves":5,"envelope":{"attack":0.001,"decay":0.26,"sustain":0,"release":0.16}},"hat":{"noise":{"type":"white"},"envelope":{"attack":0.001,"decay":0.07,"sustain":0,"release":0.03}},"hatFilter":7500,"snare":{"noise":{"type":"pink"},"envelope":{"attack":0.001,"decay":0.16,"sustain":0,"release":0.06}},"snareFilter":1400}}};

function instrumentSettings(instrument, role) {
  const preset = INSTRUMENTS[instrument] || INSTRUMENTS["Glass bell"];
  return preset[role];
}

// ---- voice builders (mirror of audio-engine.js) --------------------------
const ROLE_VOLUME = { melody: -9, chords: -16, bass: -11 };
function makePitched(roleKey, cfg) {
  const { voice, pluck, ...options } = cfg;
  if (voice === "pluck") return new Tone.PluckSynth({ ...(pluck || {}), volume: ROLE_VOLUME[roleKey] });
  if (voice === "fm") return new Tone.PolySynth(Tone.FMSynth).set({ ...options, volume: ROLE_VOLUME[roleKey] });
  return new Tone.PolySynth(Tone.Synth).set({ ...options, volume: ROLE_VOLUME[roleKey] });
}
function makeDrums(instrument, reverb, glue) {
  const preset = instrumentSettings(instrument, "percussion");
  const extras = [];
  const kick = new Tone.MembraneSynth({ ...preset.kick, volume: -10 }).toDestination();
  const hatFilter = preset.hatFilter
    ? new Tone.Filter({ type: "highpass", frequency: preset.hatFilter }).connect(reverb)
    : null;
  const hat = new Tone.NoiseSynth({ ...preset.hat, volume: -24 }).connect(hatFilter || reverb);
  if (hatFilter) extras.push(hatFilter);
  let snare = null;
  if (preset.snare) {
    const snareFilter = preset.snareFilter
      ? new Tone.Filter({ type: "bandpass", frequency: preset.snareFilter, Q: 0.8 }).connect(glue)
      : null;
    snare = new Tone.NoiseSynth({ ...preset.snare, volume: -14 }).connect(snareFilter || glue);
    if (snareFilter) extras.push(snareFilter);
    extras.push(snare);
  }
  return { kind: "drums", kick, hat, snare, extras };
}

// ---- reactive-dynamics core, spliced from src/music/dynamics.js ----
// __RT_DYN_BEGIN__
const EPSILON = 1e-9;

function clamp01(value, fallback = 0.5) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : fallback;
}

function domainValue(domain, value) {
  const v = clamp01(value, 0.5);
  if (domain.length === 2 && typeof domain[0] === "number" && typeof domain[1] === "number") {
    return domain[0] + (domain[1] - domain[0]) * v;
  }
  const index = Math.max(0, Math.min(domain.length - 1, Math.round(v * (domain.length - 1))));
  return domain[index];
}

function contextTargets(project, contextId) {
  const preset = (project.contexts ?? []).find((ctx) => ctx.id === contextId);
  return preset ? { ...preset.targets } : { intensity: 0.3, tension: 0.25, brightness: 0.7 };
}

function easeToward(live, target, rate = 0.35) {
  const out = {};
  for (const key of ["intensity", "tension", "brightness"]) {
    const from = clamp01(live[key], 0);
    const to = clamp01(target[key], from);
    out[key] = from + (to - from) * rate;
  }
  return out;
}

function bindingValue(project, target, live) {
  const binding = (project.bindings ?? []).find((b) => b.target === target);
  return binding ? domainValue(binding.domain, live[binding.axis]) : undefined;
}

function tempoOffset(project, live) {
  const bound = bindingValue(project, "tempo.offset", live);
  return bound !== undefined ? bound : live.intensity * 26;
}

function layerActive(layer, live) {
  const a = layer.activity;
  if (!a) return true;
  const v = a.axis ? clamp01(live[a.axis], 0.5) : Math.max(clamp01(live.intensity, 0), clamp01(live.tension, 0));
  if (a.range) return v >= a.range[0] && v <= a.range[1];
  return v >= a.from && v <= a.to;
}

function fillActive(layer, live, step) {
  if (!layer.fills) return false;
  for (const fill of layer.fills) {
    if (!fill.at.includes(step)) continue;
    const threshold = fill.threshold ?? 0.5;
    if (clamp01(live[fill.axis], 0) >= threshold) return true;
  }
  return false;
}

function automationLookup(layer, live) {
  const out = {};
  for (const entry of layer.automation ?? []) {
    out[entry.param] = domainValue(entry.domain, live[entry.axis]);
  }
  return out;
}

function humanDelay(layer, rng) {
  return rng() * (layer.humanize ?? 0) / 100 * 0.035;
}

function computeStepFrame(project, live, state, step, rng) {
  const chordDegree = project.progression[Math.floor(step / 4) % project.progression.length];
  const chordVel = 0.22 + 0.08 * clamp01(live.intensity, 0);
  const resting = state.resting ?? [];
  const events = [];

  for (const layer of project.layers) {
    if (layer.muted || resting.includes(layer.id)) continue;
    const feat = state.features?.[layer.id];
    const kind = layer.role;
    if (!layerActive(layer, live)) continue;
    const auto = automationLookup(layer, live);
    const av = (param, fallback) => (auto[param] !== undefined ? auto[param] : fallback);

    if (kind === "harmony" || kind === "chords") {
      if (layer.steps[step]) {
        events.push({
          layerId: layer.id,
          kind: "chord",
          degree: chordDegree,
          duration: av("duration", "1m"),
          velocity: av("velocity", chordVel),
          offset: 0,
        });
      }
    } else if (kind === "motif" || kind === "melody") {
      const phrase = feat?.steps ?? layer.steps;
      let degree = phrase[step];
      if (degree !== null && rng() < 0.12 * (layer.variation ?? 0) / 100) {
        degree = Math.max(0, Math.min(7, degree + (rng() > 0.5 ? 1 : -1)));
      }
      const density = av("density", (layer.density ?? 100) / 100);
      if (degree === null && rng() < 0.08 * (layer.variation ?? 0) / 100 * density) {
        degree = Math.max(0, Math.min(7, chordDegree + (rng() > 0.5 ? 2 : 4)));
      }
      // Capture the base note's offset: the fill note must land strictly after
      // it on the same voice or Tone rejects the duplicate start time.
      const baseOffset = humanDelay(layer, rng);
      if (degree !== null && rng() < density + 0.24) {
        events.push({
          layerId: layer.id,
          kind: "scale",
          degree,
          octave: Math.round(av("octave", 4)),
          duration: av("duration", "4n"),
          velocity: av("velocity", 0.4),
          offset: baseOffset,
        });
        if (fillActive(layer, live, step)) {
          events.push({
            layerId: layer.id,
            kind: "scale",
            degree: Math.max(0, Math.min(7, degree + (rng() > 0.5 ? 2 : -2))),
            octave: Math.round(av("octave", 4)),
            duration: "16n",
            velocity: av("velocity", 0.4),
            offset: baseOffset + 0.04,
          });
        }
      }
    } else if (kind === "bass") {
      const straight = layer.steps[step];
      const fillPush = fillActive(layer, live, step) && step % 2 === 0;
      if (straight || fillPush) {
        events.push({
          layerId: layer.id,
          kind: "scale",
          degree: chordDegree,
          octave: 2,
          duration: av("duration", "4n"),
          velocity: av("velocity", 0.45),
          offset: humanDelay(layer, rng) * 0.45,
        });
      }
    } else if (kind === "percussion" || kind === "drums") {
      const hit = !!layer.steps[step];
      const isDownbeat = step % 4 === 0;
      const fillPush = fillActive(layer, live, step);
      const kickProps = av("kickProps", null);
      const pitch = kickProps && typeof kickProps === "object" ? kickProps.midi : "D1";
      // Kick on structural downbeats (and fill-driven extra kicks on offbeats).
      if (hit && isDownbeat) {
        events.push({ layerId: layer.id, kind: "kick", pitch, duration: "16n", velocity: av("kick.velocity", 0.25), offset: 0 });
      }
      if (hit && !isDownbeat) {
        events.push({ layerId: layer.id, kind: "hat", duration: "32n", velocity: av("hat.velocity", 0.16), offset: humanDelay(layer, rng) * 0.7 });
      }
      // Higher intensity: fills add off-beat kicks and probabilistic extra
      // hats. Skip the fill kick when the straight downbeat kick already fired
      // — two attacks on one MembraneSynth at the same time is a Tone error.
      if (fillPush && step % 2 === 0 && !(hit && isDownbeat)) {
        events.push({ layerId: layer.id, kind: "kick", pitch, duration: "16n", velocity: av("kick.velocity", 0.25), offset: 0 });
      }
      // Fills also add snare accents; late-phrase fill steps close with a
      // short rising roll so transitions into the next half feel played, not
      // switched. Offsets are fixed (not rng) to keep seeded determinism, and
      // start slightly off the grid so a kit without a dedicated snare (the
      // accent falls back to the hat synth) never collides with the hat hit,
      // and stay clear of the accent (0.02) and the odd-step double (0.065 /
      // 0.11) so two snare accents never land on one voice at the same time.
      const snareVel = av("snare.velocity", null);
      if (fillPush) {
        events.push({ layerId: layer.id, kind: "snare", duration: "16n", velocity: snareVel ?? Math.min(1, av("hat.velocity", 0.2) + 0.12), offset: 0.02 });
        if (step % 2 === 1) {
          events.push({ layerId: layer.id, kind: "snare", duration: "32n", velocity: snareVel ?? 0.24, offset: 0.065 });
          events.push({ layerId: layer.id, kind: "snare", duration: "32n", velocity: snareVel ?? 0.3, offset: 0.11 });
        }
        if (step >= 13) {
          [0.045, 0.085, 0.125, 0.165].forEach((offset, index) => {
            events.push({ layerId: layer.id, kind: "snare", duration: "32n", velocity: Math.min(1, (snareVel ?? 0.26) + index * 0.09), offset });
          });
        }
      }
      if (rng() < av("hat.variation", 0)) {
        events.push({ layerId: layer.id, kind: "hat", duration: "32n", velocity: av("hat.velocity", 0.16), offset: humanDelay(layer, rng) * 0.7 });
      }
    }
  }
  return events;
}

function journeyGain(layer, energy) {
  const bias = layer.energyRole === "forward" ? 3 : layer.energyRole === "recessive" ? -3 : 1.5;
  return ((energy - 0.5) * 2) * bias;
}
// __RT_DYN_END__

// supply the one function dynamics.js imports from variation.js
function journeyEnergy(shape, depth, bar, length) {
  const span = Math.max(4, Math.round(length));
  const phase = (((bar % span) + span) % span) / span;
  let raw;
  if (shape === "arc") raw = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
  else if (shape === "tide") raw = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
  else return 0.5;
  return 0.5 + (raw - 0.5) * (Math.max(0, Math.min(100, depth)) / 100);
}

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALES = {"Major":[0,2,4,5,7,9,11],"Minor":[0,2,3,5,7,8,10],"Dorian":[0,2,3,5,7,9,10],"Lydian":[0,2,4,6,7,9,11],"Pentatonic":[0,2,4,7,9]};
function pitchClass(key) {
  return NOTES.indexOf(({ Eb: "D#", Ab: "G#", Bb: "A#" })[key] || key);
}
function note(degree, octave = 4) {
  const scale = SCALES[score.scale];
  const wrapped = ((degree % scale.length) + scale.length) % scale.length;
  const midi = 12 * (octave + 1 + Math.floor(degree / scale.length)) + pitchClass(score.key) + scale[wrapped];
  return NOTES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}
function chord(degree) {
  return [degree, degree + 2, degree + 4, degree + 6].map((d) => note(d, 3));
}

// ---- deterministic PRNG + long-form drift (mirror of variation.js) ----
const clampDegree = (d) => Math.max(0, Math.min(7, d));
function makeRng(seed) {
  const s = Math.floor(Number(seed));
  if (!Number.isFinite(s) || s <= 0) return Math.random;
  let a = s >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function mutateMotif(rate, steps, rng = Math.random) {
  const out = [...steps];
  const chance = (Math.max(0, Math.min(100, rate)) / 100) * 0.35;
  for (let i = 1; i < out.length - 1; i++) {
    if (rng() >= chance * (out[i] === null ? 0.5 : 1)) continue;
    if (out[i] === null) {
      let before = null;
      for (let j = i - 1; j >= 0; j--) if (out[j] !== null) { before = out[j]; break; }
      let after = null;
      for (let j = i + 1; j < out.length; j++) if (out[j] !== null) { after = out[j]; break; }
      out[i] = clampDegree((before ?? after ?? 0) + (rng() > 0.5 ? 1 : -1));
      continue;
    }
    const roll = rng();
    if (roll < 0.4) {
      out[i] = clampDegree(out[i] + (rng() > 0.5 ? 1 : -1));
    } else if (roll < 0.7) {
      out[i] = null;
    } else {
      const others = [];
      for (let k = 1; k < out.length - 1; k++) if (out[k] !== null && k !== i) others.push(k);
      if (others.length > 0) {
        const swapWith = others[Math.floor(rng() * others.length)];
        out[i] = out[swapWith];
        out[swapWith] = steps[i];
      }
    }
  }
  return out;
}

let context = "explore";
let queuedContext = null;
let victoryQueued = false;
let step = 0;
let loopId = null;
let nodes = null;
let voices = {};
let drumExtras = [];
let perfSteps = {};
let barCount = 0;
const restCounter = {};
const resting = {};
let liveAxes = { intensity: 0.3, tension: 0.25, brightness: 0.7 };
let driftRng = Math.random;

function setup() {
  const master = new Tone.Gain(0.74).toDestination();
  const limiter = new Tone.Limiter(-1).connect(master);
  const glue = new Tone.Compressor({ threshold: -20, ratio: 2.4, attack: 0.01, release: 0.25 }).connect(limiter);
  const reverb = new Tone.Reverb({ decay: 5, wet: score.reverb / 100 }).connect(glue);
  const toneShaper = new Tone.Filter({ type: "lowpass", frequency: 7800 }).connect(glue);
  const motifBus = new Tone.Panner(-0.18).connect(reverb);
  const harmonyBus = new Tone.Panner(0.18).connect(toneShaper);
  nodes = { reverb, glue, limiter, master, toneShaper, motifBus, harmonyBus };
  drumExtras = [];
  voices = {};
  perfSteps = {};
  barCount = 0;
  for (const k of Object.keys(restCounter)) delete restCounter[k];
  for (const k of Object.keys(resting)) delete resting[k];
  for (const layer of score.layers) {
    if (layer.role === "motif") perfSteps[layer.id] = [...layer.steps];
    if (layer.role === "harmony") {
      const synth = makePitched("chords", instrumentSettings(layer.instrument, "harmony")).connect(harmonyBus);
      voices[layer.id] = { kind: "chords", synth };
      nodes[layer.id] = synth;
    } else if (layer.role === "motif") {
      const synth = makePitched("melody", instrumentSettings(layer.instrument, "motif")).connect(motifBus);
      voices[layer.id] = { kind: "melody", synth };
      nodes[layer.id] = synth;
    } else if (layer.role === "bass") {
      const cfg = instrumentSettings(layer.instrument, "bass");
      const synth = cfg.pluck
        ? makePitched("bass", cfg).toDestination()
        : new Tone.MonoSynth({ ...cfg, volume: -11 }).toDestination();
      voices[layer.id] = { kind: "bass", synth };
      nodes[layer.id] = synth;
    } else if (layer.role === "percussion") {
      const drums = makeDrums(layer.instrument, reverb, glue);
      voices[layer.id] = drums;
      nodes[layer.id] = { kick: drums.kick, hat: drums.hat };
      drumExtras.push(...drums.extras);
    }
  }
  const transport = Tone.getTransport();
  transport.bpm.value = score.bpm;
  transport.swing = score.swing / 100 || 0;
  transport.swingSubdivision = "8n";
  loopId = transport.scheduleRepeat((time) => {
    const boundary = step === 0 || step === 8;
    if (boundary && queuedContext) {
      context = queuedContext;
      queuedContext = null;
    }
    if (boundary) {
      liveAxes = easeToward(liveAxes, contextTargets(score, context), 0.5);
      transport.bpm.rampTo(score.bpm + tempoOffset(score, liveAxes), 0.5);
    }
    if (step === 0) {
      barCount += 1;
      const journey = score.journey || { shape: "flat", length: 16, depth: 0 };
      const energy = journeyEnergy(journey.shape, journey.depth, barCount, journey.length);
      for (const layer of score.layers) {
        restCounter[layer.id] = (restCounter[layer.id] || 0) + 1;
        const window = layer.restWindow || 0;
        resting[layer.id] = window > 0 && restCounter[layer.id] % (window + 1) === 0;
        const voice = voices[layer.id];
        if (!voice || layer.muted || resting[layer.id] || !layerActive(layer, liveAxes)) continue;
        const delta = journeyGain(layer, energy);
        if (voice.kind === "drums") {
          voice.kick.volume.rampTo(-10 + delta, 0.8);
          voice.hat.volume.rampTo(-24 + delta, 0.8);
          if (voice.snare) voice.snare.volume.rampTo(-14 + delta, 0.8);
        } else if (voice.synth) {
          const base = voice.kind === "chords" ? -16 : voice.kind === "melody" ? -9 : -11;
          voice.synth.volume.rampTo(Math.max(-40, Math.min(0, base + delta)), 0.8);
        }
      }
    }
    if (boundary) {
      for (const layer of score.layers) {
        if (layer.role === "motif" && !layer.muted && layer.variation > 0) {
          perfSteps[layer.id] = mutateMotif(layer.variation, layer.steps, driftRng);
        }
      }
    }
    const features = {};
    for (const layer of score.layers) features[layer.id] = { steps: perfSteps[layer.id] || layer.steps };
    const restingIds = Object.keys(resting).filter((id) => resting[id]);
    const events = computeStepFrame(score, liveAxes, { features, resting: restingIds }, step, driftRng);
    for (const ev of events) {
      const voice = voices[ev.layerId];
      if (!voice) continue;
      if (ev.kind === "chord") {
        voice.synth.triggerAttackRelease(chord(ev.degree), ev.duration, time + (ev.offset || 0), ev.velocity);
      } else if (ev.kind === "scale") {
        voice.synth.triggerAttackRelease(note(ev.degree, ev.octave), ev.duration, time + (ev.offset || 0), ev.velocity);
      } else if (ev.kind === "kick") {
        voice.kick.triggerAttackRelease(ev.pitch || "D1", ev.duration, time + (ev.offset || 0), ev.velocity);
      } else if (ev.kind === "hat") {
        voice.hat.triggerAttackRelease(ev.duration || "32n", time + (ev.offset || 0), ev.velocity);
      } else if (ev.kind === "snare") {
        const target = voice.snare || voice.hat;
        target.triggerAttackRelease(ev.duration || "16n", time + (ev.offset || 0), ev.velocity);
      }
    }
    if (boundary && victoryQueued) {
      const lead = score.layers.find((layer) => layer.role === "motif" && !layer.muted);
      const synth = lead && voices[lead.id] ? voices[lead.id].synth : null;
      if (synth) [0, 2, 4, 7].forEach((d, i) => synth.triggerAttackRelease(note(d, 5), "16n", time + i * 0.09, 0.65));
      victoryQueued = false;
      context = "explore";
      queuedContext = null;
      liveAxes = { intensity: 0.3, tension: 0.25, brightness: 0.7 };
      transport.bpm.rampTo(score.bpm + tempoOffset(score, liveAxes), 0.5);
    }
    step = (step + 1) % 16;
  }, "8n");
}

export async function startScore() {
  await Tone.start();
  if (!nodes) setup();
  driftRng = makeRng(score.variationSeed || 0);
  Tone.getTransport().start();
}

export function stopScore() {
  Tone.getTransport().stop();
  step = 0;
  driftRng = Math.random;
  barCount = 0;
  liveAxes = { intensity: 0.3, tension: 0.25, brightness: 0.7 };
  for (const k of Object.keys(restCounter)) delete restCounter[k];
  for (const k of Object.keys(resting)) delete resting[k];
  for (const layer of score.layers) {
    if (layer.role === "motif") perfSteps[layer.id] = [...layer.steps];
  }
}

export function setGameMusicState({ threat = 0, inCombat = false } = {}) {
  queuedContext = inCombat || threat > 0.7 ? "combat" : threat > 0.3 ? "unease" : "explore";
}

// After a one-shot event such as "victory" the music resolves back to
// exploration at the next bar boundary.
export function musicEvent(name) {
  if (name === "victory") victoryQueued = true;
}

export function disposeScore() {
  if (loopId !== null) Tone.getTransport().clear(loopId);
  Object.values(nodes || {}).forEach((node) => {
    if (Array.isArray(node)) node.forEach((child) => child.dispose());
    else node.dispose && node.dispose();
  });
  drumExtras.forEach((node) => node.dispose && node.dispose());
  drumExtras = [];
  nodes = null;
  voices = {};
}
