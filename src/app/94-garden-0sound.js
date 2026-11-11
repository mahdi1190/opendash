/* ============================================================
   GARDEN, its sound (2.68). The owner: make it feel like a real, polished cosy game. Everything is made on the spot with Web Audio:
   no audio files, nothing downloaded, nothing to licence, and it works offline.

     gardenSfx(name, o)        one short sound: steps, panels, tools, fishing, the net, doors, the gate's mist, a level, a pet, a friend.
                               Falsy when it is not played (Sounds off, effects off, the tab hidden, nobody has clicked yet).
     gardenSoundOut(ac)        where the older garden chimes plug in (_glSound, wdSound): the effects bus, so the volume and the
                               Effects switch reach them too
     gardenSoundFxOn()         the Effects switch (gardenAudioContext asks it)
     gardenSoundWake()         start listening (the world calls it when it starts; any click or key does too)
     gardenSoundOpen()         the Sound panel (Garden menu > View & help > Sound)
     gardenSoundRender(name, secs, o)   the same sound drawn into an OfflineAudioContext, for checking levels (no speakers needed)
     gardenSoundLog()          the last 200 sounds played: [{t, s}]

   Preferences live with the game's own (state.game.prefs): sounds (the app's Sounds switch, off by default: nothing plays without it),
   gsVol 0..1 (0.7), gsAmb (music and nature sounds, on), gsFx (sound effects, on).
   Cost: one 160 ms timer while the garden shows (none otherwise), at most eight ambience chains made once and reused, short-lived
   nodes for each one-shot, nothing per frame. The context is suspended while the tab is hidden and when you leave the garden.
   Browsers only allow sound after the first click or key press: nothing plays before it.
   ============================================================ */
const _gsn = { ac: null, g: null, amb: null, armed: false, iv: 0, n: 0, log: [], last: Object.create(null), uiQuiet: 0, step: { at: 0, x: NaN, y: NaN, moving: false, side: 1 }, reel: 0, strain: 0, room: '', src: null, srcAt: 0, music: 0, petAt: 0, noise: new WeakMap(), fade: 0 };
const GS_TICK_MS = 160;

/* ---------- preferences ---------- */
function _gsPrefs() {
  const p = typeof _gmG === 'function' ? _gmG().prefs : {};
  const vol = Number(p.gsVol);
  return { on: !!p.sounds, vol: Number.isFinite(vol) ? Math.max(0, Math.min(1, vol)) : 0.7, amb: p.gsAmb !== false, fx: p.gsFx !== false };
}
function gardenSoundFxOn() { try { return _gsPrefs().fx; } catch (e) { return true; } }
function _gsAllowed() { try { return _gsn.armed && _gsPrefs().on && !document.hidden && (typeof gameOn !== 'function' || gameOn()); } catch (e) { return false; } }
function _gsSet(patch) {
  const p = _gmG().prefs; Object.assign(p, patch);
  try { if (typeof _gm !== 'undefined') { _gm.rev++; _gm.key = ''; } if (typeof saveUI === 'function') saveUI(); } catch (e) { /* saved next time */ }
  _gsApply(); gardenSoundWake();
}

/* ---------- the context and its buses ---------- */
function _gsnCtx() {
  const ac = typeof gardenAudioContext === 'function' ? gardenAudioContext(true) : null;
  if (!ac) return null;
  if (_gsn.ac !== ac || !_gsn.g) { _gsn.ac = ac; _gsn.g = _gsGraph(ac); _gsn.amb = null; _gsApply(); }
  if (ac.state === 'suspended' && _gsn.armed && !document.hidden) { try { const r = ac.resume(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* later */ } }
  return ac;
}
function _gsGraph(c) {
  const G = { master: c.createGain(), lim: c.createDynamicsCompressor(), fx: c.createGain(), amb: c.createGain(), ambLP: c.createBiquadFilter(), music: c.createGain(), mIn: c.createGain(), dly: c.createDelay(1), fb: c.createGain(), wet: c.createGain(), dlyLP: c.createBiquadFilter() };
  // a soft safety limiter: nothing in here is loud, but a pile-up never clips
  G.lim.threshold.value = -10; G.lim.knee.value = 10; G.lim.ratio.value = 6; G.lim.attack.value = 0.004; G.lim.release.value = 0.3;
  G.master.connect(G.lim); G.lim.connect(c.destination);
  G.fx.connect(G.master);
  G.ambLP.type = 'lowpass'; G.ambLP.frequency.value = 16000; G.ambLP.Q.value = 0.5; G.amb.connect(G.ambLP); G.ambLP.connect(G.master);
  // the music: a little echo, darkened, for space
  G.dly.delayTime.value = 0.36; G.fb.gain.value = 0.3; G.wet.gain.value = 0.26; G.dlyLP.type = 'lowpass'; G.dlyLP.frequency.value = 2600;
  G.mIn.connect(G.music); G.mIn.connect(G.dly); G.dly.connect(G.dlyLP); G.dlyLP.connect(G.fb); G.fb.connect(G.dly); G.dlyLP.connect(G.wet); G.wet.connect(G.music);
  G.music.connect(G.master);
  return G;
}
function _gsApply() {
  const G = _gsn.g, c = _gsn.ac; if (!G || !c) return;
  const p = _gsPrefs(), t = c.currentTime;
  G.master.gain.setTargetAtTime(p.vol * p.vol, t, 0.05);
  G.fx.gain.setTargetAtTime(p.fx ? 1 : 0, t, 0.05);
  G.amb.gain.setTargetAtTime(p.amb ? 1 : 0, t, 0.2);
  G.music.gain.setTargetAtTime(p.amb ? 1 : 0, t, 0.2);
}
/** Where an older garden chime plugs in. */
function gardenSoundOut(ac) { return _gsn.g && ac === _gsn.ac ? _gsn.g.fx : ac.destination; }

/* ---------- building blocks (any BaseAudioContext: the live one or an offline render) ---------- */
function _gsNoise(c) {
  let b = _gsn.noise.get(c);
  if (!b) { const n = Math.floor(c.sampleRate * 2.5); b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; _gsn.noise.set(c, b); }
  return b;
}
function _gsPan(c, out, pan) {
  if (!pan || !c.createStereoPanner) return out;
  const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(out); return p;
}
/** A tone: {f, f2 (glide to), fm (a middle pitch), type, a (attack), d (length), peak, pan, lp (a lowpass), bp/q (a bandpass)} */
function _gsTone(c, out, t, o) {
  const osc = c.createOscillator(), v = c.createGain(), d = o.d || 0.2, a = Math.min(o.a || 0.005, d * 0.5);
  v.gain.value = 0;   // (silent until it starts: a gain left at 1 lets a click through)
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
  if (o.fm) { osc.frequency.exponentialRampToValueAtTime(o.fm, t + d * 0.45); if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + d); }
  else if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || d));
  v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(o.peak, t + a); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
  let node = osc;
  if (o.bp || o.lp) { const f = c.createBiquadFilter(); f.type = o.bp ? 'bandpass' : 'lowpass'; f.frequency.value = o.bp || o.lp; f.Q.value = o.q || 0.8; node.connect(f); node = f; }
  node.connect(v); v.connect(_gsPan(c, out, o.pan));
  osc.start(t); osc.stop(t + d + 0.03);
}
/** A breath of filtered noise: {type ('bandpass' | 'lowpass' | 'highpass'), f, f2, q, a, d, peak, pan, rate} */
function _gsHiss(c, out, t, o) {
  const s = c.createBufferSource(), f = c.createBiquadFilter(), v = c.createGain(), d = Math.max(0.012, o.d || 0.1), a = Math.min(o.a || 0.004, d * 0.6);
  v.gain.value = 0;
  s.buffer = _gsNoise(c); s.playbackRate.value = o.rate || 1;
  f.type = o.type || 'bandpass'; f.frequency.value = o.f; f.Q.value = o.q || 0.8; if (o.f2) { f.frequency.setValueAtTime(o.f, t); f.frequency.exponentialRampToValueAtTime(o.f2, t + d); }   // (set before it starts: a filter that jumps mid-signal can spike)
  v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(o.peak, t + a); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f); f.connect(v); v.connect(_gsPan(c, out, o.pan));
  s.start(t, Math.random() * 2); s.stop(t + d + 0.03);
}
/** A soft music-box note (two sines). */
function _gsPluck(c, out, t, f, peak, d, pan) {
  _gsTone(c, out, t, { f, peak, a: 0.004, d: d || 0.7, pan });
  _gsTone(c, out, t, { f: f * 2, peak: peak * 0.22, a: 0.003, d: (d || 0.7) * 0.4, pan });
}
/** A small bell (inharmonic partials). */
function _gsBell(c, out, t, f, peak, d, pan) {
  _gsTone(c, out, t, { f, peak, a: 0.003, d: d || 1.1, pan });
  _gsTone(c, out, t, { f: f * 2.01, peak: peak * 0.3, a: 0.003, d: (d || 1.1) * 0.55, pan });
  _gsTone(c, out, t, { f: f * 3.02, peak: peak * 0.12, a: 0.002, d: (d || 1.1) * 0.3, pan });
}
const _gsJ = (R, v, p) => v * (1 + (R() * 2 - 1) * p);

/* ---------- the voices of things ---------- */
function _gsBird(c, out, t, R, kind, peak, pan) {
  const osc = c.createOscillator(), v = c.createGain(), hp = c.createBiquadFilter();
  osc.type = 'sine'; hp.type = 'highpass'; hp.frequency.value = kind === 'dove' || kind === 'owl' ? 120 : 900;
  v.gain.setValueAtTime(0, t);
  const P = osc.frequency, base = _gsJ(R, kind === 'tit' ? 4200 : kind === 'wren' ? 4800 : 3300, 0.12);
  let at = t;
  const note = (f0, f1, d, k) => { P.setValueAtTime(f0, at); P.exponentialRampToValueAtTime(f1, at + d); v.gain.setValueAtTime(0.0001, at); v.gain.linearRampToValueAtTime(peak * (k || 1), at + Math.min(0.012, d * 0.3)); v.gain.linearRampToValueAtTime(0.0001, at + d); at += d; };
  const rest = (d) => { at += d; };
  if (kind === 'robin') { const n = 4 + Math.floor(R() * 4); for (let i = 0; i < n; i++) { const f = base * (0.75 + R() * 0.6); note(f, f * (R() < 0.5 ? 1.25 : 0.8), 0.05 + R() * 0.09, 0.6 + R() * 0.4); rest(0.02 + R() * 0.06); } }
  else if (kind === 'tit') { const n = 2 + Math.floor(R() * 2); for (let i = 0; i < n; i++) { note(base, base * 0.98, 0.09, 0.9); rest(0.04); note(base * 0.74, base * 0.72, 0.1, 0.8); rest(0.09); } }
  else if (kind === 'wren') { const n = 10 + Math.floor(R() * 10); for (let i = 0; i < n; i++) { note(base * (1 + (i % 2) * 0.1), base * 0.9, 0.035, 0.7); rest(0.012); } }
  else if (kind === 'dove') { osc.type = 'triangle'; const f = _gsJ(R, 520, 0.05); for (const [d, k, g] of [[0.32, 1, 0.9], [0.5, 1.06, 1], [0.24, 1, 0.8], [0.24, 0.98, 0.7], [0.36, 0.94, 0.7]]) { note(f * k, f * k * 0.92, d, g); rest(0.1); } }
  else if (kind === 'owl') { const f = _gsJ(R, 370, 0.05); note(f, f * 0.94, 0.42, 1); rest(0.6); note(f * 1.02, f * 0.95, 0.22, 0.8); rest(0.06); note(f, f * 0.9, 0.5, 0.9); }
  else if (kind === 'gull') { osc.type = 'sawtooth'; hp.type = 'bandpass'; hp.frequency.value = 1500; hp.Q.value = 2.5; const f = _gsJ(R, 1150, 0.1); for (let i = 0; i < 3; i++) { note(f, f * 1.4, 0.12, 1); note(f * 1.4, f * 0.8, 0.22, 0.8); rest(0.12); } }
  else { const f = base; note(f, f * 1.3, 0.07, 1); rest(0.05); note(f * 1.2, f * 0.9, 0.08, 0.8); }   // a tweet
  osc.connect(hp); hp.connect(v); v.connect(_gsPan(c, out, pan));
  osc.start(t); osc.stop(at + 0.05);
  return at - t;
}
function _gsFrog(c, out, t, R, peak, pan) {
  const osc = c.createOscillator(), f = c.createBiquadFilter(), v = c.createGain(); osc.type = 'sawtooth'; osc.frequency.value = _gsJ(R, 120, 0.15); f.type = 'bandpass'; f.frequency.value = _gsJ(R, 520, 0.15); f.Q.value = 3;
  v.gain.setValueAtTime(0, t); let at = t;
  for (let g = 0; g < 2; g++) { for (let i = 0; i < 5; i++) { v.gain.setValueAtTime(0, at); v.gain.linearRampToValueAtTime(peak, at + 0.008); v.gain.linearRampToValueAtTime(0, at + 0.03); at += 0.038; } at += 0.12; }
  osc.connect(f); f.connect(v); v.connect(_gsPan(c, out, pan)); osc.start(t); osc.stop(at + 0.05);
}
const _gsSteps = {
  grass: (c, o, t, R, k, p) => { _gsHiss(c, o, t, { f: _gsJ(R, 1900, 0.25), q: 0.7, a: 0.008, d: _gsJ(R, 0.1, 0.2), peak: 0.16 * k, pan: p }); _gsHiss(c, o, t + 0.012, { type: 'lowpass', f: 500, q: 0.7, d: 0.06, peak: 0.12 * k, pan: p }); },
  path: (c, o, t, R, k, p) => { const n = 3 + Math.floor(R() * 3); for (let i = 0; i < n; i++) _gsHiss(c, o, t + R() * 0.05, { f: _gsJ(R, 3200, 0.35), q: 2.2, a: 0.002, d: 0.018 + R() * 0.02, peak: 0.2 * k, pan: p }); _gsTone(c, o, t, { f: _gsJ(R, 95, 0.1), f2: 60, d: 0.06, peak: 0.08 * k, pan: p }); },
  wood: (c, o, t, R, k, p) => { const f = _gsJ(R, 175, 0.08); _gsTone(c, o, t, { type: 'triangle', f, f2: f * 0.82, d: 0.1, peak: 0.16 * k, pan: p }); _gsTone(c, o, t, { f: f * 2.4, d: 0.05, peak: 0.05 * k, pan: p }); _gsHiss(c, o, t, { type: 'highpass', f: 2800, d: 0.012, peak: 0.07 * k, pan: p }); },
  sand: (c, o, t, R, k, p) => { _gsHiss(c, o, t, { type: 'lowpass', f: _gsJ(R, 750, 0.2), q: 0.6, a: 0.018, d: _gsJ(R, 0.15, 0.15), peak: 0.22 * k, pan: p }); },
  snow: (c, o, t, R, k, p) => { _gsHiss(c, o, t, { f: _gsJ(R, 1300, 0.2), q: 1.3, a: 0.025, d: _gsJ(R, 0.17, 0.15), peak: 0.15 * k, pan: p }); for (let i = 0; i < 4; i++) _gsHiss(c, o, t + 0.02 + R() * 0.12, { f: _gsJ(R, 3400, 0.2), q: 3, a: 0.002, d: 0.012, peak: 0.07 * k, pan: p }); },
};
function _gsPet(c, out, t, R, sp) {
  const id = String(sp && sp.id || ''), kind = String(sp && sp.kind || 'mammal');
  if (/dog|pup|corgi|hound|fox|wolf/.test(id)) { for (const at of [0, 0.24]) _gsTone(c, out, t + at, { type: 'sawtooth', f: _gsJ(R, 330, 0.08), f2: 190, d: 0.13, a: 0.01, peak: 0.12, bp: 750, q: 1.6 }); return; }
  if (/cat|kitten|lynx|tiger|lion/.test(id)) { _gsTone(c, out, t, { type: 'sawtooth', f: _gsJ(R, 480, 0.06), fm: 780, f2: 560, a: 0.06, d: 0.55, peak: 0.08, bp: 1400, q: 2.5 }); return; }
  if (kind === 'bird' || /owl|duck|chick/.test(id)) { _gsBird(c, out, t, R, 'tweet', 0.05); return; }
  if (kind === 'amphibian' || kind === 'reptile') { _gsFrog(c, out, t, R, 0.06); return; }
  if (kind === 'sea') { for (let i = 0; i < 4; i++) _gsTone(c, out, t + i * 0.07 + R() * 0.03, { f: _gsJ(R, 700, 0.2), f2: 1300, d: 0.05, peak: 0.05 }); return; }
  if (kind === 'myth') { for (let i = 0; i < 5; i++) _gsPluck(c, out, t + i * 0.06, [1568, 1760, 2093, 2349, 2637][i], 0.025, 0.5); return; }
  if (kind === 'bug') { for (let i = 0; i < 3; i++) _gsTone(c, out, t + i * 0.05, { f: 4600, d: 0.03, peak: 0.03 }); return; }
  if (kind === 'machine') { _gsTone(c, out, t, { type: 'square', f: 880, d: 0.09, peak: 0.025, lp: 2000 }); _gsTone(c, out, t + 0.12, { type: 'square', f: 660, d: 0.12, peak: 0.025, lp: 2000 }); return; }
  for (let i = 0, n = 2 + Math.floor(R() * 2); i < n; i++) _gsTone(c, out, t + i * 0.1, { f: _gsJ(R, 2300, 0.1), f2: 2900, d: 0.07, peak: 0.045 });   // a squeak: rabbits, hamsters, mice, guinea pigs...
}
const _gsSfx = {
  // panels
  open: (c, o, t, R) => { _gsTone(c, o, t, { f: 520, f2: 760, d: 0.13, peak: 0.1 }); _gsTone(c, o, t + 0.05, { f: 780, f2: 1040, d: 0.16, peak: 0.065 }); _gsHiss(c, o, t, { f: 3000, d: 0.05, peak: 0.03 }); },
  close: (c, o, t, R) => { _gsTone(c, o, t, { f: 760, f2: 540, d: 0.12, peak: 0.08 }); _gsTone(c, o, t + 0.05, { f: 520, f2: 400, d: 0.15, peak: 0.06 }); },
  tab: (c, o, t, R) => { _gsTone(c, o, t, { type: 'triangle', f: _gsJ(R, 1500, 0.04), d: 0.035, peak: 0.07 }); _gsHiss(c, o, t, { type: 'highpass', f: 4000, d: 0.01, peak: 0.03 }); },
  buy: (c, o, t, R) => { for (let i = 0; i < 3; i++) { const f = _gsJ(R, 2500, 0.04) * (1 + i * 0.19); _gsTone(c, o, t + i * 0.07, { f, d: 0.28, peak: 0.06 }); _gsTone(c, o, t + i * 0.07, { f: f * 2.76, d: 0.1, peak: 0.022 }); } _gsPluck(c, o, t + 0.2, 1318.5, 0.04, 0.5); _gsPluck(c, o, t + 0.28, 1760, 0.035, 0.6); },
  sell: (c, o, t, R) => { for (let i = 0; i < 4; i++) { const f = _gsJ(R, 2300, 0.08); _gsTone(c, o, t + i * 0.06, { f, d: 0.22, peak: 0.05 }); _gsTone(c, o, t + i * 0.06, { f: f * 2.76, d: 0.08, peak: 0.018 }); } },
  cant: (c, o, t, R) => { _gsTone(c, o, t, { type: 'triangle', f: 330, f2: 300, d: 0.11, peak: 0.1, lp: 1200 }); _gsTone(c, o, t + 0.11, { type: 'triangle', f: 247, f2: 230, d: 0.16, peak: 0.09, lp: 1000 }); },
  cheer: (c, o, t, R) => { _gsPluck(c, o, t, 880, 0.045, 0.35); _gsPluck(c, o, t + 0.06, 1174.7, 0.04, 0.4); },
  // fishing
  cast: (c, o, t, R) => { _gsHiss(c, o, t, { f: 500, f2: 2600, q: 1, a: 0.08, d: 0.34, peak: 0.13 }); _gsTone(c, o, t + 0.06, { f: 1500, f2: 600, d: 0.32, peak: 0.018 }); },
  plop: (c, o, t, R) => { _gsTone(c, o, t, { f: _gsJ(R, 700, 0.1), f2: 160, d: 0.1, a: 0.002, peak: 0.17 }); _gsHiss(c, o, t + 0.01, { f: 1000, q: 0.8, d: 0.13, peak: 0.07 }); for (let i = 0; i < 3; i++) _gsTone(c, o, t + 0.09 + R() * 0.22, { f: _gsJ(R, 900, 0.2), f2: 1600, d: 0.03, peak: 0.035 }); },
  nibble: (c, o, t, R) => { _gsTone(c, o, t, { f: _gsJ(R, 900, 0.1), f2: 1300, d: 0.045, peak: 0.07 }); _gsTone(c, o, t + 0.09, { f: _gsJ(R, 800, 0.1), f2: 1150, d: 0.04, peak: 0.045 }); },
  bite: (c, o, t, R) => { _gsHiss(c, o, t, { f: 1500, f2: 650, q: 0.7, a: 0.004, d: 0.38, peak: 0.24 }); _gsTone(c, o, t, { f: 230, f2: 90, d: 0.16, peak: 0.14 }); for (let i = 0; i < 4; i++) _gsTone(c, o, t + 0.1 + R() * 0.3, { f: _gsJ(R, 2200, 0.3), f2: 3000, d: 0.025, peak: 0.035 }); _gsPluck(c, o, t + 0.02, 1568, 0.04, 0.3); },
  strike: (c, o, t, R) => { _gsHiss(c, o, t, { f: 900, f2: 2200, q: 1, d: 0.12, peak: 0.1 }); },
  tick: (c, o, t, R, x) => { const k = (x && x.k) || 0; _gsHiss(c, o, t, { type: 'highpass', f: 3500, d: 0.007, peak: 0.07 }); _gsTone(c, o, t, { f: 2300 + k * 1500, d: 0.014, peak: 0.022 }); },
  drag: (c, o, t, R) => { _gsHiss(c, o, t, { type: 'highpass', f: 5000, d: 0.005, peak: 0.04 }); },
  strain: (c, o, t, R, x) => { const k = (x && x.k) || 0; _gsTone(c, o, t, { type: 'triangle', f: 1700 + k * 700, f2: 1750 + k * 760, a: 0.05, d: 0.3, peak: 0.022 }); },
  splash: (c, o, t, R) => { _gsHiss(c, o, t, { f: 1900, f2: 800, q: 0.6, a: 0.005, d: 0.42, peak: 0.2 }); for (let i = 0; i < 5; i++) _gsTone(c, o, t + 0.12 + R() * 0.35, { f: _gsJ(R, 2000, 0.35), f2: 2900, d: 0.025, peak: 0.032 }); },
  catch: (c, o, t, R, x) => {
    const rare = x && x.rare, notes = rare ? [1046.5, 1318.5, 1568, 2093, 2637] : [1046.5, 1318.5, 1568, 2093];
    notes.forEach((f, i) => _gsPluck(c, o, t + i * 0.085, f, 0.05, 0.8, (i - 2) * 0.12));
    for (let i = 0; i < (rare ? 6 : 3); i++) _gsTone(c, o, t + notes.length * 0.085 + i * 0.06, { f: _gsJ(R, 3600, 0.2), d: 0.25, peak: 0.016 });
    if (rare) for (const f of [261.6, 329.6, 392]) _gsTone(c, o, t, { f, a: 0.25, d: 1.6, peak: 0.022 });
  },
  lost: (c, o, t, R) => { _gsPluck(c, o, t, 784, 0.045, 0.45); _gsPluck(c, o, t + 0.16, 587.3, 0.04, 0.6); },
  reelin: (c, o, t, R) => { for (let i = 0; i < 9; i++) _gsSfx.tick(c, o, t + i * 0.045, R, { k: 0.2 }); },
  // the net
  swing: (c, o, t, R) => { _gsHiss(c, o, t, { f: 700, f2: 2100, q: 0.9, a: 0.04, d: 0.22, peak: 0.12 }); },
  netted: (c, o, t, R) => { _gsTone(c, o, t, { f: 420, f2: 900, d: 0.07, peak: 0.11 }); _gsPluck(c, o, t + 0.06, 1568, 0.045, 0.5); _gsPluck(c, o, t + 0.13, 2093, 0.04, 0.6); },
  missed: (c, o, t, R) => { _gsTone(c, o, t, { type: 'triangle', f: 330, f2: 260, d: 0.16, peak: 0.06, lp: 1200 }); },
  // the garden
  plant: (c, o, t, R) => { for (const at of [0, 0.13]) _gsHiss(c, o, t + at, { type: 'lowpass', f: _gsJ(R, 420, 0.15), q: 0.7, d: 0.08, peak: 0.28 }); _gsTone(c, o, t + 0.26, { f: 620, f2: 940, d: 0.1, peak: 0.05 }); },
  water: (c, o, t, R) => { _gsHiss(c, o, t, { f: 2300, f2: 1700, q: 1.3, a: 0.09, d: 0.75, peak: 0.1 }); for (let i = 0; i < 6; i++) _gsTone(c, o, t + 0.1 + R() * 0.7, { f: _gsJ(R, 1800, 0.3), f2: 2700, d: 0.03, peak: 0.032 }); },
  harvest: (c, o, t, R) => { _gsTone(c, o, t, { f: 260, f2: 720, d: 0.07, peak: 0.14 }); _gsHiss(c, o, t, { f: 3000, q: 0.8, d: 0.2, peak: 0.07 }); _gsPluck(c, o, t + 0.08, 1318.5, 0.04, 0.35); },
  dig: (c, o, t, R) => { _gsHiss(c, o, t, { f: 900, q: 1, d: 0.13, peak: 0.2 }); _gsHiss(c, o, t + 0.05, { type: 'lowpass', f: 300, d: 0.1, peak: 0.22 }); },
  place: (c, o, t, R) => { _gsTone(c, o, t, { type: 'triangle', f: 220, f2: 190, d: 0.08, peak: 0.13 }); _gsTone(c, o, t + 0.09, { type: 'triangle', f: 196, f2: 170, d: 0.09, peak: 0.1 }); },
  craft: (c, o, t, R) => { for (const at of [0, 0.18, 0.36]) { _gsTone(c, o, t + at, { type: 'triangle', f: _gsJ(R, 900, 0.05), d: 0.05, peak: 0.08 }); _gsHiss(c, o, t + at, { type: 'highpass', f: 3000, d: 0.012, peak: 0.05 }); } },
  sparkle: (c, o, t, R) => { for (let i = 0; i < 5; i++) _gsTone(c, o, t + i * 0.05, { f: _gsJ(R, 3000, 0.3), d: 0.22, peak: 0.024, pan: (R() - 0.5) * 0.6 }); },
  door: (c, o, t, R) => { _gsTone(c, o, t, { type: 'sawtooth', f: _gsJ(R, 95, 0.05), fm: 125, f2: 88, a: 0.06, d: 0.5, peak: 0.07, bp: 700, q: 5 }); _gsHiss(c, o, t + 0.5, { type: 'highpass', f: 2600, d: 0.016, peak: 0.08 }); _gsTone(c, o, t + 0.55, { f: 115, f2: 70, d: 0.13, peak: 0.12 }); },
  gate: (c, o, t, R) => {
    _gsTone(c, o, t, { type: 'sawtooth', f: 185, fm: 265, f2: 175, a: 0.1, d: 0.9, peak: 0.04, bp: 1200, q: 8 }); _gsHiss(c, o, t + 0.9, { type: 'highpass', f: 2200, d: 0.02, peak: 0.07 });
    _gsHiss(c, o, t + 0.4, { type: 'lowpass', f: 300, f2: 2400, q: 0.4, a: 1.2, d: 3.2, peak: 0.1 });   // the mist rolls back
    [784, 987.8, 1174.7, 1568].forEach((f, i) => _gsPluck(c, o, t + 0.9 + i * 0.16, f, 0.035, 1.1, (i - 1.5) * 0.2));
  },
  level: (c, o, t, R) => { [523.25, 659.25, 784, 1046.5].forEach((f, i) => _gsPluck(c, o, t + i * 0.11, f, 0.055, 0.9)); for (const f of [261.6, 329.6, 392]) _gsTone(c, o, t, { f, a: 0.3, d: 1.7, peak: 0.02 }); },
  friend: (c, o, t, R) => { _gsBell(c, o, t, 1318.5, 0.05, 1.1, -0.15); _gsBell(c, o, t + 0.28, 1046.5, 0.05, 1.3, 0.15); },
  pet: (c, o, t, R, x) => _gsPet(c, o, t, R, x && x.sp),
};
function _gsStep(c, out, t, surface, R, k, pan) { (_gsSteps[surface] || _gsSteps.grass)(c, out, t, R, k == null ? 1 : k, pan || 0); }

/** One sound. o: {at: seconds from now, k: tension for 'tick'/'strain', rare: for 'catch', sp: a pet species} */
function gardenSfx(name, o) {
  o = o || {};
  try {
    if (!_gsAllowed() || !_gsPrefs().fx) return false;
    const fn = _gsSfx[name]; if (!fn) return false;
    const now = performance.now(), gap = name === 'tick' || name === 'drag' ? 30 : 70;
    if (now - (_gsn.last[name] || 0) < gap) return true;   // (the same sound twice at once is one sound)
    if ((name === 'open' || name === 'close') && now < _gsn.uiQuiet) return true;
    _gsn.last[name] = now;
    if (name === 'door' || name === 'gate') _gsn.uiQuiet = now + 450;
    const c = _gsnCtx(); if (!c || !_gsn.g) return false;
    fn(c, _gsn.g.fx, c.currentTime + 0.01 + (o.at || 0), Math.random, o);
    _gsLog(name);
    gardenSoundWake();
    return true;
  } catch (e) { return false; }
}
function _gsLog(s) { _gsn.log.push({ t: Math.round(performance.now()), s }); if (_gsn.log.length > 200) _gsn.log.splice(0, _gsn.log.length - 200); }
function gardenSoundLog() { return _gsn.log.slice(); }

/* ---------- ambience: a few chains, made once, faded in and out ---------- */
function _gsAmbBuild(c, out) {
  const N = _gsNoise(c), A = { c, nodes: [] };
  const src = (rate) => { const s = c.createBufferSource(); s.buffer = N; s.loop = true; s.playbackRate.value = rate || 1; s.start(c.currentTime, Math.random() * 2); A.nodes.push(s); return s; };
  const filt = (type, f, q) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q == null ? 0.7 : q; return b; };
  const gain = (v) => { const g = c.createGain(); g.gain.value = v; return g; };
  const pan = () => c.createStereoPanner ? c.createStereoPanner() : gain(1);
  const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
  const lfo = (hz, depth, param) => { const o = c.createOscillator(), g = gain(depth); o.frequency.value = hz; o.connect(g); g.connect(param); o.start(); A.nodes.push(o); };
  // wind: two slow gusts
  { const lp = filt('lowpass', 420, 0.9), lvl = gain(0), body = gain(0.5); chain(src(0.6), lp, body, lvl, out); lfo(0.07, 180, lp.frequency); lfo(0.043, 0.3, body.gain); A.wind = lvl; }
  // the sea: waves are scheduled swells
  { const lp = filt('lowpass', 700, 0.6), sw = gain(0.2), lvl = gain(0), p = pan(); chain(src(1), lp, sw, lvl, p, out); A.sea = lvl; A.seaSw = sw; A.seaLP = lp; A.seaPan = p; A.waveAt = 0; }
  // lapping water at a lake, a pond or the mere
  { const bp = filt('bandpass', 650, 1.1), lp2 = gain(0.15), lvl = gain(0), p = pan(); chain(src(0.8), bp, lp2, lvl, p, out); A.lap = lvl; A.lapSw = lp2; A.lapPan = p; A.lapAt = 0; }
  // a waterfall (or the mill race): a steady rush and a low roar
  { const bp = filt('bandpass', 1100, 0.45), lo = filt('lowpass', 170, 0.7), lvl = gain(0), p = pan(), lg = gain(1.6); chain(src(1), bp, lvl); chain(src(0.5), lo, lg, lvl); lvl.connect(p); p.connect(out); A.falls = lvl; A.fallsPan = p; }
  // rain, and drips scheduled on top
  { const hp = filt('highpass', 1400, 0.5), lp = filt('lowpass', 7000, 0.5), lvl = gain(0); chain(src(1.1), hp, lp, lvl, out); A.rain = lvl; A.rainLP = lp; A.dripAt = 0; }
  // crickets: a pulsing high tone, gated in chirps
  { const car = c.createOscillator(), am = gain(0.5), pulse = c.createOscillator(), depth = gain(0.5), chirp = gain(0), lvl = gain(0);
    car.frequency.value = 4400; pulse.type = 'square'; pulse.frequency.value = 29; pulse.connect(depth); depth.connect(am.gain); chain(car, am, chirp, lvl, out); car.start(); pulse.start(); A.nodes.push(car, pulse);
    A.crick = lvl; A.chirp = chirp; A.chirpAt = 0; }
  // a room: a hush and a clock
  { const lp = filt('lowpass', 260, 0.6), lvl = gain(0); chain(src(0.4), lp, lvl, out); A.room = lvl; A.clockAt = 0; }
  return A;
}
function _gsAmbStop(A, t) {
  if (!A) return;
  for (const n of A.nodes) { try { n.stop(t); } catch (e) { /* stopped */ } }
}
const GS_AMB_GAIN = Object.freeze({ wind: 0.09, sea: 0.5, lap: 0.55, falls: 0.16, rain: 0.08, crick: 0.012, room: 0.12 });

/** What is around you, about once a second: {sea, seaPan, lap, lapPan, falls, fallsPan, woods, high} 0..1 */
function _gsNear(px, py) {
  const out = { sea: 0, seaPan: 0, lap: 0, lapPan: 0, falls: 0, fallsPan: 0, woods: 0, high: 0 };
  const W = typeof GARDEN_WORLD !== 'undefined' ? GARDEN_WORLD : null; if (!W || !Number.isFinite(px)) return out;
  const R = 9, island = typeof gardenIslandActive === 'function' && gardenIslandActive();
  for (let dy = -R; dy <= R; dy += 1.5) for (let dx = -R; dx <= R; dx += 1.5) {
    const d = Math.hypot(dx, dy * 1.4); if (d > R) continue;
    const x = Math.floor(px + dx), y = Math.floor(py + dy); if (x < 0 || y < 0 || x >= W.cols || y >= W.rows) continue;
    const w = 1 - d / R;
    let sea = false, fresh = false;
    if (island) { const cell = gardenIslandBaseCell(x, y); if (!cell) continue; sea = cell.ocean; fresh = cell.freshwater; }
    else if (gardenIsWater(x, y)) { const z = gardenWaterZone(x, y); fresh = true; if (z && z !== 'pond') sea = false; }
    if (sea && w > out.sea) { out.sea = w; out.seaPan = dx / R; }
    if (fresh && w > out.lap) { out.lap = w; out.lapPan = dx / R; }
  }
  // waterfalls and mills: the props that are one, by name (so new ones join in)
  for (const s of _gsSources()) {
    const dx = s.x - px, d = Math.hypot(dx, (s.y - py) * 1.4), w = Math.max(0, 1 - d / s.r) * s.k;
    if (w > out.falls) { out.falls = w; out.fallsPan = Math.max(-1, Math.min(1, dx / s.r)); }
  }
  try {
    const reg = island && typeof gardenIslandRegionAt === 'function' ? gardenIslandRegionAt(px, py) : null, words = reg ? (reg.id + ' ' + (reg.name || '')).toLowerCase() : '';
    if (/wood|forest|grove|ruin/.test(words)) out.woods = 1;
    if (/mountain|peak|headland|cloud|fell|high/.test(words)) out.high = 1;
  } catch (e) { /* no regions here */ }
  return out;
}
function _gsSources() {
  const now = performance.now(); if (_gsn.src && now - _gsn.srcAt < 15000) return _gsn.src;
  const list = [];
  try {
    const props = typeof gardenPropsNow === 'function' ? gardenPropsNow() : (typeof GARDEN_PROPS !== 'undefined' ? GARDEN_PROPS : []);
    for (const p of props) {
      const words = [p.id, p.name, p.art, p.label].filter(Boolean).join(' ').toLowerCase();
      const fall = /fall|cascade|weir|spout/.test(words), mill = !fall && /mill|wheel|race/.test(words);
      if (fall || mill) list.push({ x: p.x + (p.w || 1) / 2, y: p.y + (p.h || 1) / 2, r: fall ? 16 : 9, k: fall ? 1 : 0.45 });
    }
  } catch (e) { /* none */ }
  _gsn.src = list; _gsn.srcAt = now;
  return list;
}
function _gsRoom() {
  try {
    const s = window.GardenNativeRooms && GardenNativeRooms.current && GardenNativeRooms.current();
    if (s) return { music: !!s.music, me: (s.music ? (typeof _ee !== 'undefined' ? _ee : null) : _grm || null) };
    if (typeof _grm !== 'undefined' && _grm.on) return { music: false, me: _grm };
    if (document.body.classList.contains('gd-room-in')) return { music: false, me: null };
  } catch (e) { /* outside */ }
  return null;
}
function _gsAmbience(c) {
  const p = _gsPrefs(), G = _gsn.g, t = c.currentTime;
  if (!p.amb) { if (_gsn.amb) { for (const k of Object.keys(GS_AMB_GAIN)) _gsn.amb[k].gain.setTargetAtTime(0, t, 0.3); } return; }
  if (!_gsn.amb || _gsn.amb.c !== c) _gsn.amb = _gsAmbBuild(c, G.amb);
  const A = _gsn.amb, R = Math.random;
  let m = null; try { m = gardenHere(); } catch (e) { m = null; }
  const tod = (m && m.tod) || 'day', season = (m && m.season) || 'summer', rain = !!(m && m.rain && m.rain.now), snow = !!(m && m.rain && m.rain.snow);
  const room = _gsRoom(), px = typeof _gw !== 'undefined' ? _gw.px : NaN, py = typeof _gw !== 'undefined' ? _gw.py : NaN;
  const near = _gsNear(px, py), out = room ? 0.3 : 1, night = tod === 'night', dusk = tod === 'dusk', dawn = tod === 'dawn';
  const set = (k, v, tc) => A[k].gain.setTargetAtTime(Math.max(0, v) * GS_AMB_GAIN[k], t, tc || 0.8);
  const frozen = season === 'winter' && snow;
  set('wind', ((0.3 + 0.55 * near.high + 0.3 * near.sea + (season === 'winter' ? 0.2 : 0) + (rain ? 0.2 : 0)) * (near.woods ? 0.65 : 1) * (snow ? 0.7 : 1)) * out);
  set('sea', near.sea * out); set('lap', near.lap * (frozen ? 0.15 : 1) * out); set('falls', near.falls * (frozen ? 0.4 : 1) * out);
  set('rain', rain && !snow ? (room ? 0.5 : 1) : 0, 1.5);
  const crickets = (night || dusk) && !rain && !snow && season !== 'winter' ? (season === 'spring' ? 0.5 : 1) * (dusk ? 0.55 : 1) * (1 - 0.6 * near.sea) : 0;
  set('crick', crickets * out, 1.5); set('room', room && !room.music ? 1 : 0, 0.5);
  if (A.seaPan.pan) A.seaPan.pan.setTargetAtTime(near.seaPan * 0.7, t, 1); if (A.lapPan.pan) A.lapPan.pan.setTargetAtTime(near.lapPan * 0.7, t, 1); if (A.fallsPan.pan) A.fallsPan.pan.setTargetAtTime(near.fallsPan * 0.8, t, 1);
  A.rainLP.frequency.setTargetAtTime(room ? 900 : 7000, t, 0.5);
  G.ambLP.frequency.setTargetAtTime(room ? 750 : snow ? 3200 : 16000, t, 0.4);
  // what happens in the next second
  const until = t + 1.15, from = (k) => (A[k] < t ? t + R() * 0.4 : A[k]);
  if (near.sea > 0.02) { for (A.waveAt = from('waveAt'); A.waveAt < until;) { const up = 1.4 + R() * 1.2, down = 2.4 + R() * 1.8, top = 0.65 + R() * 0.35; A.seaSw.gain.setTargetAtTime(top, A.waveAt, up / 3); A.seaSw.gain.setTargetAtTime(0.18, A.waveAt + up, down / 3); A.seaLP.frequency.setTargetAtTime(1300, A.waveAt, up / 3); A.seaLP.frequency.setTargetAtTime(600, A.waveAt + up, down / 3); A.waveAt += up + down + R() * 2; } }
  if (near.lap > 0.02) { for (A.lapAt = from('lapAt'); A.lapAt < until;) { const k = 0.4 + R() * 0.6, d = 0.18 + R() * 0.3; A.lapSw.gain.setTargetAtTime(k, A.lapAt, 0.05); A.lapSw.gain.setTargetAtTime(0.12, A.lapAt + d, 0.12); A.lapAt += d + 0.35 + R() * 0.9; } }
  if (rain && !snow) { for (A.dripAt = from('dripAt'); A.dripAt < until;) { _gsTone(c, G.amb, A.dripAt, { f: _gsJ(R, 2600, 0.35), f2: 3600, d: 0.025, peak: 0.02 * out, pan: (R() - 0.5) * 1.4 }); A.dripAt += 0.08 + R() * 0.35; } }
  if (crickets > 0.02) { for (A.chirpAt = from('chirpAt'); A.chirpAt < until;) { const s = A.chirpAt; for (let i = 0; i < 3; i++) { A.chirp.gain.setTargetAtTime(1, s + i * 0.16, 0.012); A.chirp.gain.setTargetAtTime(0, s + i * 0.16 + 0.09, 0.015); } A.chirpAt += 0.7 + R() * 0.5; } }
  if (room && !room.music) { for (A.clockAt = from('clockAt'); A.clockAt < until; A.clockAt += 1) _gsHiss(c, G.amb, A.clockAt, { type: 'highpass', f: 3000, d: 0.008, peak: 0.025 }); }
  // birds by day, an owl at night, gulls by the sea, frogs by fresh water
  const busy = (dawn ? 0.5 : tod === 'day' ? 0.24 : dusk ? 0.12 : 0) * (near.woods ? 1.6 : 1) * (season === 'winter' ? 0.4 : 1) * (rain || snow ? 0.2 : 1) * (1 - 0.5 * near.high) * (room ? 0.4 : 1);
  if (R() < busy) { const kinds = near.woods ? ['robin', 'wren', 'tit', 'dove', 'robin'] : ['robin', 'tit', 'tweet', 'dove', 'robin', 'wren']; _gsBird(c, G.amb, t + R() * 0.9, R, kinds[Math.floor(R() * kinds.length)], 0.035 * out * (0.45 + R() * 0.55), (R() - 0.5) * 1.4); }
  if (night && !rain && R() < 0.025) _gsBird(c, G.amb, t + R(), R, 'owl', 0.05 * out, (R() - 0.5));
  if (near.sea > 0.3 && !night && !room && R() < 0.02) _gsBird(c, G.amb, t + R(), R, 'gull', 0.012 * near.sea, near.seaPan);
  if (near.lap > 0.25 && (night || dusk) && (season === 'spring' || season === 'summer') && !room && R() < 0.1) _gsFrog(c, G.amb, t + R(), R, 0.04 * near.lap, near.lapPan);
  // your pet now and then
  if (!room && p.fx && performance.now() > _gsn.petAt) { if (_gsn.petAt) { const pet = typeof gpPet === 'function' ? gpPet() : null; if (pet && typeof _gw !== 'undefined' && _gw.pet) gardenSfx('pet', { sp: pet.sp }); } _gsn.petAt = performance.now() + 30000 + Math.random() * 50000; }
  _gsMusic(c, t, { tod, season, rain, snow, room });
}

/* ---------- the music: a few soft notes, now and then, in the key of the hour ---------- */
const GS_SCALES = Object.freeze({ day: [261.6, 293.7, 329.6, 392, 440, 523.25, 587.3, 659.25, 784], dawn: [293.7, 329.6, 370, 440, 493.9, 587.3, 659.25, 740], dusk: [220, 246.9, 293.7, 329.6, 370, 440, 493.9, 587.3], night: [220, 261.6, 293.7, 329.6, 392, 440, 523.25] });
function _gsMusic(c, t, s) {
  if (s.room && s.room.music) return;   // the music room plays its own
  if (!_gsn.music || _gsn.music < t - 30) _gsn.music = t + 4 + Math.random() * 6;
  if (_gsn.music > t + 1.1) return;
  const R = Math.random, sc = GS_SCALES[s.tod] || GS_SCALES.day, slow = s.tod === 'night' || s.tod === 'dusk' ? 1.5 : 1, out = _gsn.g.mIn, k = (s.room ? 0.6 : 1) * (s.rain ? 0.75 : 1);
  let at = Math.max(t, _gsn.music), i = Math.floor(R() * (sc.length - 3));
  const n = 3 + Math.floor(R() * 4);
  if (R() < 0.5) _gsTone(c, out, at, { f: sc[0] / 2, a: 0.4, d: 3.2 * slow, peak: 0.022 * k });   // a low note under it
  for (let j = 0; j < n; j++) {
    const f = sc[Math.max(0, Math.min(sc.length - 1, i))];
    if (s.season === 'winter' || s.snow) _gsBell(c, out, at, f * 2, 0.018 * k, 1.6); else _gsPluck(c, out, at, f * 2, 0.03 * k, 1.3, (R() - 0.5) * 0.5);
    at += (0.32 + R() * 0.4) * slow; i += R() < 0.65 ? (R() < 0.5 ? 1 : -1) : (R() < 0.5 ? 2 : -2);
  }
  _gsn.music = at + (6 + R() * 10) * slow;
}

/* ---------- the loop: 160 ms, only while the garden shows ---------- */
function _gsShowing() { try { return typeof _gw !== 'undefined' && !!_gw.on && (typeof _gdOnPage !== 'function' || _gdOnPage()) || !!_gsRoom(); } catch (e) { return false; } }
function gardenSoundWake() {
  if (_gsn.iv || !_gsn.armed || !_gsShowing() || !_gsAllowed()) return;
  _gsn.iv = setInterval(_gsTick, GS_TICK_MS); _gsn.n = 0;
}
function _gsSleep() {
  if (_gsn.iv) { clearInterval(_gsn.iv); _gsn.iv = 0; }
  const c = _gsn.ac, A = _gsn.amb;
  if (A && c) { const t = c.currentTime; for (const k of Object.keys(GS_AMB_GAIN)) A[k].gain.setTargetAtTime(0, t, 0.15); _gsAmbStop(A, t + 0.8); _gsn.amb = null; }
  _gsn.step.moving = false; _gsn.music = 0;
}
function _gsTick() {
  if (!_gsShowing() || !_gsAllowed()) { _gsSleep(); return; }
  const c = _gsnCtx(); if (!c || c.state !== 'running') return;
  _gsn.n++;
  try { _gsFeet(c); } catch (e) { /* a step missed */ }
  try { _gsReel(c); } catch (e) { /* the reel */ }
  try { const room = _gsRoom(), key = room ? (room.music ? 'music' : 'room') : ''; if (key !== _gsn.room) { if (_gsn.n > 1) gardenSfx('door'); _gsn.room = key; } } catch (e) { /* doors */ }
  if (_gsn.n % 6 === 1) { try { _gsAmbience(c); } catch (e) { console.error('[garden sound]', e); } }
}
/** Footsteps: from how far you went since the last tick, so the native world, the old one and the rooms all count. */
function _gsFeet(c) {
  const S = _gsn.step, room = _gsRoom();
  let x, y, sx = GARDEN_WORLD.cellW, sy = GARDEN_WORLD.cellH;
  if (room && room.me && room.me.me) { x = room.me.me.x; y = room.me.me.y; sx = sy = 1; } else if (!room) { x = _gw.px; y = _gw.py; } else return;
  const v = Number.isFinite(S.x) ? Math.hypot((x - S.x) * sx, (y - S.y) * sy) / (GS_TICK_MS / 1000) : 0;
  S.x = x; S.y = y;
  const moving = v > 45 && v < 1500, t = c.currentTime;
  if (!moving) { S.moving = false; return; }
  if (!S.moving || S.at < t) S.at = t + 0.02;
  S.moving = true;
  if (!_gsPrefs().fx) return;
  const period = Math.max(0.26, Math.min(0.55, 0.58 - v * 0.0011)), surface = room ? 'wood' : _gsSurface(Math.floor(x), Math.floor(y)), k = v < 120 ? 0.6 : 1;
  for (; S.at < t + GS_TICK_MS / 1000 + 0.02; S.at += period * (0.96 + Math.random() * 0.08)) { S.side = -S.side; _gsStep(c, _gsn.g.fx, S.at, surface, Math.random, k, S.side * 0.08); _gsLog('step:' + surface); }
}
function _gsSurface(x, y) {
  try {
    const p = typeof gardenPropAt === 'function' ? gardenPropAt(x, y) : null;
    if (p && /pier|jetty|deck|bridge|board|boat|dock|walk/.test(p.id || '')) return 'wood';
    const m = gardenHere();
    if (m && m.rain && m.rain.snow && m.season === 'winter') return 'snow';
    const c = m && m.occ && m.occ.get(x + ',' + y);
    if (c && c.ground) { const d = typeof gardenDecorById === 'function' ? gardenDecorById(m, c.ground) : null, id = d && d.def ? d.def.id : ''; return /deck|board|plank|bridge|jetty/.test(id) ? 'wood' : /sand|shell|beach/.test(id) ? 'sand' : 'path'; }
    const cell = typeof gardenIslandActive === 'function' && gardenIslandActive() ? gardenIslandBaseCell(x, y) : null;
    if (cell) { if (cell.beach) return 'sand'; if (cell.route || cell.reservation === 'apron') return 'path'; }
    if (m && m.season === 'winter' && m.rain && m.rain.snow) return 'snow';
    const area = typeof gardenAreaAt === 'function' ? gardenAreaAt(x, y) : '';
    if (area === 'lake') return 'sand';
  } catch (e) { /* grass */ }
  return 'grass';
}
/** The reel: a ratchet while you hold, a buzz while it runs, the line singing when it is close to snapping. */
function _gsReel(c) {
  const R = typeof _gw !== 'undefined' ? _gw.reel : null; if (!R || !_gsPrefs().fx) return;
  const t = c.currentTime, end = t + GS_TICK_MS / 1000 + 0.02, tn = Math.max(0, Math.min(1, Number(R.tn) || 0));
  if (!_gsn.reel || _gsn.reel < t) _gsn.reel = t + 0.01;
  if (R.hold) { const gap = 1 / (11 + tn * 9 + (Number(R.p) || 0) * 4); for (; _gsn.reel < end; _gsn.reel += gap) _gsSfx.tick(c, _gsn.g.fx, _gsn.reel, Math.random, { k: tn }); _gsLog('reel'); }
  else if (R.mv === 'run') { for (; _gsn.reel < end; _gsn.reel += 0.035) _gsSfx.drag(c, _gsn.g.fx, _gsn.reel, Math.random); _gsLog('drag'); }
  else _gsn.reel = 0;
  if (R.heavy && tn > 0.7 && t > _gsn.strain) { _gsSfx.strain(c, _gsn.g.fx, t, Math.random, { k: tn }); _gsn.strain = t + 0.28; _gsLog('strain'); }
}

/* ---------- what the garden says it did ---------- */
function _gsOnGarden(ev) {
  const d = ev && ev.detail; if (!d) return;
  const k = d.kind;
  if (k === 'plant') gardenSfx('plant');
  else if (k === 'water') gardenSfx('water');
  else if (k === 'harvest') gardenSfx('harvest');
  else if (k === 'buy') gardenSfx('buy');
  else if (k === 'sell') gardenSfx('sell');
  else if (k === 'dig' || k === 'prune') gardenSfx('dig');
  else if (k === 'decor' || k === 'move') gardenSfx('place');
  else if (k === 'craft' || k === 'recipe') gardenSfx('craft');
  else if (k === 'collect' || k === 'feed' || k === 'bouquet' || k === 'wonder') gardenSfx('sparkle');
  else if (k === 'bug') gardenSfx('netted');   // ('catch' carries its own kind: a bug here; a fish is said by its landing)
  else if (k === 'land') gardenSfx(/^zn-/.test(String(d.id || '')) ? 'gate' : 'sparkle');
  else if (d.what) gardenSfx('sparkle');
}
/** Tabs and toggles inside a garden panel: a tiny tick. */
function _gsOnClick(ev) {
  const b = ev.target && ev.target.closest ? ev.target.closest('.gd-popup [role="tab"], .gd-popup .seg > button, .gd-popup button[aria-pressed], .gd-popup .chip, .gd-popup summary, .gs-panel .switch') : null;
  if (b) gardenSfx('tab');
}
function _gsArm() {
  if (!_gsn.armed) { _gsn.armed = true; if (_gsPrefs().on) _gsnCtx(); }
  if (_gsn.iv) return;
  gardenSoundWake();
  clearTimeout(_gsn.wakeT); _gsn.wakeT = setTimeout(gardenSoundWake, 1500);   // (a click that opens the garden: it shows a moment later)
}
function _gsOnVisible() {
  const c = _gsn.ac; if (!c) return;
  try { if (document.hidden) { _gsSleep(); if (c.state === 'running') c.suspend(); } else if (_gsShowing() && _gsAllowed()) { _gsnCtx(); gardenSoundWake(); } } catch (e) { /* fine */ }
}

/* ---------- the Sound panel (Garden menu > View & help > Sound) ---------- */
function gardenSoundOpen() {
  openDialog({
    title: 'Sound', width: 460, className: 'gs-panel',
    body(el) {
      const row = (label, hint, control) => (typeof _settingsRow === 'function' ? _settingsRow(label, hint, control) : Object.assign(document.createElement('div'), {}));
      const sw = (on, label, set) => { const s = _settingsSwitch(on, label, (v) => { s.setAttribute('aria-checked', v ? 'true' : 'false'); set(v); paint(); }); return s; };
      const P = _gsPrefs();
      const master = sw(P.on, 'Sound', (v) => { _gsSet({ sounds: v }); if (v) { _gsArm(); setTimeout(() => gardenSfx('cheer'), 60); } else _gsSleep(); });
      const vol = document.createElement('input'); vol.type = 'range'; vol.min = '0'; vol.max = '100'; vol.step = '5'; vol.value = String(Math.round(P.vol * 100)); vol.className = 'gs-vol'; vol.setAttribute('aria-label', 'Volume');
      vol.oninput = () => { _gmG().prefs.gsVol = Number(vol.value) / 100; _gsApply(); };
      vol.onchange = () => { _gsSet({ gsVol: Number(vol.value) / 100 }); gardenSfx('tab'); };
      const amb = sw(P.amb, 'Music and nature sounds', (v) => _gsSet({ gsAmb: v }));
      const fx = sw(P.fx, 'Sound effects', (v) => { _gsSet({ gsFx: v }); if (v) setTimeout(() => gardenSfx('tab'), 60); });
      el.appendChild(row('Sound', 'Everything you hear in the garden. Off by default.', master));
      el.appendChild(row('Volume', 'How loud the garden is.', vol));
      el.appendChild(row('Music and nature sounds', 'Soft music, birds, wind, water and rain.', amb));
      el.appendChild(row('Sound effects', 'Footsteps, tools, fishing and the menus.', fx));
      const note = document.createElement('p'); note.className = 'muted gs-note'; el.appendChild(note);
      function paint() { const q = _gsPrefs(); for (const n of [vol, amb, fx]) n.disabled = !q.on; note.textContent = q.on ? 'Your computer’s own volume and mute still apply.' : 'Sound is off. Turn it on to hear the garden.'; }
      paint();
    },
  });
  gardenSfx('open');
}

/* ---------- checking without speakers: the same sound, drawn offline ---------- */
/** name: a sound above, 'step:<surface>', or 'amb:<layer>' (wind, sea, lap, falls, rain, crick, room, birds, music). Resolves to {sr, l, r} (Float32Arrays), at the full volume (before the volume control). */
function gardenSoundRender(name, secs, o) {
  o = o || {};
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) return Promise.reject(new Error('no offline audio'));
  const sr = 44100, c = new OAC(2, Math.ceil(sr * (secs || 1.5)), sr), out = c.createGain(), R = Math.random;
  out.connect(c.destination);
  const s = String(name);
  if (s.startsWith('step:')) _gsStep(c, out, 0.02, s.slice(5), R, 1, 0);
  else if (s === 'amb:birds') { let at = 0.1; while (at < secs - 2) at += _gsBird(c, out, at, R, ['robin', 'tit', 'wren', 'dove', 'tweet'][Math.floor(R() * 5)], 0.035 * (0.45 + R() * 0.55), (R() - 0.5)) + 0.6 + R() * 1.5; }
  else if (s === 'amb:owl') _gsBird(c, out, 0.1, R, 'owl', 0.05);
  else if (s === 'amb:frog') _gsFrog(c, out, 0.1, R, 0.04);
  else if (s === 'amb:music') { const G = _gsGraph(c); G.lim.disconnect(); G.music.disconnect(); G.music.connect(out); const save = { g: _gsn.g, m: _gsn.music }; _gsn.g = G; _gsn.music = 0.01; for (let t = 0; t < secs - 3; t += 1) if (_gsn.music <= t + 1.1) _gsMusic(c, t, { tod: o.tod || 'day', season: o.season || 'summer' }); _gsn.g = save.g; _gsn.music = save.m; }
  else if (s.startsWith('amb:')) {
    const k = s.slice(4), A = _gsAmbBuild(c, out);
    for (const key of Object.keys(GS_AMB_GAIN)) A[key].gain.value = key === k ? GS_AMB_GAIN[key] : 0;
    const until = secs, R2 = R;
    if (k === 'sea') for (let at = 0.1; at < until;) { const up = 1.4 + R2() * 1.2, down = 2.4 + R2() * 1.8, top = 0.65 + R2() * 0.35; A.seaSw.gain.setTargetAtTime(top, at, up / 3); A.seaSw.gain.setTargetAtTime(0.18, at + up, down / 3); A.seaLP.frequency.setTargetAtTime(1300, at, up / 3); A.seaLP.frequency.setTargetAtTime(600, at + up, down / 3); at += up + down + R2() * 2; }
    if (k === 'lap') for (let at = 0.1; at < until;) { const kk = 0.4 + R2() * 0.6, d = 0.18 + R2() * 0.3; A.lapSw.gain.setTargetAtTime(kk, at, 0.05); A.lapSw.gain.setTargetAtTime(0.12, at + d, 0.12); at += d + 0.35 + R2() * 0.9; }
    if (k === 'crick') for (let at = 0.1; at < until; at += 0.7 + R2() * 0.5) for (let i = 0; i < 3; i++) { A.chirp.gain.setTargetAtTime(1, at + i * 0.16, 0.012); A.chirp.gain.setTargetAtTime(0, at + i * 0.16 + 0.09, 0.015); }
    if (k === 'rain') for (let at = 0.1; at < until; at += 0.08 + R2() * 0.35) _gsTone(c, out, at, { f: _gsJ(R2, 2600, 0.35), f2: 3600, d: 0.025, peak: 0.02, pan: (R2() - 0.5) * 1.4 });
    if (k === 'room') for (let at = 0.2; at < until; at += 1) _gsHiss(c, out, at, { type: 'highpass', f: 3000, d: 0.008, peak: 0.025 });
  }
  else if (_gsSfx[s]) _gsSfx[s](c, out, 0.02, R, o);
  else return Promise.reject(new Error('no such sound: ' + s));
  return c.startRendering().then(b => ({ sr, l: b.getChannelData(0), r: b.getChannelData(1) }));
}
function gardenSoundNames() { return Object.keys(_gsSfx).concat(Object.keys(_gsSteps).map(k => 'step:' + k), ['amb:wind', 'amb:sea', 'amb:lap', 'amb:falls', 'amb:rain', 'amb:crick', 'amb:room', 'amb:birds', 'amb:owl', 'amb:frog', 'amb:music']); }

/* ---------- wiring (listeners only: nothing runs until the garden shows and someone clicks) ---------- */
if (typeof document !== 'undefined' && document.addEventListener) {
  for (const k of ['pointerdown', 'keydown']) document.addEventListener(k, _gsArm, { capture: true, passive: true });
  document.addEventListener('visibilitychange', _gsOnVisible);
  document.addEventListener('opendash:garden', _gsOnGarden);
  document.addEventListener('click', _gsOnClick, true);
}
