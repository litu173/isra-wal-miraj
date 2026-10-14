/*
 * Soundscape — synthesised live with the Web Audio API.
 *
 *  - No instruments or music: natural textures and voices only.
 *      Earth        a soft night breeze with distant crickets
 *      Heavens      a smooth, soothing airflow and gentle rain
 *      Lote Tree    leaves and running water
 *      Paradise     birdsong over a gentle brook, in a sense of open space
 *      The Pens     nibs writing on paper (Bukhari 349: "the scratching of the Pens")
 *      The Throne   a soft, distant chorus of "Allah" — those around the Throne
 *                   glorify their Lord (Ghafir 40:7).
 *  - Recordings in audio/ (see SAMPLES) replace the synthesis when present.
 *      Beneath      the roar of fire, crackling embers, boiling, a deep rumble
 *  - Off by default. Browsers only allow sound after a tap or click, so the
 *    visitor turns it on with the Sound button; the choice is remembered.
 *  - app.js calls SoundScape.setPosition(levelA, levelB, t) every frame and
 *    the layers crossfade between the two levels' mixes below.
 */
window.I18N.ready.then(() => {
  'use strict';

  // Loudness of each layer per level (0–1). Edit freely.
  const MIX = {
    earth: { breeze: 0.4, wind: 0.2, crickets: 0.55 },
    makkah: { breeze: 0.4, wind: 0.25, crickets: 0.5 },
    aqsa: { breeze: 0.4, wind: 0.15, crickets: 0.25 },
    'heaven-1': { breeze: 0.5, rain: 0.55, air: 0.05 },
    'heaven-2': { breeze: 0.5, rain: 0.55, air: 0.06 },
    'heaven-3': { breeze: 0.5, rain: 0.5, air: 0.08 },
    'heaven-4': { breeze: 0.5, rain: 0.5, air: 0.1 },
    'heaven-5': { breeze: 0.5, rain: 0.45, air: 0.12 },
    'heaven-6': { breeze: 0.5, rain: 0.42, air: 0.14 },
    'heaven-7': { breeze: 0.5, rain: 0.4, air: 0.16 },
    sidrah: { breeze: 0.35, leaves: 0.45, water: 0.35, air: 0.12 },
    jannah: { birds: 0.9, water: 0.5, breeze: 0.3, leaves: 0.2 },
    pens: { pens: 1, breeze: 0.15, air: 0.06 },
    arsh: { dhikr: 0.9, air: 0.06 },
    'hell-gate': { fire: 0.35, rumble: 0.5, crackle: 0.25 },
    'hell-fire': { fire: 1, crackle: 0.9, rumble: 0.45 },
    'hell-depth': { rumble: 1, wind: 0.3, fire: 0.2 },
    'hell-shown': { fire: 0.6, crackle: 0.6, rumble: 0.5 },
    'hell-zaqqum': { fire: 0.45, crackle: 0.4, rumble: 0.4, boil: 0.7 },
    'hell-lowest': { rumble: 0.45, wind: 0.18 },
  };
  // Overall trim per layer so they sit together
  const TRIM = {
    wind: 0.4, breeze: 0.5, rain: 0.45, crickets: 0.3, air: 0.12, water: 0.35, leaves: 0.25, birds: 0.55, pens: 0.8,
    dhikr: 0.7, fire: 0.38, crackle: 0.35, rumble: 0.5, boil: 0.25,
  };
  const LAYERS = Object.keys(TRIM);
  const MASTER = 0.85;
  const STORE = 'miraj-sound';
  // Real recordings (CC0, see audio/CREDITS.md). When a file is present it
  // replaces the synthesised version of that layer; when absent, synthesis plays.
  //   flow    seamless: overlapping, crossfaded copies (voices = parallel streams)
  //   slices  endless variety: random short phrases cut from the recording
  //   multitude  countless voices: many copies at once, each its own pitch,
  //           pace, place and moment, hushed into a distant whisper
  const SAMPLES = {
    dhikr: { file: 'audio/arsh-dhikr.mp3', mode: 'multitude', voices: 40, room: 1.2, gain: 1 },
    pens: { file: 'audio/pens-writing.mp3', mode: 'slices', room: 0.06, gain: 1.4 },
  };

  let meterNode = null;
  let pink = null;
  let ac = null, master = null, white = null, brown = null, space = null, hall = null;
  const out = {}, level = {}, applied = {};
  let enabled = false, nextDhikr = 0, nextBird = 0;
  const sampled = {}; // layer -> decoded recording, once loaded
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- building blocks ---------- */

  function noiseBuffer(seconds, isBrown, channels = 1) {
    const len = Math.floor(ac.sampleRate * seconds);
    const buf = ac.createBuffer(channels, len, ac.sampleRate);
    for (let c = 0; c < channels; c++) {
      const d = buf.getChannelData(c);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (isBrown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
      }
    }
    return buf;
  }
  // Pink noise (Paul Kellet's filter): even, soft, natural — never rumbling
  function pinkBuffer(seconds) {
    const len = Math.floor(ac.sampleRate * seconds);
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
    return buf;
  }
  // A synthetic room: decaying, darkening noise
  function impulse(seconds, darkness) {
    const len = Math.floor(ac.sampleRate * seconds);
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        lp += (Math.random() * 2 - 1 - lp) * (1 - darkness * t);
        d[i] = lp * Math.pow(1 - t, 2.4);
      }
    }
    return buf;
  }
  const gainNode = (v = 0) => { const g = ac.createGain(); g.gain.value = v; return g; };
  const filter = (type, f, q = 0.7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const panner = (p) => { const s = ac.createStereoPanner ? ac.createStereoPanner() : gainNode(1); if (s.pan) s.pan.value = p; return s; };
  function loop(buf) {
    const s = ac.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.start(0, Math.random() * buf.duration);
    return s;
  }
  function lfo(freq, depth, param, type = 'sine') {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = gainNode(depth);
    o.connect(g).connect(param);
    o.start();
    return g;
  }
  function chain(...nodes) {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    return nodes[nodes.length - 1];
  }
  // a bus with a dry path and a reverb send, feeding a layer
  function spaced(dest, room, wet, dry = 1) {
    const bus = gainNode(1);
    bus.connect(gainNode(dry)).connect(dest);
    const send = gainNode(wet);
    chain(bus, send, room);
    return bus;
  }

  function burst(dest, { type = 'bandpass', freq, q = 1, dur, amp, sweep = 0, attack = 0.004, buf = white, when = 0 }) {
    const t = ac.currentTime + 0.01 + when;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = filter(type, freq, q);
    if (sweep) f.frequency.linearRampToValueAtTime(freq + sweep, t + dur);
    const g = gainNode(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    chain(src, f, g, dest);
    src.start(t, Math.random() * (buf.duration - dur - 0.1), dur + 0.05);
  }

  /* ---------- continuous layers ---------- */

  function build() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = gainNode(0);
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    chain(master, comp, ac.destination);
    meterNode = ac.createAnalyser(); meterNode.fftSize = 2048; comp.connect(meterNode);
    white = noiseBuffer(4, false);
    brown = noiseBuffer(6, true);
    pink = pinkBuffer(6);
    // keep any position already reported (the page may be sitting on the Earth screen)
    for (const k of LAYERS) { out[k] = gainNode(0); out[k].connect(master); level[k] ??= 0; applied[k] = 0; }

    // two rooms: an open garden air, and a vast, dark hall for the Throne
    space = ac.createConvolver(); space.buffer = impulse(2.4, 0.6); space.connect(out.birds);
    hall = ac.createConvolver(); hall.buffer = impulse(4.8, 0.35); hall.connect(out.dhikr);

    // wind (Earth) — low and still, the night desert
    { const f = filter('bandpass', 340, 0.5), am = gainNode(0.75);
      chain(loop(brown), f, am, out.wind); lfo(0.03, 70, f.frequency); lfo(0.07, 0.18, am.gain); }

    // breeze (heavens) — a smooth airflow: stereo pink noise, the low end
    // removed so it can never rumble or howl, swelling only very slowly
    { const hp = filter('highpass', 380, 0.5), lp = filter('lowpass', 3200, 0.4), am = gainNode(0.85);
      const soft = filter('peaking', 1200, 0.6); soft.gain.value = -3;
      chain(loop(pink), hp, soft, lp, am, out.breeze);
      lfo(0.025, 0.08, am.gain); }

    // rain (heavens) — a gentle, even hiss of fine rain; droplets are added by tick()
    { const hp = filter('highpass', 1200, 0.5), lp = filter('lowpass', 7500, 0.4), am = gainNode(0.5);
      chain(loop(pink), hp, lp, am, out.rain);
      lfo(0.05, 0.04, am.gain);
      out.rain._drops = [-0.6, 0, 0.6].map((p) => { const pn = panner(p); pn.connect(out.rain); return pn; }); }

    // air — the faintest open-space shimmer
    { const f = filter('bandpass', 5200, 0.3), lp = filter('lowpass', 9000), am = gainNode(0.5);
      chain(loop(white), f, lp, am, out.air); lfo(0.04, 0.15, am.gain); }

    // water — a gentle brook: three softly wandering voices over a low body
    out.water._voices = [-0.5, 0, 0.5].map((p) => {
      const f = filter('bandpass', 900, 2.4);
      chain(loop(white), f, gainNode(0.35), panner(p), out.water);
      return f;
    });
    chain(loop(brown), filter('lowpass', 480), gainNode(0.45), out.water);

    // leaves — rustling high band with irregular gusts
    { const f = filter('bandpass', 4200, 0.8), am = gainNode(0.4);
      chain(loop(white), f, am, out.leaves); out.leaves._gust = am; }

    // fire — a deep roar that breathes, with a breathy hiss
    { const f = filter('lowpass', 520), am = gainNode(0.8);
      chain(loop(brown), f, am, out.fire); lfo(0.27, 0.25, am.gain); lfo(0.09, 120, f.frequency);
      const hiss = filter('bandpass', 1100, 0.6); chain(loop(white), hiss, gainNode(0.12), out.fire); }

    // rumble — the depth
    { const f = filter('lowpass', 110); chain(loop(brown), f, gainNode(1.2), out.rumble); lfo(0.04, 30, f.frequency); }

    for (const layer of Object.keys(SAMPLES)) loadSample(layer);
    setInterval(tick, 40);
    writer(-0.3, 1);
    writer(0.4, 0.55, 1.3);
  }

  /* ---------- Earth: crickets of a Makkah night ---------- */

  const crickets = [-0.7, 0.15, 0.75].map((pan) => ({ pan, f: rnd(4200, 4900), next: 0, near: rnd(0.4, 1) }));
  function cricket(c) {
    const t = ac.currentTime + 0.02;
    if (!c.dest) { c.dest = panner(c.pan); c.dest.connect(out.crickets); }
    const pulses = 3 + Math.floor(rnd(0, 3));
    for (let i = 0; i < pulses; i++) {
      const o = ac.createOscillator(), g = gainNode(0), at = t + i * 0.028;
      o.frequency.value = c.f;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.12 * c.near, at + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.016);
      o.connect(g).connect(c.dest);
      o.start(at);
      o.stop(at + 0.02);
    }
  }

  /* ---------- Paradise: birdsong ---------- */

  function chirp(dest, t, f0, f1, dur, amp) {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = gainNode(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + Math.min(0.015, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    chain(o, g, dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  const SONGS = [
    // a sweet two-note whistle, repeated
    (d, t) => { const f = rnd(2100, 3000); const n = 2 + Math.floor(rnd(0, 2));
      for (let i = 0; i < n; i++) { chirp(d, t + i * 0.5, f, f * 1.32, 0.13, 0.22); chirp(d, t + i * 0.5 + 0.16, f * 1.3, f * 1.04, 0.18, 0.2); } },
    // a soft descending trill
    (d, t) => { const f = rnd(3600, 4800); const n = 8 + Math.floor(rnd(0, 7));
      for (let i = 0; i < n; i++) chirp(d, t + i * 0.055, f * (1 - i * 0.012), f * 0.86 * (1 - i * 0.012), 0.04, 0.14 * (1 - i / (n * 1.6))); },
    // a warbling phrase
    (d, t) => { const o = ac.createOscillator(), m = ac.createOscillator(), mg = gainNode(rnd(250, 520)), g = gainNode(0);
      const f = rnd(2600, 3400), dur = rnd(0.45, 0.85);
      o.frequency.value = f; m.frequency.value = rnd(16, 30); chain(m, mg, o.frequency);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.06);
      g.gain.setValueAtTime(0.12, t + dur - 0.12); g.gain.linearRampToValueAtTime(0, t + dur);
      chain(o, g, d); o.start(t); m.start(t); o.stop(t + dur + 0.05); m.stop(t + dur + 0.05); },
    // light twitters
    (d, t) => { const n = 3 + Math.floor(rnd(0, 4)); let tt = t;
      for (let i = 0; i < n; i++) { const f = rnd(4000, 6200); chirp(d, tt, f, f * rnd(0.75, 1.25), rnd(0.03, 0.07), 0.12); tt += rnd(0.07, 0.14); } },
  ];
  function birdCall() {
    const t = ac.currentTime + 0.02;
    const near = Math.random();
    const lp = filter('lowpass', 3500 + near * 6000);
    const bus = spaced(out.birds, space, 0.45, 0.4 + near * 0.6);
    chain(lp, panner(rnd(-0.85, 0.85)), bus);
    SONGS[Math.floor(Math.random() * SONGS.length)](lp, t);
  }

  /* ---------- The Pens: nibs on paper ---------- */

  // one stroke of a nib: friction noise whose grain follows the hand
  function stroke(dest, t, dur, amp) {
    const src = ac.createBufferSource();
    src.buffer = white;
    const hp = filter('highpass', 1400, 0.6);
    const f0 = rnd(2600, 4600);
    const bp = filter('bandpass', f0, 1.1);
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.linearRampToValueAtTime(f0 * rnd(0.82, 1.18), t + dur);
    const body = filter('bandpass', rnd(900, 1300), 0.8); // the paper's own tone
    const g = gainNode(0), gb = gainNode(0.22);
    const N = 28, curve = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const shape = Math.pow(Math.sin((Math.PI * (i + 0.5)) / N), 0.6);
      curve[i] = amp * shape * (0.55 + 0.45 * Math.random());
    }
    curve[0] = 0; curve[N - 1] = 0;
    g.gain.setValueCurveAtTime(curve, t, dur);
    chain(src, hp, bp, g, dest);
    chain(hp, body, gb, g);
    src.start(t, Math.random() * (white.duration - dur - 0.1), dur + 0.02);
  }
  // a word: a few letters of strokes, sometimes a dot
  function writeWord(dest, amp) {
    let t = ac.currentTime + 0.03;
    const letters = 2 + Math.floor(rnd(0, 6));
    for (let l = 0; l < letters; l++) {
      const strokes = 1 + Math.floor(rnd(0, 3));
      for (let s = 0; s < strokes; s++) {
        const dur = rnd(0.07, 0.3);
        stroke(dest, t, dur, amp * rnd(0.6, 1));
        t += dur + rnd(0.012, 0.05);
      }
      if (Math.random() < 0.18) { t += 0.05; stroke(dest, t, 0.018, amp * 0.8); t += 0.04; } // a dot
      t += rnd(0.03, 0.1);
    }
    return t - ac.currentTime;
  }
  // each writer keeps writing while the Pens are audible
  function writer(pan, amp, delay = 0) {
    let dest = null;
    const step = () => {
      if (!enabled || !ac || ac.state !== 'running' || level.pens < 0.01) return setTimeout(step, 500);
      if (!dest) { dest = panner(pan); dest.connect(sampled.pens ? spaced(out.pens, space, SAMPLES.pens.room, 1) : out.pens); }
      const took = sampled.pens ? writePhrase(dest, amp * SAMPLES.pens.gain) : writeWord(dest, amp);
      setTimeout(step, (took + rnd(0.25, 0.9)) * 1000);
    };
    setTimeout(step, delay * 1000);
  }

  /* ---------- The Throne: "Allah" ---------- */

  // Formants of the vowels: a (Al), l (-lāh onset), ā (long), then a soft h
  const VOWEL_A = [760, 1220, 2700], VOWEL_L = [400, 1050, 2600], VOWEL_AA = [800, 1250, 2650];
  // A gentle, luminous chorus: mid-range voices on one note with a soft
  // open fifth and octave above, slow swells, and a bright reverberant space.
  function sayAllah(pan) {
    const t = ac.currentTime + 0.05;
    const bus = spaced(out.dhikr, hall, 1, 0.2);
    const warm = filter('lowpass', 3200, 0.5);
    const lift = filter('highshelf', 2500); lift.gain.value = 3; // a little air, never murky
    chain(warm, lift, panner(pan), bus);
    const base = rnd(196, 204); // around G3: calm, open, not dark
    const voices = [
      [1, 0.07], [1.004, 0.06], [0.996, 0.06], [1.008, 0.05], [0.992, 0.05],
      [1.5, 0.025], [1.503, 0.02],        // a soft open fifth
      [2, 0.018], [2.004, 0.014],         // and a faint octave of light
    ];
    const T = { a: 0.35, l: 0.6, aa: 1.05, hold: 2.3, end: 3.4 };
    for (const [mult, amp] of voices) {
      const p = base * mult * (1 + rnd(-0.0015, 0.0015));
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(p, t);
      o.frequency.setValueAtTime(p, t + T.l);
      o.frequency.linearRampToValueAtTime(p * 1.059, t + T.aa); // a gentle lift on "-lāh"
      o.frequency.setValueAtTime(p * 1.059, t + T.hold);
      o.frequency.linearRampToValueAtTime(p, t + T.end);        // settles home, never sinks
      const vib = lfo(rnd(4.4, 5.0), 0, o.frequency);
      vib.gain.setValueAtTime(0, t + T.aa);
      vib.gain.linearRampToValueAtTime(p * 0.004, t + T.hold);
      const soft = filter('lowpass', 1500, 0.3);
      const env = gainNode(0);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(amp * 0.8, t + T.a);
      env.gain.linearRampToValueAtTime(amp * 0.6, t + T.l);
      env.gain.linearRampToValueAtTime(amp, t + T.aa + 0.2);
      env.gain.setValueAtTime(amp, t + T.hold);
      env.gain.linearRampToValueAtTime(0, t + T.end);
      chain(o, soft);
      [[1, 6], [0.5, 9], [0.22, 11]].forEach(([g, q], k) => {
        const bp = filter('bandpass', VOWEL_A[k], q);
        bp.frequency.setValueAtTime(VOWEL_A[k], t + T.a);
        bp.frequency.linearRampToValueAtTime(VOWEL_L[k], t + T.l - 0.05);
        bp.frequency.setValueAtTime(VOWEL_L[k], t + T.l + 0.08);
        bp.frequency.linearRampToValueAtTime(VOWEL_AA[k], t + T.aa);
        chain(soft, bp, gainNode(g * 5), env);
      });
      env.connect(warm);
      o.start(t);
      o.stop(t + T.end + 0.1);
    }
    burst(warm, { freq: 1800, q: 0.6, dur: 0.9, amp: 0.025, attack: 0.4, when: T.hold - 0.1 });
  }

  // A phrase cut from the quill recording: a random stretch, softly faded
  function writePhrase(dest, amp) {
    const buf = sampled.pens, t = ac.currentTime + 0.03;
    const len = Math.min(buf.duration - 0.1, rnd(0.6, 1.7));
    const from = rnd(0, buf.duration - len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rnd(0.94, 1.06); // each hand writes a little differently
    const g = gainNode(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.04);
    g.gain.setValueAtTime(amp, t + len - 0.08);
    g.gain.linearRampToValueAtTime(0, t + len);
    chain(src, g, dest);
    src.start(t, from, len + 0.05);
    return len;
  }

  // Load a recording; if present it replaces that layer's synthesis
  async function loadSample(layer) {
    const cfg = SAMPLES[layer];
    try {
      const res = await fetch(cfg.file);
      if (!res.ok) return;
      const buf = await ac.decodeAudioData(await res.arrayBuffer());
      sampled[layer] = buf;
      if (cfg.mode === 'multitude') return startMultitude(layer, buf, cfg);
      if (cfg.mode !== 'flow') return; // slices are played by their writer
      // seamless flow: each voice starts a new copy before the last one ends,
      // crossfading across the join, so there is never an audible loop point
      const fade = Math.min(1.5, buf.duration / 4);
      const step = buf.duration - fade;
      const dest = spaced(out[layer], layer === 'dhikr' ? hall : space, cfg.room, 1);
      const streams = Array.from({ length: cfg.voices }, (_, v) => ({
        next: ac.currentTime + 0.05 + (step * v) / cfg.voices,
        pan: cfg.voices > 1 ? (v % 2 ? 0.3 : -0.3) : 0,
        gain: (v ? 0.7 : 1) * cfg.gain,
      }));
      const schedule = () => {
        const now = ac.currentTime;
        for (const st of streams) {
          if (level[layer] < 0.004) { st.next = Math.max(st.next, now + 0.05); continue; }
          while (st.next < now + 1.5) {
            const t = Math.max(st.next, now + 0.02);
            const src = ac.createBufferSource();
            src.buffer = buf;
            const g = gainNode(0);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(st.gain, t + fade);
            g.gain.setValueAtTime(st.gain, t + buf.duration - fade);
            g.gain.linearRampToValueAtTime(0, t + buf.duration);
            chain(src, g, panner(st.pan), dest);
            src.start(t);
            st.next = t + step;
          }
        }
      };
      schedule();
      setInterval(schedule, 400);
    } catch (_) { /* no recording: keep the synthesis */ }
  }

  // Thousands glorifying at once (Ghafir 40:7): every copy of the recording is
  // a different voice — slightly higher or lower, faster or slower, nearer or
  // further, left or right — begun at its own moment. Filtered to a whisper and
  // set far back in a vast space, the words blur into a murmur of "Allah".
  function startMultitude(layer, buf, cfg) {
    const room = gainNode(cfg.room);
    room.connect(hall);
    const bus = gainNode(1);
    // whisper: remove the chest of the voices, keep the breath and the consonants
    const low = filter('highpass', 520, 0.5), high = filter('lowpass', 4200, 0.4);
    const presence = filter('peaking', 2400, 0.8); presence.gain.value = 4;
    chain(bus, low, high, presence);
    presence.connect(gainNode(0.25)).connect(out[layer]); // a little dry, for clarity
    presence.connect(room);                                // most of it in the hall
    for (let v = 0; v < cfg.voices; v++) {
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.playbackRate.value = rnd(0.86, 1.14);            // each voice its own pitch & pace
      const far = Math.random();
      const g = gainNode(0);
      const at = ac.currentTime + rnd(0, 3);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime((0.05 + 0.07 * (1 - far)) * cfg.gain, at + rnd(2, 5)); // swell in
      const dist = filter('lowpass', 2500 + (1 - far) * 4000, 0.4);   // further = softer, darker
      chain(src, dist, g, panner(rnd(-0.95, 0.95)), bus);
      src.start(at, rnd(0, buf.duration));
    }
  }

  /* ---------- event scheduler ---------- */

  let side = 1;
  function tick() {
    if (!enabled || ac.state !== 'running') return;
    const now = ac.currentTime;
    if (level.water > 0.01) {
      for (const f of out.water._voices) if (Math.random() < 0.35) f.frequency.setTargetAtTime(rnd(520, 1500), now, 0.08);
    }
    if (level.leaves > 0.01 && Math.random() < 0.15) out.leaves._gust.gain.setTargetAtTime(rnd(0.2, 1), now, 0.3);
    if (level.birds > 0.01 && now >= nextBird) { birdCall(); nextBird = now + rnd(0.7, 2.8); }
    if (level.rain > 0.01) {
      // soft droplets: tiny, bright, randomly spaced — the sound of rain on leaves
      const n = Math.random() < 0.6 ? 2 + Math.floor(Math.random() * 4) : 1;
      for (let i = 0; i < n; i++) {
        const dest = out.rain._drops[Math.floor(Math.random() * 3)];
        burst(dest, { type: 'bandpass', freq: rnd(2500, 7000), q: rnd(2, 6), dur: rnd(0.008, 0.03), amp: Math.pow(Math.random(), 2) * 0.5, attack: 0.001, when: Math.random() * 0.04 });
      }
    }
    if (level.crickets > 0.01) {
      for (const c of crickets) if (now >= c.next) { cricket(c); c.next = now + rnd(0.55, 1.1) + (Math.random() < 0.1 ? rnd(1, 3) : 0); }
    }
    if (level.dhikr > 0.01 && !sampled.dhikr && now >= nextDhikr) {
      sayAllah((side = -side) * 0.25);
      nextDhikr = now + rnd(4.6, 5.6);
    }
    if (level.crackle > 0.01) {
      const count = Math.random() < 0.5 ? 1 : Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        burst(out.crackle, { type: 'highpass', freq: rnd(1400, 3800), q: 0.5, dur: rnd(0.004, 0.022), amp: Math.pow(Math.random(), 2.5) * 1.4, attack: 0.001 });
      }
    }
    if (level.boil > 0.01 && Math.random() < 0.3) {
      burst(out.boil, { type: 'bandpass', freq: rnd(220, 600), q: 9, dur: rnd(0.05, 0.13), amp: 0.8, sweep: rnd(300, 700), attack: 0.01, buf: brown });
    }
  }

  /* ---------- public API ---------- */

  let lastA = '', lastB = '', lastT = -1;
  function setPosition(a, b, t) {
    if (a === lastA && b === lastB && Math.abs(t - lastT) < 0.01) return;
    lastA = a; lastB = b; lastT = t;
    const ma = MIX[a] || {}, mb = MIX[b] || {};
    for (const k of LAYERS) level[k] = ((ma[k] || 0) * (1 - t) + (mb[k] || 0) * t) * TRIM[k];
    apply();
  }

  function apply() {
    if (!ac) return;
    const now = ac.currentTime;
    for (const k of LAYERS) {
      if (Math.abs(level[k] - applied[k]) < 0.004) continue;
      applied[k] = level[k];
      out[k].gain.setTargetAtTime(level[k], now, 0.8);
    }
  }

  const buttons = [...document.querySelectorAll('.sound-btn, .sound-toggle')];

  function setEnabled(on, remember = true) {
    enabled = on;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(on)));
    if (remember) { try { localStorage.setItem(STORE, on ? '1' : '0'); } catch (_) { /* storage unavailable */ } }
    if (!on) {
      if (ac) master.gain.setTargetAtTime(0, ac.currentTime, 0.3);
      return;
    }
    if (!ac) build();
    ac.resume();
    apply();
    master.gain.setTargetAtTime(MASTER, ac.currentTime, 0.8);
  }

  buttons.forEach((b) => b.addEventListener('click', () => setEnabled(!enabled)));

  // Remembered "on": start at the first tap or key press (browsers require one)
  let wanted = false;
  try { wanted = localStorage.getItem(STORE) === '1'; } catch (_) { /* storage unavailable */ }
  if (wanted) {
    // the buttons stay "off" until audio is truly running — any tap or key starts it
    const start = (e) => {
      if (e.target.closest?.('.sound-btn, .sound-toggle')) return; // the buttons handle themselves
      removeEventListener('pointerdown', start, true);
      removeEventListener('keydown', start, true);
      if (!enabled) setEnabled(true);
    };
    addEventListener('pointerdown', start, true);
    addEventListener('keydown', start, true);
    buttons.forEach((b) => b.addEventListener('click', () => {
      removeEventListener('pointerdown', start, true);
      removeEventListener('keydown', start, true);
    }, { once: true }));
  }

  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) ac.suspend();
    else if (enabled) ac.resume();
  });

  window.SoundScape = {
    setPosition, setEnabled, MIX,
    get state() { return ac ? ac.state : 'off'; },
    get levels() { return { ...level }; },
    // debugging: loudness of what is playing right now, in dBFS
    meter() {
      if (!meterNode) return -Infinity;
      const d = new Float32Array(meterNode.fftSize); meterNode.getFloatTimeDomainData(d);
      const rms = Math.sqrt(d.reduce((a, v) => a + v * v, 0) / d.length);
      return Math.round(20 * Math.log10(rms || 1e-9) * 10) / 10;
    },
    preview: { allah: () => ac && sayAllah(0), bird: () => ac && birdCall(), word: () => ac && writeWord(out.pens, 1) },
  };
});
