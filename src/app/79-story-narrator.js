/* ElevenLabs playback with the existing browser narrator as a complete fallback.
   No credentials reach this module. Audio generation is always a local-server POST;
   pausing, seeking, speed, volume and replay operate on the saved audio. */
function storyCreateCloudNarrator(env) {
  env = env || {};
  const fallback = env.fallback || storyCreateNarrator(env);
  const AudioClass = env.Audio || (typeof Audio !== 'undefined' ? Audio : null);
  const AbortClass = env.AbortController || (typeof AbortController !== 'undefined' ? AbortController : null);
  const T = env.timers || { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id) };
  const request = env.request || (async (body, options) => {
    const r = await fetch('/api/narration/speech', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), signal: options.signal });
    const j = await r.json();
    if (!r.ok) { const e = new Error(j.error || 'ElevenLabs is unavailable.'); e.code = j.code; throw e; }
    return j;
  });
  let prefs = Object.assign({ rate: 1, volume: 1 }, env.prefs || {}), cur = null, media = null;
  const saved = new Map(), pending = new Map(), preparedFailures = new Map();
  const config = () => (env.getConfig ? env.getConfig() : prefs.narration) || {};
  const enabled = () => { const c = config(); return !!(AudioClass && c.provider === 'elevenlabs' && c.voiceId); };
  const audio = () => media || (media = new AudioClass());
  const configTag = c => JSON.stringify([c.provider, c.voiceId, c.modelId, c.scope]);
  const cancelledError = () => Object.assign(new Error('Voice preparation was cancelled.'), { name: 'AbortError' });
  const changedError = () => Object.assign(new Error('Voice settings changed during preparation.'), { code: 'NARRATION_SETTINGS_CHANGED' });
  const validResult = r => r && /^\/api\/narration\/audio\?id=[a-f0-9]{64}$/.test(r.url || '');
  function keep(map, key, value) {
    map.delete(key); map.set(key, value);
    if (map.size > 100) map.delete(map.keys().next().value);
  }
  function clipSpec(text, o, cfg) {
    const full = String(text || '').trim();
    if (!full || o.silent || (cfg.scope === 'highlights' && o.cloudVoice === false)) return null;
    const d = o.delivery;
    const delivery = d ? { tone: d.tone, pace: d.pace, pauseMs: d.pauseMs } : undefined;
    return { key: JSON.stringify([cfg.voiceId, cfg.modelId, full, delivery || null]), tag: configTag(cfg),
      body: { text: full, delivery, kind: o.voiceKind || o.kind } };
  }
  // Generation belongs to the clip, rather than to the player. Preparation and
  // playback can share it; cancelling one subscriber never aborts another's clip.
  function acquire(spec, signal) {
    if (signal?.aborted) return { promise: Promise.reject(cancelledError()), release() {} };
    if (saved.has(spec.key)) {
      const result = saved.get(spec.key); keep(saved, spec.key, result);
      return { promise: Promise.resolve(result), release() {} };
    }
    let entry = pending.get(spec.key);
    if (entry && entry.tag !== spec.tag) entry = null;
    if (!entry) {
      const abort = AbortClass ? new AbortClass() : null;
      entry = { users: new Set(), tag: spec.tag, done: false, timer: null, stop: null, promise: null };
      entry.promise = new Promise((resolve, reject) => {
        const finish = (error, result) => {
          if (entry.done) return;
          entry.done = true; T.clear(entry.timer);
          if (pending.get(spec.key) === entry) pending.delete(spec.key);
          if (error) { abort?.abort(); reject(error); }
          else { keep(saved, spec.key, result); preparedFailures.delete(spec.key); resolve(result); }
        };
        entry.stop = error => finish(error);
        entry.timer = T.set(() => finish(new Error('ElevenLabs took too long to respond.')), 50000);
        Promise.resolve().then(() => {
          if (entry.done) return null;
          if (configTag(config()) !== spec.tag) throw changedError();
          return request(spec.body, { signal: abort?.signal });
        }).then(result => {
          if (entry.done) return;
          if (configTag(config()) !== spec.tag) return finish(changedError());
          if (!validResult(result)) return finish(new Error('The voice audio was unavailable.'));
          finish(null, result);
        }, error => finish(error));
      });
      pending.set(spec.key, entry);
    }
    const user = {}, e = entry;
    let settled = false, rejectUser;
    const cleanup = () => { e.users.delete(user); signal?.removeEventListener('abort', release); };
    function release() {
      if (settled) return;
      settled = true; cleanup(); rejectUser(cancelledError());
      if (!e.done && !e.users.size) e.stop(cancelledError());
    }
    e.users.add(user);
    const promise = new Promise((resolve, reject) => {
      rejectUser = reject;
      e.promise.then(result => { if (!settled) { settled = true; cleanup(); resolve(result); } }, error => { if (!settled) { settled = true; cleanup(); reject(error); } });
    });
    signal?.addEventListener('abort', release, { once: true });
    return { promise, release };
  }
  async function prepare(beats, options) {
    options = options || {};
    const cfg = config(), tag = configTag(cfg), unique = new Map();
    if (enabled()) for (const beat of beats || []) {
      const spec = clipSpec(beat.say, beat, cfg);
      if (spec && !unique.has(spec.key)) unique.set(spec.key, spec);
    }
    const clips = Array.from(unique.values());
    const result = { total: clips.length, completed: 0, prepared: 0, cached: 0, failed: 0, cancelled: !!options.signal?.aborted, stale: false, errors: [] };
    // Failed clips fall back immediately for this prepared story. A later story
    // preparation is an explicit opportunity to retry a temporarily failed clip.
    for (const clip of clips) preparedFailures.delete(clip.key);
    const progress = () => { if (options.onProgress) options.onProgress(Object.assign({}, result, { errors: result.errors.slice() })); };
    const abort = AbortClass ? new AbortClass() : null;
    const signal = abort?.signal || options.signal;
    const cancel = () => { result.cancelled = true; abort?.abort(); };
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (result.cancelled) abort?.abort();
    let cursor = 0;
    progress();
    async function worker() {
      while (!result.cancelled && cursor < clips.length) {
        if (configTag(config()) !== tag) { result.stale = true; cancel(); break; }
        const spec = clips[cursor++], cached = saved.has(spec.key);
        const subscription = acquire(spec, signal);
        try {
          await subscription.promise;
          if (result.cancelled) break;
          if (cached) result.cached++; else result.prepared++;
          result.completed++;
        } catch (error) {
          if (error.code === 'NARRATION_SETTINGS_CHANGED') { result.stale = true; cancel(); }
          else if (error.name === 'AbortError' || result.cancelled) cancel();
          else {
            keep(preparedFailures, spec.key, error);
            result.failed++; result.completed++;
            result.errors.push({ message: error.message || 'The voice audio was unavailable.', code: error.code });
          }
        } finally { subscription.release(); progress(); }
      }
    }
    try { await Promise.all([worker(), worker()]); }
    finally { options.signal?.removeEventListener('abort', cancel); }
    if (configTag(config()) !== tag) { result.stale = true; result.cancelled = true; }
    return result;
  }

  function speak(text, o) {
    o = o || {};
    if (cur) cur.cancel();
    const full = String(text || '').trim(), cfg = config();
    if (!enabled() || o.silent || !full || (cfg.scope === 'highlights' && o.cloudVoice === false)) {
      cur = fallback.speak(full, o);
      return cur;
    }
    fallback.cancel();
    const a = audio(), tokens = storyTokens(full), times = storyWordTimes(full, 1);
    const scale = Math.max(1, storyReadMs(full, 1) - 300);
    const spec = clipSpec(full, o, cfg), key = spec.key;
    let subscription = null;
    let fallbackHandle = null, readyFallback = null, tickTimer = null, waitTimer = null, ready = false, failed = false, sought = false;
    const live = () => cur === h && !h.cancelled && !h.done;
    const clearTick = () => { T.clear(tickTimer); tickTimer = null; };
    const clearWait = () => { T.clear(waitTimer); waitTimer = null; };
    const detach = () => { a.onended = a.onerror = a.onloadedmetadata = a.onplaying = a.onwaiting = null; };
    const mode = (m) => { h.mode = m; if (o.onMode) o.onMode(m); };
    const finish = () => {
      if (!live()) return;
      clearTick(); clearWait(); detach(); h.done = true;
      if (cur === h) cur = null;
      if (o.onEnd) o.onEnd();
    };
    const h = {
      text: full, charIndex: Math.max(0, Number(o.fromChar) || 0), mode: 'loading', done: false, cancelled: false, paused: false,
      pause() {
        if (!live() || h.paused) return;
        h.paused = true; clearTick(); clearWait();
        if (fallbackHandle) fallbackHandle.pause();
        else { try { a.pause(); } catch (e) { /* audio not ready */ } }
      },
      resume() {
        if (!live() || !h.paused) return;
        h.paused = false;
        if (fallbackHandle) fallbackHandle.resume();
        else if (readyFallback) useFallback(readyFallback);
        else if (ready) playAudio();
        else { clearWait(); waitTimer = T.set(() => useFallback(new Error('ElevenLabs took too long to respond.')), 50000); }
      },
      cancel() {
        if (h.cancelled || h.done) return;
        h.cancelled = true; clearTick(); clearWait(); detach(); subscription?.release();
        if (fallbackHandle) fallbackHandle.cancel();
        try { a.pause(); } catch (e) { /* audio not ready */ }
        if (cur === h) cur = null;
      },
    };
    cur = h;
    function useFallback(error) {
      if (!live() || fallbackHandle) return;
      failed = true; clearTick(); clearWait(); detach(); subscription?.release();
      try { a.pause(); } catch (e) { /* no audio */ }
      if (h.paused) { readyFallback = error; return; }
      readyFallback = null;
      if (env.onFallback) env.onFallback(error);
      fallbackHandle = fallback.speak(full, Object.assign({}, o, {
        fromChar: h.charIndex,
        onWord(c) { if (!live()) return; h.charIndex = c; if (o.onWord) o.onWord(c); },
        onMode(m) { if (live()) mode(m); },
        onEnd: finish,
      }));
      h.mode = fallbackHandle.mode;
    }
    function tick() {
      if (!live() || h.paused || failed) return;
      const duration = Number(a.duration), position = Number(a.currentTime) || 0;
      const progress = Number.isFinite(duration) && duration > 0 ? position / duration : position * 1000 / scale;
      let k = 0;
      while (k + 1 < times.length && times[k + 1] / scale <= progress) k++;
      if (tokens[k] && tokens[k].start >= h.charIndex) {
        const c = tokens[k].start;
        if (c !== h.charIndex || position === 0) { h.charIndex = c; if (o.onWord) o.onWord(c); }
      }
      tickTimer = T.set(tick, 80);
    }
    function seek() {
      if (sought || !live() || !Number.isFinite(a.duration) || a.duration <= 0) return;
      sought = true;
      const k = Math.max(0, storyWordIndexAt(tokens, h.charIndex));
      if (h.charIndex > 0) { try { a.currentTime = Math.min(a.duration - 0.02, (times[k] || 0) / scale * a.duration); } catch (e) { /* not seekable yet */ sought = false; } }
    }
    function playAudio() {
      if (!live() || h.paused || failed) return;
      seek();
      a.volume = Math.max(0, Math.min(1, Number(prefs.volume) || 0));
      a.playbackRate = Math.max(0.5, Math.min(2, (Number(prefs.rate) || 1) * (Number(o.speed) || 1)));
      clearWait();
      waitTimer = T.set(() => useFallback(new Error('The saved voice audio could not start.')), 15000);
      try {
        Promise.resolve(a.play()).then(() => {
          if (!live() || failed) return;
          if (h.paused) { a.pause(); return; }
          clearWait(); mode('elevenlabs'); clearTick(); tick();
        }, useFallback);
      } catch (e) { useFallback(e); }
    }
    function load(result) {
      if (!live() || failed) return;
      clearWait();
      if (!validResult(result)) return useFallback(new Error('The voice audio was unavailable.'));
      a.onended = finish;
      a.onerror = () => useFallback(new Error('The saved voice audio could not play.'));
      a.onloadedmetadata = seek;
      a.onplaying = () => { if (live() && !h.paused) clearWait(); };
      a.onwaiting = () => { if (!live() || h.paused) return; clearWait(); waitTimer = T.set(() => useFallback(new Error('Voice playback paused unexpectedly.')), 12000); };
      a.src = result.url; a.preload = 'auto'; ready = true;
      if (!h.paused) playAudio();
    }
    mode('loading');
    if (saved.has(key)) load(saved.get(key));
    else if (preparedFailures.has(key)) useFallback(preparedFailures.get(key));
    else {
      waitTimer = T.set(() => useFallback(new Error('ElevenLabs took too long to respond.')), 50000);
      subscription = acquire(spec);
      subscription.promise.then(load, e => { if (live()) useFallback(e); });
    }
    return h;
  }
  return {
    speak, prepare, canPrepare: enabled,
    cancel() { if (cur) cur.cancel(); cur = null; fallback.cancel(); },
    pause() { if (cur) cur.pause(); }, resume() { if (cur) cur.resume(); },
    canSpeak: () => enabled() || fallback.canSpeak(), voices: () => fallback.voices(), voice: () => fallback.voice(),
    setPrefs(p) { prefs = Object.assign({}, prefs, p || {}); fallback.setPrefs(p); if (media) media.volume = Math.max(0, Math.min(1, Number(prefs.volume) || 0)); },
    get prefs() { return Object.assign({}, prefs); }, get current() { return cur && !cur.done && !cur.cancelled ? cur : null; },
    prime() {
      fallback.prime();
      if (!enabled()) return;
      // Unlock this same media element in the Play click, before generation finishes.
      const a = audio();
      if (cur && !cur.done && !cur.cancelled) return;
      a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      a.volume = 0;
      try { Promise.resolve(a.play()).then(() => { if (!cur) a.pause(); }, () => {}); } catch (e) { /* playback will use the regular fallback */ }
    },
  };
}

/** Give every storyboard the same voice cues and economical highlight selection. */
function storyVoiceBeats(beats, payload) {
  const sc = (payload && payload.script) || {}, kind = payload && payload.kind;
  const defaultTone = kind === 'evening' || kind === 'week' ? 'reflective' : 'warm';
  return (beats || []).map(b => {
    const sentence = (sc.sentences || []).find(s => s && s.text && (s.text === b.say || (b.id === 'reflect' && String(b.say || '').startsWith(s.text))));
    const opening = b.id === 'intro' || b.id === 'done' || (kind === 'week' && b.id === 'numbers');
    const closing = b.id === 'close' || b.id === 'outro' || (kind === 'week' && b.id === 'guided');
    const delivery = b.delivery || (sentence && sentence.delivery) || (opening ? sc.openingDelivery : closing ? sc.closingDelivery : null)
      || { tone: defaultTone, pace: kind === 'evening' ? 'slow' : 'steady', pauseMs: 250 };
    // Evening's one-line reflection is where its Claude-written sentences appear.
    return Object.assign({}, b, { delivery, kind, voiceKind: opening ? 'intro' : closing ? 'closing' : 'recap', cloudVoice: opening || closing || !!sentence || b.id === 'reflect' });
  });
}
