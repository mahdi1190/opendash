// Load the same classic scripts as the dashboard. Requests and media are fake;
// the browser fallback and player timeline run with their real implementation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = readFileSync(join(ROOT, 'src', 'app', '79-story-core.js'), 'utf8');
const narrator = readFileSync(join(ROOT, 'src', 'app', '79-story-narrator.js'), 'utf8');
const S = new Function(`"use strict";\n${core}\n${narrator}\nreturn { storyCreateCloudNarrator, storyCreateNarrator, storyCreateTimeline, storyVoiceBeats, storyTokens, storyWordTimes, storyReadMs, STORY_TIMING };`)();
const AUDIO_URL = '/api/narration/audio?id=' + 'a'.repeat(64);
const FULL = 'alpha beta gamma delta epsilon';
const CUE = { tone: 'warm', pace: 'steady', pauseMs: 350 };
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fakeClock() {
  let now = 0, sequence = 0;
  const queue = new Map();
  return {
    now: () => now,
    timers: {
      set(fn, ms) { const id = ++sequence; queue.set(id, { fn, at: now + Math.max(0, ms || 0), id }); return id; },
      clear(id) { queue.delete(id); },
    },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        let next = null;
        for (const x of queue.values()) if (x.at <= end && (!next || x.at < next.at || (x.at === next.at && x.id < next.id))) next = x;
        if (!next) break;
        queue.delete(next.id); now = next.at; next.fn();
      }
      now = end;
    },
    get pending() { return queue.size; },
  };
}
function harness({ config = {}, prefs = {}, play, duration = 10 } = {}) {
  const clock = fakeClock(), media = [], calls = [], fallbacks = [];
  const cfg = { provider: 'elevenlabs', voiceId: 'test-voice', modelId: 'eleven_flash_v2_5', scope: 'highlights', ...config };
  class FakeAudio {
    constructor() { this.duration = duration; this.currentTime = 0; this.playCalls = 0; this.pauseCalls = 0; this.volume = 1; this.playbackRate = 1; media.push(this); }
    set src(value) { this._src = value; this.currentTime = 0; }
    get src() { return this._src; }
    play() { this.playCalls++; return play ? play(this) : Promise.resolve(); }
    pause() { this.pauseCalls++; }
    emit(name) { const fn = this['on' + name]; if (fn) fn(); }
  }
  const browser = S.storyCreateNarrator({ timers: clock.timers, now: clock.now, prefs });
  const fallbackCalls = [], preferenceCalls = [];
  let primes = 0;
  const fallback = {
    speak(text, options) { const handle = browser.speak(text, options); fallbackCalls.push({ text, options, handle }); return handle; },
    cancel: () => browser.cancel(), pause: () => browser.pause(), resume: () => browser.resume(),
    canSpeak: () => browser.canSpeak(), voices: () => browser.voices(), voice: () => browser.voice(),
    setPrefs(p) { preferenceCalls.push(p); browser.setPrefs(p); }, prime() { primes++; browser.prime(); },
  };
  const cloud = S.storyCreateCloudNarrator({
    Audio: FakeAudio, AbortController, fallback, timers: clock.timers, now: clock.now, prefs,
    getConfig: () => cfg, onFallback: error => fallbacks.push(error),
    request(body, options) { const pending = deferred(); calls.push({ body, options, ...pending }); return pending.promise; },
  });
  return { cloud, clock, cfg, calls, media, fallbackCalls, preferenceCalls, fallbacks, get primes() { return primes; } };
}
async function loadFirst(h) {
  await flush();
  assert.equal(h.calls.length, 1);
  h.calls[0].resolve({ url: AUDIO_URL, cached: false });
  await flush();
  return h.media[0];
}

test('cloud narrator: muted and non-highlight beats stay local without any generation request', async () => {
  for (const [config, options, text = FULL] of [
    [{}, { silent: true }], [{}, { cloudVoice: false }], [{ provider: 'browser' }, {}], [{ voiceId: '' }, {}], [{}, {}, ''],
  ]) {
    const h = harness({ config });
    let ended = 0;
    const handle = h.cloud.speak(text, { ...options, onEnd: () => ended++ });
    await flush(); h.clock.advance(10000);
    assert.equal(h.calls.length, 0);
    assert.equal(h.media.length, 0);
    assert.equal(h.fallbackCalls.length, 1);
    assert.equal(handle.mode, 'timed');
    assert.equal(ended, 1, 'local timed captions still finish');
  }
  const all = harness({ config: { scope: 'all' } });
  all.cloud.speak(FULL, { cloudVoice: false });
  await flush();
  assert.equal(all.calls.length, 1, 'explicit all-beats setting includes supporting beats');
  all.cloud.cancel();
});

test('cloud narrator: pausing generation prevents audio from starting until Resume', async () => {
  const h = harness();
  const words = [], modes = []; let ended = 0;
  const handle = h.cloud.speak(FULL, { delivery: CUE, kind: 'morning', onWord: c => words.push(c), onMode: mode => modes.push(mode), onEnd: () => ended++ });
  await flush();
  assert.deepEqual(h.calls[0].body, { text: FULL, delivery: CUE, kind: 'morning' });
  handle.pause();
  h.calls[0].resolve({ url: AUDIO_URL }); await flush();
  assert.equal(h.media[0].playCalls, 0);
  assert.equal(handle.paused, true);
  h.clock.advance(60000);
  assert.equal(ended, 0); assert.deepEqual(words, []);
  handle.resume(); await flush();
  assert.equal(h.media[0].playCalls, 1);
  assert.equal(handle.mode, 'elevenlabs');
  assert.deepEqual(modes, ['loading', 'elevenlabs']);
  handle.pause(); const n = words.length;
  h.media[0].currentTime = 7; h.clock.advance(10000);
  assert.equal(words.length, n, 'pausing playback also stops caption ticks');
  handle.resume(); await flush();
  h.media[0].emit('ended'); h.media[0].emit('ended');
  assert.equal(ended, 1); assert.equal(handle.done, true);
  assert.equal(h.clock.pending, 0);
});

test('cloud narrator: a resumed pending generation retains a timeout and falls back', async () => {
  const h = harness();
  const handle = h.cloud.speak(FULL);
  await flush(); handle.pause(); h.clock.advance(60000);
  assert.equal(h.fallbackCalls.length, 0, 'paused narration remains paused');
  handle.resume(); h.clock.advance(50001); await flush();
  assert.equal(h.fallbackCalls.length, 1, 'a hung request cannot strand playback after Resume');
  assert.equal(handle.mode, 'timed');
  assert.equal(h.calls[0].options.signal.aborted, true);
  h.cloud.cancel(); assert.equal(h.clock.pending, 0);
});

test('cloud narrator: cancellation aborts generation and ignores its late result', async () => {
  const h = harness();
  let oldEnd = 0, oldWords = 0;
  const old = h.cloud.speak(FULL, { onEnd: () => oldEnd++, onWord: () => oldWords++ });
  await flush(); old.cancel();
  assert.equal(old.cancelled, true);
  assert.equal(h.calls[0].options.signal.aborted, true);
  const current = h.cloud.speak('A new story line.'); await flush();
  h.calls[0].resolve({ url: AUDIO_URL }); await flush();
  assert.equal(h.media[0].playCalls, 0, 'late old generation does not replace the new line');
  h.calls[1].resolve({ url: AUDIO_URL }); await flush();
  assert.equal(h.media[0].playCalls, 1); assert.equal(h.cloud.current, current);
  h.clock.advance(1000);
  assert.equal(oldEnd, 0); assert.equal(oldWords, 0);
  h.cloud.cancel(); assert.equal(h.clock.pending, 0);
});

test('cloud narrator: playback failure resumes the full browser text at the same character and suppresses stale events', async () => {
  const playing = deferred();
  const h = harness({ play: () => playing.promise });
  const words = []; let ended = 0;
  const handle = h.cloud.speak(FULL, { fromChar: 11, onWord: c => words.push(c), onEnd: () => ended++ });
  const audio = await loadFirst(h), staleEnd = audio.onended, staleError = audio.onerror;
  playing.reject(new Error('Playback blocked')); await flush();
  assert.equal(h.fallbackCalls.length, 1);
  assert.equal(h.fallbackCalls[0].text, FULL);
  assert.equal(h.fallbackCalls[0].options.fromChar, 11);
  assert.equal(handle.mode, 'timed');
  h.clock.advance(0);
  assert.deepEqual(words, [11], 'fallback offsets still refer to full text');
  const next = h.cloud.speak('Next line.', { silent: true });
  const count = words.length;
  staleEnd(); staleError(); h.clock.advance(10000);
  assert.equal(ended, 0); assert.equal(words.length, count);
  assert.equal(h.fallbackCalls.length, 2, 'stale errors never start another fallback');
  assert.equal(next.done, true);
  assert.equal(h.fallbacks.length, 1);
});

test('cloud narrator: a failed request while paused waits to start the browser fallback', async () => {
  const h = harness(); let ended = 0;
  const handle = h.cloud.speak(FULL, { onEnd: () => ended++ });
  await flush(); handle.pause();
  h.calls[0].reject(new Error('Quota reached')); await flush(); h.clock.advance(10000);
  assert.equal(h.fallbackCalls.length, 0); assert.equal(ended, 0);
  handle.resume();
  assert.equal(h.fallbackCalls.length, 1); assert.equal(handle.mode, 'timed');
  h.clock.advance(10000);
  assert.equal(ended, 1); assert.equal(h.cloud.current, null);
});

test('cloud narrator: invalid audio URLs and playback that never starts fall back safely', async () => {
  const invalid = harness();
  invalid.cloud.speak(FULL); await flush();
  invalid.calls[0].resolve({ url: 'https://unrelated.example/audio.mp3' }); await flush();
  assert.equal(invalid.media[0].playCalls, 0);
  assert.equal(invalid.fallbackCalls.length, 1);
  invalid.cloud.cancel();

  const playing = deferred(), stalled = harness({ play: () => playing.promise });
  const handle = stalled.cloud.speak(FULL);
  await loadFirst(stalled); stalled.clock.advance(15001);
  assert.equal(stalled.fallbackCalls.length, 1); assert.equal(handle.mode, 'timed');
  playing.resolve(); await flush();
  assert.equal(handle.mode, 'timed', 'late successful play promise cannot restart failed media');
  stalled.cloud.cancel(); assert.equal(stalled.clock.pending, 0);
});

test('cloud narrator: brief buffering recovers; persistent buffering falls back at the current word', async () => {
  const h = harness();
  const handle = h.cloud.speak(FULL), audio = await loadFirst(h);
  audio.currentTime = 5; h.clock.advance(80);
  const fromChar = handle.charIndex;
  assert.ok(fromChar > 0);
  audio.emit('waiting'); h.clock.advance(1000); audio.emit('playing'); h.clock.advance(12000);
  assert.equal(h.fallbackCalls.length, 0, 'recovered buffering clears its fallback deadline');
  audio.emit('waiting'); h.clock.advance(12001);
  assert.equal(h.fallbackCalls.length, 1);
  assert.equal(h.fallbackCalls[0].options.fromChar, fromChar);
  assert.equal(handle.mode, 'timed');
  h.cloud.cancel(); assert.equal(h.clock.pending, 0);
});

test('cloud narrator: replay reuses saved audio; changing delivery generates a new rendition', async () => {
  const h = harness(); let ended = 0;
  h.cloud.speak(FULL, { delivery: CUE, onEnd: () => ended++ });
  const audio = await loadFirst(h); audio.emit('ended');
  const replay = h.cloud.speak(FULL, { delivery: { ...CUE } }); await flush();
  assert.equal(h.calls.length, 1);
  assert.equal(h.media.length, 1); assert.equal(audio.playCalls, 2);
  assert.equal(replay.mode, 'elevenlabs'); assert.equal(ended, 1);
  h.cloud.speak(FULL, { delivery: { ...CUE, tone: 'gentle' } }); await flush();
  assert.equal(h.calls.length, 2, 'voice inflection belongs in the cache identity');
  h.cloud.cancel(); assert.equal(h.clock.pending, 0);
});

test('cloud narrator: volume, speed and seeking operate on audio without regenerating it', async () => {
  const h = harness({ prefs: { rate: 1.2, volume: 0.4 }, duration: NaN });
  const handle = h.cloud.speak(FULL, { fromChar: 11, speed: 1.25 });
  const audio = await loadFirst(h);
  assert.equal(audio.volume, 0.4); assert.equal(audio.playbackRate, 1.5);
  assert.equal(audio.currentTime, 0, 'seek waits for real media metadata');
  audio.duration = 12; audio.emit('loadedmetadata');
  const tokens = S.storyTokens(FULL), word = tokens.findIndex(t => t.start === 11);
  const expected = S.storyWordTimes(FULL, 1)[word] / Math.max(1, S.storyReadMs(FULL, 1) - 300) * 12;
  assert.equal(audio.currentTime, expected);
  h.cloud.setPrefs({ volume: 0.9, rate: 1.4 });
  assert.equal(audio.volume, 0.9); assert.deepEqual(h.preferenceCalls, [{ volume: 0.9, rate: 1.4 }]);
  handle.pause(); handle.resume(); await flush();
  assert.equal(audio.playbackRate, 1.75); assert.equal(h.calls.length, 1);
  h.cloud.setPrefs({ volume: 5 }); assert.equal(audio.volume, 1);
  h.cloud.cancel(); assert.equal(h.clock.pending, 0);
});

test('cloud narrator: browser unlock primes the same media element and does not request speech', async () => {
  const h = harness();
  h.cloud.prime(); await flush();
  assert.equal(h.primes, 1); assert.equal(h.media.length, 1);
  assert.match(h.media[0].src, /^data:audio\/wav;base64,/);
  assert.equal(h.calls.length, 0); assert.equal(h.media[0].volume, 0);
  h.cloud.speak(FULL); await loadFirst(h);
  assert.equal(h.media.length, 1); assert.equal(h.media[0].volume, 1);
  h.cloud.cancel();
});

test('cloud preparation: generates unique eligible clips in advance without playback, with two workers and progress', async () => {
  const h = harness(), progress = [];
  const beats = [
    { id: 'intro', say: 'A prepared introduction.', voiceKind: 'intro', delivery: CUE },
    { id: 'duplicate', say: 'A prepared introduction.', voiceKind: 'recap', delivery: { pauseMs: 350, pace: 'steady', tone: 'warm' } },
    { id: 'recap', say: 'A prepared recap.', kind: 'evening', voiceKind: 'recap', delivery: CUE },
    { id: 'close', say: 'A prepared goodbye.', voiceKind: 'closing', delivery: CUE },
    { id: 'detail', say: 'A local supporting detail.', cloudVoice: false },
    { id: 'silent', say: 'Muted narration.', silent: true },
    { id: 'empty', say: '' },
  ];
  assert.equal(h.cloud.canPrepare(), true);
  const preparing = h.cloud.prepare(beats, { onProgress: p => progress.push(p) });
  await flush();
  assert.equal(h.calls.length, 2, 'two requests run together; remaining requests stay queued');
  assert.equal(h.media.length, 0, 'preparation never creates or starts audio');
  assert.deepEqual(h.calls[0].body, { text: beats[0].say, delivery: CUE, kind: 'intro' });
  assert.equal(h.calls[1].body.kind, 'recap', 'voiceKind controls the server highlight scope');
  h.calls[0].resolve({ url: AUDIO_URL }); await flush();
  assert.equal(h.calls.length, 3);
  h.calls[1].resolve({ url: AUDIO_URL }); h.calls[2].resolve({ url: AUDIO_URL });
  const result = await preparing;
  assert.deepEqual(result, { total: 3, completed: 3, prepared: 3, cached: 0, failed: 0, cancelled: false, stale: false, errors: [] });
  assert.equal(progress[0].completed, 0); assert.equal(progress.at(-1).completed, 3);
  assert.equal(h.media.length, 0); assert.equal(h.fallbackCalls.length, 0); assert.equal(h.clock.pending, 0);
  for (const beat of beats.slice(0, 4)) {
    const handle = h.cloud.speak(beat.say, beat); await flush();
    assert.equal(handle.mode, 'elevenlabs');
    h.media[0].emit('ended');
  }
  assert.equal(h.calls.length, 3, 'intro, duplicate, recap and goodbye all play their prepared clips');
  const replay = await h.cloud.prepare(beats);
  assert.equal(replay.cached, 3); assert.equal(replay.prepared, 0); assert.equal(h.calls.length, 3);
});

test('cloud preparation: browser narration skips preparation; all or missing scope includes every spoken beat', async () => {
  const browser = harness({ config: { provider: 'browser' } });
  assert.equal(browser.cloud.canPrepare(), false);
  const skipped = await browser.cloud.prepare([{ say: FULL }]);
  assert.equal(skipped.total, 0); assert.equal(browser.calls.length, 0);
  for (const scope of ['all', undefined]) {
    const h = harness({ config: { scope } });
    const preparing = h.cloud.prepare([{ say: FULL, cloudVoice: false }]); await flush();
    assert.equal(h.calls.length, 1);
    h.calls[0].resolve({ url: AUDIO_URL });
    assert.equal((await preparing).prepared, 1);
    h.cloud.speak(FULL, { cloudVoice: false }); await flush();
    assert.equal(h.calls.length, 1, 'the prepared supporting clip is reused during playback');
    h.cloud.cancel();
  }
});

test('cloud preparation: playback shares an in-flight clip and preparation cancellation leaves playback alive', async () => {
  const h = harness(), abort = new AbortController();
  const preparing = h.cloud.prepare([{ say: FULL, delivery: CUE }, { say: 'Second clip.' }, { say: 'Still queued.' }], { signal: abort.signal });
  await flush();
  const handle = h.cloud.speak(FULL, { delivery: CUE }); await flush();
  assert.equal(h.calls.length, 2, 'playback joins its pending prepared clip');
  abort.abort(); await flush();
  assert.equal(h.calls[0].options.signal.aborted, false, 'another subscriber still needs the first clip');
  assert.equal(h.calls[1].options.signal.aborted, true, 'the otherwise unused pending clip is stopped');
  const result = await preparing;
  assert.equal(result.cancelled, true); assert.equal(result.completed, 0);
  assert.equal(h.calls.length, 2, 'cancellation stops queued generation');
  h.calls[0].resolve({ url: AUDIO_URL }); await flush();
  assert.equal(handle.mode, 'elevenlabs'); assert.equal(h.media[0].playCalls, 1);
  h.cloud.cancel(); assert.equal(h.clock.pending, 0);
});

test('cloud preparation: cancelling playback leaves a shared preparation request alive', async () => {
  const h = harness();
  h.cloud.speak(FULL, { delivery: CUE }); await flush();
  const preparing = h.cloud.prepare([{ say: FULL, delivery: CUE }]); await flush();
  assert.equal(h.calls.length, 1);
  h.cloud.cancel(); await flush();
  assert.equal(h.calls[0].options.signal.aborted, false);
  h.calls[0].resolve({ url: AUDIO_URL });
  assert.equal((await preparing).prepared, 1);
  assert.equal(h.media[0].playCalls, 0, 'a late result never restarts cancelled playback');
  h.cloud.speak(FULL, { delivery: CUE }); await flush();
  assert.equal(h.calls.length, 1); assert.equal(h.media[0].playCalls, 1);
  h.cloud.cancel(); assert.equal(h.clock.pending, 0);
});

test('cloud preparation: failures fall back for the prepared story without another paid attempt per beat', async () => {
  const h = harness(), error = Object.assign(new Error('Included allowance reached.'), { code: 'ELEVENLABS_QUOTA' });
  const preparing = h.cloud.prepare([{ say: FULL, delivery: CUE }, { say: 'Goodbye.' }]); await flush();
  h.calls[0].reject(error); h.calls[1].resolve({ url: AUDIO_URL });
  const result = await preparing;
  assert.equal(result.failed, 1); assert.equal(result.prepared, 1); assert.equal(result.completed, 2);
  assert.deepEqual(result.errors, [{ message: error.message, code: error.code }]);
  assert.equal(h.fallbacks.length, 0, 'preparation reports errors without starting a fallback voice');
  for (let i = 0; i < 3; i++) {
    const handle = h.cloud.speak(FULL, { delivery: CUE }); await flush();
    assert.equal(handle.mode, 'timed'); h.cloud.cancel();
  }
  assert.equal(h.calls.length, 2, 'failed prepared narration is not generated again on seek or replay');
  const retry = h.cloud.prepare([{ say: FULL, delivery: CUE }]); await flush();
  assert.equal(h.calls.length, 3, 'a later explicit story preparation can retry a temporary failure');
  h.calls[2].resolve({ url: AUDIO_URL }); assert.equal((await retry).prepared, 1);
  assert.equal(h.clock.pending, 0);
});

test('cloud preparation: cancellation before start and while pending stops queued clips and ignores late results', async () => {
  const h = harness(), abort = new AbortController(); abort.abort();
  assert.equal((await h.cloud.prepare([{ say: FULL }], { signal: abort.signal })).cancelled, true);
  assert.equal(h.calls.length, 0);
  const active = new AbortController();
  const preparing = h.cloud.prepare([{ say: FULL }, { say: 'Second.' }, { say: 'Third.' }], { signal: active.signal }); await flush();
  active.abort(); const result = await preparing;
  assert.equal(result.cancelled, true); assert.equal(h.calls.length, 2);
  assert.ok(h.calls.every(c => c.options.signal.aborted));
  h.calls[0].resolve({ url: AUDIO_URL }); h.calls[1].resolve({ url: AUDIO_URL }); await flush();
  h.cloud.speak(FULL); await flush();
  assert.equal(h.calls.length, 3, 'cancelled late clips cannot enter the saved cache');
  h.cloud.cancel(); assert.equal(h.clock.pending, 0);
});

test('cloud preparation: settings changes invalidate pending clips instead of caching the wrong voice', async () => {
  const h = harness();
  const preparing = h.cloud.prepare([{ say: FULL }, { say: 'Second.' }, { say: 'Third.' }]); await flush();
  h.cfg.voiceId = 'new-voice';
  h.calls[0].resolve({ url: AUDIO_URL }); await flush();
  const result = await preparing;
  assert.equal(result.stale, true); assert.equal(result.cancelled, true); assert.equal(result.failed, 0);
  assert.equal(h.calls.length, 2); assert.equal(h.calls[1].options.signal.aborted, true);
  h.calls[1].resolve({ url: AUDIO_URL }); await flush();
  h.cloud.speak(FULL); await flush();
  assert.equal(h.calls.length, 3, 'new voice requires its own audio');
  h.cloud.cancel(); h.cfg.voiceId = 'test-voice';
  h.cloud.speak(FULL); await flush();
  assert.equal(h.calls.length, 4, 'stale old-voice response was never saved');
  h.cloud.cancel(); assert.equal(h.clock.pending, 0);
});

test('cloud preparation: a scope change starts a fresh subscriber group for the same clip identity', async () => {
  const h = harness();
  const old = h.cloud.prepare([{ say: FULL }]); await flush();
  h.cfg.scope = 'all';
  const current = h.cloud.prepare([{ say: FULL }]); await flush();
  assert.equal(h.calls.length, 2, 'a new preparation never joins an older settings snapshot');
  h.calls[0].resolve({ url: AUDIO_URL });
  assert.equal((await old).stale, true);
  assert.equal(h.calls[1].options.signal.aborted, false, 'finishing the stale entry does not remove or cancel its replacement');
  h.calls[1].resolve({ url: AUDIO_URL });
  assert.equal((await current).prepared, 1);
  h.cloud.speak(FULL); await flush();
  assert.equal(h.calls.length, 2); assert.equal(h.cloud.current.mode, 'elevenlabs');
  h.cloud.cancel(); assert.equal(h.clock.pending, 0);
});

test('cloud preparation: hung generation times out and saved preparation cache stays bounded', async () => {
  const stalled = harness();
  const pending = stalled.cloud.prepare([{ say: FULL }]); await flush();
  stalled.clock.advance(50001); const failed = await pending;
  assert.equal(failed.failed, 1); assert.equal(stalled.calls[0].options.signal.aborted, true);
  assert.equal(stalled.clock.pending, 0);
  const h = harness();
  for (let i = 0; i < 101; i++) {
    const preparing = h.cloud.prepare([{ say: 'Saved clip ' + i }]); await flush();
    h.calls[i].resolve({ url: AUDIO_URL }); await preparing;
  }
  h.cloud.speak('Saved clip 100'); await flush();
  assert.equal(h.calls.length, 101, 'the newest prepared clip is retained');
  h.cloud.cancel(); h.cloud.speak('Saved clip 0'); await flush();
  assert.equal(h.calls.length, 102, 'older clips leave the bounded in-memory cache');
  h.cloud.cancel(); assert.equal(h.clock.pending, 0);
});

test('voice beats: Claude cues apply to spoken lines, with economical intros and closing highlights', () => {
  const opening = { ...CUE, tone: 'bright' }, closing = { ...CUE, tone: 'gentle' }, sentence = { ...CUE, tone: 'focused' };
  const beats = [{ id: 'intro', say: 'Good morning.' }, { id: 'detail', say: 'A calendar detail.' }, { id: 's0', say: 'Your focus today.' }, { id: 'reflect', say: 'A recap.' }, { id: 'close', say: 'Have a good day.' }];
  const result = S.storyVoiceBeats(beats, { kind: 'morning', script: { openingDelivery: opening, closingDelivery: closing, sentences: [{ text: 'Your focus today.', delivery: sentence }] } });
  assert.deepEqual(result.map(b => b.cloudVoice), [true, false, true, true, true]);
  assert.deepEqual(result.map(b => b.voiceKind), ['intro', 'recap', 'recap', 'recap', 'closing']);
  assert.equal(result[0].delivery, opening); assert.equal(result[2].delivery, sentence); assert.equal(result[4].delivery, closing);
  assert.ok(result.every(b => b.kind === 'morning'));
  assert.equal(beats[0].delivery, undefined, 'decorating beats does not mutate the builder output');
  const evening = S.storyVoiceBeats([{ id: 'done' }, { id: 'outro' }], { kind: 'evening' });
  assert.ok(evening.every(b => b.cloudVoice && b.delivery.pace === 'slow'));
});

test('voice beats: weekly numbers and guided closing use their script cues as cloud highlights', () => {
  const opening = { tone: 'reflective', pace: 'steady', pauseMs: 300 }, closing = { tone: 'gentle', pace: 'slow', pauseMs: 600 };
  const beats = [{ id: 'numbers', say: 'This week, three tasks done.' }, { id: 'wins', say: 'Your biggest win.' }, { id: 'guided', say: 'Pick a few outcomes. Ready for the guided review?' }];
  const result = S.storyVoiceBeats(beats, { kind: 'week', script: { openingDelivery: opening, closingDelivery: closing } });
  assert.deepEqual(result.map(b => b.cloudVoice), [true, false, true]);
  assert.deepEqual(result.map(b => b.voiceKind), ['intro', 'recap', 'closing']);
  assert.equal(result[0].delivery, opening); assert.equal(result[2].delivery, closing);
  const otherStory = S.storyVoiceBeats(beats, { kind: 'morning', script: { openingDelivery: opening, closingDelivery: closing } });
  assert.deepEqual(otherStory.map(b => b.cloudVoice), [false, false, false], 'weekly-specific IDs do not broaden another story\'s scope');
});

test('timeline: the script pause follows the audio end, respects speed and preserves explicit storyboard timing', async () => {
  for (const item of [
    { pauseMs: 250, expected: 250 },
    { pauseMs: 250, after: 900, expected: 900 },
    { pauseMs: 500, speed: 1.25, expected: 400 },
    { pauseMs: 5000, expected: 1200 },
    { pauseMs: undefined, expected: S.STORY_TIMING.after },
  ]) {
    const h = harness();
    const beat = { id: 'intro', say: FULL, enter: 0, sayDelay: 0, hold: 0, exit: 0, delivery: { ...CUE, pauseMs: item.pauseMs } };
    if (item.after !== undefined) beat.after = item.after;
    const tl = S.storyCreateTimeline({ beats: [beat, { id: 'last', hold: 0, enter: 0 }], narrator: h.cloud, timers: h.clock.timers, now: h.clock.now, speed: item.speed });
    tl.play(); h.clock.advance(0);
    const audio = await loadFirst(h);
    assert.equal(tl.index, 0);
    audio.emit('ended');
    h.clock.advance(item.expected - 1);
    assert.equal(tl.index, 0, 'the next beat waits for the remaining pause');
    h.clock.advance(1);
    assert.equal(tl.index, 1, 'the next beat starts at the expected pause boundary');
    tl.destroy(); assert.equal(h.clock.pending, 0);
  }
});

test('timeline: pause, speed, mute, next, previous and replay preserve cloud narration controls', async () => {
  const h = harness();
  const beats = S.storyVoiceBeats([{ id: 'intro', say: FULL, enter: 0, sayDelay: 0, hold: 0, auto: false, delivery: CUE }, { id: 'detail', say: 'Supporting details.', enter: 0, sayDelay: 0, hold: 0, auto: false }], { kind: 'morning' });
  const tl = S.storyCreateTimeline({ beats, narrator: h.cloud, timers: h.clock.timers, now: h.clock.now });
  tl.play(); h.clock.advance(0); await flush();
  assert.deepEqual(h.calls[0].body, { text: FULL, delivery: CUE, kind: 'intro' }, 'timeline forwards delivery and server highlight scope metadata');
  tl.pause(); assert.equal(tl.state, 'paused');
  h.calls[0].resolve({ url: AUDIO_URL }); await flush();
  assert.equal(h.media[0].playCalls, 0);
  tl.resume(); await flush(); assert.equal(tl.mode, 'elevenlabs');
  tl.setSpeed(1.25); await flush();
  assert.equal(h.media[0].playbackRate, 1.25); assert.equal(h.calls.length, 1);
  tl.setMuted(true); assert.equal(tl.mode, 'timed');
  tl.setMuted(false); await flush(); assert.equal(tl.mode, 'elevenlabs');
  tl.next(); h.clock.advance(0); await flush();
  assert.equal(tl.index, 1); assert.equal(tl.mode, 'timed'); assert.equal(h.calls.length, 1);
  tl.prev(); h.clock.advance(0); await flush();
  assert.equal(tl.index, 0); assert.equal(tl.mode, 'elevenlabs'); assert.equal(h.calls.length, 1);
  tl.replay(); h.clock.advance(0); await flush();
  assert.equal(tl.index, 0); assert.equal(h.calls.length, 1);
  tl.destroy(); assert.equal(tl.state, 'idle'); assert.equal(h.cloud.current, null); assert.equal(h.clock.pending, 0);
});
