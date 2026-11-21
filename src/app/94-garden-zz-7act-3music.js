/* ============================================================
   PLAYING MUSIC TOGETHER (20 Nov 2026). The owner: "Playing the fiddle doesn't make a noise. Also the animations all play in the same spot. So
   basically one person plays the fiddle, it plays a tune; another person plays and it ADDS to the tune, so it develops the song, and the more
   players the cooler it sounds."

   Nothing here names a place. Any thing whose kind's places (GARDEN_KINDS acts) lead to a GARDEN_ACTS row with `music` (a voice) is an
   instrument; a kind's place with `music: i` is its i-th place, and each place holds one player. Everyone at one thing (a band's pitch)
   plays one tune, in time, from one clock:
     the tune      GM_TUNE: a reel in D, sixteen bars (A and B), 96 beats a minute, played by the parts below. One eighth note is one step.
     the parts     by who is playing (gmRoles): the first of fiddle, whistle, squeezebox has the melody; a whistle beside a fiddle plays the
                   harmony a third or so above it; a squeezebox beside a melody plays the chords and the bass (oom-pah); the drum keeps the
                   beat, pitched to the chord. One player: the A part over and over. Two or more: A and B. Three or more: the melody is
                   ornamented (cuts and rolls), the harmony moves in eighths, the chords fill in; four: a high descant on the repeat.
     the clock     the garden's host's. On the host's screen it is performance.now(); a visitor asks the host now and then (fx tune ping, to
                   the host alone) and the host answers (tune pong: its clock, seconds and ms into the tune); the answer that came back
                   quickest of the last few sets the visitor's offset (half the round trip added). Every screen then plays step
                   floor((now + offset) / step) of the same tune, so the parts meet whatever screen they are heard on.
     the wire      fx tune on / off: { i: the thing's id, n: its place }, sent when you start and stop, and every GMU.beatMs while you play (a
                   friend who comes in late hears you). Nothing per note. A player not heard from for GMU.staleMs, or whose figure is seen
                   to walk off, has stopped.
     the sound     made on the spot with Web Audio on the garden's own sound context (94-garden-0sound.js): the Volume and the Sounds
                   switch reach it, a little of the music echo for space. Heard at full within GMU.ear cells of the pitch, fading to
                   nothing at GMU.far, panned to where the pitch is. Scheduled 0.35 s ahead on a 100 ms timer that runs only while
                   someone is playing within hearing.
   gardenMusicStart(cur) / gardenMusicStop(cur)   94-garden-zz-7act-1core.js calls these when you start or stop an act with `music`
   gardenMusicHeard(A, ev)                         a friend's tune message (94-garden-live-2visit.js, 3host.js)
   gardenMusicHeld(id) -> Set of places in use at that thing (its drawing leaves those instruments out: they are in someone's hands)
   gardenMusicState()                              for checking: { me, them, off, synced, roles, n, step, notes }
   gardenMusicRender(voices, secs)                 the tune drawn into an OfflineAudioContext: for checking levels with no speakers
   ============================================================ */
const GMU = Object.freeze({ bpm: 96, steps: 8, bars: 16, ear: 7, far: 20, ahead: 0.35, tickMs: 100, beatMs: 9000, staleMs: 26000, pingMs: 8000, walkOff: 1.2 });
const GM_STEP = 60000 / GMU.bpm / 2, GM_LOOP = GM_STEP * GMU.steps * GMU.bars, GM_NSTEP = GMU.steps * GMU.bars, GM_SYNC = GM_LOOP * 2;   // (the clock is told modulo two times round, so every screen is on the same time round too: the descant is on the second)
// the chord of each bar, and what is in it (MIDI notes): roots low for the bass, the triad round middle D
const GM_BARS = Object.freeze(['D', 'G', 'D', 'A', 'D', 'G', 'A', 'D', 'Bm', 'G', 'D', 'A', 'Bm', 'G', 'A', 'D']);
const GM_CHORDS = Object.freeze({ D: Object.freeze({ root: 50, fifth: 57, tri: [62, 66, 69] }), G: Object.freeze({ root: 43, fifth: 50, tri: [62, 67, 71] }), A: Object.freeze({ root: 45, fifth: 52, tri: [61, 64, 69] }), Bm: Object.freeze({ root: 47, fifth: 54, tri: [62, 66, 71] }) });
// the melody, eight eighths a bar: a note, -1 to hold the one before, 0 a rest
const GM_TUNE = Object.freeze([
  69, 66, 69, 74, 78, 74, 76, 74,   71, 74, 71, 67, 71, 69, 67, 71,   69, 66, 69, 74, 78, 76, 74, 76,   73, 69, 71, 73, 76, -1, 73, 69,
  69, 66, 69, 74, 78, 74, 76, 74,   71, 74, 79, 78, 79, 76, 74, 71,   76, 73, 69, 73, 76, 78, 76, 73,   74, -1, 69, 66, 62, -1, 0, 0,
  78, 76, 74, 78, 74, 73, 71, 74,   79, 78, 76, 74, 71, 74, 79, 78,   78, -1, 74, 78, 81, 78, 76, 74,   76, 73, 69, 73, 76, -1, 73, 76,
  78, 76, 74, 78, 74, 73, 71, 74,   79, -1, 78, 76, 74, 76, 78, 79,   81, 78, 76, 73, 69, 71, 73, 76,   74, -1, -1, -1, 74, 0, 0, 0]);   // (every note on the first and third beat is in that bar's chord)
const GM_SCALE = Object.freeze([2, 4, 6, 7, 9, 11, 1]);   // D major's notes (pitch classes), for the harmony
const GM_DRUM = Object.freeze({ low: Object.freeze([1, 0, 0.5, 0, 0.85, 0, 0.5, 0.35]), full: Object.freeze([1, 0.4, 0.6, 0.4, 0.9, 0.4, 0.6, 0.45]) });
const _gmu = { me: null, them: new Map(), off: 0, samples: [], synced: false, iv: 0, next: -1, ac: null, bus: null, band: null, pingT: 0, pingAt: 0, beatT: 0, pings: new Map(), notes: 0, lastRoles: '', heldSig: '' };
const _gmF = (m) => 440 * Math.pow(2, (m - 69) / 12);

/* ---------- who plays what ---------- */
/** The places a thing of this kind has for music: [{ i (the place), act, voice }] */
function gmPlaces(kind) { const K = GARDEN_KINDS[kind]; return K && K.acts ? K.acts.filter(a => a.music != null && GARDEN_ACTS[a.act] && GARDEN_ACTS[a.act].music).map(a => ({ i: a.music, act: a.act, voice: GARDEN_ACTS[a.act].music })) : []; }
/** The part each voice plays, from who is playing at once: { voice: role }. Pure. */
function gmRoles(voices) {
  const has = new Set(voices), mel = ['fiddle', 'whistle', 'squeeze'].find(v => has.has(v)) || '', out = {};
  for (const v of has) out[v] = v === 'drum' ? 'rhythm' : v === mel ? (v === 'squeeze' ? 'melody-bass' : 'melody') : v === 'whistle' ? 'harmony' : v === 'squeeze' ? 'chords' : 'melody';
  return out;
}
/** The bar of the tune a step is in, for this many players (one player: the A part over and over). */
function gmBar(step, n) { const b = Math.floor(((step % GM_NSTEP) + GM_NSTEP) % GM_NSTEP / GMU.steps); return n <= 1 ? b % 8 : b; }
/** The melody's note at a step (held notes resolved to how long they last): { m, len (steps) } or null. */
function gmMelody(bar, k) {
  const at = bar * GMU.steps + k, m = GM_TUNE[at]; if (!(m > 0)) return null;
  let len = 1; while (k + len < GMU.steps && GM_TUNE[at + len] === -1) len++;
  return { m, len };
}
/** A note of D major's scale nearest above m, `deg` scale steps up (2: a third). */
function gmUp(m, deg) { let n = m, d = 0; while (d < deg) { n++; if (GM_SCALE.includes(((n % 12) + 12) % 12)) d++; } return n; }
/** The note of the chord nearest above the melody (the harmony's choice: never a clash with the chord). */
function gmChordAbove(m, bar) { const tri = GM_CHORDS[GM_BARS[bar]].tri; let best = null; for (let o = 0; o <= 24; o += 12) for (const t of tri) { const n = t + o; if (n > m + 2 && (best == null || n < best)) best = n; } return best || m + 4; }

/* ---------- the sound ---------- */
function _gmBus() {
  const B = typeof gardenSoundBus === 'function' ? gardenSoundBus({ always: true }) : null; if (!B) return null;
  if (_gmu.ac !== B.ac || !_gmu.bus) {
    const c = B.ac, g = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null, send = c.createGain();
    g.gain.value = 0; send.gain.value = 0.32;
    if (pan) { g.connect(pan); pan.connect(B.out); } else g.connect(B.out);
    try { if (typeof _gsn !== 'undefined' && _gsn.g && _gsn.g.dly) { g.connect(send); send.connect(_gsn.g.dly); } } catch (e) { /* dry */ }
    _gmu.ac = c; _gmu.bus = { g, pan, send };
  }
  return _gmu.bus;
}
function _gmEnv(c, v, t, a, peak, d, r) { v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(peak, t + a); v.gain.setValueAtTime(peak * 0.85, t + Math.max(a, d - r)); v.gain.exponentialRampToValueAtTime(0.0001, t + d + r); }
/** One note in a voice. c: a BaseAudioContext, out: where it goes, t: when (seconds on c), m: MIDI, d: how long (s), k: loudness 0..1 */
function gmNote(c, out, voice, t, m, d, k) {
  const f = _gmF(m), K = k == null ? 1 : k;
  if (voice === 'fiddle') {   // two bowed saws a hair apart, through a body (a lowpass and a resonance), with vibrato that comes in after the attack
    const v = c.createGain(), lp = c.createBiquadFilter(), pk = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 0.6; pk.type = 'peaking'; pk.frequency.value = 1150; pk.Q.value = 1.4; pk.gain.value = 5;
    lfo.frequency.value = 5.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.0045, t + Math.min(0.3, d * 0.6)); lfo.connect(lg);
    for (const det of [-5, 5]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; lg.connect(o.frequency); o.connect(lp); o.start(t); o.stop(t + d + 0.2); }
    lp.connect(pk); pk.connect(v); v.connect(out); _gmEnv(c, v, t, 0.03, 0.05 * K, d, 0.08);
    lfo.start(t); lfo.stop(t + d + 0.2); return;
  }
  if (voice === 'whistle') {   // a pure, breathy tone: a sine with a little of its octave, and a puff of breath at the start
    const v = c.createGain(), o = c.createOscillator(), o2 = c.createOscillator(), g2 = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f * 2; g2.gain.value = 0.12;
    lfo.frequency.value = 5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.003, t + Math.min(0.25, d * 0.7)); lfo.connect(lg); lg.connect(o.frequency);
    o.connect(v); o2.connect(g2); g2.connect(v); v.connect(out); _gmEnv(c, v, t, 0.02, 0.07 * K, d, 0.05);
    o.start(t); o2.start(t); lfo.start(t); o.stop(t + d + 0.12); o2.stop(t + d + 0.12); lfo.stop(t + d + 0.12);
    if (typeof _gsHiss === 'function') _gsHiss(c, out, t, { f: f * 2.2, q: 2, a: 0.004, d: 0.05, peak: 0.02 * K });
    return;
  }
  if (voice === 'squeeze' || voice === 'bass') {   // reeds: two square waves a hair apart, darkened; the bass hand a rounder triangle
    const v = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = voice === 'bass' ? 700 : 1700; lp.Q.value = 0.7;
    for (const det of voice === 'bass' ? [0] : [-7, 7]) { const o = c.createOscillator(); o.type = voice === 'bass' ? 'triangle' : 'square'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + d + 0.15); }
    lp.connect(v); v.connect(out); _gmEnv(c, v, t, voice === 'bass' ? 0.012 : 0.04, (voice === 'bass' ? 0.11 : 0.022) * K, d, 0.07);
    return;
  }
  if (voice === 'drum') {   // a frame drum: a skin's thump falling in pitch, tuned to the chord's root, with the tipper's tap on it
    const v = c.createGain(), o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f * 2.2, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(0.22 * K, t + 0.004); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(v); v.connect(out); o.start(t); o.stop(t + 0.36);
    if (typeof _gsHiss === 'function') _gsHiss(c, out, t, { type: 'lowpass', f: 1400, q: 0.7, a: 0.002, d: 0.045, peak: 0.07 * K });
  }
}
/** Everything one voice plays at one step of the tune, in its role, with n players. */
function gmStepNotes(voice, role, step, n, play) {
  const k = ((step % GM_NSTEP) + GM_NSTEP) % GM_NSTEP % GMU.steps, bar = gmBar(step, n), ch = GM_CHORDS[GM_BARS[bar]], S = GM_STEP / 1000, lap = Math.floor(step / GM_NSTEP) % 2;
  if (role === 'melody' || role === 'melody-bass') {
    const mel = gmMelody(bar, k);
    if (mel) {
      const v = role === 'melody-bass' ? 'squeeze' : voice, acc = k === 0 || k === 4 ? 1 : 0.82;
      if (n >= 3 && k % 4 === 0 && mel.len === 1 && voice !== 'squeeze') { play(v, 0, gmUp(mel.m, 1), S * 0.18, 0.55); play(v, S * 0.18, mel.m, S * 0.82, acc); }   // a cut: a grace note above, on the beat
      else play(v, 0, mel.m, S * mel.len * 0.95, acc);
      if (n >= 4 && voice === 'whistle' && lap === 1) play('whistle', 0, mel.m + 12, S * mel.len * 0.9, 0.35);
    }
    if (role === 'melody-bass' && (k === 0 || k === 4)) play('bass', 0, k === 0 ? ch.root : ch.fifth, S * 1.6, 0.9);
    return;
  }
  if (role === 'harmony') {   // the whistle above the fiddle: on the beats, or every eighth with three or more
    if (!(n >= 3 || k % 2 === 0)) return;
    const mel = gmMelody(bar, k) || gmMelody(bar, k - 1 >= 0 ? k - 1 : 0); if (!mel) return;
    const len = n >= 3 ? 1 : 2, m = gmChordAbove(mel.m, bar);
    play('whistle', 0, m, S * len * 0.92, 0.6);
    if (n >= 4 && lap === 1 && k % 4 === 0) play('whistle', 0, m + 12, S * 1.8, 0.25);   // a descant on the repeat
    return;
  }
  if (role === 'chords') {   // oom-pah: the bass hand on the beat (root, then fifth), the chord on the off-beat; fuller with more players
    if (k === 0 || k === 4) play('bass', 0, k === 0 ? ch.root : ch.fifth, S * 1.7, 1);
    if (k === 2 || k === 6 || (n >= 3 && (k === 3 || k === 7))) for (const m of ch.tri) play('squeeze', 0, m, S * (k % 2 ? 0.7 : 1.4), k % 2 ? 0.6 : 0.9);
    if (n >= 4 && k === 0) for (const m of ch.tri) play('squeeze', 0, m + 12, S * 7.5, 0.22);   // a held chord high over everything
    return;
  }
  if (role === 'rhythm') {   // the reel's beat, accents on one and three; a roll into the last bar of each half with two or more
    const pat = n >= 2 ? GM_DRUM.full : GM_DRUM.low, w = pat[k], last = bar % 8 === 7;
    if (w) play('drum', 0, ch.root + 12, 0.3, w);
    if (n >= 2 && bar % 8 === 6 && k === 7) { play('drum', S / 3, ch.root + 12, 0.2, 0.5); play('drum', S * 2 / 3, ch.root + 12, 0.2, 0.6); }
    if (last && k === 4) play('drum', 0, ch.root + 7, 0.3, 0.9);
  }
}

/* ---------- the band nearest you, now ---------- */
function _gmThing(id) { try { return (typeof gardenAffordThings === 'function' ? gardenAffordThings() : []).find(t => t.id === id) || null; } catch (e) { return null; } }
function _gmSpotRow(id, i) { try { const t = _gmThing(id); if (!t) return null; const P = gmPlaces(t.kind).find(p => p.i === i); if (!P) return null; return (typeof _ga !== 'undefined' && _ga.list || _gaStaticRows()).find(r => r.src === id && r.act === P.act) || _gaStaticRows().find(r => r.src === id && r.act === P.act) || null; } catch (e) { return null; } }
/** Everyone playing at one thing: [{ who ('me' | w), i, voice }] by the thing's id. */
function _gmBands() {
  const out = new Map(), now = performance.now();
  const add = (id, p) => { let b = out.get(id); if (!b) { b = []; out.set(id, b); } if (!b.some(q => q.i === p.i)) b.push(p); };
  if (_gmu.me) add(_gmu.me.id, { who: 'me', i: _gmu.me.i, voice: _gmu.me.voice });
  for (const [w, r] of _gmu.them) {
    if (now - r.at > GMU.staleMs) { _gmu.them.delete(w); continue; }
    const A = typeof _gll !== 'undefined' && _gll.actors ? _gll.actors.get(w) : null;
    if (A && r.stand && Number.isFinite(A.x) && Math.hypot(A.x - r.stand.x, A.y - r.stand.y) > GMU.walkOff && now - r.at > 2500) { _gmu.them.delete(w); continue; }   // (their figure walked off: they stopped)
    add(r.id, { who: w, i: r.i, voice: r.voice });
  }
  return out;
}
/** The band you hear: the nearest within GMU.far, with how loud and where. */
function _gmHeard() {
  let best = null; const px = typeof _gw !== 'undefined' ? _gw.px : 0, py = typeof _gw !== 'undefined' ? _gw.py : 0;
  for (const [id, players] of _gmBands()) {
    const t = _gmThing(id); if (!t) continue;
    const mv = typeof gartActMovedTo === 'function' ? gartActMovedTo(id) : null, x = mv ? mv.x : t.x, y = mv ? mv.y : t.y, d = Math.hypot(x - px, (y - py) * 1.3);
    if (d > GMU.far) continue;
    if (!best || d < best.d) best = { id, players, d, dx: x - px, k: d <= GMU.ear ? 1 : 1 - (d - GMU.ear) / (GMU.far - GMU.ear) };
  }
  return best;
}
/** The places in use at a thing now (yours and friends'): its drawing leaves those instruments out. */
function gardenMusicHeld(id) { const s = new Set(); const b = _gmBands().get(id); if (b) for (const p of b) s.add(p.i); return s; }
function _gmHeldSync() { const sig = [..._gmBands()].map(([id, b]) => id + ':' + b.map(p => p.i).sort().join('')).sort().join('|'); if (sig !== _gmu.heldSig) { _gmu.heldSig = sig; if (typeof _gaResync === 'function') _gaResync(); } }

/* ---------- the clock ---------- */
function _gmLive() { try { return typeof _gll !== 'undefined' && (_gll.role === 'visit' ? typeof _glvLive === 'function' && _glvLive() : _gll.role === 'host' && typeof _glh !== 'undefined' && _glh.on && typeof _glhAnyone === 'function' && _glhAnyone()); } catch (e) { return false; } }
function _gmVisitor() { return typeof _gll !== 'undefined' && _gll.role === 'visit'; }
/** The tune's clock here: the host's, in ms. */
function gmNow() { return performance.now() + (_gmVisitor() ? _gmu.off : 0); }
/** ms from now until a loop of `period` ms should start, at least `min` from now: on the tune's beat (song time 0 is the start of a bar). */
function gmLoopAt(min, period) { const p = Math.max(1, period || GM_STEP * 2), t = gmNow() + min; return Math.round(min + ((p - (t % p)) % p)); }
function _gmPing() {
  if (!_gmVisitor() || !_gmLive()) return;
  const v = Math.floor(Math.random() * 36 ** 6).toString(36); _gmu.pings.set(v, performance.now());
  if (_gmu.pings.size > 8) _gmu.pings.delete(_gmu.pings.keys().next().value);
  _gmu.pingAt = performance.now();
  try { gardenLiveFx('tune', 'ping', { v }); } catch (e) { /* alone */ }
}
function _gmPong(ev) {
  const t0 = _gmu.pings.get(String(ev.v)); if (t0 == null) return; _gmu.pings.delete(String(ev.v));
  const t1 = performance.now(), rtt = t1 - t0, host = (Number(ev.tt) || 0) * 1000 + (Number(ev.n) || 0);
  if (!(rtt >= 0 && rtt < 8000)) return;
  const off = ((host + rtt / 2 - t1) % GM_SYNC + GM_SYNC) % GM_SYNC;
  _gmu.samples.push({ rtt, off, at: t1 }); _gmu.samples = _gmu.samples.filter(s => t1 - s.at < 40000).slice(-8);
  const best = _gmu.samples.reduce((a, s) => (!a || s.rtt < a.rtt ? s : a), null);
  const was = _gmu.off; _gmu.off = best.off; _gmu.synced = true;
  const jump = Math.abs(((_gmu.off - was) % GM_SYNC + GM_SYNC * 1.5) % GM_SYNC - GM_SYNC / 2);
  if (jump > 25) _gmu.next = -1;   // (a new clock: start scheduling again from now, so nothing plays twice)
}

/* ---------- yours ---------- */
function gardenMusicStart(cur) {
  try {
    const row = cur && cur.row, sp = cur && cur.spot; if (!row || !row.music || !sp || !sp.src) return;
    const t = _gmThing(sp.src), P = t && gmPlaces(t.kind).find(p => p.act === cur.id); if (!P) return;
    _gmu.me = { id: sp.src, i: P.i, voice: row.music };
    _gmTell('on');
    clearInterval(_gmu.beatT); _gmu.beatT = setInterval(() => { if (_gmu.me) _gmTell('on'); else clearInterval(_gmu.beatT); }, GMU.beatMs);
    if (_gmVisitor()) { _gmPing(); setTimeout(_gmPing, 450); setTimeout(_gmPing, 1000); }
    _gmWake(); _gmHeldSync();
    // the app's Sounds switch is off by default: say once how to hear the band (plain words, what to press)
    _gmSoundNote('You are playing, but the garden’s sound is off.');
  } catch (e) { console.error('[garden music]', e); }
}
/** The app's Sound switch is off by default: say so once, with the switch on the note (plain words, one click). */
function _gmSoundNote(words) {
  try {
    if (_gmu.told || typeof _gsPrefs !== 'function' || _gsPrefs().on) return; _gmu.told = true;
    gardenToast(words, { icon: 'music', timeout: 9000, action: { label: 'Turn sound on', run: () => { try { _gsSet({ sounds: true }); if (typeof _gsArm === 'function') _gsArm(); _gmu.next = -1; _gmWake(); } catch (e) { /* Menu, View & help, Sound */ } } } });
  } catch (e) { /* fine */ }
}
function gardenMusicStop(cur) {
  if (!_gmu.me) return;
  const was = _gmu.me; _gmu.me = null; clearInterval(_gmu.beatT);
  _gmTell('off', was); _gmHeldSync();
}
function _gmTell(e, me) {
  const m = me || _gmu.me; if (!m) return;
  try { if (typeof gardenLiveFx === 'function') gardenLiveFx('tune', e, { i: m.id, n: m.i }); } catch (err) { /* alone */ }
}
/* ---------- theirs ---------- */
function gardenMusicHeard(A, ev) {
  try {
    if (!ev || ev.c !== 'tune') return;
    if (ev.e === 'ping') {   // (you are the host: your clock, to the one who asked)
      if (_gmVisitor() || !A || !A.f || typeof _glhSend !== 'function') return;
      const ph = Math.floor(((performance.now() % GM_SYNC) + GM_SYNC) % GM_SYNC);
      _glhSend(A.f, 'fx', { c: 'tune', e: 'pong', v: String(ev.v), tt: Math.floor(ph / 1000), n: ph % 1000 });
      return;
    }
    if (ev.e === 'pong') { if (_gmVisitor() && ev.w === 0) _gmPong(ev); return; }
    const w = ev.w; if (w == null) return;
    if (ev.e === 'off') { _gmu.them.delete(w); _gmHeldSync(); return; }
    if (ev.e === 'on') {
      const id = String(ev.i || ''), i = Number(ev.n) || 0, t = _gmThing(id); if (!t) return;
      const P = gmPlaces(t.kind).find(p => p.i === i); if (!P) return;
      // one player a place: someone already on it here (you) keeps it; theirs is the later claim
      if (_gmu.me && _gmu.me.id === id && _gmu.me.i === i) return;
      for (const [w2, r] of _gmu.them) if (w2 !== w && r.id === id && r.i === i) _gmu.them.delete(w2);
      const row = _gmSpotRow(id, i), was = _gmu.them.get(w);
      _gmu.them.set(w, { id, i, voice: P.voice, stand: row && row.stand ? { x: row.stand.x, y: row.stand.y } : null, at: performance.now(), since: was && was.id === id && was.i === i ? was.since : performance.now() });
      if (_gmVisitor() && !_gmu.synced) _gmPing();
      if (!was) { const h = _gmHeard(); if (h && h.id === id) _gmSoundNote((A && A.n ? A.n : 'A friend') + ' is playing music here, but the garden’s sound is off.'); }
      _gmWake(); _gmHeldSync();
      setTimeout(() => _gmHeal(w), 1500);
    }
  } catch (e) { console.error('[garden music]', e); }
}
/** Their figure here shows them playing that instrument (after their move's own message, or a check that only knew they were "sitting"
 *  put a plain sit on it): from where they stand, it is put right; standing elsewhere, it walks there first. */
function _gmHeal(w) {
  try {
    const r = _gmu.them.get(w), A = r && typeof _gll !== 'undefined' && _gll.actors ? _gll.actors.get(w) : null; if (!A || A.moving || A.then) return;
    const t = _gmThing(r.id), P = t && gmPlaces(t.kind).find(p => p.i === r.i); if (!P || A.actHold === P.act) return;
    if (r.stand && typeof _gllEmoteAt === 'function') _gllEmoteAt(A, { e: GA_WIRE + P.act, x: r.stand.x, y: r.stand.y }); else if (typeof gartActRemote === 'function') gartActRemote(A, P.act);
  } catch (e) { /* the next one */ }
}
/** A place someone else is playing at now: not offered to you (one player a place). */
function gardenMusicTaken(id, act) {
  if (!id || !act) return false;
  const t = _gmThing(id), P = t && gmPlaces(t.kind).find(p => p.act === act); if (!P) return false;
  for (const [w, r] of _gmu.them) if (r.id === id && r.i === P.i && performance.now() - r.at < GMU.staleMs) return true;
  return false;
}

/* ---------- the player: a 100 ms timer that schedules the next 0.35 s, only while someone plays within hearing ---------- */
function _gmWake() { if (!_gmu.iv) _gmu.iv = setInterval(_gmTick, GMU.tickMs); _gmTick(); }
function _gmTick() {
  try {
    const band = _gmHeard();
    if (!_gmu.me && !_gmu.them.size) { clearInterval(_gmu.iv); _gmu.iv = 0; _gmu.next = -1; _gmQuiet(); _gmHeldSync(); return; }
    if (_gmVisitor() && _gmLive() && (_gmu.me || _gmu.them.size) && performance.now() - _gmu.pingAt > (_gmu.synced ? GMU.pingMs : 1500)) _gmPing();
    if (performance.now() % 1000 < GMU.tickMs) _gmHeldSync();
    if (performance.now() % 2000 < GMU.tickMs) for (const w of _gmu.them.keys()) _gmHeal(w);   // (their figure shows them playing, every two seconds at most)
    if (!band) { _gmu.next = -1; _gmQuiet(); return; }
    const B = _gmBus(); if (!B) { _gmu.next = -1; return; }   // (Sounds off, or nobody has clicked yet: silent, still in time)
    const c = _gmu.ac, now = performance.now(), song = gmNow(), cur = Math.floor(song / GM_STEP), until = Math.floor((song + GMU.ahead * 1000) / GM_STEP);
    if (_gmu.next < cur || _gmu.next > until + 4) _gmu.next = cur + 1;
    const voices = band.players.map(p => p.voice), roles = gmRoles(voices), n = band.players.length;
    _gmu.band = { id: band.id, n, roles, k: band.k };
    const sig = band.id + JSON.stringify(roles); if (sig !== _gmu.lastRoles) { _gmu.lastRoles = sig; try { if (typeof _gsLog === 'function') _gsLog('tune:' + n + ':' + Object.keys(roles).sort().join('+')); } catch (e) { /* fine */ } }
    const t = c.currentTime;
    B.g.gain.setTargetAtTime(0.9 * band.k, t, 0.15);
    if (B.pan) B.pan.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, band.dx / 12)), t, 0.2);
    for (let s = _gmu.next; s <= until; s++) {
      const at = t + Math.max(0.005, (s * GM_STEP - song) / 1000);
      for (const v of Object.keys(roles)) gmStepNotes(v, roles[v], s, n, (voice, dt, m, d, k) => { gmNote(c, B.g, voice, at + dt, m, d, k); _gmu.notes++; });
    }
    _gmu.next = until + 1;
  } catch (e) { console.error('[garden music]', e); clearInterval(_gmu.iv); _gmu.iv = 0; }
}
function _gmQuiet() { try { if (_gmu.bus && _gmu.ac) _gmu.bus.g.gain.setTargetAtTime(0, _gmu.ac.currentTime, 0.2); } catch (e) { /* fine */ } }
// while the band plays, the garden's own soft notes wait (they are in another key)
if (typeof _gsMusic === 'function') {
  const _gmGsMusic0 = _gsMusic;
  _gsMusic = function (c, t, s) { if (_gmu.iv && _gmu.band) { if (typeof _gsn !== 'undefined') _gsn.music = t + 8; return; } return _gmGsMusic0(c, t, s); };   // eslint-disable-line no-func-assign
}
// a place someone else is playing at is not offered; and with friends playing, the prompt says to join in
if (typeof gartActNearby === 'function') {
  const _gmNearby0 = gartActNearby;
  gartActNearby = function () { const r = _gmNearby0(); return _gmu.them.size ? r.filter(q => !gardenMusicTaken(q.src, q.act)) : r; };   // eslint-disable-line no-func-assign
}
if (typeof _gaWords === 'function') {
  const _gmWords0 = _gaWords;
  _gaWords = function (r) { const s = _gmWords0(r); try { const row = r && GARDEN_ACTS[r.act]; if (row && row.music && r.src && _gmBands().get(r.src)) return 'Join in: ' + s.charAt(0).toLowerCase() + s.slice(1); } catch (e) { /* as it was */ } return s; };   // eslint-disable-line no-func-assign
}
function gardenMusicState() { const b = _gmu.band; return { me: _gmu.me, them: [..._gmu.them].map(([w, r]) => ({ w, id: r.id, i: r.i, voice: r.voice })), off: Math.round(_gmu.off), synced: _gmu.synced, rtt: _gmu.samples.length ? Math.round(Math.min(..._gmu.samples.map(s => s.rtt))) : null, roles: b && b.roles, n: b && b.n, k: b && b.k, step: Math.floor(gmNow() / GM_STEP) % GM_NSTEP, on: !!_gmu.iv, notes: _gmu.notes }; }
/** The tune with these voices playing, drawn into an OfflineAudioContext: a Promise of { peak, rms, notes } (and the buffer as o.buffer). */
function gardenMusicRender(voices, secs) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) return Promise.reject(new Error('no offline audio'));
  const sr = 22050, c = new OAC(2, Math.floor(sr * (secs || 10)), sr), out = c.createGain(); out.connect(c.destination); out.gain.value = 0.9;
  const roles = gmRoles(voices), n = voices.length; let notes = 0;
  for (let s = 0; s * GM_STEP / 1000 < (secs || 10) - 0.5; s++) for (const v of Object.keys(roles)) gmStepNotes(v, roles[v], s, n, (voice, dt, m, d, k) => { gmNote(c, out, voice, s * GM_STEP / 1000 + dt + 0.05, m, d, k); notes++; });
  return c.startRendering().then(buf => { let peak = 0, sum = 0; const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; } return { peak: Math.round(peak * 1000) / 1000, rms: Math.round(Math.sqrt(sum / d.length) * 1000) / 1000, notes, roles, buffer: buf }; });
}
