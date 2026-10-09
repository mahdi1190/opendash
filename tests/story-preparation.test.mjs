// The real story engine controls preparation, AI rewriting and the player. A
// deliberately small DOM and deferred narrator make the before-Play boundary
// observable without rendering a scene or contacting a speech provider.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const core = readFileSync(new URL('../src/app/79-story-core.js', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../src/app/79-story-engine.js', import.meta.url), 'utf8');
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function script(version = 'built-in') {
  return { source: version === 'built-in' ? 'fallback' : 'ai', model: 'test-model', headline: 'A quiet day', opening: `${version} opening`, closing: `${version} closing`, sentences: [{ text: `${version} recap` }] };
}
function payload(kind = 'morning', version = 'built-in', ai = 'cached') {
  return { kind, data: {}, script: script(version), ai: { state: ai } };
}
function harness({ provider = 'elevenlabs', muted = false, ai = false, aiState = 'cached', hidden = false } = {}) {
  const storage = new Map(), prepares = [], timelines = [], requests = [], posts = [], primes = [], toasts = [], listeners = new Map();
  let timerId = 0;
  const timers = new Map();
  class Element {
    constructor() {
      this.dataset = {}; this.attributes = {}; this.children = []; this.nodes = new Map(); this.events = new Map(); this.style = { setProperty() {}, getPropertyValue: () => '' };
      this.hidden = false; this.disabled = false; this.isConnected = true; this.classes = new Set();
      this.classList = { add: (...xs) => xs.forEach(x => this.classes.add(x)), remove: (...xs) => xs.forEach(x => this.classes.delete(x)), contains: x => this.classes.has(x), toggle: (x, yes) => { if (yes ?? !this.classes.has(x)) this.classes.add(x); else this.classes.delete(x); } };
    }
    set className(text) { this.classes = new Set(String(text).split(/\s+/).filter(Boolean)); }
    get className() { return [...this.classes].join(' '); }
    setAttribute(k, value) { this.attributes[k] = String(value); }
    getAttribute(k) { return this.attributes[k] ?? null; }
    removeAttribute(k) { delete this.attributes[k]; }
    querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Element()); return this.nodes.get(selector); }
    querySelectorAll() { return []; }
    appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
    remove() { this.isConnected = false; }
    focus() { document.activeElement = this; }
    addEventListener(type, callback) { const callbacks = this.events.get(type) || []; callbacks.push(callback); this.events.set(type, callbacks); }
    dispatch(type, event = {}) { for (const callback of this.events.get(type) || []) callback(event); }
    insertAdjacentHTML() {}
  }
  const document = {
    hidden, body: new Element(), documentElement: new Element(), activeElement: null,
    createElement: () => new Element(), querySelector: () => null,
    addEventListener(type, callback) { listeners.set(type, callback); }, removeEventListener(type) { listeners.delete(type); },
  };
  const config = { onboardedAt: '2026-10-01', weekStart: 'Mon', brief: { story: { voice: !muted, narration: { provider, voiceId: 'voice_test', modelId: 'eleven_flash_v2_5', scope: 'all', monthlyLimit: 18000 } } } };
  const narrator = {
    canSpeak: () => true,
    canPrepare: () => config.brief.story.narration.provider === 'elevenlabs' && !!config.brief.story.narration.voiceId,
    setPrefs() {}, voices: () => [], prime: () => primes.push(true), cancel() {},
    prepare(beats, options = {}) {
      const work = deferred(); const total = beats.filter(b => b.say).length;
      const call = { beats, options, ...work, total }; prepares.push(call);
      options.onProgress?.({ total, completed: 0, prepared: 0, cached: 0, failed: 0, cancelled: false, stale: false });
      return work.promise;
    },
  };
  const box = {
    console, AbortController, document, navigator: { userActivation: { isActive: false } }, APP_CONFIG: config, Motion: { prefersReduced: () => true },
    window: { addEventListener() {}, speechSynthesis: null, SpeechSynthesisUtterance: null, Motion: { prefersReduced: () => true } },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, value) => storage.set(k, String(value)), removeItem: k => storage.delete(k) },
    setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id), setInterval: () => ++timerId,
    requestAnimationFrame: fn => { fn(); return ++timerId; }, performance: { now: () => 0 },
    todayStrSafe: () => '2026-10-09', Clock: { now: () => 0, parts: () => ({ h: 9, dow: 5 }) },
    _serverAvailable: true, AI_AVAILABLE: ai, briefPrefs: () => ({ ai, eveningHour: 17 }), connHas: () => ai,
    registerCommand() {}, icon: () => '', esc: text => String(text || ''), escAttr: text => String(text || ''), toast: (...args) => toasts.push(args),
    _bfJson: async url => { requests.push(url); return payload(new URL(url, 'http://local.test').searchParams.get('kind') || 'morning', 'built-in', aiState); },
    _bfPost: (url, body) => { const work = deferred(); posts.push({ url, body, ...work }); return work.promise; },
    storyCreateCloudNarrator: () => narrator,
  };
  vm.createContext(box); vm.runInContext(core + '\n' + engine, box);
  box.testNarrator = narrator; box.testTimelines = timelines;
  vm.runInContext(`
    _stBg = () => {};
    _stCtx = p => ({kind:p.kind, data:p.data, script:p.script, ai:p.ai, prefs:storyPrefs(), kit:STORY_KIT});
    _stPaintProgress = () => {};
    _stPaintPoster = () => {};
    _stSrcBadge = () => {};
    _stSyncControls = () => {};
    _stOnBeat = () => {};
    _stOnState = () => {};
    _story.narrator = testNarrator;
    for (const kind of ['morning','evening','week']) storyRegisterBuilder(kind, ctx => [
      {id:'intro', type:'title', say:ctx.script.opening},
      {id:'recap', type:'sentence', say:ctx.script.sentences[0].text},
      {id:'outro', type:'closing', say:ctx.script.closing}
    ]);
    storyCreateTimeline = options => {
      const tl = {
        options, state:'idle', index:-1, playCalls:0, replacements:[],
        play() { this.playCalls++; this.state='playing'; this.index=0; options.hooks.onBeat(0, options.beats[0], 1); },
        pause() {this.state='paused'}, toggle() {this.state === 'playing' ? this.pause() : this.play()},
        destroy() {this.destroyed=true; this.state='destroyed'},
        replaceUpcoming(beats) {this.replacements.push(beats)}, replay() {this.play()},
        refresh() {}, setMuted(value) {this.muted=value}, setSpeed() {}, next() {}, prev() {}, goTo() {}
      };
      testTimelines.push(tl); return tl;
    };
  `, box);
  function finish(index = prepares.length - 1, extra = {}) {
    const call = prepares[index];
    const result = { total: call.total, completed: call.total, prepared: call.total, cached: 0, failed: 0, cancelled: false, stale: false, ...extra };
    call.options.onProgress?.(result); call.resolve(result);
  }
  return { box, Story: box.window.Story, config, storage, prepares, timelines, requests, posts, primes, toasts, document, listeners, finish,
    root: () => vm.runInContext('_story.root', box), state: () => box.window.Story.state(), beats: () => vm.runInContext('_story.beats', box) };
}

test('all voice clips finish before the intro timeline or scene starts', async () => {
  const h = harness(); const opened = h.Story.open('morning', { autoplay: true }); await flush();
  assert.equal(h.prepares.length, 1); assert.equal(h.prepares[0].beats.length, 3);
  assert.equal(h.timelines.length, 0); assert.equal(h.root().classList.contains('is-playing'), false);
  assert.equal(h.state().preparing, true);
  h.finish(); await opened; await flush();
  assert.equal(h.timelines.length, 1); assert.equal(h.timelines[0].playCalls, 1);
  assert.equal(h.state().preparing, false); assert.equal(h.root().classList.contains('is-playing'), true);
});

test('repeated autoplay requests while preparing share work and start only one timeline', async () => {
  const h = harness(); const opened = h.Story.open('morning', { autoplay: true }); await flush();
  h.box.storyPlay(); h.box.storyPlay(); h.Story.open('morning', { autoplay: true }); await flush();
  assert.equal(h.prepares.length, 1); assert.equal(h.timelines.length, 0);
  h.finish(); await opened; await flush();
  assert.equal(h.timelines.length, 1); assert.equal(h.timelines[0].playCalls, 1);
});

test('cancelling Play while clips prepare keeps the ready poster still until a new Play request', async () => {
  const h = harness(); const opened = h.Story.open('morning', { autoplay: true }); await flush();
  h.Story.toggle(); await flush();
  h.finish(); await opened; await flush();
  assert.equal(h.timelines.length, 0);
  h.Story.play(); await flush();
  assert.equal(h.prepares.length, 1, 'ready clips are reused');
  assert.equal(h.timelines.length, 1); assert.equal(h.timelines[0].playCalls, 1);
});

test('closing a preparing story aborts its work and a late completion cannot play a reopened story', async () => {
  const h = harness(); const first = h.Story.open('morning', { autoplay: true }); await flush();
  const signal = h.prepares[0].options.signal; h.Story.close();
  assert.equal(signal.aborted, true);
  const next = h.Story.open('evening', { autoplay: false }); await flush();
  assert.equal(h.prepares.length, 2, 'the next poster begins its own preparation');
  h.finish(0); await first; await flush();
  assert.equal(h.timelines.length, 0); assert.equal(h.state().kind, 'evening');
  assert.equal(h.root().classList.contains('is-playing'), false);
  h.finish(1); await next; await flush();
  assert.equal(h.timelines.length, 0, 'finishing the next poster does not invent a Play request');
  h.Story.close();
});

test('muting during preparation starts captions without waiting for remaining voice generation', async () => {
  const h = harness(); const opened = h.Story.open('evening', { autoplay: true }); await flush();
  h.Story.toggleMute(); await flush();
  assert.equal(h.timelines.length, 1); assert.equal(h.timelines[0].options.muted, true);
  assert.equal(h.prepares[0].options.signal.aborted, true);
  h.finish(0, { cancelled: true }); await opened; await flush();
  assert.equal(h.timelines.length, 1); assert.equal(h.timelines[0].playCalls, 1);
});

test('hiding the tab before clips finish prevents a late autoplay', async () => {
  const h = harness(); const opened = h.Story.open('morning', { autoplay: true }); await flush();
  h.document.hidden = true; h.listeners.get('visibilitychange')();
  h.finish(); await opened; await flush();
  assert.equal(h.timelines.length, 0);
  h.document.hidden = false; h.listeners.get('visibilitychange')(); await flush();
  assert.equal(h.timelines.length, 0, 'returning to the tab does not play the story automatically');
  h.Story.play(); await flush(); assert.equal(h.timelines.length, 1);
});

test('Claude finishes the script before voice preparation and the final words are the ones played', async () => {
  const h = harness({ ai: true, aiState: 'missing' }); const opened = h.Story.open('morning', { autoplay: true }); await flush();
  assert.equal(h.posts.length, 1); assert.equal(h.prepares.length, 0); assert.equal(h.timelines.length, 0);
  h.posts[0].resolve({ script: script('Claude') }); await flush();
  assert.equal(h.prepares.length, 1); assert.equal(h.prepares[0].beats[0].say, 'Claude opening');
  h.finish(); await opened; await flush();
  assert.equal(h.timelines[0].options.beats[0].say, 'Claude opening');
});

test('repeated Rewrite clicks while Claude is already writing cannot replace the pending script job', async () => {
  const h = harness({ ai: true, aiState: 'missing' }); const opened = h.Story.open('morning', { autoplay: true }); await flush();
  h.root().querySelector('.st-regen').dispatch('click'); h.root().querySelector('.st-regen').dispatch('click'); await flush();
  assert.equal(h.posts.length, 1); assert.equal(h.prepares.length, 0);
  h.posts[0].resolve({ script: script('Claude') }); await flush();
  assert.equal(h.prepares.length, 1); assert.equal(h.prepares[0].beats[0].say, 'Claude opening');
  h.finish(); await opened; await flush(); assert.equal(h.timelines.length, 1);
});

test('a registered story also waits for its own initial Claude script before preparing clips', async () => {
  const h = harness(); const writing = deferred();
  h.Story.registerKind('money', { label: 'Money story', load: async () => payload('money', 'built-in', 'missing'), ai: () => writing.promise });
  const opened = h.Story.open('money', { autoplay: true }); await flush();
  assert.equal(h.prepares.length, 0); assert.equal(h.timelines.length, 0);
  writing.resolve(script('money Claude')); await flush();
  assert.equal(h.prepares.length, 1); assert.equal(h.prepares[0].beats[0].say, 'money Claude opening');
  h.finish(); await opened; await flush();
  assert.equal(h.timelines[0].options.beats[0].say, 'money Claude opening');
});

test('rewriting a ready poster invalidates its old clips before Play', async () => {
  const h = harness({ ai: true }); const opened = h.Story.open('morning', { autoplay: false }); await flush();
  h.finish(); await opened; await flush();
  assert.equal(h.timelines.length, 0);
  const rewrite = h.box._stMaybeAi(true); await flush();
  h.posts[0].resolve({ script: script('rewritten') }); await rewrite; await flush();
  h.Story.play(); await flush();
  assert.equal(h.prepares.length, 2); assert.equal(h.prepares[1].beats[0].say, 'rewritten opening');
  assert.equal(h.timelines.length, 0, 'clips from the previous words cannot release the new intro');
  h.finish(1); await flush(); assert.equal(h.timelines.length, 1);
});

test('an explicit Claude rewrite during cloud playback is held for replay rather than replacing ready clips', async () => {
  const h = harness({ ai: true }); const opened = h.Story.open('morning', { autoplay: true }); await flush();
  h.finish(); await opened; await flush();
  const rewrite = h.box._stMaybeAi(true); await flush();
  h.posts[0].resolve({ script: script('new Claude') }); await rewrite; await flush();
  assert.equal(h.timelines[0].replacements.length, 0);
  assert.equal(h.timelines[0].options.beats[0].say, 'built-in opening');
  assert.equal(h.prepares.length, 1, 'rewriting does not generate a second live clip sequence');
  // The Replay card is another entry point; it must use the same preparation
  // gate as keyboard and toolbar Replay rather than replaying the old timeline.
  const frame = { type: h.document.createElement('div'), cards: h.document.createElement('div') };
  const closing = vm.runInContext('STORY_BEAT_TYPES.closing', h.box);
  closing(frame, { text: 'All done', say: 'All done' }, {});
  frame.cards.children[0].children[1].dispatch('click'); await flush();
  assert.equal(h.prepares.length, 2, 'replay prepares the replacement words');
  assert.equal(h.prepares[1].beats[0].say, 'new Claude opening');
  assert.equal(h.timelines.length, 1, 'the new intro waits for its new clips');
  h.finish(1); await flush();
  assert.equal(h.timelines.length, 2);
  assert.equal(h.timelines[1].options.beats[0].say, 'new Claude opening');
});

test('browser voice and muted stories start immediately without cloud preparation', async () => {
  for (const options of [{ provider: 'browser' }, { muted: true }]) {
    const h = harness(options); await h.Story.open('morning', { autoplay: true }); await flush();
    assert.equal(h.prepares.length, 0); assert.equal(h.timelines.length, 1); assert.equal(h.timelines[0].playCalls, 1);
  }
});

test('background prewarm stays quiet and respects provider, mute and tab visibility', async () => {
  for (const options of [{ provider: 'browser' }, { muted: true }, { hidden: true }]) {
    const h = harness(options); await h.Story.prefetch(); await flush();
    assert.equal(h.prepares.length, 0); assert.equal(h.timelines.length, 0); assert.equal(h.primes.length, 0);
  }
});

test('background prewarm deduplicates concurrent and repeated requests without starting a scene', async () => {
  const h = harness(); const first = h.Story.prefetch(); const second = h.Story.prefetch(); await flush();
  assert.equal(h.prepares.length, 1); assert.equal(h.timelines.length, 0); assert.equal(h.primes.length, 0);
  h.finish(); await first; await second; await h.Story.prefetch(); await flush();
  assert.equal(h.prepares.length, 1, 'the same story and voice configuration stays warmed');
  assert.equal(h.timelines.length, 0); assert.equal(h.Story.isOpen(), false);
});
