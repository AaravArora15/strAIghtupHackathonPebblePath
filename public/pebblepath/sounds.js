// PebbleSounds — tiny Web-Audio helper for UI feedback.
// All sounds are synthesised on the fly (no asset files, no licensing).
// The AudioContext is lazy-constructed on the first user gesture to dodge
// browser autoplay gating; until then, sound calls are no-ops.

(function () {
  const SOUND_KEY = "pebblepath:sound:v1";
  let ctx = null;
  let cachedEnabled = null;

  function readEnabled() {
    if (cachedEnabled !== null) return cachedEnabled;
    try {
      const raw = localStorage.getItem(SOUND_KEY);
      cachedEnabled = raw == null ? true : raw === "true";
    } catch (_) {
      cachedEnabled = true;
    }
    return cachedEnabled;
  }

  function writeEnabled(v) {
    cachedEnabled = !!v;
    try { localStorage.setItem(SOUND_KEY, String(cachedEnabled)); } catch (_) {}
  }

  function ensureCtx() {
    if (!readEnabled()) return null;
    try {
      if (!ctx) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        ctx = new C();
      }
      if (ctx.state === "suspended") {
        // resume() is a promise; we don't await since callers don't care.
        ctx.resume().catch(() => {});
      }
      return ctx;
    } catch (_) {
      return null;
    }
  }

  // One tone burst. pitchEnd lets us sweep for a natural chirp.
  function tone({ pitch, duration = 0.09, type = "sine", volume = 0.12, pitchEnd = null, attack = 0.01 }) {
    const c = ensureCtx();
    if (!c) return;
    try {
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(pitch, now);
      if (pitchEnd != null && pitchEnd !== pitch) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, pitchEnd), now + duration);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain).connect(c.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (_) { /* noop */ }
  }

  // Public API
  window.PebbleSounds = {
    isEnabled: readEnabled,
    setEnabled: (v) => writeEnabled(v),

    // Quick drip for modal open / hover feedback.
    tap: () => tone({
      pitch: 720, pitchEnd: 520,
      duration: 0.06, type: "triangle", volume: 0.07,
    }),

    // Confident two-tone chirp on a successful commit.
    commit: () => {
      tone({ pitch: 520, pitchEnd: 760, duration: 0.11, type: "sine", volume: 0.12 });
      setTimeout(() => tone({ pitch: 880, pitchEnd: 700, duration: 0.09, type: "triangle", volume: 0.09 }), 55);
    },

    // Softer whoosh when the pebble modal opens.
    whoosh: () => tone({
      pitch: 240, pitchEnd: 560,
      duration: 0.15, type: "sine", volume: 0.06, attack: 0.02,
    }),

    // 4-note ascending arpeggio for retirement — the big moment.
    reward: () => {
      [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => tone({
          pitch: freq, pitchEnd: freq * 0.98,
          duration: 0.16, type: "sine", volume: 0.12,
        }), i * 95);
      });
    },
  };
})();
