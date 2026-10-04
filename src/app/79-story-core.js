/* ============================================================
   STORY CORE (owner: Story engine). PURE classic script: no DOM, no page
   globals, nothing runs at load except constants, so the tests evaluate it
   in Node (tests/story-*.test.mjs) exactly as the page does.

   The full-screen player (79-story-engine.js) is built on four pieces:
     storyTokens / storySegments / storyWordTimes   text -> words and entity spans
     storyCreateNarrator(env)    Web Speech wrapper: voice choice, word boundaries
                                 (with a timed fallback), pause/resume, and a silent
                                 timed mode when there are no voices or it is muted
     storyCreateTimeline(opts)   beats with enter / hold / exit; auto-advance on the
                                 narration's end (or a timer), pause, next/prev, speed,
                                 mute, replay, and swapping in a later script
     storyKeyAction(e)           Space, arrows, M, Esc (+ Home = replay)
   Everything time-based takes injected timers so tests can run a fake clock.
   ============================================================ */
const STORY_SPEEDS = Object.freeze([0.8, 1, 1.25]);
const STORY_TIMING = Object.freeze({
  enter: 750,      // ms the beat takes to come in
  exit: 450,       // ms to leave
  after: 650,      // pause after the narration before the beat leaves
  sayDelay: 380,   // narration starts this long after the beat starts
  minHold: 1800,   // a narrated beat stays at least this long
  hold: 3200,      // a silent beat without its own hold
  wpm: 170,        // reading speed of the timed captions at rate 1
  noStart: 1600,   // speech that has not started by then is treated as silent
  noBoundary: 1500, // no word boundary by then: timed word highlighting (Windows voices fire 'start' ~1 s before the first word)
});

/* ---------- text ---------- */
/** Words with character offsets: [{w, start, end}]. */
function storyTokens(text) {
  const out = [], s = String(text || ''), re = /\S+/g;
  let m;
  while ((m = re.exec(s))) out.push({ w: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}
/** The token at a character offset (the last one starting at or before it); -1 before the first. */
function storyWordIndexAt(tokens, charIndex) {
  let k = -1;
  for (let i = 0; i < tokens.length; i++) { if (tokens[i].start <= charIndex) k = i; else break; }
  return k;
}
/** How long reading the text takes at a rate (ms), never under 1.2 s. */
function storyReadMs(text, rate) {
  const words = storyTokens(text).length;
  const r = Number(rate) > 0 ? Number(rate) : 1;
  return Math.max(1200, Math.round((words * 60000 / STORY_TIMING.wpm) / r + 300));
}
/** Estimated start time (ms) of each word: longer words and punctuation take longer. */
function storyWordTimes(text, rate) {
  const toks = storyTokens(text);
  if (!toks.length) return [];
  const weight = (t) => 1 + Math.max(0, t.w.replace(/[^\p{L}\p{N}]/gu, '').length - 5) * 0.12 + (/[,;:–—]$/.test(t.w) ? 0.6 : 0) + (/[.!?…”]$/.test(t.w) ? 1 : 0);
  const ws = toks.map(weight);
  const total = ws.reduce((a, b) => a + b, 0);
  const ms = storyReadMs(text, rate) - 300;
  const out = []; let acc = 0;
  for (const w of ws) { out.push(Math.round(acc / total * ms)); acc += w; }
  return out;
}
/**
 * Text cut into plain and entity segments: [{text, start, end, entity|null}].
 * Entities need start/end inside the text (the server's script has them); ones
 * without valid offsets are looked up by their text. Overlaps are skipped.
 */
function storySegments(text, entities) {
  const s = String(text || '');
  const lower = s.toLowerCase();
  const spans = [];
  for (const e of Array.isArray(entities) ? entities : []) {
    if (!e) continue;
    let a = Number(e.start), b = Number(e.end);
    if (!(Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b <= s.length && b > a)) {
      const i = e.text ? lower.indexOf(String(e.text).toLowerCase()) : -1;
      if (i < 0) continue;
      a = i; b = i + String(e.text).length;
    }
    if (spans.some(x => a < x.end && b > x.start)) continue;
    spans.push({ start: a, end: b, entity: e });
  }
  spans.sort((x, y) => x.start - y.start);
  const out = []; let at = 0;
  for (const sp of spans) {
    if (sp.start > at) out.push({ text: s.slice(at, sp.start), start: at, end: sp.start, entity: null });
    out.push({ text: s.slice(sp.start, sp.end), start: sp.start, end: sp.end, entity: sp.entity });
    at = sp.end;
  }
  if (at < s.length) out.push({ text: s.slice(at), start: at, end: s.length, entity: null });
  return out;
}

/* ---------- voices ---------- */
/**
 * The voice to use: the named one when it exists, else the best English voice:
 * en-GB natural/neural, then en-GB, then any English (offline voices first among
 * equals). null when there is no English voice (the story then reads silently).
 */
function storyPickVoice(voices, preferredName) {
  const list = (Array.isArray(voices) ? voices : []).filter(v => v && v.name);
  if (preferredName) { const v = list.find(x => x.name === preferredName); if (v) return v; }
  let best = null, bestScore = -1;
  for (const v of list) {
    const lang = String(v.lang || '').replace('_', '-').toLowerCase();
    if (!lang.startsWith('en')) continue;
    let sc = lang === 'en-gb' ? 100 : 50;
    if (/natural|neural|enhanced|premium/i.test(v.name)) sc += 30;
    if (v.localService) sc += 8;
    if (v.default) sc += 2;
    if (sc > bestScore) { best = v; bestScore = sc; }
  }
  return best;
}
/** English voices for the Settings picker, best first: [{name, lang, local, natural}]. */
function storyVoiceList(voices) {
  return (Array.isArray(voices) ? voices : []).filter(v => v && v.name && /^en/i.test(String(v.lang || '')))
    .map(v => ({ name: v.name, lang: String(v.lang || ''), local: !!v.localService, natural: /natural|neural|enhanced|premium/i.test(v.name) }))
    .sort((a, b) => (b.lang.replace('_', '-').toLowerCase() === 'en-gb') - (a.lang.replace('_', '-').toLowerCase() === 'en-gb') || b.natural - a.natural || b.local - a.local || a.name.localeCompare(b.name));
}

/* ---------- a pausable timer list ---------- */
function _stScheduler(T, now) {
  let list = [], paused = false;
  const fire = (t) => { list = list.filter(x => x !== t); t.fn(); };
  return {
    add(ms, fn) {
      const t = { fn, due: now() + Math.max(0, ms), rem: Math.max(0, ms), h: null };
      if (!paused) t.h = T.set(() => fire(t), t.rem);
      list.push(t);
      return t;
    },
    clear() { for (const t of list) T.clear(t.h); list = []; },
    pause() { if (paused) return; paused = true; for (const t of list) { T.clear(t.h); t.h = null; t.rem = Math.max(0, t.due - now()); } },
    resume() { if (!paused) return; paused = false; for (const t of list) { t.due = now() + t.rem; t.h = T.set(() => fire(t), t.rem); } },
    get size() { return list.length; },
  };
}

/* ---------- the narrator ---------- */
/**
 * env: {synth (speechSynthesis), Utterance (SpeechSynthesisUtterance), timers:{set, clear}, now,
 *       prefs:{voiceName, rate, pitch, volume}}
 * speak(text, {speed, silent, fromChar, onWord(charIndex), onEnd(), onMode(mode)}) -> handle
 *   handle: {mode 'voice'|'timed', charIndex, pause(), resume(), cancel(), done}
 * One utterance at a time: a new speak() cancels the last one (no callbacks from it).
 * No voices / muted / speech failing to start -> timed mode: the same word callbacks
 * from estimated timings, so captions still follow along.
 */
function storyCreateNarrator(env) {
  env = env || {};
  const synth = env.synth || null, Utt = env.Utterance || null;
  const T = env.timers || { set: (f, ms) => setTimeout(f, ms), clear: (h) => clearTimeout(h) };
  const now = env.now || (() => Date.now());
  let prefs = Object.assign({ voiceName: '', rate: 1, pitch: 1, volume: 1 }, env.prefs || {});
  const failed = new Set();
  let cur = null, seq = 0;
  const allVoices = () => { try { return synth && typeof synth.getVoices === 'function' ? (synth.getVoices() || []) : []; } catch (e) { return []; } };
  const voice = () => storyPickVoice(allVoices().filter(v => !failed.has(v.name)), prefs.voiceName);
  const canSpeak = () => !!(synth && Utt && voice());
  const safeCancel = () => { try { if (synth) synth.cancel(); } catch (e) { /* ignore */ } };

  function speak(text, o) {
    o = o || {};
    if (cur) cur.cancel();
    const full = String(text || '');
    const id = ++seq;
    const live = () => cur === h && h.id === id && !h.done && !h.cancelled;
    const timers = _stScheduler(T, now);
    const speed = Number(o.speed) > 0 ? Number(o.speed) : 1;
    const toks = storyTokens(full);
    let utt = null, gotBoundary = false, started = false;
    const h = {
      id, text: full, charIndex: Math.max(0, Number(o.fromChar) || 0), mode: null, done: false, cancelled: false, paused: false,
      pause() {
        if (!live() || h.paused) return;
        h.paused = true; timers.clear();
        if (h.mode === 'voice') { utt = null; safeCancel(); }
      },
      resume() { if (!live() || !h.paused) return; h.paused = false; run(h.charIndex); },
      cancel() {
        if (h.cancelled || h.done) return;
        h.cancelled = true; timers.clear();
        if (h.mode === 'voice') { utt = null; safeCancel(); }
        if (cur === h) cur = null;
      },
    };
    const word = (c) => { if (!live()) return; h.charIndex = c; if (o.onWord) o.onWord(c); };
    const finish = () => {
      if (!live()) return;
      timers.clear(); h.done = true; utt = null;
      if (cur === h) cur = null;
      if (o.onEnd) o.onEnd();
    };
    function timed(from) {
      h.mode = 'timed'; if (o.onMode) o.onMode('timed');
      const k0 = Math.max(0, storyWordIndexAt(toks, from));
      const rest = toks.slice(k0);
      const restText = rest.map(t => t.w).join(' ');
      const times = storyWordTimes(restText, (Number(prefs.rate) || 1) * speed);
      rest.forEach((t, i) => timers.add(times[i], () => word(t.start)));
      timers.add(rest.length ? storyReadMs(restText, (Number(prefs.rate) || 1) * speed) : 0, finish);
    }
    /** Timed word ticks only (the voice keeps going and ends the beat itself). */
    function tickOnly(fromChar, msSoFar) {
      const k0 = Math.max(0, storyWordIndexAt(toks, fromChar));
      const rest = toks.slice(k0);
      const times = storyWordTimes(rest.map(t => t.w).join(' '), (Number(prefs.rate) || 1) * speed);
      rest.forEach((t, i) => { if (times[i] >= msSoFar) timers.add(times[i] - msSoFar, () => { if (!gotBoundary) word(t.start); }); });
    }
    function run(from) {
      if (o.silent || !canSpeak() || from >= full.length) return timed(from);
      // Start at the beginning of the word the reader was in.
      const k = Math.max(0, storyWordIndexAt(toks, from));
      const base = toks.length ? toks[k].start : 0;
      const v = voice();
      h.mode = 'voice'; if (o.onMode) o.onMode('voice');
      gotBoundary = false; started = false;
      const u = new Utt(full.slice(base));
      utt = u;
      try { u.voice = v; u.lang = v.lang || 'en-GB'; } catch (e) { /* read-only in some engines */ }
      u.rate = Math.max(0.5, Math.min(2, (Number(prefs.rate) || 1) * speed));
      u.pitch = Number(prefs.pitch) || 1; u.volume = Number.isFinite(Number(prefs.volume)) ? Math.max(0, Math.min(1, Number(prefs.volume))) : 1;
      const t0 = now();
      u.onstart = () => {
        if (utt !== u || !live()) return;
        started = true;
        word(base);
        timers.add(STORY_TIMING.noBoundary, () => { if (!gotBoundary && utt === u) tickOnly(base, now() - t0); });
      };
      u.onboundary = (e) => {
        if (utt !== u || !live()) return;
        if (e && e.name && e.name !== 'word') return;
        gotBoundary = true;
        word(base + (Number(e && e.charIndex) || 0));
      };
      u.onend = () => { if (utt === u) finish(); };
      u.onerror = (e) => {
        if (utt !== u || !live()) return;
        const err = e && e.error;
        if (err === 'interrupted' || err === 'canceled') return;     // ours (pause/cancel), or the engine's
        if (err && err !== 'not-allowed') failed.add(v.name);         // network voice offline, etc.
        utt = null; timers.clear(); safeCancel();
        timed(h.charIndex);
      };
      // Speech that never starts (no gesture yet, a stuck engine): read silently instead.
      timers.add(STORY_TIMING.noStart, () => { if (!started && utt === u) { utt = null; safeCancel(); timers.clear(); timed(base); } });
      // Some engines never fire 'end': a generous ceiling keeps the story moving.
      timers.add(storyReadMs(full.slice(base), u.rate) * 2.5 + 4000, () => { if (utt === u) { utt = null; safeCancel(); finish(); } });
      try { safeCancel(); synth.speak(u); } catch (e) { utt = null; timers.clear(); timed(base); }
    }
    cur = h;
    if (!full.trim()) { h.mode = 'timed'; timers.add(0, finish); return h; }
    run(h.charIndex);
    return h;
  }
  return {
    speak,
    cancel() { if (cur) cur.cancel(); cur = null; },
    pause() { if (cur) cur.pause(); },
    resume() { if (cur) cur.resume(); },
    canSpeak, voice, voices: () => storyVoiceList(allVoices()),
    setPrefs(p) { prefs = Object.assign({}, prefs, p || {}); },
    get prefs() { return Object.assign({}, prefs); },
    /** Call inside a click: unlocks speech in browsers that need a gesture. */
    prime() { if (!synth || !Utt) return; try { const u = new Utt(' '); u.volume = 0; synth.speak(u); } catch (e) { /* ignore */ } },
    get current() { return cur; },
  };
}

/* ---------- the beat timeline ---------- */
/**
 * opts: {beats, narrator, timers:{set, clear}, now, speed (0.8|1|1.25), muted,
 *        hooks:{onBeat(i, beat, dir), onPhase(i, phase, beat), onWord(i, charIndex, beat),
 *               onState(state), onEnd(), onBeats(beats), onMode(mode)}}
 * A beat: {id, say?, hold?, enter?, exit?, after?, sayDelay?, auto? (false = wait for Next)}.
 * Phases: enter -> hold -> exit -> next beat. A narrated beat holds until the
 * narration ends (+ after); a silent one for `hold` ms. The last beat holds and ends.
 * States: idle (before Play), playing, paused, ended.
 */
function storyCreateTimeline(opts) {
  opts = opts || {};
  const T = opts.timers || { set: (f, ms) => setTimeout(f, ms), clear: (h) => clearTimeout(h) };
  const now = opts.now || (() => Date.now());
  const hooks = opts.hooks || {};
  const narrator = opts.narrator || storyCreateNarrator({ timers: T, now });
  let beats = Array.isArray(opts.beats) ? opts.beats.slice() : [];
  let speed = STORY_SPEEDS.includes(Number(opts.speed)) ? Number(opts.speed) : 1;
  let muted = !!opts.muted;
  let i = -1, phase = null, state = 'idle', say = null, spoken = false, held = false, lastChar = 0, exiting = false;
  const sch = _stScheduler(T, now);
  const call = (name, ...a) => { try { if (hooks[name]) hooks[name](...a); } catch (e) { if (typeof console !== 'undefined') console.error('[story] ' + name, e); } };
  const setState = (s) => { if (state !== s) { state = s; call('onState', s); } };
  const ms = (beat, key) => Math.round((Number.isFinite(beat && beat[key]) ? beat[key] : STORY_TIMING[key]) / speed);
  const sayText = (b) => String((b && b.say) || '').trim();

  function speakFrom(from) {
    const b = beats[i];
    if (say) say.cancel();
    say = narrator.speak(sayText(b), {
      speed, silent: muted, fromChar: from,
      onWord: (c) => { lastChar = c; call('onWord', i, c, b); },
      onEnd: () => { spoken = true; say = null; maybeExit(); },
      onMode: (m) => call('onMode', m),
    });
  }
  function maybeExit() {
    const b = beats[i];
    if (!spoken || !held || phase !== 'hold' || exiting || state !== 'playing') return;
    if (i >= beats.length - 1) { setState('ended'); call('onEnd'); return; }
    if (b && b.auto === false) return;
    exiting = true;
    sch.add(sayText(b) ? ms(b, 'after') : 0, () => {
      // An interactive beat can turn auto-advance off while it waits to leave (the user started typing).
      if (b && b.auto === false) { exiting = false; return; }
      phase = 'exit'; call('onPhase', i, 'exit', b);
      sch.add(ms(b, 'exit'), () => show(i + 1, 1));
    });
  }
  function show(k, dir) {
    sch.clear();
    if (say) { say.cancel(); say = null; }
    if (!beats.length) { setState('ended'); call('onEnd'); return; }
    i = Math.max(0, Math.min(beats.length - 1, k));
    const b = beats[i];
    phase = 'enter'; spoken = false; held = false; lastChar = 0; exiting = false;
    setState('playing');
    call('onBeat', i, b, dir || 0);
    call('onPhase', i, 'enter', b);
    sch.add(ms(b, 'enter'), () => {
      phase = 'hold'; call('onPhase', i, 'hold', b);
      const hold = sayText(b) ? (Number.isFinite(b.hold) ? b.hold : STORY_TIMING.minHold) : (Number.isFinite(b.hold) ? b.hold : STORY_TIMING.hold);
      sch.add(Math.round(hold / speed), () => { held = true; maybeExit(); });
    });
    if (sayText(b)) sch.add(ms(b, 'sayDelay'), () => speakFrom(0));
    else spoken = true;
  }
  const api = {
    play() { if (state === 'idle' || state === 'ended') show(0, 1); else if (state === 'paused') api.resume(); },
    pause() {
      if (state !== 'playing') return;
      sch.pause(); if (say) say.pause();
      setState('paused');
    },
    resume() {
      if (state !== 'paused') return;
      setState('playing');
      sch.resume(); if (say) say.resume();
      maybeExit();
    },
    toggle() { if (state === 'playing') api.pause(); else if (state === 'paused') api.resume(); else api.play(); },
    next() { if (i < beats.length - 1) show(i + 1, 1); },
    prev() { show(Math.max(0, i - 1), -1); },
    goTo(k) { show(k, k >= i ? 1 : -1); },
    replay() { show(0, -1); },
    setSpeed(x) {
      x = Number(x); if (!STORY_SPEEDS.includes(x) || x === speed) return;
      speed = x;
      if (say && state === 'playing') speakFrom(lastChar);
    },
    /** Say the current words again with the narrator's latest prefs (volume / voice changed). */
    refresh() { if (say && state === 'playing') speakFrom(lastChar); },
    setMuted(m) {
      m = !!m; if (m === muted) return;
      muted = m;
      if (say && state === 'playing') speakFrom(lastChar);
    },
    /** A newer script: replace the beats after the one on screen (it and the ones before stay). */
    replaceUpcoming(next) {
      next = Array.isArray(next) ? next : [];
      if (i < 0) { beats = next.slice(); call('onBeats', beats); return true; }
      const id = beats[i] && beats[i].id;
      const k = next.findIndex(b => b && b.id === id);
      if (k < 0) return false;
      const wasLast = i >= beats.length - 1;
      beats = beats.slice(0, i + 1).concat(next.slice(k + 1));
      call('onBeats', beats);
      if (wasLast && state === 'ended' && i < beats.length - 1) { setState('playing'); held = true; spoken = true; phase = 'hold'; maybeExit(); }
      return true;
    },
    destroy() { sch.clear(); if (say) say.cancel(); say = null; narrator.cancel(); setState('idle'); i = -1; },
    get index() { return i; }, get phase() { return phase; }, get state() { return state; },
    get beats() { return beats; }, get speed() { return speed; }, get muted() { return muted; },
    get mode() { return say ? say.mode : null; },
  };
  return api;
}

/* ---------- keys ---------- */
/** The player action for a keydown, or null. Typing in a field never counts. */
function storyKeyAction(e) {
  if (!e || e.ctrlKey || e.metaKey || e.altKey) return null;
  const t = e.target;
  if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '') || t.isContentEditable)) return null;
  switch (e.key) {
    case ' ': case 'Spacebar': case 'k': case 'K': return 'toggle';
    case 'ArrowRight': case 'l': case 'L': return 'next';
    case 'ArrowLeft': case 'j': case 'J': return 'prev';
    case 'm': case 'M': return 'mute';
    case 'Escape': case 'Esc': return 'close';
    case 'Home': return 'replay';
    default: return null;
  }
}
/** Run a key on a player {toggle, next, prev, toggleMute, close, replay}; true when handled. */
function storyHandleKey(e, player) {
  const a = storyKeyAction(e);
  if (!a || !player) return false;
  const fn = { toggle: player.toggle, next: player.next, prev: player.prev, mute: player.toggleMute, close: player.close, replay: player.replay }[a];
  if (typeof fn !== 'function') return false;
  if (e.preventDefault) e.preventDefault();
  if (e.stopPropagation) e.stopPropagation();
  fn.call(player);
  return true;
}
