/* ============================================================
   STORY ENGINE (owner: Story engine). The full-screen story player for the
   Morning brief, Finish the day and the Weekly review: "your day in three
   sentences", read out, with kinetic type, scenes, people and chips.
   Pure timing/narration pieces live in 79-story-core.js (tested in Node).

   API for story builders (window.Story is the same object):
     storyOpen(kind, {autoplay, at})    kind 'morning'|'evening'|'week'; fetches
                                        GET /api/story?kind= -> {data, script, ai}; shows
                                        the Play poster (or plays at once with autoplay)
                                        Every entry point opens this big full-screen player
                                        (user request, 4 Oct: never a small box on Home).
     storyClose()  storyIsOpen()
     storyRegisterBuilder(kind, build)  build(ctx) -> [beat...]  (replaces the default)
     storyRegisterBeatType(type, render) render(frame, beat, ctx) -> cleanup fn | void
         frame = {scene, type, cards, root}: one fresh element per layer for this beat
     STORY_KIT  kinetic type + chips: sentenceHtml, driftHtml, countUp, typeText,
                sweepHtml, chipHtml, chipsHtml, sceneHtml, avatarHtml, list, fmtDay
   A beat (declarative; everything optional except id):
     { id: 's0' (stable: a later AI script replaces beats AFTER the one on screen by id),
       type: 'title'|'sentence'|'stats'|'timeline'|'people'|'list'|'closing'|<registered>,
       say: 'narration' (read out; '' = silent), caption: 'shown under it' (default say),
       text + entities (sentence), title/overline/sub (title), items (stats/list),
       scene: 'meeting' | {type, size} | null,  chips: [{type, ref}],
       bg: {cond, tod, palette, mood},  className, hold, enter, exit, after, auto }
   ctx = {kind, data, script, ai, prefs, kit, reduced, person(id), event(id), task(id),
          entity(type, ref), names(list), view}
   Stage layers (z order): .st-bg (sky + palette tint) .st-scene .st-type .st-cards,
   then caption, controls and progress. Phase classes on each frame:
   .is-enter -> .is-hold -> .is-exit. Reduced motion / animations off: .st-still
   (static, instant text). The tab hidden: playback pauses. ElevenLabs clips are
   prepared before the timeline starts; browser speech and silent captions are fallbacks.
   ============================================================ */
const STORY_BUILDERS = {};
const STORY_BEAT_TYPES = {};
const STORY_VIEWS = { morning: 'home', evening: 'home:evening', week: 'home:week' };
const STORY_LABELS = { morning: 'Morning story', evening: 'Finish the day', week: 'Week in review' };
/* Kinds whose data the page builds itself (the money story, src/finance/28-money-story.js):
   storyRegisterKind(kind, {label, view, dark, load(opts) -> payload {kind, data, script, ai},
     ai?(payload, {regenerate}) -> script | null, details?(payload)}). The built-in kinds can't be replaced.
   Story.open(kind, {variant}) with another variant (a different period) is a new story, not a re-click. */
const STORY_SOURCES = {};
function storyRegisterKind(kind, src) {
  if (!kind || !src || typeof src.load !== 'function' || (STORY_VIEWS[kind] && !STORY_SOURCES[kind])) return false;
  STORY_SOURCES[kind] = src; STORY_VIEWS[kind] = src.view || 'home'; STORY_LABELS[kind] = src.label || 'Story';
  return true;
}
const _story = {
  open: false, kind: null, root: null, tl: null, narrator: null, payload: null, beats: [], frames: [], cleanups: [],
  words: [], capWords: [], hot: new Set(), autoPaused: false, seq: 0, aiBusy: false, lastFocus: null, keyFn: null, ui: null,
  voicePreparation: null, playRequest: null, nextVoiceBeats: null, scriptJob: null,
};
let _storyVoiceWarm = null;
const _storyVoiceWarmKeys = new Map();
function storyRegisterBuilder(kind, build) { if (kind && typeof build === 'function') STORY_BUILDERS[kind] = build; }
function storyRegisterBeatType(type, render) { if (type && typeof render === 'function') STORY_BEAT_TYPES[type] = render; }
function storyIsOpen() { return _story.open; }

/* ---------- inline control icons (Lucide geometry, ISC; trusted constants) ---------- */
const _ST_SVG = {
  play: '<path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5Z"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>',
  prev: '<path d="M18 19.5 9 12l9-7.5v15Z"/><path d="M6 5v14"/>',
  next: '<path d="m6 4.5 9 7.5-9 7.5v-15Z"/><path d="M18 5v14"/>',
  vol: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mute: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m22 9-6 6M16 9l6 6"/>',
};
function _stIcon(name, cls) { return `<svg class="i st-i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${_ST_SVG[name] || ''}</svg>`; }

/* ---------- settings ---------- */
function storyPrefs() {
  const s = (APP_CONFIG && APP_CONFIG.brief && APP_CONFIG.brief.story) || {};
  let ui = {};
  try { ui = JSON.parse(localStorage.getItem('dashboard-story-ui') || '{}') || {}; } catch (e) { ui = {}; }
  const num = (v, d) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : d);
  return {
    autoOpen: s.autoOpen !== false, voice: s.voice !== false, voiceName: s.voiceName || '',
    rate: num(s.rate, 1), pitch: num(s.pitch, 1),
    // The player's volume slider (this browser) wins over the Settings default.
    volume: Math.max(0, Math.min(1, num(ui.volume, num(s.volume, 1)))),
    speed: STORY_SPEEDS.includes(Number(ui.speed)) ? Number(ui.speed) : STORY_SPEEDS.includes(Number(s.speed)) ? Number(s.speed) : 1,
    // This session's mute (the M key) wins over the default until the next day.
    muted: ui.mutedFor === todayStrSafe() ? !!ui.muted : s.voice === false,
    model: s.model || 'claude-haiku-4-5',
    narration: s.narration || { provider: 'browser', scope: 'all' },
  };
}
function _stSaveUi(patch) {
  try {
    const cur = JSON.parse(localStorage.getItem('dashboard-story-ui') || '{}') || {};
    localStorage.setItem('dashboard-story-ui', JSON.stringify(Object.assign(cur, patch, patch.muted !== undefined ? { mutedFor: todayStrSafe() } : {})));
  } catch (e) { /* private mode */ }
}
function storyReduced() { return typeof animEnabled === 'function' ? !animEnabled() : !!(window.Motion && Motion.prefersReduced()); }
function _stSynth() { return typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function' ? window.speechSynthesis : null; }
function storyNarrator() {
  if (!_story.narrator) {
    const p = storyPrefs();
    const prefs = { voiceName: p.voiceName, rate: p.rate, pitch: p.pitch, volume: p.volume };
    const browser = storyCreateNarrator({ synth: _stSynth(), Utterance: window.SpeechSynthesisUtterance || null, prefs });
    _story.narrator = typeof storyCreateCloudNarrator === 'function' ? storyCreateCloudNarrator({
      fallback: browser, prefs, getConfig: () => storyPrefs().narration,
      onFallback: (e) => {
        if (!_story.open || _story.voiceFallback) return;
        _story.voiceFallback = true;
        toast(((e && e.message) || 'ElevenLabs is unavailable.') + ' Using the browser voice.', { kind: 'note' });
      },
    }) : browser;
  } else {
    const p = storyPrefs();
    _story.narrator.setPrefs({ voiceName: p.voiceName, rate: p.rate, pitch: p.pitch, volume: p.volume });
  }
  return _story.narrator;
}
if (typeof window !== 'undefined') window.addEventListener('story-voice-settings-changed', (e) => {
  const s = e.detail;
  if (!s || !APP_CONFIG) return;
  if (!APP_CONFIG.brief) APP_CONFIG.brief = {};
  if (!APP_CONFIG.brief.story) APP_CONFIG.brief.story = {};
  APP_CONFIG.brief.story.narration = { provider: s.provider, voiceId: s.voiceId, modelId: s.modelId, scope: s.scope, monthlyLimit: s.monthlyLimit };
  _story.voiceFallback = false;
  _stCancelVoicePreparation();
  if (_storyVoiceWarm) _storyVoiceWarm.controller.abort();
  _storyVoiceWarmKeys.clear();
  if (_story.narrator) storyNarrator();
  if (_story.tl) _story.tl.refresh();
  else if (_story.open && _story.payload) _stPrepareVoice();
});
/* Voices load late in Chromium: refresh the Settings picker when they arrive. */
if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.speechSynthesis.addEventListener === 'function') {
  window.speechSynthesis.addEventListener('voiceschanged', () => { const sel = document.querySelector('[data-story-voices]'); if (sel && typeof _stFillVoices === 'function') _stFillVoices(sel); });
}

/* ---------- kinetic typography kit ---------- */
function _stDelay(i, step, base) { return `--i:${i};--st-step:${step}ms;--st-d0:${base}ms`; }
const STORY_KIT = {
  /** A sentence as word (or phrase) spans; entities wrapped in .st-ent[data-type][data-key]. */
  sentenceHtml(text, entities, o) {
    o = o || {};
    const step = Number.isFinite(o.step) ? o.step : (o.mode === 'phrase' ? 220 : 70), base = Number(o.delay) || 0;
    let n = 0, out = '';
    /** Word spans; `tail` (punctuation right after an entity) goes inside the last word so it never wraps alone. */
    const words = (seg, tail) => {
      let html = '';
      const s = seg.text;
      const re = /(\s+)|(\S+)/g; let m;
      while ((m = re.exec(s))) {
        if (m[1]) { html += m[1]; continue; }
        const last = tail && re.lastIndex >= s.length;
        // Phrase mode: the words of one phrase share a delay; punctuation starts the next.
        html += `<span class="st-w" data-c="${seg.start + m.index}" style="${_stDelay(n, step, base)}">${esc(m[2])}${last ? `<span class="st-tail">${esc(tail)}</span>` : ''}</span>`;
        if (o.mode !== 'phrase' || /[,;:.!?–—]$/.test(last ? tail : m[2])) n++;
      }
      return html;
    };
    const segs = storySegments(text, entities);
    for (let k = 0; k < segs.length; k++) {
      const seg = segs[k];
      if (!seg.entity) { out += words(seg); continue; }
      const e = seg.entity;
      // Punctuation right after an entity ("Sam," "10:00." "Sam's") stays on its line.
      const nx = segs[k + 1];
      const lead0 = nx && !nx.entity ? /^(?:['’]s(?![\p{L}\p{N}]))?[^\s\p{L}\p{N}]*/u.exec(nx.text) : null;
      const lead = lead0 && lead0[0] ? lead0 : null;
      if (lead) segs[k + 1] = { text: nx.text.slice(lead[0].length), start: nx.start + lead[0].length, end: nx.end, entity: null };
      out += `<span class="st-ent" data-type="${escAttr(e.type)}" data-key="${escAttr(e.type + '|' + e.ref)}" data-from="${seg.start}" data-to="${seg.end}">${words(seg, lead ? lead[0] : '')}</span>`;
    }
    return out;
  },
  /** Letters that drift into place (headings). */
  driftHtml(text, o) {
    o = o || {};
    let i = 0;
    return String(text || '').split(/(\s+)/).map(w => /^\s+$/.test(w) ? w : `<span class="st-dw">${Array.from(w).map(ch => `<span class="st-l" style="--i:${i++};--st-d0:${Number(o.delay) || 0}ms">${esc(ch)}</span>`).join('')}</span>`).join('');
  },
  /** Count a number up in el (instant when still / hidden). */
  countUp(el, to, o) {
    o = o || {};
    if (!el) return;
    const target = Number(to) || 0, fmt = typeof o.format === 'function' ? o.format : (n) => String(Math.round(n));
    if (storyReduced() || document.hidden || target === 0) { el.textContent = fmt(target); return; }
    const dur = Number(o.duration) || 1100, t0 = performance.now() + (Number(o.delay) || 0);
    el.textContent = fmt(0);
    const tick = (t) => {
      if (!el.isConnected) return;
      const p = Math.max(0, Math.min(1, (t - t0) / dur));
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1 && !document.hidden) requestAnimationFrame(tick); else el.textContent = fmt(target);
    };
    requestAnimationFrame(tick);
  },
  /** Type text into el; returns a cancel function. */
  typeText(el, text, o) {
    o = o || {};
    if (!el) return () => {};
    const s = Array.from(String(text || ''));
    if (storyReduced()) { el.textContent = s.join(''); return () => {}; }
    let i = 0, h = null, dead = false;
    const cps = Number(o.cps) || 38;
    el.classList.add('st-typing');
    const step = () => {
      if (dead || !el.isConnected) return;
      i = Math.min(s.length, i + 1);
      el.textContent = s.slice(0, i).join('');
      if (i < s.length && !document.hidden) h = setTimeout(step, 1000 / cps);
      else { el.textContent = s.join(''); el.classList.remove('st-typing'); if (o.done) o.done(); }
    };
    h = setTimeout(step, Number(o.delay) || 0);
    return () => { dead = true; clearTimeout(h); el.textContent = s.join(''); el.classList.remove('st-typing'); };
  },
  /** Text with a highlighter sweep behind it (plays when its frame holds). */
  sweepHtml(text, o) { return `<mark class="st-sweep${o && o.tone ? ' tone-' + String(o.tone).replace(/[^a-z]/g, '') : ''}">${esc(text)}</mark>`; },
  sceneHtml(type, o) { o = o || {}; return animSceneHtml(type || 'event', { size: o.size || 'hero', hero: true, label: o.label, cls: 'st-scene-el' + (o.cls ? ' ' + o.cls : '') }); },
  avatarHtml(p, size) { return typeof avatarHtml === 'function' ? avatarHtml(p, size || 40) : `<span class="avatar">${esc((p && p.name || '?').slice(0, 1))}</span>`; },
  /** A chip for one entity {type, ref, text}. ctx resolves people/events/tasks from the data. */
  chipHtml(e, ctx) {
    if (!e) return '';
    const key = escAttr(e.type + '|' + e.ref);
    // Chips show the short name the sentence used; the full title is the tooltip.
    const label = (full) => esc(e.text && e.type !== 'person' ? e.text : full);
    const wrap = (inner, cls, full) => `<span class="st-chip st-chip-${escAttr(e.type)}${cls ? ' ' + cls : ''}" data-key="${key}"${full ? ` title="${escAttr(full)}"` : ''}>${inner}</span>`;
    if (e.type === 'person') {
      const p = ctx && ctx.person(e.ref);
      const pp = p ? { id: p.id, name: p.name, color: p.color, avatarUrl: p.avatarUrl, kind: p.kind } : { name: e.text };
      return wrap(`${STORY_KIT.avatarHtml(pp, 28)}<b>${esc(p ? p.first || p.name : e.text)}</b>${p && p.why ? `<small>${esc(p.why)}</small>` : ''}`);
    }
    if (e.type === 'event') {
      const ev = ctx && ctx.event(e.ref);
      return wrap(`${animSceneHtml(ev ? ev.type : 'event', { size: 'sm' })}<b>${label(ev ? ev.title : e.text)}</b>${ev && ev.start ? `<small>${esc(ev.start)}</small>` : ev && ev.allDay ? '<small>All day</small>' : ''}`, '', ev && ev.title);
    }
    if (e.type === 'task' || e.type === 'deadline') {
      const t = ctx && ctx.task(e.ref);
      const due = t && t.due ? STORY_KIT.fmtDue(t.due, ctx) : '';
      const ic = e.type === 'deadline' ? 'hourglass' : 'circle-check';
      return wrap(`${t && t.type ? animSceneHtml(t.type, { size: 'sm' }) : icon(ic, 'i-sm')}<b>${label(t ? t.title : e.text)}</b>${due ? `<small>${esc(due)}</small>` : ''}`, e.type === 'deadline' ? 'is-deadline' : '', t && t.title);
    }
    const ic = { time: 'clock', place: 'map-pin', money: 'coins' }[e.type] || 'sparkle';
    return wrap(`${icon(ic, 'i-sm')}<b>${esc(e.text)}</b>`);
  },
  chipsHtml(list, ctx) {
    const seen = new Set();
    return (list || []).filter(e => e && !seen.has(e.type + '|' + e.ref) && seen.add(e.type + '|' + e.ref)).map(e => STORY_KIT.chipHtml(e, ctx)).join('');
  },
  /** "today" / "tomorrow" / "Friday" / "3 Oct" for an ISO date. */
  fmtDue(iso, ctx) {
    const today = (ctx && ctx.data && ctx.data.date) || todayStrSafe();
    const n = briefDaysBetween(today, iso);
    if (n === 0) return 'today'; if (n === 1) return 'tomorrow'; if (n === -1) return 'yesterday';
    if (n < 0) return `${-n} days late`;
    try { return _calParse(iso).toLocaleDateString(APP_CONFIG.locale || undefined, n < 7 ? { weekday: 'long' } : { day: 'numeric', month: 'short' }); } catch (e) { return iso; }
  },
  fmtDay(iso, o) { try { return _calParse(iso).toLocaleDateString(APP_CONFIG.locale || undefined, o || { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return iso; } },
  /** "Sam, Alex and Jo". */
  list(names) { const a = (names || []).filter(Boolean); return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; },
};

/* ---------- the context builders get ---------- */
function _stCtx(p) {
  const d = (p && p.data) || {};
  const people = new Map((d.people || []).map(x => [x.id, x]));
  const events = new Map((d.events || []).map(x => [x.id, x]));
  const tasks = new Map();
  for (const list of [d.focus, d.deadlines, d.done, d.wins, d.slipped, d.slippedWeek, d.waiting, d.tomorrow && d.tomorrow.tasks]) for (const t of list || []) if (t && t.id && !tasks.has(t.id)) tasks.set(t.id, t);
  for (const pp of d.people || []) for (const list of [pp.owe, pp.waiting, pp.followUps]) for (const t of list || []) if (!tasks.has(t.id)) tasks.set(t.id, t);
  const ents = new Map((d.entities || []).map(e => [e.type + '|' + e.ref, e]));
  return {
    kind: p.kind, data: d, script: p.script, ai: p.ai, prefs: storyPrefs(), kit: STORY_KIT, reduced: storyReduced(), view: STORY_VIEWS[p.kind],
    person: (id) => people.get(id) || (typeof getPerson === 'function' && getPerson(id) ? Object.assign({ first: String(getPerson(id).name || '').split(/\s+/)[0] }, getPerson(id)) : null),
    event: (id) => events.get(id) || null,
    task: (id) => {
      if (tasks.has(id)) return tasks.get(id);
      const it = typeof getItem === 'function' ? getItem(id) : null;
      return it ? { id, title: effTitle(it), due: effDate(it), type: typeof animForTask === 'function' ? animForTask(it).type : 'task' } : null;
    },
    entity: (type, ref) => ents.get(type + '|' + ref) || null,
    names: (list) => STORY_KIT.list(list),
  };
}

/* ---------- default builders (a storyboard can replace them: storyRegisterBuilder) ---------- */
function _stWeatherLine(w) {
  if (!w) return '';
  const t = (n) => (typeof n === 'number' && isFinite(n) ? Math.round(n) + '°' : '');
  return [w.label, w.hi !== null && w.hi !== undefined ? `high ${t(w.hi)}` : '', w.rainChance >= 30 ? `${w.rainChance}% chance of rain` : ''].filter(Boolean).join(' · ');
}
/** Scene for a sentence: its first event, deadline or task, else a person meeting, else the fallback. */
function storySceneFor(entities, ctx, fallback) {
  for (const want of ['event', 'deadline', 'task', 'person']) {
    const e = (entities || []).find(x => x.type === want);
    if (!e) continue;
    if (want === 'event') { const ev = ctx.event(e.ref); if (ev) return ev.type; }
    if (want === 'deadline') return 'deadline';
    if (want === 'task') { const t = ctx.task(e.ref); if (t && t.type) return t.type; }
    if (want === 'person') { const p = ctx.person(e.ref); if (p && p.celebration) return p.celebration.kind === 'birthday' ? 'birthday' : 'celebration'; return 'one-on-one'; }
  }
  return fallback || null;
}
function _stSentenceBeats(ctx, fallbackScene) {
  return (ctx.script.sentences || []).map((s, i) => ({
    id: 's' + i, type: 'sentence', text: s.text, entities: s.entities, say: s.text,
    scene: storySceneFor(s.entities, ctx, i === 0 ? fallbackScene : null),
    chips: s.entities.filter(e => ['person', 'event', 'task', 'deadline'].includes(e.type)),
  }));
}
function _stClosing(ctx, extraSay) {
  return { id: 'close', type: 'closing', text: ctx.script.closing || '', say: [ctx.script.closing, extraSay].filter(Boolean).join(' '), auto: false };
}
storyRegisterBuilder('morning', (ctx) => {
  const d = ctx.data, sc = ctx.script;
  const beats = [{
    id: 'intro', type: 'title', overline: `${STORY_KIT.fmtDay(d.date)}${d.weather && d.weather.place ? ' · ' + d.weather.place : ''}`,
    title: sc.headline || 'Your day', sub: _stWeatherLine(d.weather), say: sc.headline ? sc.headline + '.' : '',
    scene: d.headline && d.headline.type ? d.headline.type : (d.dayType && d.dayType.type === 'weekend' ? 'rest' : 'idea'),
  }];
  beats.push(..._stSentenceBeats(ctx, d.headline && d.headline.type));
  const timed = (d.events || []).filter(e => e.date === d.date);
  if (timed.length) beats.push({ id: 'schedule', type: 'timeline', title: 'The shape of today', events: timed.slice(0, 7), say: timed.length === 1 ? 'One thing in the calendar.' : `${timed.length} things in the calendar.` });
  if ((d.people || []).length) beats.push({ id: 'people', type: 'people', title: 'People today', people: d.people.slice(0, 5), say: `People to keep in mind: ${STORY_KIT.list(d.people.slice(0, 4).map(p => p.first))}.` });
  beats.push(_stClosing(ctx));
  return beats;
});
storyRegisterBuilder('evening', (ctx) => {
  const d = ctx.data, sc = ctx.script;
  const beats = [{ id: 'intro', type: 'title', overline: STORY_KIT.fmtDay(d.date), title: sc.headline || 'Finish the day', sub: d.streak && d.streak.days > 1 ? `${d.streak.days}-day streak` : '', say: sc.headline ? sc.headline + '.' : '', scene: 'rest' }];
  const stats = [{ n: d.doneCount || 0, label: d.doneCount === 1 ? 'task done' : 'tasks done' }];
  if (d.subtasksDone) stats.push({ n: d.subtasksDone, label: d.subtasksDone === 1 ? 'step' : 'steps' });
  if (d.meetingsHeld) stats.push({ n: d.meetingsHeld, label: d.meetingsHeld === 1 ? 'meeting' : 'meetings' });
  if (d.thisWeek) stats.push({ n: d.thisWeek, label: 'this week' });
  beats.push({ id: 'stats', type: 'stats', items: stats, say: '' , hold: 2600 });
  beats.push(..._stSentenceBeats(ctx, 'rest'));
  const tom = (d.tomorrow && d.tomorrow.events || []).map(id => ctx.event(id)).filter(Boolean);
  if (tom.length) beats.push({ id: 'tomorrow', type: 'timeline', title: 'Tomorrow', events: tom.slice(0, 6), say: '' });
  beats.push(_stClosing(ctx));
  return beats;
});
storyRegisterBuilder('week', (ctx) => {
  const d = ctx.data, sc = ctx.script;
  const r = d.range || {};
  const beats = [{ id: 'intro', type: 'title', overline: r.from ? `${STORY_KIT.fmtDay(r.from, { day: 'numeric', month: 'short' })} – ${STORY_KIT.fmtDay(r.to, { day: 'numeric', month: 'short' })}` : 'This week', title: sc.headline || 'Your week', sub: '', say: sc.headline ? sc.headline + '.' : '', scene: 'review' }];
  const stats = [{ n: d.completed || 0, label: d.completed === 1 ? 'task done' : 'tasks done' }];
  if (d.meetings) stats.push({ n: d.meetings, label: d.meetings === 1 ? 'meeting' : 'meetings' });
  if (d.busiest) stats.push({ n: d.busiest.n, label: `on ${d.busiest.weekday}` });
  beats.push({ id: 'stats', type: 'stats', items: stats, say: '', hold: 2600 });
  beats.push(..._stSentenceBeats(ctx, 'review'));
  if ((d.wins || []).length) beats.push({ id: 'wins', type: 'list', title: 'Wins', items: d.wins.slice(0, 5).map(t => ({ scene: t.type, title: t.title, meta: t.stream || '' })), say: '' });
  if ((d.people || []).length) beats.push({ id: 'people', type: 'people', title: 'People next week', people: d.people.slice(0, 5), say: '' });
  beats.push(_stClosing(ctx));
  return beats;
});

/* ---------- built-in beat renderers ---------- */
function _stSceneInto(el, beat, ctx) {
  const sc = beat.scene;
  if (!sc) return;
  const type = typeof sc === 'string' ? sc : sc.type;
  if (!type) return;
  el.innerHTML = STORY_KIT.sceneHtml(type, { size: (sc && sc.size) || 'hero', label: '' });
}
storyRegisterBeatType('title', (f, b, ctx) => {
  _stSceneInto(f.scene, b, ctx);
  f.type.innerHTML = `<div class="st-title">${b.overline ? `<div class="st-over">${esc(b.overline)}</div>` : ''}<h2 class="st-h">${STORY_KIT.driftHtml(b.title || '')}</h2>${b.sub ? `<p class="st-sub">${esc(b.sub)}</p>` : ''}</div>`;
});
storyRegisterBeatType('sentence', (f, b, ctx) => {
  _stSceneInto(f.scene, b, ctx);
  f.type.innerHTML = `<p class="st-sentence" data-caption="1">${STORY_KIT.sentenceHtml(b.text || '', b.entities || [], { mode: b.mode || 'word' })}</p>`;
  if (b.chips && b.chips.length) f.cards.innerHTML = `<div class="st-chips">${STORY_KIT.chipsHtml(b.chips, ctx)}</div>`;
});
storyRegisterBeatType('stats', (f, b) => {
  f.type.innerHTML = `<div class="st-stats">${(b.items || []).map((x, i) => `<div class="st-stat" style="--i:${i}"><b class="num" data-n="${escAttr(x.n)}">${storyReduced() ? esc(x.n) : '0'}</b><span>${esc(x.label)}</span></div>`).join('')}</div>`;
  f.type.querySelectorAll('b[data-n]').forEach((el, i) => STORY_KIT.countUp(el, Number(el.dataset.n) || 0, { delay: 250 + i * 160 }));
});
storyRegisterBeatType('timeline', (f, b) => {
  f.type.innerHTML = `<h3 class="st-kicker">${esc(b.title || '')}</h3>`;
  f.cards.innerHTML = `<ol class="st-timeline">${(b.events || []).map((e, i) => `<li class="st-tl" style="--i:${i}" data-key="${escAttr('event|' + e.id)}">${animSceneHtml(e.type, { size: 'md' })}<span class="st-tl-t">${esc(e.allDay ? 'All day' : e.start || '')}</span><b>${esc(e.title)}</b></li>`).join('')}</ol>`;
});
storyRegisterBeatType('people', (f, b, ctx) => {
  f.type.innerHTML = `<h3 class="st-kicker">${esc(b.title || 'People')}</h3>`;
  f.cards.innerHTML = `<div class="st-people">${(b.people || []).map((p, i) => `<div class="st-person" style="--i:${i}" data-key="${escAttr('person|' + p.id)}">${STORY_KIT.avatarHtml({ id: p.id, name: p.name, color: p.color, avatarUrl: p.avatarUrl, kind: p.kind }, 56)}<b>${esc(p.first || p.name)}</b><span>${esc(p.why || '')}</span>${p.lastContact ? `<small>Last in touch ${esc(p.lastContact.daysAgo === 0 ? 'today' : p.lastContact.daysAgo === 1 ? 'yesterday' : p.lastContact.daysAgo + ' days ago')}</small>` : ''}</div>`).join('')}</div>`;
});
storyRegisterBeatType('list', (f, b) => {
  f.type.innerHTML = `<h3 class="st-kicker">${esc(b.title || '')}</h3>`;
  f.cards.innerHTML = `<ul class="st-list">${(b.items || []).map((x, i) => `<li style="--i:${i}">${x.scene ? animSceneHtml(x.scene, { size: 'md' }) : ''}<b>${esc(x.title)}</b>${x.meta ? `<small>${esc(x.meta)}</small>` : ''}</li>`).join('')}</ul>`;
});
storyRegisterBeatType('closing', (f, b, ctx) => {
  f.type.innerHTML = `<div class="st-closing"><p class="st-close-t">${STORY_KIT.sentenceHtml(b.text || '', [], { step: 90 })}</p></div>`;
  const acts = document.createElement('div'); acts.className = 'st-close-acts';
  const btn = (label, ic, run, primary) => { const x = document.createElement('button'); x.type = 'button'; x.className = 'btn ' + (primary ? 'btn-primary' : 'btn-secondary') + ' btn-lg'; x.innerHTML = (ic ? (ic === 'play' ? _stIcon('play') : icon(ic)) : '') + `<span>${esc(label)}</span>`; x.addEventListener('click', run); acts.appendChild(x); return x; };
  btn('Open details', 'external-link', () => storyOpenDetails(), true);
  btn('Replay', 'rotate-ccw', () => STORY_PLAYER.replay());
  btn('Close', 'x', () => storyClose());
  f.cards.appendChild(acts);
});

/* ---------- the stage ---------- */
function _stStageHtml(kind) {
  return `
    <div class="st-bg" aria-hidden="true"><div class="st-sky"></div><div class="st-tint"></div><div class="st-vignette"></div></div>
    <div class="st-layer st-scene" aria-hidden="true"></div>
    <div class="st-layer st-type"></div>
    <div class="st-layer st-cards"></div>
    <div class="st-top">
      <div class="st-prog" role="tablist" aria-label="Story progress"></div>
      <div class="st-top-r">
        <button type="button" class="st-src" hidden disabled></button>
        <button type="button" class="st-btn st-regen" data-tip="Rewrite with Claude" aria-label="Rewrite with Claude" data-requires="claude" data-requires-soft>${icon('sparkles')}</button>
        <button type="button" class="st-btn st-details" aria-label="Open details">${icon('external-link')}<span>Open details</span></button>
        <button type="button" class="st-btn st-x" aria-label="Close (Esc)" data-tip="Close" data-kbd="Esc">${icon('x')}</button>
      </div>
    </div>
    <div class="st-caption" aria-hidden="true"><p class="st-cap-t"></p></div>
    <div class="st-ctrl" role="toolbar" aria-label="Story controls">
      <button type="button" class="st-btn st-replay" aria-label="Replay (Home)" data-tip="Replay">${icon('rotate-ccw')}</button>
      <button type="button" class="st-btn st-prev" aria-label="Previous (Left arrow)" data-tip="Previous" data-kbd="←">${_stIcon('prev')}</button>
      <button type="button" class="st-btn st-play" aria-label="Pause (Space)">${_stIcon('pause', 'st-i-pause')}${_stIcon('play', 'st-i-play')}</button>
      <button type="button" class="st-btn st-next" aria-label="Next (Right arrow)" data-tip="Next" data-kbd="→">${_stIcon('next')}</button>
      <button type="button" class="st-btn st-mute" aria-label="Mute (M)" data-tip="Read aloud" data-kbd="M">${_stIcon('vol', 'st-i-vol')}${_stIcon('mute', 'st-i-mute')}</button>
      <div class="st-vol"><input type="range" class="st-vol-r" min="0" max="1" step="0.05" aria-label="Volume" data-tip="Volume"><output class="st-vol-o" aria-hidden="true"></output></div>
      <div class="st-speed" role="group" aria-label="Speed">${STORY_SPEEDS.map(s => `<button type="button" data-speed="${s}" aria-pressed="false">${s === 1 ? '1×' : String(s) + '×'}</button>`).join('')}</div>
    </div>
    <div class="st-poster">
      <div class="st-poster-in">
        <div class="st-poster-scene" aria-hidden="true"></div>
        <div class="st-over st-poster-over">${esc(STORY_LABELS[kind] || 'Story')}</div>
        <h2 class="st-poster-h"><span class="skeleton skeleton-text" style="width:12ch"></span></h2>
        <p class="st-poster-sub"></p>
        <p class="st-voice-preparation" role="status" aria-live="polite" hidden></p>
        <progress class="st-voice-progress" aria-label="Voice clips prepared" hidden></progress>
        <button type="button" class="st-bigplay" aria-label="Play the story">${_stIcon('play')}<span>Play</span></button>
        <div class="st-poster-opts">
          <label class="st-readaloud"><input type="checkbox" class="st-ra"> Read it out</label>
          <button type="button" class="btn btn-ghost btn-sm st-poster-details">Open details instead</button>
        </div>
      </div>
    </div>
    <p class="st-narration-state" role="status" aria-live="polite" hidden></p>
    <p class="st-attrib" hidden></p>`;
}
function _stBg(p, beat) {
  const root = _story.root; if (!root) return;
  const d = p && p.data ? p.data : {};
  const w = d.weather;
  const bg = (beat && beat.bg) || {};
  const cond = bg.cond || (w && w.cond) || 'none';
  const tod = bg.tod || d.tod || (w && w.tod) || 'day';
  const sky = root.querySelector('.st-sky');
  if (sky && (sky.dataset.cond !== cond || sky.dataset.tod !== tod)) {
    sky.dataset.cond = cond; sky.dataset.tod = tod;
    sky.innerHTML = briefSkyHtml(cond, tod, { accent: false });   // the beat's own scene sits where the accent would
  }
  const sc = (p && p.script) || {};
  root.dataset.palette = bg.palette || sc.palette || '';
  root.dataset.mood = bg.mood || sc.mood || '';
  root.dataset.tod = tod; root.dataset.cond = cond;
  // Text colour follows the sky (palettes are soft tints that never flip contrast).
  root.classList.toggle('st-dark', /night|evening|dusk/.test(tod) || /rain|thunder/.test(cond) || document.documentElement.getAttribute('data-theme') === 'dark');
}

/* ---------- open / close ---------- */
async function storyOpen(kind, opts) {
  opts = opts || {};
  if (!STORY_VIEWS[kind]) kind = 'morning';
  const variant = opts.variant != null ? String(opts.variant) : '';   // a page-built kind's period: another one is a new story
  // Re-selecting the story that is already open is a no-op (no reload, no replayed intro).
  if (_story.open && _story.kind === kind && (_story.variant || '') === variant) {
    if (opts.autoplay === true && _story.payload && !_story.tl) storyPlay();
    return;
  }
  if (_story.open) storyClose({ quiet: true });
  if (_storyVoiceWarm) _storyVoiceWarm.controller.abort();
  const seq = ++_story.seq;
  const src = STORY_SOURCES[kind] || null;
  _story.open = true; _story.kind = kind; _story.variant = variant; _story.payload = null; _story.autoPaused = false; _story.fresh = false; _story.aiBusy = false; _story.voiceFallback = false;
  _story.voicePreparation = null; _story.playRequest = null; _story.nextVoiceBeats = null; _story.scriptJob = null;
  _story.lastFocus = document.activeElement;
  const root = document.createElement('div');
  root.className = 'story is-loading' + (storyReduced() ? ' st-still' : '');
  _stRole(root, kind);
  root.dataset.kind = kind; root.dataset.state = 'idle';
  root.dataset.apTx = typeof animStoryTx === 'function' ? animStoryTx() : 'fade';   // today's beat transition (78-anim-wire.js)
  root.innerHTML = _stStageHtml(kind);
  if (typeof animLoadingHtml === 'function') root.insertAdjacentHTML('beforeend', animLoadingHtml('st-ap-loading'));   // shown while .is-loading
  document.body.appendChild(root); document.documentElement.classList.add('story-open');
  _story.root = root;
  _stWire(root);
  const prefs = storyPrefs();
  if (opts.autoplay === true && !prefs.muted) storyNarrator().prime();
  _stSyncControls();
  root.querySelector('.st-ra').checked = !prefs.muted;
  requestAnimationFrame(() => root.classList.add('is-in'));
  root.querySelector('.st-bigplay').focus({ preventScroll: true });
  // Show whatever sky we already know while the story loads.
  if (src) _stBg({ data: { tod: src.dark ? 'night' : 'day' } });
  else if (typeof _bf !== 'undefined' && _bf.weather && _bf.weather.ok) _stBg({ data: { weather: { cond: _bf.weather.current ? _bf.weather.current.cond : 'none', tod: typeof briefTod === 'function' ? briefTod(_bf.weather) : 'day' } } });
  else _stBg({ data: {} });
  let payload;
  try {
    payload = src ? await src.load(opts) : await _bfJson('/api/story?kind=' + encodeURIComponent(kind));
    if (!payload || typeof payload !== 'object') throw new Error('Nothing to show yet.');
  } catch (e) {
    if (seq !== _story.seq) return;
    root.classList.remove('is-loading'); root.classList.add('is-error');
    root.querySelector('.st-poster-h').textContent = 'The story could not load.';
    root.querySelector('.st-poster-sub').textContent = _serverAvailable === false ? 'The OpenDash server is not running.' : (e.message || 'Try again in a moment.');
    root.querySelector('.st-bigplay').hidden = true;
    return;
  }
  if (seq !== _story.seq || !_story.open) return;
  _story.payload = payload;
  _stBuild();
  root.classList.remove('is-loading');
  _stPaintPoster();
  if (payload.data && payload.data.weather && payload.data.weather.attribution) {
    const a = root.querySelector('.st-attrib'); a.hidden = false; a.textContent = payload.data.weather.attribution.text || '';
  }
  _story.scriptJob = _stMaybeAi(false);
  _stPrepareVoice();
  // Opened by a click (palette, a button): play straight away; the auto-open waits for Play.
  const gesture = opts.autoplay !== false && (opts.autoplay === true || (navigator.userActivation && navigator.userActivation.isActive));
  if (gesture) storyPlay();
}
function _stBuild() {
  const p = _story.payload; if (!p) return;
  const ctx = _stCtx(p);
  let beats = [];
  try { beats = (STORY_BUILDERS[p.kind] || STORY_BUILDERS.morning)(ctx) || []; }
  catch (e) { console.error('[story] builder', e); beats = []; }
  beats = beats.filter(b => b && b.id);
  if (!beats.length) beats = [{ id: 'close', type: 'closing', text: p.script && p.script.closing || 'Nothing to show yet.', say: '' }];
  if (typeof storyVoiceBeats === 'function') beats = storyVoiceBeats(beats, p);
  _story.beats = beats;
  _story.ctx = ctx;
  _stBg(p, beats[0]);
  _stPaintProgress();
}
function _stCanPrepareVoice() {
  const p = storyPrefs();
  if (p.muted || p.narration.provider !== 'elevenlabs') return false;
  const nar = storyNarrator();
  return typeof nar.prepare === 'function' && typeof nar.canPrepare === 'function' && nar.canPrepare();
}
function _stCancelVoicePreparation() {
  const previous = _story.voicePreparation;
  _story.voicePreparation = null;
  if (previous) previous.controller.abort();
  _stVoicePreparationUi();
}
function _stVoicePreparationUi() {
  const root = _story.root; if (!root) return;
  const preparation = _story.voicePreparation, busy = !!(preparation && !preparation.done);
  const progress = preparation && preparation.progress;
  const label = root.querySelector('.st-voice-preparation'), meter = root.querySelector('.st-voice-progress');
  const button = root.querySelector('.st-bigplay'), span = button && button.querySelector('span');
  root.classList.toggle('is-preparing-voice', busy);
  if (!_story.tl) root.dataset.state = busy ? 'preparing' : 'idle';
  if (label) {
    label.hidden = !preparation;
    label.textContent = busy ? preparation.waitingForScript ? 'Claude is writing your narration…'
      : progress && progress.total ? `Preparing ElevenLabs voice · ${progress.completed} of ${progress.total} clips`
      : 'Preparing ElevenLabs voice…'
      : progress && progress.failed ? progress.total ? `${progress.total - progress.failed} voice clips ready · ${progress.failed} ${progress.failed === 1 ? 'moment uses' : 'moments use'} the browser voice`
      : 'ElevenLabs unavailable · using the browser voice'
      : 'ElevenLabs voice ready';
  }
  if (meter) {
    meter.hidden = !busy || !progress || !progress.total;
    meter.max = progress && progress.total || 1;
    meter.value = progress && progress.completed || 0;
  }
  if (button) {
    button.setAttribute('aria-busy', busy ? 'true' : 'false');
    const requested = !!_story.playRequest;
    if (span) span.textContent = busy ? requested ? 'Cancel start' : 'Play when ready' : 'Play';
    button.setAttribute('aria-label', busy ? requested ? 'Cancel automatic start' : 'Play when the voice is ready' : 'Play the story');
  }
}
/** Freeze the words before generation, and keep every provider wait off the timeline. */
function _stPrepareVoice() {
  if (!_story.open || !_story.payload || !_stCanPrepareVoice()) return Promise.resolve(null);
  if (_story.voicePreparation) return _story.voicePreparation.promise;
  const seq = _story.seq, root = _story.root, controller = new AbortController();
  const preparation = { controller, promise: null, done: false, progress: null, waitingForScript: !!_story.aiBusy };
  const live = () => seq === _story.seq && root === _story.root && _story.voicePreparation === preparation && !controller.signal.aborted;
  _story.voicePreparation = preparation;
  _stVoicePreparationUi();
  preparation.promise = (async () => {
    if (preparation.waitingForScript && _story.scriptJob) {
      let stopWaiting;
      const stopped = new Promise(resolve => { stopWaiting = resolve; controller.signal.addEventListener('abort', stopWaiting, { once: true }); });
      try { await Promise.race([_story.scriptJob, stopped]); }
      finally { controller.signal.removeEventListener('abort', stopWaiting); }
    }
    if (!live() || !_stCanPrepareVoice()) return null;
    preparation.waitingForScript = false;
    _stVoicePreparationUi();
    const result = await storyNarrator().prepare(_story.beats, {
      signal: controller.signal,
      onProgress(progress) { if (live()) { preparation.progress = progress; _stVoicePreparationUi(); } },
    });
    if (!live()) return null;
    preparation.progress = result; preparation.done = true;
    if (result && (result.cancelled || result.stale)) { _story.voicePreparation = null; _stVoicePreparationUi(); return result; }
    _stVoicePreparationUi();
    if (result && result.failed && !_story.voiceFallback) {
      _story.voiceFallback = true;
      const error = result.errors && result.errors[0];
      toast(((error && error.message) || 'Some voice clips could not be prepared.') + ' Those moments will use the browser voice.', { kind: 'note' });
    }
    return result;
  })().catch(e => {
    if (!live()) return null;
    preparation.done = true; preparation.progress = { total: 0, completed: 0, failed: 1 };
    _stVoicePreparationUi();
    toast((e && e.message) || 'Voice preparation could not finish.', { kind: 'note' });
    return null;
  });
  return preparation.promise;
}
function _stPaintPoster() {
  const root = _story.root, p = _story.payload; if (!root || !p) return;
  const sc = p.script || {};
  root.querySelector('.st-poster-h').innerHTML = STORY_KIT.driftHtml(sc.headline || STORY_LABELS[p.kind]);
  const n = _story.beats.length;
  const secs = Math.round(_story.beats.reduce((t, b) => t + (b.say ? storyReadMs(b.say, storyPrefs().rate * storyPrefs().speed) + 1400 : (b.hold || STORY_TIMING.hold) + 1200), 0) / 1000);
  root.querySelector('.st-poster-sub').textContent = `${sc.theme ? sc.theme + ' · ' : ''}${n} moments · about ${secs < 60 ? secs + ' seconds' : Math.round(secs / 60) + ' min'}`;
  const ps = root.querySelector('.st-poster-scene');
  const first = _story.beats[0];
  const type = first && first.scene ? (typeof first.scene === 'string' ? first.scene : first.scene.type) : null;
  ps.innerHTML = type ? STORY_KIT.sceneHtml(type, { size: 'hero' }) : '';
  ps.querySelectorAll('.anim-scene').forEach(s => { if (!storyReduced()) s.classList.add('is-live'); });
  _stSrcBadge();
}
function _stSrcBadge() {
  const root = _story.root, p = _story.payload; if (!root || !p) return;
  const b = root.querySelector('.st-src');
  b.hidden = false;
  const fresh = !!_story.fresh && !_story.aiBusy;
  b.textContent = _story.aiBusy ? 'Claude is writing…' : fresh ? 'Claude’s version is ready · Play' : p.script && p.script.source === 'ai' ? 'Written by Claude' : 'Built-in script';
  b.disabled = !fresh;
  b.classList.toggle('is-busy', !!_story.aiBusy);
  b.classList.toggle('is-fresh', fresh);
}
function storyPlay() {
  const root = _story.root; if (!root || !_story.payload) return;
  if (_story.playRequest) return _story.playRequest.promise;
  if (_story.nextVoiceBeats) {
    if (_story.tl) { _story.tl.destroy(); _story.tl = null; }
    _story.beats = _story.nextVoiceBeats; _story.nextVoiceBeats = null;
    root.classList.remove('is-playing');
    _stCancelVoicePreparation(); _stPaintPoster(); _stPaintProgress();
  }
  const nar = storyNarrator();
  const prefs = storyPrefs();
  if (!prefs.muted) nar.prime();
  if (_stCanPrepareVoice() && (!_story.voicePreparation || !_story.voicePreparation.done)) {
    const seq = _story.seq, request = { promise: null };
    _story.playRequest = request;
    request.promise = (async () => {
      while (_story.open && _story.seq === seq && _story.root === root && _story.playRequest === request && _stCanPrepareVoice()) {
        await _stPrepareVoice();
        if (_story.voicePreparation && _story.voicePreparation.done) break;
      }
      if (!_story.open || _story.seq !== seq || _story.root !== root || _story.playRequest !== request) return false;
      _story.playRequest = null; _stVoicePreparationUi();
      if (document.hidden) return false;
      _stStartPlayback();
      return true;
    })();
    _stVoicePreparationUi();
    return request.promise;
  }
  _stStartPlayback();
}
function _stStartPlayback() {
  const root = _story.root; if (!root || !_story.payload) return;
  const nar = storyNarrator(), prefs = storyPrefs();
  root.classList.add('is-playing');
  if (_story.fresh) { _story.fresh = false; _stSrcBadge(); }
  // Playing the morning story counts as having seen the brief (the top-bar pill and auto-open stop).
  if (_story.kind === 'morning') { try { localStorage.setItem('dashboard-brief-seen', todayStrSafe()); } catch (e) { /* private mode */ } }
  if (!_story.tl) {
    _story.tl = storyCreateTimeline({
      beats: _story.beats, narrator: nar, speed: prefs.speed, muted: prefs.muted || !nar.canSpeak(),
      hooks: { onBeat: _stOnBeat, onPhase: _stOnPhase, onWord: _stOnWord, onMode: _stOnVoiceMode, onState: _stOnState, onEnd: _stOnEnd, onBeats: (b) => { _story.beats = b; _stPaintProgress(); } },
    });
  }
  _story.tl.play();
  const pl = root.querySelector('.st-play'); if (pl) pl.focus({ preventScroll: true });
}
function storyClose(o) {
  if (!_story.open) return;
  _story.seq++;
  _story.playRequest = null; _stCancelVoicePreparation();
  _story.scriptJob = null; _story.nextVoiceBeats = null;
  if (_story.tl) { _story.tl.destroy(); _story.tl = null; }
  if (_story.narrator) _story.narrator.cancel();
  for (const c of _story.cleanups) { try { c(); } catch (e) { /* ignore */ } }
  _story.cleanups = [];
  if (_story.keyFn) document.removeEventListener('keydown', _story.keyFn, true);
  _story.keyFn = null;
  const root = _story.root;
  _story.open = false; _story.root = null; _story.payload = null; _story.beats = []; _story.words = []; _story.capWords = [];
  document.documentElement.classList.remove('story-open');
  if (root) {
    root.classList.remove('is-in'); root.classList.add('is-out');
    setTimeout(() => root.remove(), storyReduced() || (o && o.quiet) ? 0 : 320);
  }
  const f = _story.lastFocus; _story.lastFocus = null;
  if (f && f.isConnected && typeof f.focus === 'function' && !(o && o.quiet)) { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
}

/** The player is always a full-screen dialog. */
function _stRole(root, kind) {
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', STORY_LABELS[kind] || 'Story');
}
/** The player's state (tests and other areas read it). */
function storyState() {
  return {
    open: _story.open, kind: _story.open ? _story.kind : null,
    state: _story.root ? (_story.root.dataset.state || 'idle') : 'idle', muted: storyPrefs().muted, volume: storyPrefs().volume,
    index: _story.tl ? _story.tl.index : -1, count: (_story.beats || []).length, loading: !!(_story.root && _story.root.classList.contains('is-loading')),
    error: !!(_story.root && _story.root.classList.contains('is-error')),
    preparing: !!(_story.voicePreparation && !_story.voicePreparation.done),
    voiceProgress: _story.voicePreparation && _story.voicePreparation.progress ? {
      total: _story.voicePreparation.progress.total, completed: _story.voicePreparation.progress.completed, failed: _story.voicePreparation.progress.failed,
    } : null,
  };
}
function storyOpenDetails() {
  const kind = _story.kind, src = STORY_SOURCES[kind], p = _story.payload;
  storyClose();
  if (src && typeof src.details === 'function') { src.details(p); return; }
  if (kind === 'morning' && typeof briefOpen === 'function') briefOpen({ welcome: false });
  else setView(STORY_VIEWS[kind] || 'home');
}
/** The first brief of the day: open it as a story (the Play poster; speech needs a click). */
function storyAutoOpen(kind) {
  if (!storyPrefs().autoOpen || _story.open) return;
  storyOpen(kind || 'morning', { autoplay: false });
}

/* ---------- AI script ---------- */
/** A page-built kind's Claude version: src.ai(payload, {regenerate}) -> a new script or null (quiet unless asked). */
async function _stSourceAi(src, regenerate) {
  const p = _story.payload;
  if (!regenerate && p.ai && p.ai.state !== 'missing') return;
  if (typeof src.ai !== 'function') { if (regenerate) toast('This story keeps its own words.', { kind: 'err' }); return; }
  const seq = _story.seq;
  _story.aiBusy = true; _stSrcBadge();
  try {
    const sc = await src.ai(p, { regenerate: !!regenerate });
    if (seq !== _story.seq || !_story.payload || !sc) return;
    _story.payload.script = sc; _story.payload.ai = { state: 'cached', model: sc.model || null };
    _stSwapScript();
  } catch (e) {
    if (regenerate && seq === _story.seq) toast((e && e.message) || 'Claude could not rewrite the story just now.', { kind: 'err' });
  } finally {
    if (seq === _story.seq) { _story.aiBusy = false; _stSrcBadge(); }
  }
}
async function _stMaybeAi(regenerate) {
  const p = _story.payload; if (!p || _story.aiBusy) return;
  if (STORY_SOURCES[p.kind]) return _stSourceAi(STORY_SOURCES[p.kind], regenerate);
  if (!regenerate && p.ai && p.ai.state !== 'missing') return;
  if (typeof briefPrefs === 'function' && !briefPrefs().ai) return;
  const ai = typeof connHas === 'function' ? connHas('claude') : (typeof AI_AVAILABLE !== 'undefined' && AI_AVAILABLE);
  if (!ai) { if (regenerate) toast('Connect Claude to rewrite the story.', { kind: 'err' }); return; }
  const seq = _story.seq;
  _story.aiBusy = true; _stSrcBadge();
  try {
    const r = await _bfPost('/api/story/script', { kind: p.kind, regenerate: !!regenerate });
    if (seq !== _story.seq || !_story.payload || !r || !r.script) return;
    _story.payload.script = r.script; _story.payload.ai = { state: 'cached', model: r.script.model };
    _stSwapScript();
  } catch (e) {
    if (regenerate && seq === _story.seq) toast(e.message || 'Claude could not rewrite the story just now.', { kind: 'err' });
  } finally {
    if (seq === _story.seq) { _story.aiBusy = false; _stSrcBadge(); }
  }
}
/** A new script: rebuild the beats; the one on screen (and earlier ones) stay as they are. */
function _stSwapScript() {
  const p = _story.payload;
  const ctx = _stCtx(p);
  let beats;
  try { beats = (STORY_BUILDERS[p.kind] || STORY_BUILDERS.morning)(ctx).filter(b => b && b.id); } catch (e) { console.error('[story] builder', e); return; }
  if (typeof storyVoiceBeats === 'function') beats = storyVoiceBeats(beats, p);
  _story.ctx = ctx;
  const tl = _story.tl;
  if (!tl || tl.state === 'idle') {
    _story.beats = beats; if (tl) tl.replaceUpcoming(beats); _stBg(p, beats[0]); _stPaintPoster(); _stPaintProgress();
    if (!_story.voicePreparation || !_story.voicePreparation.waitingForScript) { _stCancelVoicePreparation(); _stPrepareVoice(); }
    return;
  }
  if (_stCanPrepareVoice() && tl.state !== 'ended') {
    // The playing version already has its clips. Offer a later rewrite for replay,
    // rather than inserting unprepared speech into the running timeline.
    _story.nextVoiceBeats = beats; _story.fresh = true; _stSrcBadge();
    return;
  }
  if (tl.state === 'ended') {
    // Finished already: never restart on its own. The badge offers Claude's version.
    tl.destroy(); _story.tl = null; _story.beats = beats; _story.fresh = true;
    if (_story.root) _story.root.dataset.state = 'ended';
    _stCancelVoicePreparation(); _stPrepareVoice(); _stPaintProgress(); _stSrcBadge();
    return;
  }
  tl.replaceUpcoming(beats);
}

/**
 * Write the day's AI script and prepare its narration in the background. Claude runs
 * at most once per kind/day; repeated narration uses the existing clip cache.
 * Morning before the evening hour, the evening recap after it, the week on its last
 * and first day. The server caches; a cached script costs nothing.
 */
async function storyPrefetchDue() {
  if (typeof _serverAvailable === 'undefined' || !_serverAvailable || document.hidden) return;
  // Never during the welcome set-up (or before it on a new, empty data folder): the
  // person has not even reached the step that says Claude is connected yet.
  if (typeof _obOpen !== 'undefined' && _obOpen) return;
  if (typeof APP_CONFIG !== 'undefined' && !APP_CONFIG.onboardedAt && typeof getAllItems === 'function' && !getAllItems().length) return;
  const ai = !(typeof briefPrefs === 'function' && !briefPrefs().ai)
    && (typeof connHas === 'function' ? connHas('claude') : (typeof AI_AVAILABLE !== 'undefined' && AI_AVAILABLE));
  const voice = !_story.open && _stCanPrepareVoice();
  if (!ai && !voice) return;
  const today = todayStrSafe(), now = Clock.parts(Clock.now());   // the hour and weekday where the user is (travel spec P11)
  const evening = typeof briefPrefs === 'function' ? now.h >= briefPrefs().eveningHour : now.h >= 17;
  const kinds = [evening ? 'evening' : 'morning'];
  const ws = String((APP_CONFIG && APP_CONFIG.weekStart) || 'Mon').toLowerCase().startsWith('sun') ? 0 : 1;
  if (now.dow === ws || now.dow === (ws + 6) % 7) kinds.push('week');
  for (const kind of kinds) {
    const k = 'dashboard-story-prefetch-' + kind;
    let asked = false;
    try { asked = localStorage.getItem(k) === today; } catch (e) { asked = true; }
    if (ai && !asked) {
      try { localStorage.setItem(k, today); } catch (e) { /* cache on the server still deduplicates */ }
      try { await _bfPost('/api/story/script', { kind }); } catch (e) { /* quiet: the built-in script still plays */ }
    }
    if (!_story.open && !document.hidden && _stCanPrepareVoice()) await _stWarmVoice(kind);
  }
}
async function _stWarmVoice(kind) {
  if (_storyVoiceWarm) return _storyVoiceWarm.promise;
  if (_story.open || document.hidden || !_stCanPrepareVoice()) return;
  const controller = new AbortController(), warm = { controller, promise: null };
  _storyVoiceWarm = warm;
  warm.promise = (async () => {
    const payload = await _bfJson('/api/story?kind=' + encodeURIComponent(kind));
    if (controller.signal.aborted || _story.open || document.hidden || !_stCanPrepareVoice()) return;
    const ctx = _stCtx(payload);
    let beats = (STORY_BUILDERS[kind] || STORY_BUILDERS.morning)(ctx).filter(b => b && b.id);
    if (typeof storyVoiceBeats === 'function') beats = storyVoiceBeats(beats, payload);
    const c = storyPrefs().narration;
    const key = JSON.stringify([c.voiceId, c.modelId, c.scope, beats.map(b => [b.say, b.delivery, b.cloudVoice])]);
    if (_storyVoiceWarmKeys.get(kind) === key) return;
    const result = await storyNarrator().prepare(beats, { signal: controller.signal });
    if (!controller.signal.aborted && result && !result.cancelled && !result.stale) _storyVoiceWarmKeys.set(kind, key);
  })().catch(() => {}).finally(() => { if (_storyVoiceWarm === warm) _storyVoiceWarm = null; });
  return warm.promise;
}
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(() => storyPrefetchDue().catch(() => {}), 30000), { once: true });
  setInterval(() => { storyPrefetchDue().catch(() => {}); }, 30 * 60 * 1000);
}

/* ---------- timeline hooks -> DOM ---------- */
function _stOnBeat(i, beat, dir) {
  const root = _story.root; if (!root) return;
  const ctx = _story.ctx;
  // Old frames leave (their exit class may already be on).
  for (const fr of _story.frames) { for (const el of [fr.scene, fr.type, fr.cards]) { el.classList.remove('is-enter', 'is-hold'); el.classList.add('is-exit'); el.querySelectorAll('.anim-scene.is-live').forEach(s => s.classList.remove('is-live')); setTimeout(() => el.remove(), storyReduced() ? 0 : 520); } }
  for (const c of _story.cleanups) { try { c(); } catch (e) { /* ignore */ } }
  _story.cleanups = [];
  const mk = (layer) => { const el = document.createElement('div'); el.className = 'st-frame is-enter' + (beat.className ? ' ' + String(beat.className).replace(/[^a-zA-Z0-9 _-]/g, '') : ''); el.dataset.beat = beat.id; el.dataset.type = beat.type || 'custom'; root.querySelector('.st-' + layer).appendChild(el); return el; };
  const frame = { scene: mk('scene'), type: mk('type'), cards: mk('cards'), root };
  frame.type.style.setProperty('--dir', String(dir || 1)); frame.scene.style.setProperty('--dir', String(dir || 1));
  _story.frames = [frame];
  root.dataset.beat = beat.id; root.dataset.beatType = beat.type || 'custom';
  const render = STORY_BEAT_TYPES[beat.type] || (typeof beat.render === 'function' ? null : STORY_BEAT_TYPES.sentence);
  try {
    const c = typeof beat.render === 'function' ? beat.render(frame, beat, ctx) : render(frame, beat, ctx);
    if (typeof c === 'function') _story.cleanups.push(c);
  } catch (e) { console.error('[story] beat ' + beat.id, e); frame.type.textContent = beat.text || beat.say || ''; }
  // Only this beat's scenes move (the page's own scenes are paused under html.story-open).
  if (!storyReduced()) for (const el of [frame.scene, frame.type, frame.cards]) el.querySelectorAll('.anim-scene').forEach(s => s.classList.add('is-live'));
  _stBg(_story.payload, beat);
  // Caption: the narration as words; merged into the big text when they are the same.
  const say = String(beat.caption || beat.say || '');
  // The big text lives in the type layer, or in the cards layer for beats that mix it with controls.
  const capHost = !frame.type.querySelector('[data-caption]') && frame.cards.querySelector('[data-caption]') ? frame.cards : frame.type;
  const merged = !!capHost.querySelector('[data-caption]') && (!beat.caption && beat.say === beat.text);
  const cap = root.querySelector('.st-caption');
  cap.classList.toggle('is-merged', merged || !say);
  cap.querySelector('.st-cap-t').innerHTML = say ? STORY_KIT.sentenceHtml(say, [], { step: 0 }) : '';
  // The big text follows the voice only when it IS the narration; otherwise it is simply lit.
  if (!merged) capHost.querySelectorAll('[data-caption] .st-w').forEach(el => el.classList.add('is-said'));
  _story.words = merged ? [...capHost.querySelectorAll('[data-caption] .st-w')].map(el => ({ el, c: Number(el.dataset.c) })) : [];
  _story.capWords = [...cap.querySelectorAll('.st-w')].map(el => ({ el, c: Number(el.dataset.c) }));
  _story.ents = [...capHost.querySelectorAll('.st-ent')].map(el => ({ el, from: Number(el.dataset.from), to: Number(el.dataset.to), key: el.dataset.key }));
  _story.hot = new Set();
  _stPaintProgress();
}
function _stOnPhase(i, phase) {
  for (const fr of _story.frames) for (const el of [fr.scene, fr.type, fr.cards]) {
    if (!el.isConnected) continue;
    el.classList.toggle('is-enter', phase === 'enter'); el.classList.toggle('is-hold', phase === 'hold'); el.classList.toggle('is-exit', phase === 'exit');
  }
  if (phase === 'hold') {
    const b = _story.beats[i];
    // A silent beat fills its progress segment over its hold.
    if (b && !String(b.say || '').trim()) { const seg = _story.root && _story.root.querySelector(`.st-seg[data-i="${i}"]`); if (seg) { seg.style.setProperty('--dur', ((b.hold || STORY_TIMING.hold) / (_story.tl ? _story.tl.speed : 1)) + 'ms'); seg.classList.add('is-run'); } }
  }
}
function _stOnWord(i, c) {
  const mark = (list) => {
    let k = -1;
    for (let j = 0; j < list.length; j++) if (list[j].c <= c) k = j; else break;
    list.forEach((w, j) => { w.el.classList.toggle('is-said', j < k); w.el.classList.toggle('is-now', j === k); });
    return list.length ? (k + 1) / list.length : 0;
  };
  const pBig = mark(_story.words), pCap = mark(_story.capWords);
  for (const e of _story.ents || []) {
    if (c >= e.from && c < e.to && !_story.hot.has(e.key)) {
      _story.hot.add(e.key);
      e.el.classList.add('is-hot');
      if (_story.root) _story.root.querySelectorAll(`.st-cards .st-frame:not(.is-exit) [data-key="${CSS.escape(e.key)}"]`).forEach(x => x.classList.add('is-hot'));
    }
  }
  const seg = _story.root && _story.root.querySelector(`.st-seg[data-i="${i}"]`);
  if (seg) seg.style.setProperty('--p', String(Math.max(pBig, pCap)));
}
function _stOnState(state) {
  const root = _story.root; if (!root) return;
  root.dataset.state = state;
  const pl = root.querySelector('.st-play');
  if (pl) pl.setAttribute('aria-label', state === 'playing' ? 'Pause (Space)' : state === 'ended' ? 'Replay' : 'Play (Space)');
  root.classList.toggle('is-paused', state === 'paused');
}
function _stOnVoiceMode(mode) {
  const root = _story.root;
  const label = root && root.querySelector('.st-narration-state');
  if (!label) return;
  label.hidden = storyPrefs().narration.provider !== 'elevenlabs';
  label.textContent = mode === 'loading' ? 'Preparing voice…' : mode === 'elevenlabs' ? 'ElevenLabs voice' : mode === 'voice' ? 'Browser voice' : 'Captions';
}
function _stOnEnd() {
  const root = _story.root; if (!root) return;
  root.querySelectorAll('.st-seg').forEach(s => s.style.setProperty('--p', '1'));
  try { localStorage.setItem('dashboard-story-played-' + _story.kind, todayStrSafe()); } catch (e) { /* ignore */ }
}
function _stPaintProgress() {
  const root = _story.root; if (!root) return;
  const bar = root.querySelector('.st-prog');
  const cur = _story.tl ? _story.tl.index : -1;
  const beats = _story.beats;
  if (bar.children.length !== beats.length) {
    bar.innerHTML = beats.map((b, i) => `<button type="button" class="st-seg" role="tab" data-i="${i}" aria-label="Moment ${i + 1} of ${beats.length}"><i></i></button>`).join('');
  }
  [...bar.children].forEach((s, i) => {
    s.classList.toggle('is-past', i < cur); s.classList.toggle('is-cur', i === cur);
    s.setAttribute('aria-selected', i === cur ? 'true' : 'false');
    if (i !== cur) { s.style.setProperty('--p', i < cur ? '1' : '0'); s.classList.remove('is-run'); }
    else if (!s.style.getPropertyValue('--p')) s.style.setProperty('--p', '0');
  });
  if (cur >= 0) { const s = bar.children[cur]; if (s && !s.classList.contains('is-run')) s.style.setProperty('--p', '0'); }
}
function _stSyncControls() {
  const root = _story.root; if (!root) return;
  const p = storyPrefs();
  const nar = storyNarrator().canSpeak();
  root.style.setProperty('--st-speed', String(p.speed));
  root.classList.toggle('is-muted', p.muted);
  root.classList.toggle('no-voice', !nar);
  const m = root.querySelector('.st-mute');
  m.setAttribute('aria-pressed', p.muted ? 'true' : 'false');
  m.setAttribute('aria-label', p.muted ? 'Read aloud (M)' : 'Mute (M)');
  root.querySelectorAll('.st-speed button').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.speed) === p.speed ? 'true' : 'false'));
  const vr = root.querySelector('.st-vol-r'), vo = root.querySelector('.st-vol-o'), pct = Math.round(p.volume * 100);
  if (vr && document.activeElement !== vr) vr.value = String(p.volume);
  if (vr) vr.setAttribute('aria-valuetext', pct + '%' + (p.muted ? ', muted' : ''));
  if (vo) vo.textContent = pct + '%';
  root.style.setProperty('--st-volume', String(p.muted ? 0 : p.volume));   // for any sound a beat plays
}

/* ---------- player actions + wiring ---------- */
const STORY_PLAYER = {
  toggle() {
    if (!_story.tl) {
      if (_story.playRequest) { _story.playRequest = null; _stVoicePreparationUi(); return; }
      return storyPlay();
    }
    if (_story.nextVoiceBeats || _story.tl.state === 'ended') return storyPlay();
    _story.tl.toggle();
  },
  next() { if (_story.tl) _story.tl.next(); else storyPlay(); },
  prev() { if (_story.tl) _story.tl.prev(); },
  replay() { if (_story.nextVoiceBeats) return storyPlay(); if (_story.tl) _story.tl.replay(); else storyPlay(); },
  toggleMute() {
    const muted = !storyPrefs().muted;
    _stSaveUi({ muted });
    if (!_story.tl) {
      if (muted) {
        const requested = !!_story.playRequest;
        _story.playRequest = null; _stCancelVoicePreparation();
        if (requested && !document.hidden) _stStartPlayback();
      }
      else _stPrepareVoice();
    }
    if (!muted) storyNarrator().prime();
    if (_story.tl) _story.tl.setMuted(muted || !storyNarrator().canSpeak());
    if (_story.root) _story.root.querySelector('.st-ra').checked = !muted;
    _stSyncControls();
  },
  setSpeed(x) { _stSaveUi({ speed: x }); if (_story.tl) _story.tl.setSpeed(x); _stSyncControls(); },
  /** Volume 0..1 (user request, 4 Oct): saved for this browser, applied to the narration at once. */
  setVolume(v, o) {
    v = Math.max(0, Math.min(1, Math.round(Number(v) * 100) / 100));
    if (!Number.isFinite(v)) return;
    _stSaveUi({ volume: v });
    const nar = storyNarrator();                 // picks the new volume up for the next utterance
    if (v > 0 && storyPrefs().muted) STORY_PLAYER.toggleMute();   // turning it up un-mutes
    else if (_story.tl && !(o && o.live)) _story.tl.refresh();     // speech can't change volume mid-utterance: re-say from this word
    _stSyncControls();
    if (o && o.live) { clearTimeout(_story.volT); _story.volT = setTimeout(() => { if (_story.tl) _story.tl.refresh(); }, 220); }
    return nar;
  },
  close() { storyClose(); },
};
/**
 * A task action from a story beat (user request, 4 Oct: they did nothing). Always the
 * normal actions layer (POST /api/actions: validation, history, live update of Home and
 * the task lists) with a visible confirmation and Undo.
 * o: {done: toast text, icon, onUndo()}. Returns the server's answer ({undo, ...}) or false.
 */
async function storyTaskOps(ops, o) {
  o = o || {};
  if (typeof actionsApply !== 'function') return false;
  const j = await actionsApply(ops, { client: 'story', done: false });
  if (!j) return false;                                   // failed: actionsApply has said why
  if (typeof render === 'function') { try { render(); } catch (e) { console.error('[story] render', e); } }
  toast(o.done || 'Done', { kind: 'ok', icon: o.icon, action: j.undo ? { label: 'Undo', run: () => storyTaskUndo(j.undo, o.onUndo) } : undefined });
  return j;
}
/** Undo a story action by its token; true when undone. */
async function storyTaskUndo(token, after) {
  try {
    await actionsUndo(token, { client: 'story' });
    if (typeof render === 'function') render();
    if (typeof after === 'function') after();
    toast('Undone', { kind: 'ok', icon: 'undo-2' });
    return true;
  } catch (e) {
    toast(typeof netErrorMessage === 'function' ? netErrorMessage(e, 'Could not undo') : 'Could not undo', { kind: 'err' });
    return false;
  }
}
function _stWire(root) {
  const on = (sel, fn) => { const el = root.querySelector(sel); if (el) el.addEventListener('click', fn); };
  on('.st-bigplay', () => STORY_PLAYER.toggle());
  on('.st-play', () => STORY_PLAYER.toggle());
  on('.st-prev', () => STORY_PLAYER.prev());
  on('.st-next', () => STORY_PLAYER.next());
  on('.st-replay', () => STORY_PLAYER.replay());
  on('.st-mute', () => STORY_PLAYER.toggleMute());
  on('.st-x', () => STORY_PLAYER.close());
  on('.st-details', () => storyOpenDetails());
  on('.st-poster-details', () => storyOpenDetails());
  on('.st-regen', () => {
    if (_story.aiBusy) return;
    _story.scriptJob = _stMaybeAi(true);
    if (!_story.tl) { _stCancelVoicePreparation(); _stPrepareVoice(); }
  });
  on('.st-src', () => { if (!_story.fresh) return; _story.fresh = false; _stSrcBadge(); storyPlay(); });
  root.querySelector('.st-ra').addEventListener('change', (e) => { if (storyPrefs().muted === e.target.checked) STORY_PLAYER.toggleMute(); });
  const vr = root.querySelector('.st-vol-r');
  vr.addEventListener('input', () => STORY_PLAYER.setVolume(vr.value, { live: true }));
  vr.addEventListener('keydown', (e) => { if (/^Arrow/.test(e.key)) e.stopPropagation(); });   // arrows move the slider, not the moments
  root.querySelector('.st-speed').addEventListener('click', (e) => { const b = e.target.closest('button[data-speed]'); if (b) STORY_PLAYER.setSpeed(Number(b.dataset.speed)); });
  root.querySelector('.st-prog').addEventListener('click', (e) => {
    const s = e.target.closest('.st-seg'); if (!s) return;
    if (!_story.tl) storyPlay();
    if (_story.tl) _story.tl.goTo(Number(s.dataset.i));
  });
  // A click on the stage itself (not a control) = next, like a story.
  root.querySelector('.st-cards').addEventListener('click', (e) => { if (e.target === e.currentTarget && _story.tl) STORY_PLAYER.next(); });
  _story.keyFn = (e) => {
    if (!_story.open) return;
    if (e.key === 'Tab') { _stTrapTab(e); return; }
    // Space/Enter on a focused button clicks it; everything else is a player key.
    if ((e.key === ' ' || e.key === 'Enter') && e.target && e.target.closest && e.target.closest('.story button, .story input')) return;
    if (storyHandleKey(e, STORY_PLAYER)) return;
    e.stopPropagation();   // the app's own shortcuts stay quiet while the story is open
  };
  document.addEventListener('keydown', _story.keyFn, true);
}
function _stTrapTab(e) {
  const root = _story.root; if (!root) return;
  const f = [...root.querySelectorAll('button:not([hidden]):not([disabled]), input, [tabindex="0"]')].filter(el => el.offsetParent !== null);
  if (!f.length) return;
  const i = f.indexOf(document.activeElement);
  if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (_storyVoiceWarm) _storyVoiceWarm.controller.abort();
    if (_story.playRequest) { _story.playRequest = null; _stVoicePreparationUi(); }
  }
  if (!_story.open || !_story.tl) return;
  if (document.hidden && _story.tl.state === 'playing') { _story.tl.pause(); _story.autoPaused = true; }
});

/* ---------- entry points ---------- */
/** A "Play story" button for the brief, the evening recap and the weekly review. */
function storyEntryButton(kind, o) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn btn-secondary st-entry' + (o && o.cls ? ' ' + o.cls : '');
  b.innerHTML = `${_stIcon('play')}<span>${esc((o && o.label) || (kind === 'morning' ? 'Play my morning' : kind === 'evening' ? 'Play my day' : kind === 'week' ? 'Play my week' : 'Play story'))}</span>`;
  // o.open: extra options for storyOpen (a page-built kind's period, its variant).
  b.addEventListener('click', () => storyOpen(kind, Object.assign({ autoplay: true }, o && o.open)));
  return b;
}
/** Put the entry button at the top of a page root (brief, evening, weekly). */
function storyMountEntry(root, kind) {
  if (!root || root.querySelector(':scope > .st-entry-row')) return;
  const row = document.createElement('div'); row.className = 'st-entry-row st-entry-' + (STORY_VIEWS[kind] ? kind : 'morning');
  row.appendChild(storyEntryButton(kind));
  root.classList.add('st-entry-host');
  root.prepend(row);
}
registerCommand({ id: 'story-morning', label: 'Play my morning (story)', icon: 'sunrise', group: 'Go to', keywords: 'morning brief story play read aloud day in three sentences', run: () => storyOpen('morning', { autoplay: true }) });
registerCommand({ id: 'story-evening', label: 'Play my day (finish the day story)', icon: 'sunset', group: 'Go to', keywords: 'evening recap story play read aloud', run: () => storyOpen('evening', { autoplay: true }) });
registerCommand({ id: 'story-week', label: 'Play my week (weekly review story)', icon: 'calendar-range', group: 'Go to', keywords: 'week review story play read aloud', run: () => storyOpen('week', { autoplay: true }) });

/* ---------- the public API (Home and other areas call this; never the internals) ---------- */
/**
 * window.Story
 *   open(kind, {autoplay})  'morning' | 'evening' | 'week'. From a click, plays at once
 *                           (autoplay defaults to "when there was a user gesture"); else
 *                           shows the Play poster. Returns a promise (resolves when loaded).
 *   close()  isOpen()  kind()  play()  toggle()  next()  prev()  replay()  toggleMute()
 *   setSpeed(0.8|1|1.25)   openDetails()   autoOpen(kind)
 *   playedToday(kind)       true once that story has played to the end today
 *   prefetch()              prepare today's script and voice clips quietly before playback
 *   entryButton(kind, {label, cls}) -> <button> that opens the story (for Home cards)
 *   registerBuilder(kind, build)  registerBeatType(type, render)  kit (STORY_KIT)
 *   registerKind(kind, {label, view, dark, load, ai, details})  a kind whose data the page builds
 *                           (the money story: open('money', {period, ref, variant}))
 *   timing (STORY_TIMING)  speeds (STORY_SPEEDS)  labels (STORY_LABELS)
 *   state() -> {open, kind, state, muted, volume, index, count, loading, error}
 *   setVolume(0..1)         narration volume (persisted; applies at once)
 * The overlay is a body-level element (.story); <html> gets .story-open while it shows.
 */
function storyPlayedToday(kind) { try { return localStorage.getItem('dashboard-story-played-' + kind) === todayStrSafe(); } catch (e) { return false; } }
const Story = Object.freeze({
  open: (kind, o) => storyOpen(kind, o), close: () => storyClose(), isOpen: () => storyIsOpen(), kind: () => (_story.open ? _story.kind : null),
  play: () => STORY_PLAYER.toggle(), toggle: () => STORY_PLAYER.toggle(), next: () => STORY_PLAYER.next(), prev: () => STORY_PLAYER.prev(),
  replay: () => STORY_PLAYER.replay(), toggleMute: () => STORY_PLAYER.toggleMute(), setSpeed: (x) => STORY_PLAYER.setSpeed(x),
  openDetails: () => storyOpenDetails(), autoOpen: (kind) => storyAutoOpen(kind), playedToday: storyPlayedToday, prefetch: () => storyPrefetchDue(),
  entryButton: (kind, o) => storyEntryButton(kind, o),
  setVolume: (v) => STORY_PLAYER.setVolume(v), state: () => storyState(),
  registerBuilder: storyRegisterBuilder, registerBeatType: storyRegisterBeatType, registerKind: storyRegisterKind,
  kit: STORY_KIT, timing: STORY_TIMING, speeds: STORY_SPEEDS, labels: STORY_LABELS,
});
if (typeof window !== 'undefined') window.Story = Story;

/* ---------- Settings > Home and stories: the story rows ---------- */
function _stFillVoices(sel) {
  const cur = storyPrefs().voiceName;
  const list = storyNarrator().voices();
  sel.innerHTML = '';
  const auto = document.createElement('option'); auto.value = ''; auto.textContent = list.length ? 'Automatic (best British voice)' : 'No voices on this computer'; sel.appendChild(auto);
  for (const v of list) { const o = document.createElement('option'); o.value = v.name; o.textContent = `${v.name}${v.local ? '' : ' (online)'}`; sel.appendChild(o); }
  sel.value = list.some(v => v.name === cur) ? cur : '';
}
function storySettingsRows(el) {
  const p = storyPrefs();
  // Settings re-renders after each save, so the Story / Page buttons, the switch
  // and the sliders show what was saved (they did not change on screen before).
  const save = (patch, msg) => settingsSaveConfig({ brief: { story: patch } }, msg === undefined ? 'Saved' : msg).then(ok => { if (ok && _story.narrator) storyNarrator(); if (ok) render(); return ok; });
  const h = document.createElement('h3'); h.className = 'set-subhead'; h.textContent = 'Story and narration';
  el.appendChild(h);
  el.appendChild(_settingsRow('The first visit of the day opens as', 'Story: full screen with a Play button (your day in three sentences, read out, with scenes and the people you will see). Page: Home, with Play my morning at the top.', _settingsSeg([['story', 'Story'], ['page', 'Page']], p.autoOpen ? 'story' : 'page', (k) => save({ autoOpen: k === 'story' }))));
  el.appendChild(_settingsRow('Read it out', 'Read stories using the narration voice below. Captions are always on screen; M mutes while it plays. The browser voice keeps stories moving when ElevenLabs is unavailable or its limit is reached.', _settingsSwitch(p.voice, 'Read it out', (on) => { _stSaveUi({ muted: !on }); save({ voice: on }); })));
  const sel = document.createElement('select'); sel.className = 'control control-sm'; sel.setAttribute('data-story-voices', ''); sel.setAttribute('aria-label', 'Voice');
  _stFillVoices(sel);
  sel.addEventListener('change', () => save({ voiceName: sel.value }));
  el.appendChild(_settingsRow('Browser voice', 'Also used as the fallback. Local voices keep text on this computer; a voice marked (online) sends text to the browser maker’s speech service. Automatic prefers a natural British voice.', sel));
  const slider = (label, key, min, max, step, fmt) => {
    const wrap = document.createElement('div'); wrap.className = 'st-set-slider';
    const r = document.createElement('input'); r.type = 'range'; r.min = String(min); r.max = String(max); r.step = String(step); r.value = String(p[key]); r.setAttribute('aria-label', label);
    const out = document.createElement('output'); out.textContent = fmt(p[key]);
    r.addEventListener('input', () => { out.textContent = fmt(Number(r.value)); });
    r.addEventListener('change', () => { if (key === 'volume') _stSaveUi({ volume: Number(r.value) }); save({ [key]: Number(r.value) }); });
    wrap.append(r, out);
    return wrap;
  };
  el.appendChild(_settingsRow('Speaking rate', null, slider('Speaking rate', 'rate', 0.6, 1.6, 0.05, (v) => v.toFixed(2) + '×')));
  el.appendChild(_settingsRow('Pitch', null, slider('Pitch', 'pitch', 0.6, 1.4, 0.05, (v) => v.toFixed(2))));
  el.appendChild(_settingsRow('Volume', null, slider('Volume', 'volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%')));
  el.appendChild(_settingsRow('Story speed', 'How quickly the moments move on (also in the player).', _settingsSeg(STORY_SPEEDS.map(s => [String(s), s + '×']), String(p.speed), (k) => { _stSaveUi({ speed: Number(k) }); save({ speed: Number(k) }); })));
  if (typeof SETTINGS_MODELS !== 'undefined') el.appendChild(_settingsRow('Model for the story script', 'Claude writes natural narration from your day, with tone, pacing and pauses. A built-in script plays until it is ready.', _settingsSelect(SETTINGS_MODELS, p.model, (v) => save({ model: v }))));
  const test = document.createElement('button'); test.type = 'button'; test.className = 'btn btn-secondary btn-sm';
  test.innerHTML = _stIcon('play') + '<span>Test the voice</span>';
  test.addEventListener('click', () => {
    const nar = storyCreateNarrator({ synth: _stSynth(), Utterance: window.SpeechSynthesisUtterance || null, prefs: { voiceName: p.voiceName, rate: p.rate, pitch: p.pitch, volume: p.volume } });
    if (!nar.canSpeak()) { toast('No English voice is installed on this computer, so stories show captions only.', { kind: 'err' }); return; }
    nar.prime();
    nar.speak(`Good morning${userName() ? ', ' + userName() : ''}. Here is your day in three sentences.`, { speed: 1 });
  });
  if (typeof storyWeekSettingsRows === 'function') storyWeekSettingsRows(el);   // 79-story-weekly.js
  el.appendChild(_settingsRow('Try the browser voice', null, test));
  if (typeof renderStoryVoiceSettings === 'function') renderStoryVoiceSettings(el);
}
