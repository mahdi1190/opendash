// Story engine core (src/app/79-story-core.js, loaded as the page loads it):
// text spans, voice choice, the Web Speech narrator with a mocked speechSynthesis
// (word boundaries, no boundaries, no voices, speech that never starts, errors,
// pause/resume/cancel), the beat timeline on a fake clock, and the keyboard map.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAMES = ['STORY_SPEEDS', 'STORY_TIMING', 'storyTokens', 'storyWordIndexAt', 'storyReadMs', 'storyWordTimes', 'storySegments',
  'storyPickVoice', 'storyVoiceList', 'storyCreateNarrator', 'storyCreateTimeline', 'storyKeyAction', 'storyHandleKey'];
const src = readFileSync(join(ROOT, 'src', 'app', '79-story-core.js'), 'utf8');
const S = new Function(`"use strict";\n${src}\nreturn { ${NAMES.join(', ')} };`)();

/* ---------- a fake clock ---------- */
function fakeClock() {
  let t = 0, seq = 0;
  const q = new Map();
  const timers = {
    set(fn, ms) { const id = ++seq; q.set(id, { fn, at: t + Math.max(0, ms || 0), id }); return id; },
    clear(id) { q.delete(id); },
  };
  return {
    timers, now: () => t,
    advance(ms) {
      const end = t + ms;
      for (;;) {
        let next = null;
        for (const x of q.values()) if (x.at <= end && (!next || x.at < next.at || (x.at === next.at && x.id < next.id))) next = x;
        if (!next) break;
        q.delete(next.id); t = next.at; next.fn();
      }
      t = end;
    },
    get pending() { return q.size; },
  };
}

/* ---------- a mocked speechSynthesis ---------- */
class Utt { constructor(text) { this.text = text; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; this.lang = ''; } }
function mockSynth(clock, { voices = [{ name: 'Daniel', lang: 'en-GB', localService: true }], boundaries = true, start = true, wordMs = 200, failWith = null } = {}) {
  const spoken = [];
  let current = null, cancels = 0;
  const synth = {
    getVoices: () => voices,
    speak(u) {
      if (u.text.trim() === '') return;           // prime()
      spoken.push(u); current = u;
      if (!start) return;
      clock.timers.set(() => {
        if (current !== u) return;
        if (failWith) { u.onerror && u.onerror({ error: failWith }); return; }
        u.onstart && u.onstart();
        const re = /\S+/g; let m, k = 0;
        while ((m = re.exec(u.text))) {
          const ci = m.index; k++;
          if (boundaries) clock.timers.set(() => { if (current === u) u.onboundary && u.onboundary({ name: 'word', charIndex: ci }); }, k * wordMs - wordMs + 1);
        }
        clock.timers.set(() => { if (current === u) { current = null; u.onend && u.onend(); } }, k * wordMs + 50);
      }, 20);
    },
    cancel() { cancels++; const u = current; current = null; if (u && u.onerror) u.onerror({ error: 'interrupted' }); },
  };
  return { synth, spoken, get cancels() { return cancels; } };
}

/* ---------- text ---------- */
test('tokens, word index and reading time', () => {
  const t = S.storyTokens('  Meet Sam at 10:00. ');
  assert.deepEqual(t.map(x => x.w), ['Meet', 'Sam', 'at', '10:00.']);
  assert.equal(t[1].start, 7);
  assert.equal(S.storyWordIndexAt(t, 0), -1);
  assert.equal(S.storyWordIndexAt(t, 8), 1);
  assert.ok(S.storyReadMs('one', 1) >= 1200);
  assert.ok(S.storyReadMs('word '.repeat(40), 1) > S.storyReadMs('word '.repeat(40), 1.25));
  const times = S.storyWordTimes('Hello there, Sam. Then a long meeting', 1);
  assert.equal(times.length, 7);
  assert.equal(times[0], 0);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] > times[i - 1]);
});

test('entity segments: offsets, lookup by text, overlaps skipped', () => {
  const text = 'Call Sam about the Thesis draft at 10:00';
  const segs = S.storySegments(text, [
    { type: 'person', ref: 'sam', text: 'Sam', start: 5, end: 8 },
    { type: 'task', ref: 't1', text: 'thesis draft' },              // no offsets: found by text
    { type: 'event', ref: 'e1', text: 'Sam about' },               // overlaps Sam: skipped
    { type: 'time', ref: '10:00', text: '10:00', start: 99, end: 120 }, // bad offsets: found by text
    { type: 'place', ref: 'x', text: 'nowhere' },                  // not in the text: skipped
  ]);
  assert.equal(segs.map(s => s.text).join(''), text, 'segments cover the text exactly');
  const ents = segs.filter(s => s.entity);
  assert.deepEqual(ents.map(s => [s.text, s.entity.ref]), [['Sam', 'sam'], ['Thesis draft', 't1'], ['10:00', '10:00']]);
  assert.deepEqual(S.storySegments('', []), []);
});

test('voice choice: named voice, then natural en-GB, en-GB, any English; none -> null', () => {
  const v = [
    { name: 'Alex', lang: 'en-US', localService: true, default: true },
    { name: 'Daniel', lang: 'en-GB', localService: true },
    { name: 'Microsoft Sonia Online (Natural) - English (United Kingdom)', lang: 'en-GB', localService: false },
    { name: 'Thomas', lang: 'fr-FR', localService: true },
  ];
  assert.equal(S.storyPickVoice(v).name, v[2].name);
  assert.equal(S.storyPickVoice(v.filter(x => !/Natural/.test(x.name))).name, 'Daniel');
  assert.equal(S.storyPickVoice([v[0], v[3]]).name, 'Alex');
  assert.equal(S.storyPickVoice(v, 'Thomas').name, 'Thomas', 'an explicit choice wins');
  assert.equal(S.storyPickVoice(v, 'Gone').name, v[2].name, 'a missing named voice falls back');
  assert.equal(S.storyPickVoice([v[3]]), null);
  assert.equal(S.storyPickVoice([]), null);
  const list = S.storyVoiceList(v);
  assert.deepEqual(list.map(x => x.name), [v[2].name, 'Daniel', 'Alex']);
  assert.equal(list[0].natural, true);
});

/* ---------- narrator ---------- */
test('narrator: word boundaries drive the highlight; end fires once', () => {
  const c = fakeClock(), m = mockSynth(c);
  const nar = S.storyCreateNarrator({ synth: m.synth, Utterance: Utt, timers: c.timers, now: c.now });
  assert.equal(nar.canSpeak(), true);
  const words = [], modes = []; let ended = 0;
  const h = nar.speak('Good morning Sam today', { onWord: (ci) => words.push(ci), onEnd: () => ended++, onMode: (x) => modes.push(x) });
  assert.equal(h.mode, 'voice');
  c.advance(2000);
  assert.deepEqual(modes, ['voice']);
  assert.deepEqual([...new Set(words)], [0, 5, 13, 17]);
  assert.equal(ended, 1);
  assert.equal(m.spoken[0].voice.name, 'Daniel');
  assert.equal(m.spoken[0].lang, 'en-GB');
  c.advance(60000);
  assert.equal(ended, 1, 'the safety ceiling does not end it again');
});

test('narrator: no boundary events -> timed word highlighting while the voice speaks', () => {
  const c = fakeClock(), m = mockSynth(c, { boundaries: false, wordMs: 400 });
  const nar = S.storyCreateNarrator({ synth: m.synth, Utterance: Utt, timers: c.timers, now: c.now });
  const words = []; let ended = 0;
  nar.speak('one two three four five six', { onWord: (ci) => words.push(ci), onEnd: () => ended++ });
  c.advance(S.STORY_TIMING.noBoundary + 100);
  const early = words.length;
  c.advance(3000);
  assert.ok(words.length > early, 'timed ticks continued');
  assert.equal(words[words.length - 1], 24, 'reached the last word');
  assert.equal(ended, 1, 'the voice ends it');
});

test('narrator: no voices installed -> silent timed captions, same callbacks', () => {
  const c = fakeClock(), m = mockSynth(c, { voices: [] });
  const nar = S.storyCreateNarrator({ synth: m.synth, Utterance: Utt, timers: c.timers, now: c.now });
  assert.equal(nar.canSpeak(), false);
  const words = []; let ended = 0;
  const h = nar.speak('Nothing to say out loud here', { onWord: (ci) => words.push(ci), onEnd: () => ended++ });
  assert.equal(h.mode, 'timed');
  c.advance(S.storyReadMs('Nothing to say out loud here', 1) + 10);
  assert.deepEqual(words, [0, 8, 11, 15, 19, 24]);
  assert.equal(ended, 1);
  assert.equal(m.spoken.length, 0);
  // No speechSynthesis at all behaves the same.
  const nar2 = S.storyCreateNarrator({ timers: c.timers, now: c.now });
  let e2 = 0; nar2.speak('Still works', { onEnd: () => e2++ });
  c.advance(5000);
  assert.equal(e2, 1);
});

test('narrator: muted (silent) beats never touch speechSynthesis', () => {
  const c = fakeClock(), m = mockSynth(c);
  const nar = S.storyCreateNarrator({ synth: m.synth, Utterance: Utt, timers: c.timers, now: c.now });
  let ended = 0;
  nar.speak('Quiet please', { silent: true, onEnd: () => ended++ });
  c.advance(5000);
  assert.equal(m.spoken.length, 0);
  assert.equal(ended, 1);
});

test('narrator: speech that never starts, or fails, falls back to timed captions', () => {
  const c = fakeClock(), m = mockSynth(c, { start: false });
  const nar = S.storyCreateNarrator({ synth: m.synth, Utterance: Utt, timers: c.timers, now: c.now });
  const modes = []; let ended = 0;
  nar.speak('Speech is stuck today', { onMode: (x) => modes.push(x), onEnd: () => ended++ });
  c.advance(S.STORY_TIMING.noStart + 10);
  assert.deepEqual(modes, ['voice', 'timed']);
  c.advance(10000);
  assert.equal(ended, 1);

  const c2 = fakeClock(), m2 = mockSynth(c2, { failWith: 'synthesis-failed' });
  const nar2 = S.storyCreateNarrator({ synth: m2.synth, Utterance: Utt, timers: c2.timers, now: c2.now });
  const modes2 = []; let e2 = 0;
  nar2.speak('A voice that breaks', { onMode: (x) => modes2.push(x), onEnd: () => e2++ });
  c2.advance(10000);
  assert.deepEqual(modes2, ['voice', 'timed']);
  assert.equal(e2, 1);
  assert.equal(nar2.canSpeak(), false, 'the broken voice is not picked again');
});

test('narrator: pause stops speech, resume restarts at the current word; cancel is silent', () => {
  const c = fakeClock(), m = mockSynth(c);
  const nar = S.storyCreateNarrator({ synth: m.synth, Utterance: Utt, timers: c.timers, now: c.now });
  const words = []; let ended = 0;
  const h = nar.speak('alpha beta gamma delta epsilon', { onWord: (ci) => words.push(ci), onEnd: () => ended++ });
  c.advance(450);                                // onstart + boundaries for alpha, beta, gamma
  assert.equal(h.charIndex, 11);
  h.pause();
  const n = words.length;
  c.advance(5000);
  assert.equal(words.length, n, 'nothing while paused');
  assert.equal(ended, 0);
  h.resume();
  assert.equal(m.spoken.length, 2);
  assert.equal(m.spoken[1].text, 'gamma delta epsilon', 'resumes at the start of the word');
  c.advance(5000);
  assert.equal(ended, 1);
  assert.equal(words[words.length - 1], 23, 'offsets stay relative to the full text');

  let e3 = 0, w3 = 0;
  const h3 = nar.speak('cancel me please', { onWord: () => w3++, onEnd: () => e3++ });
  h3.cancel();
  c.advance(10000);
  assert.equal(e3, 0); assert.equal(w3, 0);
  // A new speak() cancels the previous one.
  let a = 0, b = 0;
  nar.speak('first one', { onEnd: () => a++ });
  nar.speak('second one', { onEnd: () => b++ });
  c.advance(10000);
  assert.equal(a, 0); assert.equal(b, 1);
});

/* ---------- timeline ---------- */
function silentNarrator(c) { return S.storyCreateNarrator({ timers: c.timers, now: c.now }); }
function record(c, beats, extra = {}) {
  const log = [];
  const tl = S.storyCreateTimeline({
    beats, timers: c.timers, now: c.now, narrator: extra.narrator || silentNarrator(c), speed: extra.speed, muted: extra.muted,
    hooks: {
      onBeat: (i, b, dir) => log.push(['beat', b.id, dir, c.now()]),
      onPhase: (i, p, b) => log.push([p, b.id, c.now()]),
      onState: (s) => log.push(['state', s]),
      onEnd: () => log.push(['end', c.now()]),
      onWord: (i, ci) => log.push(['word', i, ci]),
    },
  });
  return { tl, log };
}
const T = S.STORY_TIMING;

test('timeline: silent beats go enter -> hold -> exit -> next, and the last one ends', () => {
  const c = fakeClock();
  const { tl, log } = record(c, [{ id: 'a', hold: 1000 }, { id: 'b', hold: 500 }]);
  assert.equal(tl.state, 'idle');
  tl.play();
  c.advance(60000);
  const seq = log.filter(x => x[0] !== 'word').map(x => x.slice(0, 2).join(':'));
  assert.deepEqual(seq, ['state:playing', 'beat:a', 'enter:a', 'hold:a', 'exit:a', 'beat:b', 'enter:b', 'hold:b', 'state:ended', 'end:' + log.find(x => x[0] === 'end')[1]]);
  const at = (k, id) => log.find(x => x[0] === k && x[1] === id)[2];
  assert.equal(at('hold', 'a'), T.enter);
  assert.equal(at('exit', 'a'), T.enter + 1000);
  assert.equal(at('enter', 'b'), T.enter + 1000 + T.exit);
  assert.equal(tl.state, 'ended');
});

test('timeline: speed scales every phase', () => {
  const c = fakeClock();
  const { tl, log } = record(c, [{ id: 'a', hold: 1000 }, { id: 'b' }], { speed: 1.25 });
  tl.play();
  c.advance(60000);
  const exitA = log.find(x => x[0] === 'exit' && x[1] === 'a')[2];
  assert.equal(exitA, Math.round(T.enter / 1.25) + Math.round(1000 / 1.25));
  assert.equal(tl.speed, 1.25);
  tl.setSpeed(3); assert.equal(tl.speed, 1.25, 'only 0.8 / 1 / 1.25');
});

test('timeline: a narrated beat holds until the narration ends', () => {
  const c = fakeClock(), m = mockSynth(c, { wordMs: 500 });
  const nar = S.storyCreateNarrator({ synth: m.synth, Utterance: Utt, timers: c.timers, now: c.now });
  const say = 'one two three four five six seven eight';  // 8 words x 500 ms, longer than minHold
  const { tl, log } = record(c, [{ id: 'a', say }, { id: 'b', hold: 300 }], { narrator: nar });
  tl.play();
  c.advance(60000);
  const words = log.filter(x => x[0] === 'word').map(x => x[2]);
  assert.deepEqual([...new Set(words)], [0, 4, 8, 14, 19, 24, 28, 34]);
  const speechEnd = T.sayDelay + 20 + 8 * 500 + 50;
  const exitA = log.find(x => x[0] === 'exit' && x[1] === 'a')[2];
  assert.equal(exitA, speechEnd + T.after, 'exits after the voice ends plus a breath');
  assert.equal(tl.state, 'ended');
});

test('timeline: auto:false waits for Next; pause holds time; next/prev/goTo/replay', () => {
  const c = fakeClock();
  const { tl, log } = record(c, [{ id: 'a', hold: 500, auto: false }, { id: 'b', hold: 500 }, { id: 'c', hold: 500 }]);
  tl.play();
  c.advance(30000);
  assert.equal(tl.index, 0, 'waits on a');
  tl.next();
  assert.equal(tl.index, 1);
  c.advance(T.enter + 200);
  tl.pause();
  assert.equal(tl.state, 'paused');
  c.advance(60000);
  assert.equal(tl.index, 1, 'paused: no advance');
  tl.resume();
  c.advance(300 + T.exit + 5);
  assert.equal(tl.index, 2, 'resumed with the remaining hold');
  tl.prev(); assert.equal(tl.index, 1);
  assert.equal(log.filter(x => x[0] === 'beat').pop()[2], -1, 'prev enters backwards');
  tl.goTo(2); assert.equal(tl.index, 2);
  tl.replay(); assert.equal(tl.index, 0);
  tl.goTo(99); assert.equal(tl.index, 2, 'clamped');
  tl.toggle(); assert.equal(tl.state, 'paused');
  tl.toggle(); assert.equal(tl.state, 'playing');
  tl.destroy(); assert.equal(tl.state, 'idle'); assert.equal(c.pending, 0, 'no timers left behind');
});

test('timeline: a later script replaces only the beats after the one on screen', () => {
  const c = fakeClock();
  const { tl } = record(c, [{ id: 'intro', hold: 400 }, { id: 's0', hold: 400 }, { id: 's1', hold: 400 }, { id: 'close' }]);
  // Before Play: everything is replaced.
  assert.ok(tl.replaceUpcoming([{ id: 'intro', title: 'AI' }, { id: 's0', text: 'new' }, { id: 'close' }]));
  assert.equal(tl.beats.length, 3);
  tl.play();
  c.advance(T.enter + 100);                       // on 'intro'
  assert.ok(tl.replaceUpcoming([{ id: 'intro', title: 'AI 2' }, { id: 's0', text: 'newer' }, { id: 's1', text: 'extra' }, { id: 'close' }]));
  assert.equal(tl.beats[0].title, 'AI', 'the beat on screen stays');
  assert.deepEqual(tl.beats.map(b => b.id), ['intro', 's0', 's1', 'close']);
  assert.equal(tl.beats[1].text, 'newer');
  assert.equal(tl.replaceUpcoming([{ id: 'zzz' }]), false, 'unknown current beat: unchanged');
  assert.equal(tl.beats.length, 4);
});

test('timeline: muting mid-beat continues the caption silently from the same word', () => {
  const c = fakeClock(), m = mockSynth(c, { wordMs: 300 });
  const nar = S.storyCreateNarrator({ synth: m.synth, Utterance: Utt, timers: c.timers, now: c.now });
  const { tl, log } = record(c, [{ id: 'a', say: 'alpha beta gamma delta epsilon zeta' }, { id: 'b' }], { narrator: nar });
  tl.play();
  c.advance(T.sayDelay + 20 + 650);              // three words in
  tl.setMuted(true);
  assert.equal(tl.mode, 'timed');
  const after = log.filter(x => x[0] === 'word').map(x => x[2]);
  assert.ok(after.includes(11));
  c.advance(60000);
  const all = log.filter(x => x[0] === 'word').map(x => x[2]);
  assert.equal(all[all.length - 1], 31, 'reached the last word silently');
  assert.equal(tl.index, 1);
});

/* ---------- keys ---------- */
test('keys: Space, arrows, M, Esc (+ Home); not in fields or with modifiers', () => {
  const k = (key, extra = {}) => S.storyKeyAction({ key, target: { tagName: 'DIV' }, ...extra });
  assert.equal(k(' '), 'toggle');
  assert.equal(k('ArrowRight'), 'next');
  assert.equal(k('ArrowLeft'), 'prev');
  assert.equal(k('m'), 'mute'); assert.equal(k('M'), 'mute');
  assert.equal(k('Escape'), 'close');
  assert.equal(k('Home'), 'replay');
  assert.equal(k('x'), null);
  assert.equal(k(' ', { ctrlKey: true }), null);
  assert.equal(k('m', { target: { tagName: 'INPUT' } }), null);
  assert.equal(k('m', { target: { tagName: 'DIV', isContentEditable: true } }), null);
  const calls = [];
  const player = { toggle: () => calls.push('toggle'), next: () => calls.push('next'), prev: () => calls.push('prev'), toggleMute: () => calls.push('mute'), close: () => calls.push('close'), replay: () => calls.push('replay') };
  let prevented = 0;
  const ev = (key) => ({ key, target: { tagName: 'BODY' }, preventDefault: () => prevented++, stopPropagation() {} });
  for (const key of [' ', 'ArrowRight', 'ArrowLeft', 'M', 'Escape', 'Home']) assert.equal(S.storyHandleKey(ev(key), player), true);
  assert.equal(S.storyHandleKey(ev('q'), player), false);
  assert.deepEqual(calls, ['toggle', 'next', 'prev', 'mute', 'close', 'replay']);
  assert.equal(prevented, 6);
});
