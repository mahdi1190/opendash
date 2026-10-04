/* ============================================================
   MORNING STORY (owner: Morning story). The full-screen "Start my day" story
   on the Story engine (79-story-engine.js): greeting and weather, the day in
   three sentences read aloud as big kinetic type with entity chips (avatars,
   event scenes, times, weather) and a hero scene that follows the voice, the
   timeline with the "next" pulse, people today and why they matter, the focus
   three with subtasks and folders, deadlines + countdowns + money, ideas and
   "Let's go". The order, palette and pace follow the kind of day
   (79-story-morning-logic.js decides; this file draws).

   Beat types (registered on the engine): m-greet m-say m-day m-people m-focus
   m-ahead m-go. Every renderer writes into the frame's layers, escapes all
   text, returns a cleanup, keeps at most ANIM_MAX_LIVE scenes looping and does
   nothing that moves under .st-still (reduced motion / animations off).
   Styles: src/styles/79-story-morning.css (scoped to .story[data-kind=morning]).
   ============================================================ */

/* ---------- the page's live facts for the pure builder ---------- */
function _smOpts(ctx) {
  const d = (ctx && ctx.data) || {};
  const now = Clock.parts(Clock.now());
  const today = typeof todayStrSafe === 'function' ? todayStrSafe() : '';
  const nowMin = d.date && d.date === today ? now.h * 60 + now.mi : smMin(d.now);
  let countdowns = [];
  try {
    countdowns = (typeof tbList === 'function' ? tbList() : []).filter(w => w && w.type === 'countdown' && w.date && w.date >= (d.date || today))
      .map(w => ({ id: 'cd:' + w.id, label: w.label || w.title || '', date: w.date }));
  } catch (e) { countdowns = []; }
  return {
    nowMin, countdowns,
    itemInfo: (id) => {
      const it = typeof getItem === 'function' ? getItem(id) : null;
      if (!it) return null;
      const sid = typeof effStream === 'function' ? effStream(it) : it.stream;
      const st = typeof STREAMS !== 'undefined' && sid ? STREAMS[sid] : null;
      let folder = null;
      if (typeof resFor === 'function') {
        const all = [...resFor('task', id), ...(sid ? resFor('stream', sid) : [])];
        const r = all.find(x => x && x.kind === 'folder') || resFor('task', id)[0] || null;
        if (r) folder = { id: r.id, label: typeof rsrcDisplayLabel === 'function' ? rsrcDisplayLabel(r) : (r.label || ''), kind: r.kind, icon: typeof rsrcIcon === 'function' ? rsrcIcon(r) : 'folder' };
      }
      return { subtasks: typeof effSubtasks === 'function' ? effSubtasks(it) : it.subtasks, estimate: it.estimate, color: st && typeof safeColor === 'function' ? safeColor(st.color) : null, folder };
    },
    personNote: (id) => {
      const p = typeof getPerson === 'function' ? getPerson(id) : null;
      const n = p && Array.isArray(p.notes) ? p.notes.find(x => x && x.text) : null;
      return n ? n.text : '';
    },
  };
}
storyRegisterBuilder('morning', (ctx) => {
  // The suggestions engine's ideas (68-suggest-ui.js) join the close beat's ideas.
  let data = ctx.data;
  if (typeof sgStoryIdeas === 'function' && data) { try { data = Object.assign({}, data, { engineIdeas: sgStoryIdeas('morning') }); } catch (e) { data = ctx.data; } }
  const beats = smBuildMorning(data, ctx.script, _smOpts(ctx));
  const kind = smDayKind(ctx.data);
  const palette = (ctx.script && ctx.script.palette) || smPalette(kind, ctx.data && ctx.data.tod);
  for (const b of beats) b.bg = Object.assign({ palette }, b.bg || {});
  return beats;
});

/* ---------- small helpers ---------- */
const _SM_MAX_LIVE = typeof ANIM_MAX_LIVE === 'number' ? ANIM_MAX_LIVE : 6;
function _smColour(type) { try { return 'var(--sw-' + animScene(type).colour + ')'; } catch (e) { return 'var(--accent)'; } }
function _smAv(p, size) { return STORY_KIT.avatarHtml(p ? { id: p.id, name: p.name || p.first || '?', color: p.color, avatarUrl: p.avatarUrl, kind: p.kind } : { name: '?' }, size); }
function _smPersonColour(p) { return typeof pplAvatarColor === 'function' ? pplAvatarColor(p && p.color) : 'var(--accent)'; }
function _smStill() { return storyReduced(); }
/** A cleanup bag: timers, intervals, listeners, observers. */
function _smBag() {
  const fns = [];
  return {
    t(fn, ms) { const h = setTimeout(fn, ms); fns.push(() => clearTimeout(h)); return h; },
    iv(fn, ms) { const h = setInterval(fn, ms); fns.push(() => clearInterval(h)); return h; },
    on(el, ev, fn, o) { el.addEventListener(ev, fn, o); fns.push(() => el.removeEventListener(ev, fn, o)); },
    add(fn) { fns.push(fn); },
    done() { for (const f of fns.splice(0)) { try { f(); } catch (e) { /* ignore */ } } },
  };
}
/**
 * Scenes start looping as their card lands (data-land ms on the card), at most
 * ANIM_MAX_LIVE at once, only visible ones; nothing loops when still.
 */
function _smLive(f, bag) {
  requestAnimationFrame(() => {
    const all = [f.scene, f.type, f.cards].flatMap(l => [...l.querySelectorAll('.anim-scene')]);
    all.forEach(s => s.classList.remove('is-live'));
    // The poster's scene is hidden once playing: it should not count against the limit.
    f.root.querySelectorAll('.st-poster .anim-scene.is-live').forEach(s => s.classList.remove('is-live'));
    if (_smStill()) return;
    let n = 0;
    for (const s of all) {
      if (n >= _SM_MAX_LIVE) break;
      if (!s.offsetParent || s.closest('.sm-ent-wait')) continue;
      n++;
      const host = s.closest('[data-land]');
      const at = host ? Number(host.dataset.land) || 0 : 0;
      bag.t(() => { if (s.isConnected) s.classList.add('is-live'); }, at);
    }
  });
}
/** Scale the beat down when it would not fit between the progress bar and the controls. */
function _smFit(f, sel, bag) {
  const el = f.cards.querySelector(sel) || f.type.querySelector(sel);
  if (!el) return;
  const host = el.parentElement;
  const fit = () => {
    if (!el.isConnected) return;
    el.style.removeProperty('--sm-fit');
    const cs = getComputedStyle(host);
    const avail = host.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const need = el.offsetHeight;
    if (avail > 40 && need > avail) el.style.setProperty('--sm-fit', String(Math.max(0.55, Math.floor(avail / need * 1000) / 1000)));
  };
  fit();
  let raf = 0;
  bag.on(window, 'resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });
  if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(fit);
}
/** Clicking or typing in a beat's controls pauses auto-advance (the story waits). */
function _smHoldOnTouch(f, bag) {
  bag.on(f.cards, 'pointerdown', (e) => { if (e.target.closest('button, a, input, textarea, select') && _story.tl && _story.tl.state === 'playing') STORY_PLAYER.toggle(); });
}
/**
 * Cards that light up as the narration names them: items [{sel, needle}] where needle is
 * the words in beat.say that stand for the card (a first name, a title). The engine marks
 * the caption's words (.st-caption .st-w[data-c], is-now) for the voice or the timed
 * captions alike; the card whose words are being read gets .is-named, and the others
 * step back a little (.sm-naming on the beat) until the narration moves past them.
 */
function _smFollowSay(f, b, bag, items) {
  const say = String((b && (b.caption || b.say)) || '');
  const cap = f.root.querySelector('.st-caption');
  if (!say || !cap) return;
  const spans = [];
  for (const it of items || []) {
    const n = String(it.needle || '').trim();
    if (!n) continue;
    // Whole words only ("Al" never lights up for "all").
    const m = new RegExp(`(^|[^\\p{L}\\p{N}])(${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}\\p{N}])`, 'iu').exec(say);
    if (m) { const at = m.index + m[1].length; spans.push({ sel: it.sel, from: at, to: at + m[2].length }); }
  }
  if (!spans.length) return;
  const host = f.cards.querySelector('.sm');
  let cur = null;
  const set = (sp) => {
    if (sp === cur) return;
    cur = sp;
    f.cards.querySelectorAll('.is-named').forEach(x => x.classList.remove('is-named'));
    if (host) host.classList.toggle('sm-naming', !!sp);
    if (sp) f.cards.querySelectorAll(sp.sel).forEach(x => x.classList.add('is-named'));
  };
  const mo = new MutationObserver(() => {
    const now = cap.querySelector('.st-w.is-now');
    if (!now) return;
    const c = Number(now.dataset.c);
    // A name stays lit until the next one is read; the end of the narration lets go.
    const hit = spans.find(s => c >= s.from && c < s.to);
    if (hit) set(hit);
  });
  mo.observe(cap, { subtree: true, attributes: true, attributeFilter: ['class'] });
  bag.add(() => { mo.disconnect(); set(null); });
  // When the narration ends, nothing stays singled out.
  const end = new MutationObserver(() => { if (cap.querySelectorAll('.st-w').length && !cap.querySelector('.st-w:not(.is-said):not(.is-now)') && cap.querySelector('.st-w:last-child.is-now')) bag.t(() => set(null), 900); });
  end.observe(cap, { subtree: true, attributes: true, attributeFilter: ['class'] });
  bag.add(() => end.disconnect());
}
/** Leave the story and go somewhere in the app. */
function _smGo(fn) { storyClose(); setTimeout(() => { try { fn(); } catch (e) { console.error('[morning story]', e); } }, 0); }
/** One confetti burst a day (transform + opacity only). */
function _smConfetti(host, bag) {
  if (_smStill() || !host) return;
  const k = 'dashboard-story-confetti';
  try { if (localStorage.getItem(k) === todayStrSafe()) return; localStorage.setItem(k, todayStrSafe()); } catch (e) { return; }
  const box = document.createElement('div'); box.className = 'sm-confetti'; box.setAttribute('aria-hidden', 'true');
  const cols = ['var(--sw-pink)', 'var(--sw-amber)', 'var(--sw-indigo)', 'var(--sw-teal)', 'var(--sw-violet)', 'var(--sw-green)', 'var(--sw-orange)'];
  let html = '';
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2 + (i % 3) * 0.17, r = 120 + (i * 53 % 160);
    html += `<i style="--tx:${(Math.cos(a) * r).toFixed(0)}px;--ty:${(Math.sin(a) * r * 0.7 - 60).toFixed(0)}px;--r:${(i * 67) % 360}deg;--d:${(i % 5) * 40}ms;background:${cols[i % cols.length]}"></i>`;
  }
  box.innerHTML = html;
  host.appendChild(box);
  bag.t(() => box.remove(), 1900);
}

/**
 * The first story ever (per browser): a quiet tip under the progress bar saying how to
 * drive it, for a few seconds, once. Any of those keys or a click dismisses it early.
 */
function _smHint(f, bag) {
  const k = 'dashboard-story-hint';
  // Phones: tapping through a story needs no telling (and there is no room above the weather).
  if (window.matchMedia && window.matchMedia('(max-width: 700px)').matches) return;
  try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch (e) { return; }
  const kbd = (s) => `<kbd>${esc(s)}</kbd>`;
  const tip = document.createElement('p');
  tip.className = 'sm-hint'; tip.setAttribute('role', 'note');
  tip.innerHTML = `<span>${kbd('Space')} pause</span><span>${kbd('←')}${kbd('→')} move between moments</span><span>${kbd('M')} sound</span><span>or click anywhere for the next</span>`;
  f.cards.appendChild(tip);
  const go = () => { if (tip.isConnected) { tip.classList.add('is-out'); bag.t(() => tip.remove(), 420); } };
  bag.t(go, 7600);
  bag.on(document, 'keydown', go, true);
  bag.on(f.root, 'pointerdown', go, true);
}

/* ---------- 1. greeting + weather ---------- */
storyRegisterBeatType('m-greet', (f, b, ctx) => {
  const m = b.m || {}, bag = _smBag(), g = m.greeting || {}, w = m.weather;
  f.root.dataset.day = m.kind || 'normal';
  const comma = g.line.indexOf(', ');
  const lines = comma > 0 ? [g.line.slice(0, comma + 1), g.line.slice(comma + 2) + '.'] : [g.line + '.'];
  const over = [STORY_KIT.fmtDay(m.date), w && w.place].filter(Boolean).join(' · ');
  const facts = (m.facts || []).map((x, i) => `<span class="sm-pill sm-in${x.tone ? ' is-' + escAttr(x.tone) : ''}" style="--i:${5 + i}">${icon(x.icon, 'i-sm')}${esc(x.text)}</span>`).join('');
  const rain = w && w.rain;
  const hl = w ? [w.hi !== null && w.hi !== undefined ? `H ${_bfDeg(w.hi)}` : '', w.lo !== null && w.lo !== undefined ? `L ${_bfDeg(w.lo)}` : '', rain ? `${rain.word} from ${rain.hour}` : ''].filter(Boolean).join(' · ') : '';
  const hours = w && w.hours && w.hours.length ? w.hours.map((h, i) => `<div class="sm-h${h.now ? ' is-now' : ''}${h.rain >= 50 || /rain|showers|drizzle|thunder|snow/.test(h.cond) ? ' is-wet' : ''}${h.ev.length ? ' has-ev' : ''}" style="--i:${i}${h.ev.length ? ';--c:' + _smColour(h.ev[0]) : ''}">
      <span class="t">${esc(h.label)}</span>${briefWxIcon(h.cond, true, 'sm-hwx' + (/rain|showers|drizzle|thunder/.test(h.cond) ? ' rain' : h.cond === 'clear' ? ' sun' : ''))}
      <b class="num">${h.temp === null ? '–' : esc(h.temp + '°')}</b><span class="rb"><i style="--r:${(h.rain / 100).toFixed(2)}"></i></span><span class="rp">${h.rain >= 30 ? esc(h.rain + '%') : ''}</span></div>`).join('') : '';
  f.cards.innerHTML = `<div class="sm sm-greet${w ? '' : ' no-wx'}">
    <div class="sm-g-main">
      <div class="sm-ov sm-in" style="--i:0">${esc(over)}</div>
      <h2 class="sm-hero-h">${lines.map((l, i) => `<span class="sm-line sm-in" style="--i:${1 + i}">${esc(l)}</span>`).join('')}</h2>
      ${g.lede ? `<p class="sm-lede sm-in" style="--i:4">${esc(g.lede)}</p>` : ''}
      ${facts ? `<div class="sm-facts">${facts}</div>` : ''}
    </div>
    ${w ? `<div class="sm-wx sm-in" style="--i:2">
        <div class="sm-temp"><b class="num" data-n="${escAttr(w.temp === null ? '' : w.temp)}">${w.temp === null ? '–' : esc(_smStill() ? w.temp : 0)}</b><span>°</span></div>
        <div class="sm-cond">${briefWxIcon(w.cond, w.isDay, 'sm-cwx')}<span>${esc(w.label || '')}</span></div>
        ${hl ? `<div class="sm-hl">${esc(hl)}</div>` : ''}
      </div>` : `<div class="sm-g-scene sm-in" style="--i:2" data-land="300">${animSceneHtml(b.scene || 'idea', { size: 'hero', hero: true })}</div>`}
    ${hours ? `<div class="sm-hours sm-glass" style="--n:${w.hours.length}">${hours}</div>` : ''}
  </div>`;
  const t = f.cards.querySelector('.sm-temp b[data-n]');
  if (t && t.dataset.n !== '') STORY_KIT.countUp(t, Number(t.dataset.n), { delay: 260, duration: 900 });
  if (m.confetti) bag.t(() => _smConfetti(f.cards.querySelector('.sm-g-main'), bag), 650);
  _smHint(f, bag);
  // "...with showers from 3 pm": the wet hours in the strip light up as the voice says it.
  if (w && w.rain) _smFollowSay(f, b, bag, [{ sel: '.sm-h.is-wet', needle: `${w.rain.word} from` }]);
  _smFit(f, '.sm', bag);
  _smLive(f, bag);
  return () => bag.done();
});

/* ---------- 2. the day in sentences ---------- */
const _SM_ENT_ICON = { deadline: 'hourglass', time: 'clock', place: 'map-pin', money: 'coins' };
/** The glyph inside an entity chip (avatar, scene, ring or icon). Trusted markup only. */
function _smEntGlyph(type, ref, ctx) {
  if (type === 'person') { const p = ctx.person(ref); return `<span class="sm-eg sm-eg-av">${_smAv(p || { name: '?' }, 40)}</span>`; }
  if (type === 'event') { const e = ctx.event(ref); return animSceneHtml(e ? e.type : 'event', { size: 'sm', cls: 'sm-eg' }); }
  if (type === 'task') {
    const info = _smOpts(ctx).itemInfo(ref);
    return `<span class="sm-eg sm-eg-ring" style="--c:${escAttr((info && info.color) || 'var(--st-task)')}"></span>`;
  }
  if (type === 'weather') return `<span class="sm-eg sm-eg-wx">${briefWxIcon(ref, true, /rain|showers|drizzle|thunder/.test(ref) ? 'rain' : ref === 'clear' ? 'sun' : '')}</span>`;
  return `<span class="sm-eg sm-eg-ic">${icon(_SM_ENT_ICON[type] || 'sparkles')}</span>`;
}
/** What the hero tile shows for an entity: {html, label, c (its glow colour)}. */
function _smHeroFor(type, ref, ctx, text) {
  const h = _smHeroFor0(type, ref, ctx, text);
  if (!h.c) {
    if (type === 'person') h.c = _smPersonColour(ctx.person(ref));
    else if (type === 'event') { const e = ctx.event(ref); h.c = _smColour(e ? e.type : 'event'); }
    else if (type === 'time') { const e = (ctx.data.events || []).find(x => x.start === ref && x.date === ctx.data.date); h.c = e ? _smColour(e.type) : 'var(--st-time)'; }
    else if (type === 'task') { const info = _smOpts(ctx).itemInfo(ref); h.c = (info && info.color) || 'var(--st-task)'; }
    else h.c = { deadline: 'var(--st-deadline)', weather: 'var(--info)', money: 'var(--st-money)', place: 'var(--st-place)' }[type] || 'var(--accent)';
  }
  return h;
}
function _smHeroFor0(type, ref, ctx, text) {
  const scene = (t) => animSceneHtml(t, { size: 'hero', hero: true, cls: 'sm-hero-sc' });
  if (type === 'person') {
    const p = ctx.person(ref);
    const ev = p && (p.meetings || []).find(m => m.date === (ctx.data && ctx.data.date));
    return { html: `<span class="sm-hero-av" style="--c:${escAttr(_smPersonColour(p))}">${_smAv(p || { name: text }, 120)}</span>`, label: p ? [p.first || p.name, ev && ev.start ? ev.start : p.role].filter(Boolean).join(' · ') : text };
  }
  if (type === 'event') { const e = ctx.event(ref); return { html: scene(e ? e.type : 'event'), label: e ? [smShort(e.title, 28), e.allDay ? 'all day' : e.start].filter(Boolean).join(' · ') : text }; }
  if (type === 'task') { const t = ctx.task(ref); return { html: scene(t && t.type ? t.type : 'task'), label: t ? [smShort(t.title, 28), t.stream].filter(Boolean).join(' · ') : text }; }
  if (type === 'deadline') { const t = ctx.task(ref); return { html: scene('deadline'), label: t ? `${smShort(t.title, 28)}${t.due ? ' · ' + STORY_KIT.fmtDue(t.due, ctx) : ''}` : text }; }
  if (type === 'time') {
    const e = (ctx.data.events || []).find(x => x.start === ref && x.date === ctx.data.date);
    return e ? { html: scene(e.type), label: `${smShort(e.title, 28)} · ${ref}` } : { html: `<span class="sm-hero-ic">${icon('clock')}</span>`, label: ref };
  }
  if (type === 'weather') return { html: `<span class="sm-hero-ic is-wx">${briefWxIcon(ref, true, /rain|showers|drizzle|thunder/.test(ref) ? 'rain' : ref === 'clear' ? 'sun' : '')}</span>`, label: text };
  if (type === 'money') return { html: scene('finance'), label: text };
  if (type === 'place') return { html: scene('travel'), label: text };
  return { html: scene('idea'), label: text };
}
storyRegisterBeatType('m-say', (f, b, ctx) => {
  const m = b.m || {}, bag = _smBag();
  const fwd = (Number(f.type.style.getPropertyValue('--dir')) || 1) > 0;
  const len = String(b.text || '').length;
  const pips = Array.from({ length: m.n }, (_, k) => `<i class="${k < m.i ? 'is-done' : k === m.i ? 'is-cur' : ''}"></i>`).join('');
  f.type.innerHTML = `<div class="sm sm-sayw">
    <div class="sm-pips"><span class="sm-ov">Your day in ${esc(smNum(m.n))} ${m.n === 1 ? 'sentence' : 'sentences'}</span><span class="sm-pip">${pips}</span></div>
    ${m.prev.length ? `<div class="sm-trail${fwd ? ' is-fwd' : ''}">${m.prev.map((t, k) => `<p style="--k:${m.prev.length - 1 - k}">${esc(t)}</p>`).join('')}</div>` : ''}
    <p class="sm-say ${len > 170 ? 'is-long' : len > 110 ? 'is-mid' : ''}" data-caption="1">${STORY_KIT.sentenceHtml(b.text || '', b.entities || [], { step: 22 })}</p>
  </div>`;
  const ents = [...f.type.querySelectorAll('.sm-say .st-ent')];
  for (const el of ents) {
    const [type, ...rest] = String(el.dataset.key || '').split('|');
    el.classList.add('sm-ent');
    const w0 = el.querySelector('.st-w'); if (w0) el.style.setProperty('--i', w0.style.getPropertyValue('--i') || '0');
    el.insertAdjacentHTML('afterbegin', _smEntGlyph(type, rest.join('|'), ctx));
    if (type === 'task') { const ring = el.querySelector('.sm-eg-ring'); if (ring) el.style.setProperty('--c', ring.style.getPropertyValue('--c')); }
    if (!_smStill()) el.classList.add('sm-ent-wait');
    // Punctuation right after a chip ("10:30,") sits outside the pill, on the same line;
    // a possessive stays inside it ("Sam's" reads as one name).
    const tail0 = el.querySelector('.st-tail');
    const tail = tail0 && !/^['’]s/.test(tail0.textContent) ? tail0 : null;
    if (tail) { const wrap = document.createElement('span'); wrap.className = 'sm-nw'; el.replaceWith(wrap); wrap.append(el); wrap.append(tail); tail.style.setProperty('--i', el.style.getPropertyValue('--i') || '0'); }
  }
  // The hero tile: the first thing the sentence names, then whatever the voice reaches.
  const first = (b.entities || []).find(e => ['event', 'person', 'task', 'deadline'].includes(e.type)) || (b.entities || [])[0];
  const h0 = first ? _smHeroFor(first.type, first.ref, ctx, first.text) : { html: animSceneHtml(m.fallbackScene || 'idea', { size: 'hero', hero: true, cls: 'sm-hero-sc' }), label: '' };
  const c0 = h0.c || 'var(--accent)';
  f.scene.innerHTML = `<div class="sm-herobox" data-land="500" style="--c:${escAttr(c0)}"><i class="sm-aura" style="--c:${escAttr(c0)}"></i><div class="sm-hero-tile"><i class="sm-hero-ring"></i><div class="sm-face is-on">${h0.html}</div></div><div class="sm-hero-lbl">${esc(h0.label)}</div></div>`;
  // The big sentence is the caption; while the voice reads, a small waveform says so.
  if (_story.tl && !_story.tl.muted) f.cards.innerHTML = '<div class="sm-wave" aria-hidden="true"><span class="bars">' + [6, 10, 14, 8, 12, 7, 11].map((h, k) => `<b style="--h:${h}px;--k:${k}"></b>`).join('') + '</span>Reading aloud</div>';
  const tile = f.scene.querySelector('.sm-hero-tile'), lbl = f.scene.querySelector('.sm-hero-lbl');
  let heroKey = first ? first.type + '|' + first.ref : '';
  const swap = (key, text) => {
    if (key === heroKey) return;
    heroKey = key;
    const [type, ...rest] = key.split('|');
    const h = _smHeroFor(type, rest.join('|'), ctx, text);
    const face = document.createElement('div'); face.className = 'sm-face is-in'; face.innerHTML = h.html;
    tile.querySelectorAll('.sm-face').forEach(x => { x.classList.remove('is-on', 'is-in'); x.classList.add('is-out'); bag.t(() => x.remove(), 460); });
    tile.appendChild(face);
    face.querySelectorAll('.anim-scene').forEach(s => { if (!_smStill()) s.classList.add('is-live'); });
    lbl.textContent = h.label;
    lbl.classList.remove('is-in'); void lbl.offsetWidth; lbl.classList.add('is-in');
    // The glow follows the colour of what was just named.
    const box = f.scene.querySelector('.sm-herobox');
    if (box) {
      box.querySelectorAll('.sm-aura').forEach(a => { a.classList.add('is-out'); bag.t(() => a.remove(), 520); });
      const aura = document.createElement('i'); aura.className = 'sm-aura is-in'; aura.style.setProperty('--c', h.c || 'var(--accent)');
      box.prepend(aura);
      box.style.setProperty('--c', h.c || 'var(--accent)');
    }
  };
  // The voice drives everything: chips pop when spoken, the hero follows, the pip fills.
  const words = [...f.type.querySelectorAll('.sm-say .st-w')];
  const pip = f.type.querySelector('.sm-pip .is-cur');
  const seen = new Set();
  let boosted = false;
  const sync = () => {
    for (const el of ents) {
      if (!el.classList.contains('is-hot') || seen.has(el)) continue;
      seen.add(el);
      el.classList.remove('sm-ent-wait');
      if (!_smStill()) { el.classList.add('sm-pop'); const sc = el.querySelector('.anim-scene'); if (sc && document.querySelectorAll('.story .anim-scene.is-live').length < _SM_MAX_LIVE + 1) sc.classList.add('is-live'); }
      const key = el.dataset.key || '';
      const type = key.split('|')[0];
      if (type !== 'time' || !heroKey) swap(key, el.textContent.trim());
      if (type === 'weather' && !boosted && /rain|showers|drizzle|thunder/.test(key)) { boosted = true; f.root.classList.add('sm-rain-boost'); bag.t(() => f.root.classList.remove('sm-rain-boost'), 2000); }
    }
    if (words.length) {
      const p = words.filter(w => w.classList.contains('is-said') || w.classList.contains('is-now')).length / words.length;
      if (pip) pip.style.setProperty('--p', String(p));
      if (ring) ring.style.setProperty('--sm-p', p.toFixed(3));
    }
  };
  const ring = f.scene.querySelector('.sm-hero-ring');
  const mo = new MutationObserver(sync);
  mo.observe(f.type, { subtree: true, attributes: true, attributeFilter: ['class'] });
  bag.add(() => mo.disconnect());
  bag.add(() => f.root.classList.remove('sm-rain-boost'));
  // A rainy sentence (without a weather chip) still nudges the sky once.
  if (m.rain && !ents.some(e => /^weather\|/.test(e.dataset.key || ''))) bag.t(() => { f.root.classList.add('sm-rain-boost'); bag.t(() => f.root.classList.remove('sm-rain-boost'), 2000); }, 1400);
  _smFit(f, '.sm', bag);
  _smLive(f, bag);
  return () => bag.done();
});

/* ---------- 3. the shape of today ---------- */
function _smPeopleOf(ev, ctx) { return (ev.people || []).map(id => ctx.person(id)).filter(Boolean); }
function _smNextText(tl) {
  if (!tl.next) return '';
  if (tl.next.on) return 'now';
  const m = tl.next.mins;
  return m < 60 ? `in ${m} min` : `in ${smDur(m)}`;
}
storyRegisterBeatType('m-day', (f, b, ctx) => {
  const m = b.m || {}, tl = m.tl, bag = _smBag();
  const span = tl.to - tl.from;
  const pct = (min) => Math.max(0, Math.min(100, (min - tl.from) / span * 100));
  const nx = tl.next && tl.events.find(e => e.id === tl.next.id);
  const nxWho = m.nextWho ? ctx.person(m.nextWho) : null;
  const pill = nx ? `<div class="sm-next sm-in" style="--i:2"><i class="lv"></i>${nxWho ? _smAv(nxWho, 30) : animSceneHtml(nx.type, { size: 'xs' })}<b>Next: ${esc(nxWho ? nxWho.first || nxWho.name : smShort(nx.title, 26))}</b><span class="cd num">${esc(_smNextText(tl))}</span></div>` : '';
  const where = (e) => {
    const who = _smPeopleOf(e, ctx);
    if (who.length) return `${_smAv(who[0], 20)}<span>${esc(who.length > 1 ? `${who[0].first || who[0].name} +${who.length - 1}` : (e.location ? smClip(e.location, 26) : who[0].first || who[0].name))}</span>`;
    if (e.location) return `${icon('map-pin', 'i-sm')}<span>${esc(smClip(e.location, 28))}</span>`;
    if (e.joinUrl) return `${icon('video', 'i-sm')}<span>Video call</span>`;
    return '';
  };
  const card = (e, i) => `<article class="sm-tc sm-glass${tl.next && tl.next.id === e.id ? ' is-next' : ''}${tl.nowMin !== null && e.endMin <= tl.nowMin ? ' is-past' : ''}" data-id="${escAttr(e.id)}" data-land="${560 + i * 90}" style="--i:${i};--c:${_smColour(e.type)}">
      ${animSceneHtml(e.type, { size: 'lg' })}<div class="tx"><span class="tm num">${esc(e.start)}${e.end ? ' – ' + esc(e.end) : ''}</span><b>${esc(smShort(e.title, 60))}</b>${where(e) ? `<span class="wh">${where(e)}</span>` : ''}</div></article>`;
  const ticks = [];
  for (let h = Math.ceil(tl.from / 60); h * 60 <= tl.to; h += span > 12 * 60 ? 3 : 2) ticks.push(`<span class="sm-tick num" style="left:${pct(h * 60)}%">${String(h % 24).padStart(2, '0')}:00</span>`);
  const allDay = tl.allDay.length ? `<div class="sm-allday sm-in" style="--i:3"><span class="lb">All day</span>${tl.allDay.slice(0, 4).map(e => `<span class="sm-pill">${animSceneHtml(e.type, { size: 'xs' })}${esc(smShort(e.title, 34))}</span>`).join('')}</div>` : '';
  const gaps = tl.gaps.map(g => `<div class="sm-gap${g.best ? ' is-best' : ''}" style="left:${pct(g.startMin)}%;width:${pct(g.endMin) - pct(g.startMin)}%"><span>${esc(`Free ${smDur(g.minutes)}${g.best ? ' · best for focus' : ''}`)}</span></div>`).join('');
  // Phone: one list in time order, with the free stretches in place.
  const rows = [];
  let gi = 0;
  const gl = tl.gaps.slice().sort((a, b2) => a.startMin - b2.startMin);
  tl.events.forEach((e, i) => {
    while (gi < gl.length && gl[gi].startMin <= e.startMin) { const g = gl[gi++]; rows.push(`<li class="sm-lg sm-in${g.best ? ' is-best' : ''}" style="--i:${rows.length + 3}">${icon('sun', 'i-sm')}${esc(`Free ${smDur(g.minutes)} from ${g.start}${g.best ? ' · best for focus' : ''}`)}</li>`); }
    rows.push(`<li class="sm-li sm-in" style="--i:${rows.length + 3}">${card(e, i)}</li>`);
  });
  while (gi < gl.length) { const g = gl[gi++]; rows.push(`<li class="sm-lg sm-in${g.best ? ' is-best' : ''}" style="--i:${rows.length + 3}">${icon('sun', 'i-sm')}${esc(`Free ${smDur(g.minutes)} from ${g.start}${g.best ? ' · best for focus' : ''}`)}</li>`); }
  f.cards.innerHTML = `<div class="sm sm-day${tl.events.length ? '' : ' is-open'}">
    <div class="sm-head"><div><div class="sm-ov sm-in" style="--i:0">Today</div><h2 class="sm-h1 sm-in" style="--i:1">${esc(tl.title)}</h2></div>${pill}</div>
    ${allDay}
    ${tl.events.length || tl.gaps.length ? `<div class="sm-track${tl.events.length ? '' : ' is-free'}" aria-hidden="true">
      <div class="sm-trk"></div>${tl.nowMin !== null && tl.nowMin > tl.from ? `<div class="sm-past" style="width:${pct(tl.nowMin)}%"></div>` : ''}
      ${tl.events.map(e => `<div class="sm-blk${tl.nowMin !== null && e.endMin <= tl.nowMin ? ' is-past' : ''}" style="left:${pct(e.startMin)}%;width:${Math.max(0.6, pct(e.endMin) - pct(e.startMin))}%;--c:${_smColour(e.type)}"></div>`).join('')}
      ${gaps}${ticks.join('')}
      ${tl.nowMin !== null && tl.nowMin >= tl.from && tl.nowMin <= tl.to ? `<div class="sm-now" style="left:${pct(tl.nowMin)}%"><i class="pulse"></i></div>` : ''}
      <div class="sm-cards-up"></div><div class="sm-cards-dn"></div>
    </div>` : ''}
    <ol class="sm-tl-list">${rows.join('')}</ol>
  </div>`;
  // Desktop: cards above and below the track, never overlapping.
  const track = f.cards.querySelector('.sm-track');
  const layout = () => {
    if (!track || !track.isConnected || !track.offsetParent) return;
    const W = track.clientWidth;
    const lay = smLanes(tl.events.map(e => ({ id: e.id, anchor: pct(e.startMin) / 100 * W })), W);
    const CH = SM_TL.cardH, gapY = 14, T = lay.lanes.up ? 30 + lay.lanes.up * CH + (lay.lanes.up - 1) * gapY : 26;
    track.style.setProperty('--T', T + 'px');
    track.style.height = (T + (lay.lanes.dn ? 58 + lay.lanes.dn * CH + (lay.lanes.dn - 1) * gapY : 52)) + 'px';
    const byId = new Map(tl.events.map((e, i) => [e.id, [e, i]]));
    let html = '';
    for (const c of lay.cards) {
      const [e, i] = byId.get(c.id);
      const up = c.lane.startsWith('up'), row = c.lane.endsWith('2') ? 1 : 0;
      const top = up ? T - 30 - CH - row * (CH + gapY) : T + 58 + row * (CH + gapY);
      const cx = Math.max(c.left + 14, Math.min(c.left + SM_TL.cardW - 14, c.anchor));
      const conn = up ? `top:${top + CH}px;height:${T - top - CH - 4}px` : `top:${T + 10}px;height:${top - T - 10}px`;
      html += `<i class="sm-conn${up ? ' up' : ''}" style="left:${cx}px;${conn};--c:${_smColour(e.type)};--i:${i}"></i><div class="sm-slot" style="left:${c.left}px;top:${top}px">${card(e, i)}</div>`;
    }
    if (lay.hidden.length) html += `<span class="sm-more" style="top:${T + 22}px">+${lay.hidden.length} more</span>`;
    track.querySelector('.sm-cards-up').innerHTML = html;
  };
  layout();
  bag.on(window, 'resize', () => { layout(); _smLive(f, bag); });
  // The "next" minutes tick on their own, once a minute.
  if (nx) {
    const cd = f.cards.querySelector('.sm-next .cd');
    const t0 = Date.now(), m0 = tl.next.mins;
    bag.iv(() => { if (document.hidden || !cd.isConnected) return; const mins = m0 - Math.floor((Date.now() - t0) / 60000); cd.textContent = tl.next.on || mins <= 0 ? 'now' : mins < 60 ? `in ${mins} min` : `in ${smDur(mins)}`; }, 30000);
  }
  // "Next up, ..." lights the next card and the pill; "free from ..." the best free stretch.
  _smFollowSay(f, b, bag, [{ sel: '.sm-tc.is-next, .sm-next', needle: 'Next up' }, { sel: '.sm-gap.is-best, .sm-lg.is-best', needle: 'free from' }]);
  _smHoldOnTouch(f, bag);
  _smFit(f, '.sm', bag);
  _smLive(f, bag);
  return () => bag.done();
});

/* ---------- 4. people today ---------- */
storyRegisterBeatType('m-people', (f, b, ctx) => {
  const m = b.m || {}, bag = _smBag();
  const cards = (m.cards || []).map((p, i) => {
    const tagIc = p.tone === 'cel' ? 'cake' : p.tone === 'owe' ? 'hourglass' : 'clock';
    return `<article class="sm-pc sm-glass sm-in${p.tone ? ' tone-' + escAttr(p.tone) : ''}" style="--i:${2 + i};--c:${escAttr(_smPersonColour(p))}" data-land="${400 + i * 90}" data-k="${i}">
      <div class="sm-pc-top"><span class="sm-pc-av">${_smAv(p, 64)}</span><div class="nm"><b>${esc(p.name)}</b>${p.role ? `<span>${esc(smClip(p.role, 40))}</span>` : ''}</div></div>
      ${p.tag ? `<span class="sm-tag">${icon(tagIc, 'i-sm')}${esc(p.tag)}</span>` : ''}
      ${p.meet ? `<div class="sm-pc-when">${animSceneHtml(p.meet.type || 'meeting', { size: 'sm' })}<div><b>${esc(p.meet.allDay ? 'All day' : p.meet.start || '')} ${esc(p.meet.title)}</b><small>${esc([p.meet.where, p.lastSaid ? null : p.last].filter(Boolean).join(' · ') || (p.meet.end ? `until ${p.meet.end}` : ''))}</small></div></div>`
        : p.last ? `<div class="sm-pc-last">${icon('history', 'i-sm')}<span>${esc(smCap(p.last))}</span></div>` : ''}
      <div class="sm-pc-why"><span class="lb">Why it matters</span><p>${esc(p.why)}</p>${p.note ? `<q>${esc(p.note)}</q>` : ''}${p.more ? `<small>${esc(p.more)}</small>` : ''}</div>
      <div class="sm-pc-ft">${p.task ? `<button type="button" class="sm-btn is-pri" data-task="${escAttr(p.task.id)}" title="${escAttr(p.task.title)}">${icon('circle-check', 'i-sm')}<span>Open task</span></button>` : ''}<button type="button" class="sm-btn" data-person="${escAttr(p.id)}">${icon('user', 'i-sm')}<span>Profile</span></button></div>
    </article>`;
  }).join('');
  f.cards.innerHTML = `<div class="sm sm-people">
    <div class="sm-head"><div><div class="sm-ov sm-in" style="--i:0">People today</div><h2 class="sm-h1 sm-in" style="--i:1">${esc(m.title || 'People today')}</h2></div></div>
    <div class="sm-pcs" style="--n:${(m.cards || []).length}">${cards}</div>
    ${m.more ? `<p class="sm-foot sm-in" style="--i:7">${icon('users', 'i-sm')}<span>${esc(`and ${m.more} more on your mind today`)}</span></p>` : ''}
  </div>`;
  f.cards.querySelectorAll('[data-person]').forEach(x => x.addEventListener('click', () => _smGo(() => openPerson(x.dataset.person))));
  f.cards.querySelectorAll('[data-task]').forEach(x => x.addEventListener('click', () => _smGo(() => openTask(x.dataset.task))));
  // Each card lights up as the voice says the name.
  _smFollowSay(f, b, bag, (m.cards || []).map((p, i) => ({ sel: `.sm-pc[data-k="${i}"]`, needle: p.first })));
  _smHoldOnTouch(f, bag);
  _smFit(f, '.sm', bag);
  _smLive(f, bag);
  return () => bag.done();
});

/* ---------- 5. focus ---------- */
function _smRing(done, total) {
  if (!total) return '';
  const C = 113.1, p = done / total;
  return `<span class="sm-ring" aria-label="${escAttr(`${done} of ${total} steps done`)}"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="bg" cx="22" cy="22" r="18"/><circle class="fg" cx="22" cy="22" r="18" style="--C:${C};--off:${(C * (1 - p)).toFixed(1)}"/></svg><b class="num">${done}/${total}</b></span>`;
}
storyRegisterBeatType('m-focus', (f, b, ctx) => {
  const m = b.m || {}, bag = _smBag();
  const cards = (m.cards || []).map((c, i) => `<article class="sm-fc sm-glass sm-in${i === 0 ? ' is-first' : ''}" style="--i:${2 + i};--c:${escAttr(c.color || _smColour(c.type))}" data-land="${420 + i * 110}">
      <div class="hd"><span class="n num">${c.n}</span>${animSceneHtml(c.type, { size: 'md' })}<span class="sp"></span>${_smRing(c.done, c.total)}</div>
      <b class="ti" title="${escAttr(c.title)}">${esc(c.short)}</b>
      ${c.meta.length ? `<div class="meta"><i class="dot"></i>${esc(c.meta.join(' · '))}</div>` : ''}
      ${c.subs.length ? `<ul class="subs">${c.subs.map((s, k) => `<li class="${s.done ? 'd' : ''}${s.next ? ' nx' : ''}" style="--k:${k}"><span class="cb">${s.done ? icon('check', 'i-sm') : ''}</span><span>${esc(s.title)}</span></li>`).join('')}${c.more ? `<li class="more">+ ${c.more} more</li>` : ''}</ul>` : ''}
      <div class="ft">${c.folder ? `<button type="button" class="sm-folder" data-res="${escAttr(c.folder.id)}" title="${escAttr(c.folder.label)}">${icon(c.folder.kind === 'folder' ? 'folder-open' : c.folder.icon || 'link', 'i-sm')}<span>${esc(smClip(c.folder.label, 30))}</span></button>` : '<span></span>'}
        <button type="button" class="sm-btn${i === 0 ? ' is-pri' : ''}" data-task="${escAttr(c.id)}">${i === 0 ? _stIcon('play') : icon('external-link', 'i-sm')}<span>${i === 0 ? 'Start' : 'Open'}</span></button></div>
    </article>`).join('');
  f.cards.innerHTML = `<div class="sm sm-focus">
    <div class="sm-head"><div><div class="sm-ov sm-in" style="--i:0">Focus</div><h2 class="sm-h1 sm-in" style="--i:1">${esc((m.cards || []).length === 1 ? 'The one thing that matters today' : `${smCap(smNum((m.cards || []).length))} things that matter today`)}</h2></div></div>
    <div class="sm-fcs" style="--n:${(m.cards || []).length}">${cards}</div>
  </div>`;
  f.cards.querySelectorAll('[data-task]').forEach(x => x.addEventListener('click', () => _smGo(() => openTask(x.dataset.task))));
  f.cards.querySelectorAll('[data-res]').forEach(x => x.addEventListener('click', () => { if (typeof resOpen === 'function') resOpen(x.dataset.res); }));
  _smFollowSay(f, b, bag, [{ sel: '.sm-fc.is-first', needle: 'Start with' }]);
  _smHoldOnTouch(f, bag);
  _smFit(f, '.sm', bag);
  _smLive(f, bag);
  return () => bag.done();
});

/* ---------- 6. deadlines, countdowns, money ---------- */
/** Tick a number down from n + 7 to n (instant when still). */
function _smCountDown(el, n, bag, delay) {
  if (!el) return;
  if (_smStill() || !Number.isFinite(n)) { el.textContent = String(n); return; }
  const from = n + 7, t0 = performance.now() + (delay || 0), dur = 700;
  el.textContent = String(from);
  const tick = (t) => {
    if (!el.isConnected) return;
    const p = Math.max(0, Math.min(1, (t - t0) / dur));
    el.textContent = String(Math.round(from - 7 * (1 - Math.pow(1 - p, 3))));
    if (p < 1 && !document.hidden) requestAnimationFrame(tick); else el.textContent = String(n);
  };
  requestAnimationFrame(tick);
}
storyRegisterBeatType('m-ahead', (f, b, ctx) => {
  const m = b.m || {}, bag = _smBag();
  const cd = (x, hero, i) => x ? `<article class="sm-cd sm-glass sm-in${hero ? ' is-hero' : ''}${x.urgent ? ' is-urgent' : ''}" style="--i:${2 + i}" data-land="${400 + i * 100}" data-k="${i}">
      <div class="big"><span class="num${/^\d+$/.test(x.num) ? '' : ' is-word'}" data-n="${/^\d+$/.test(x.num) ? escAttr(x.num) : ''}">${esc(x.num)}</span>${x.unit ? `<span class="unit">${esc(x.unit)}</span>` : ''}</div>
      <div class="tx"><b>${esc(x.label)}</b><span>${esc(x.sub || '')}</span>${hero && x.progress !== null ? `<span class="bar"><i style="--p:${x.progress.toFixed(3)}"></i></span>` : ''}</div>
      <span class="ic">${animSceneHtml(x.urgent ? 'deadline' : x.type || 'deadline', { size: 'md', urgent: x.urgent })}</span></article>` : '';
  const mo = m.money;
  const money = mo ? `<article class="sm-mon sm-glass sm-in" style="--i:5" data-land="700">
      <div class="sm-ov">${esc(mo.title)}</div>
      <div class="left"><b class="num" data-amt="${mo.amount === null ? '' : escAttr(mo.amount)}">${esc(mo.big)}</b><small>${esc(mo.label)}</small></div>
      ${mo.bar ? `<div class="bud"><b style="--p:${mo.bar.pct.toFixed(3)}"></b><i style="left:${(mo.bar.pace * 100).toFixed(1)}%"></i></div>` : ''}
      ${mo.lines.map((l, k) => `<div class="ln" style="--k:${k}">${animSceneHtml(l.type, { size: 'xs' })}<span>${esc(l.k)}</span><b class="v num${l.good ? ' is-good' : ''}">${esc(l.v)}</b></div>`).join('')}
      ${mo.stale ? `<div class="stale">${icon('history', 'i-sm')}<span>${esc(`Bank data is ${mo.stale} days old`)}</span></div>` : ''}
    </article>` : '';
  const title = m.hero && mo ? 'Deadlines, money and what’s coming' : m.hero ? 'Coming up' : 'Money this month';
  f.cards.innerHTML = `<div class="sm sm-ahead${mo ? '' : ' no-money'}${m.hero ? '' : ' no-cds'}">
    <div class="sm-head"><div><div class="sm-ov sm-in" style="--i:0">Coming up</div><h2 class="sm-h1 sm-in" style="--i:1">${esc(title)}</h2></div></div>
    <div class="sm-ah">${m.hero ? `<div class="sm-cds${m.rest.length ? '' : ' solo'}">${cd(m.hero, true, 0)}${m.rest.map((x, i) => cd(x, false, i + 1)).join('')}</div>` : ''}${money}</div>
  </div>`;
  f.cards.querySelectorAll('.sm-cd .num[data-n]').forEach((el, i) => { if (el.dataset.n !== '') _smCountDown(el, Number(el.dataset.n), bag, 300 + i * 120); });
  const amt = f.cards.querySelector('.sm-mon [data-amt]');
  if (amt && amt.dataset.amt !== '' && mo.currency) {
    let fmt;
    try { const nf = new Intl.NumberFormat((APP_CONFIG && APP_CONFIG.locale) || 'en-GB', { style: 'currency', currency: mo.currency, maximumFractionDigits: Math.abs(mo.amount) >= 100 ? 0 : 2 }); fmt = (n) => nf.format(n); } catch (e) { fmt = null; }
    if (fmt) STORY_KIT.countUp(amt, Number(amt.dataset.amt), { delay: 760, duration: 900, format: fmt });
  }
  // Each date lights up as it is read; "money" lights the money card.
  _smFollowSay(f, b, bag, [
    ...(m.hero ? [{ sel: '.sm-cd[data-k="0"]', needle: smSayTitle(m.hero.label, 40) }] : []),
    ...(m.rest || []).map((x, i) => ({ sel: `.sm-cd[data-k="${i + 1}"]`, needle: smSayTitle(x.label, 40) })),
    { sel: '.sm-mon', needle: 'money' },
  ]);
  _smHoldOnTouch(f, bag);
  _smFit(f, '.sm', bag);
  _smLive(f, bag);
  return () => bag.done();
});

/* ---------- 7. ideas + Let's go ---------- */
function _smDoIdea(btn, x) {
  const a = x.act; if (!a) return;
  if (a.do === 'plan') {
    // Through the actions layer, with a toast and Undo (user request, 4 Oct: it did nothing).
    if (btn.getAttribute('aria-busy') === 'true' || btn.classList.contains('is-done')) return;
    const label = btn.innerHTML;
    btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
    const it = typeof getItem === 'function' ? getItem(a.ref) : null;
    const name = it && typeof effTitle === 'function' ? shortTitleSafe(effTitle(it)) : 'It';
    storyTaskOps([{ op: 'task.plan', id: a.ref, date: todayStrSafe() }], {
      done: `${name}: planned for today`, icon: 'sun',
      onUndo: () => { if (!btn.isConnected) return; btn.classList.remove('is-done'); btn.disabled = false; btn.innerHTML = label; },
    }).then((j) => {
      btn.removeAttribute('aria-busy');
      if (!j) { btn.disabled = false; return; }
      btn.classList.add('is-done');
      btn.innerHTML = `${icon('check', 'i-sm')}<span>Planned for today</span>`;
    });
    return;
  }
  if (a.do === 'task') return _smGo(() => openTask(a.ref));
  if (a.do === 'person') return _smGo(() => openPerson(a.ref));
  if (a.do === 'suggest' && typeof sgRunKey === 'function') return _smGo(() => sgRunKey(a.key));   // the card's button: its editor, prefilled
}
storyRegisterBeatType('m-go', (f, b, ctx) => {
  const m = b.m || {}, bag = _smBag();
  // "Plan for today" on a task that is already planned for today (or earlier) would change
  // nothing: offer to open it instead; a task that has gone (done, binned) offers nothing.
  const ideas = (m.ideas || []).map(x => {
    const a = x && x.act;
    if (!a || a.do !== 'plan') return x;
    const it = typeof getItem === 'function' ? getItem(a.ref) : null;
    if (!it || (typeof statusOf === 'function' && statusOf(a.ref) === 'done')) return Object.assign({}, x, { act: null });
    if (it.plannedFor && it.plannedFor <= todayStrSafe()) return Object.assign({}, x, { act: { label: 'Open it', icon: 'external-link', do: 'task', ref: a.ref } });
    return x;
  });
  const glyph = (x) => x.scene ? animSceneHtml(x.scene, { size: 'lg' }) : `<span class="sm-wxt">${briefWxIcon(x.cond || 'rain', true, 'rain')}</span>`;
  const kIc = { gap: 'clock', weather: 'umbrella', 'follow-up': 'send', prep: 'users', overdue: 'alarm-clock', focus: 'target' };
  f.cards.innerHTML = `<div class="sm sm-go${ideas.length ? '' : ' no-ideas'}">
    ${ideas.length ? `<div class="sm-head"><div><div class="sm-ov sm-in" style="--i:0">Ideas</div><h2 class="sm-h1 sm-in" style="--i:1">${esc(ideas.length === 1 ? 'One idea for today' : 'A few ideas for today')}</h2></div></div>
    <div class="sm-ideas" style="--n:${ideas.length}">${ideas.map((x, i) => `<article class="sm-idea sm-glass sm-in" style="--i:${2 + i}" data-land="${380 + i * 100}" data-k="${i}">
        ${glyph(x)}<div class="k">${icon(kIc[x.kind] || 'sparkles', 'i-sm')}<span>${esc(x.label)}</span></div>
        <b class="t">${esc(x.text)}</b>${x.detail ? `<p class="d">${esc(x.detail)}</p>` : ''}
        ${x.act ? `<div class="ft"><button type="button" class="sm-btn is-pri" data-i="${i}">${icon(x.act.icon || 'check', 'i-sm')}<span>${esc(x.act.label)}</span></button></div>` : ''}
      </article>`).join('')}</div>` : `<h2 class="sm-close-h sm-in" style="--i:0">${esc(m.closing || 'Have a good day.')}</h2>`}
    <div class="sm-letsgo sm-in" style="--i:${ideas.length + 3}"><button type="button" class="sm-gobtn">Let’s go${icon('arrow-right')}</button><button type="button" class="sm-btn sm-replay">${icon('rotate-ccw', 'i-sm')}<span>Replay</span></button></div>
  </div>`;
  f.cards.querySelectorAll('.sm-idea [data-i]').forEach(btn => btn.addEventListener('click', () => _smDoIdea(btn, ideas[Number(btn.dataset.i)])));
  f.cards.querySelector('.sm-gobtn').addEventListener('click', () => _smGo(() => { if (state.view !== 'home') setView('home'); }));
  f.cards.querySelector('.sm-replay').addEventListener('click', () => STORY_PLAYER.replay());
  _smFollowSay(f, b, bag, ideas.map((x, i) => ({ sel: `.sm-idea[data-k="${i}"]`, needle: x.say })));
  // The last beat waits: the button takes focus once it has risen (keyboard: Enter starts the day).
  bag.t(() => { const g = f.cards.querySelector('.sm-gobtn'); if (g && g.isConnected && f.root.contains(document.activeElement) && !document.activeElement.closest('.st-cards')) g.focus({ preventScroll: true }); }, 900);
  _smFit(f, '.sm', bag);
  _smLive(f, bag);
  return () => bag.done();
});

/* ---------- entry points ---------- */
/** "Start my day": the story over the brief page (Open details / Close land on it). */
function storyStartMyDay() {
  if (typeof briefOpen === 'function' && !String(state.view).startsWith('home')) briefOpen({ welcome: false });
  storyOpen('morning', { autoplay: true });
}
