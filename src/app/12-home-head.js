/* ============================================================
   HOME's HEAD: what sits above the widgets on the Today tab. Owner: Brief + Review.
   The Morning brief and Home became one page (user request, 4 Oct): the top of Home
   is the brief's hero at its full size (74-brief-ui.js briefRender: the greeting
   over the weather sky, the day in three sentences), with:
     - Play my morning, big, in the hero (homeHeadPlayRow). It ALWAYS opens the big
       full-screen player (Story.open('morning')); the story never plays in a small
       box on Home (user request, 4 Oct: the inline / minimised mode is gone);
     - Ideas for today (homeHeadIdeas): the suggestions engine's cards for the brief
       and the hero (sgCards 'brief' + 'hero', minus the ones the Suggestions widget
       already shows), else the story's own suggestions, each with one action.
   The tabs (Today / Evening / Week / History) are 77-brief-review.js; the board of
   widgets under all this is 12-home.js. CSS: 13-home-head.css.
   ============================================================ */

/* Lucide geometry (ISC, vendor/icons/Lucide-LICENSE.txt). Trusted constant markup. */
const _HD_SVG = {
  play: '<path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5Z"/>',
};
function _hdSvg(name, cls) { return `<svg class="i hd-i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${_HD_SVG[name] || ''}</svg>`; }

let _hd = { story: null, storyAt: 0, storyLoading: false };

function _hdStory() { return typeof window !== 'undefined' && window.Story && typeof window.Story.open === 'function' ? window.Story : null; }
function _hdRoot() { const r = document.querySelector('#main-body .home-head'); return r && state.view === 'home' ? r : null; }

/* ---------- Play my morning (in the hero): always the full-screen player ---------- */
function homeHeadPlayRow(row) {
  if (!row) return;
  row.innerHTML = '';
  const st = _hdStory();
  if (!st) { row.hidden = true; return; }
  row.hidden = false;
  const played = typeof st.playedToday === 'function' && st.playedToday('morning');
  const b = document.createElement('button'); b.type = 'button';
  b.className = 'btn btn-lg hd-play';
  const label = played ? 'Replay my morning' : 'Play my morning';
  b.innerHTML = `${_hdSvg('play')}<span>${esc(label)}</span>`;
  b.setAttribute('aria-label', `${label}: your morning story, full screen`);
  b.onclick = () => st.open('morning', { autoplay: true });
  row.appendChild(b);
}

/* ---------- A welcome banner for another page (2.19.5: Money) ----------
   Home's hero (the weather sky, the greeting, one big button, a scene) for a page that is not Home, so
   Money greets you the same way: finance/39-board.js bdPaintHero. o: {date, greet, lead, line, sub,
   scene, caption: {why, title}, play: {label, run}, alt: {label, icon, run}, onHide}. All text is escaped here. */
function _hdSkyHtml(w) {
  const cond = w && w.current ? w.current.cond : 'none';
  const tod = typeof briefTod === 'function' ? briefTod(w, null) : 'day';
  return { cond, tod, dark: /night|evening|dusk/.test(tod) || /rain|thunder/.test(cond), html: typeof briefSkyHtml === 'function' ? briefSkyHtml(cond, tod) : '' };
}
function heroBannerEl(o) {
  o = o || {};
  const bfw = () => (typeof _bf !== 'undefined' && _bf && _bf.weather && _bf.weather.ok ? _bf.weather : null);
  const sky = _hdSkyHtml(bfw());
  const hero = document.createElement('section');
  hero.className = 'bf-hero is-page' + (sky.dark ? ' on-dark' : '');
  hero.dataset.tod = sky.tod; hero.dataset.cond = sky.cond;
  hero.setAttribute('aria-label', 'Welcome');
  const scene = o.scene && typeof animSceneHtml === 'function' ? animSceneHtml(o.scene, { size: 'hero', hero: true, label: o.caption && o.caption.title || '' }) : '';
  const cap = o.caption && o.caption.title ? `<figure class="bf-headline">${scene}<figcaption><span class="overline">${esc(o.caption.why || '')}</span><b>${esc(o.caption.title)}</b></figcaption></figure>` : '';
  hero.innerHTML = sky.html + `
    <div class="bf-hero-in">
      <div class="bf-hero-l">
        ${o.date ? `<div class="bf-date overline">${esc(o.date)}</div>` : ''}
        <h1 class="bf-greet">${esc(o.greet || '')}</h1>
        <p class="bf-key">${o.lead ? `<b class="num">${esc(o.lead)}</b> ` : ''}<span>${esc(o.line || '')}</span></p>
        ${o.sub ? `<p class="bf-key-sub">${esc(o.sub)}</p>` : ''}
        <div class="bf-play-row"></div>
      </div>
      ${cap ? `<div class="bf-hero-r">${cap}</div>` : ''}
    </div>`;
  const row = hero.querySelector('.bf-play-row');
  if (o.play && typeof o.play.run === 'function') {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-lg hd-play';
    b.innerHTML = `${_hdSvg('play')}<span>${esc(o.play.label || 'Play')}</span>`;
    b.setAttribute('aria-label', o.play.aria || o.play.label || 'Play');
    b.onclick = (e) => o.play.run(e, b);
    row.appendChild(b);
  }
  if (o.alt && typeof o.alt.run === 'function') {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn hd-alt';
    b.innerHTML = `${o.alt.icon && typeof icon === 'function' ? icon(o.alt.icon, 'i-sm') : ''}<span>${esc(o.alt.label || '')}</span>`;
    if (o.alt.title) b.title = o.alt.title;
    b.onclick = (e) => o.alt.run(e, b);
    row.appendChild(b);
  }
  if (!row.firstChild) row.remove();
  if (typeof o.onHide === 'function') {
    const x = document.createElement('button'); x.type = 'button'; x.className = 'bf-hide';
    x.title = 'Hide this banner (More brings it back)'; x.setAttribute('aria-label', 'Hide this banner');
    x.innerHTML = typeof icon === 'function' ? icon('x', 'i-sm') : '×';
    x.onclick = (e) => o.onHide(e, x);
    hero.appendChild(x);
  }
  // The sky wants the weather: fetch it once (Home's cache), then repaint the sky only.
  if (!bfw() && typeof briefLoadWeather === 'function') {
    briefLoadWeather().then(() => {
      const w = bfw(); if (!w || !hero.isConnected) return;
      const s2 = _hdSkyHtml(w), old = hero.querySelector(':scope > .bf-sky');
      if (!old || !s2.html) return;
      const t = document.createElement('template'); t.innerHTML = s2.html;
      if (t.content.firstElementChild) old.replaceWith(t.content.firstElementChild);
      hero.classList.toggle('on-dark', s2.dark); hero.dataset.tod = s2.tod; hero.dataset.cond = s2.cond;
    }).catch(() => { /* no weather: the clear sky stays */ });
  }
  if (typeof animLivingPaint === 'function') { try { animLivingPaint(hero); } catch (e) { /* the light is a bonus */ } }
  if (typeof animActivate === 'function') { try { animActivate(hero); } catch (e) { /* scenes stay still */ } }
  return hero;
}

/* ---------- Ideas for today ---------- */
/** The story's model for today (its suggestions are the fallback ideas); cached 10 minutes. */
function _hdStoryData() {
  const fresh = _hd.story && Date.now() - _hd.storyAt < 10 * 60 * 1000 && (!_hd.story.date || _hd.story.date === todayStr());
  if (!fresh && !_hd.storyLoading && typeof _serverAvailable !== 'undefined' && _serverAvailable) {
    _hd.storyLoading = true;
    fetch('/api/story?kind=morning', { cache: 'no-store', headers: { Accept: 'application/json' } }).then(r => (r.ok ? r.json() : null)).catch(() => null).then(j => {
      _hd.storyLoading = false; _hd.storyAt = Date.now();
      const had = JSON.stringify(_hd.story && _hd.story.data && _hd.story.data.suggestions || null);
      _hd.story = j && j.data ? j : _hd.story;
      if (JSON.stringify(_hd.story && _hd.story.data && _hd.story.data.suggestions || null) !== had) _hdRepaintIdeas();
    });
  }
  return fresh && _hd.story && _hd.story.data ? _hd.story : null;
}
function _hdRepaintIdeas() {
  const root = _hdRoot(); if (!root) return;
  const old = root.querySelector(':scope > .hd-ideas');
  const next = homeHeadIdeas();
  if (old && next) old.replaceWith(next); else if (old) old.remove(); else if (next) root.appendChild(next);
}
function homeHeadIdeas() {
  const max = 2;
  // The suggestions engine (68-suggest-ui.js): its cards for the brief and the hero, drawn by its
  // own card (primary = the normal editor prefilled; ✓ = as it is, with Undo).
  const cardEl = typeof sgCardEl === 'function' ? sgCardEl : typeof sgCard === 'function' ? sgCard : null;
  let cards = null;
  try {
    if (cardEl && typeof sgCards === 'function') {
      // A card the Suggestions widget already shows on this board is not repeated here.
      const sw = typeof homeLayout === 'function' ? homeLayout().widgets.find(w => w.id === 'suggest') : null;
      const there = sw && !sw.hidden ? new Set(sgCards('home').map(c => c.key)) : new Set();
      const seen = new Set();
      cards = [...sgCards('hero'), ...sgCards('brief')].filter(c => c && !there.has(c.key) && !seen.has(c.key) && seen.add(c.key)).slice(0, max);
      if (!cards.length) cards = null;
    }
  } catch (e) { cards = null; }
  const wrap = document.createElement('section'); wrap.className = 'hd-ideas';
  wrap.innerHTML = `<header class="hd-ideas-h">${icon('lightbulb', 'i-sm')}<h2 class="overline">Ideas for today</h2><span class="spacer"></span></header>`;
  // The day adviser (12-home-advisor.js) starts from here: one button, not a card of its own until it has something to say.
  const think = typeof homeAdvisorButton === 'function' ? homeAdvisorButton() : null;
  if (think) wrap.firstChild.appendChild(think);
  const row = document.createElement('div'); row.className = 'hd-idea-row';
  if (cards) {
    row.classList.add('is-engine');
    for (const c of cards) { try { const el = cardEl(c, { surface: 'brief', size: 'row' }); if (el) row.appendChild(el); } catch (e) { console.error('[home ideas] card', e); } }
  } else {
    const p = _hdStoryData();
    const list = p && Array.isArray(p.data.suggestions) ? p.data.suggestions : [];
    for (const s of list.slice(0, max)) { const el = _hdIdea(s, p); if (el) row.appendChild(el); }
  }
  if (!row.firstChild && !think) return null;
  [...row.children].forEach((c, i) => c.style.setProperty('--i', i));
  if (row.firstChild) wrap.appendChild(row);
  return wrap;
}
const _HD_IDEA_ICON = { gap: 'calendar-plus', 'follow-up': 'users', prep: 'list-checks', weather: 'umbrella', overdue: 'circle-alert', focus: 'target', roll: 'arrow-right', tomorrow: 'sunrise', top: 'flag', capacity: 'calendar-range', pattern: 'lightbulb', deadline: 'hourglass', chase: 'hourglass' };
/** One of the story's suggestions with ONE action that opens the normal editor or page, prefilled. */
function _hdIdea(s, p) {
  if (!s || !s.text) return null;
  const minute = Clock.parts(Clock.now()).min;
  for (const ref of s.refs || []) {
    if (ref.type === 'time' && /^\d{1,2}:\d{2}$/.test(ref.ref)) {
      const [h, m] = ref.ref.split(':').map(Number);
      if (h * 60 + m < minute) return null;
    }
  }
  const ref = (type) => (s.refs || []).find(r => r && r.type === type);
  const task = ref('task') || ref('deadline'), ev = ref('event');
  let act = null;
  if (s.kind === 'gap') {
    const tm = ref('time');
    const g = (p.data.gaps || []).find(x => tm && x.start === tm.ref);
    const hm = (t) => { const x = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return x ? Number(x[1]) * 60 + Number(x[2]) : null; };
    const gm = g ? { start: hm(g.start), end: hm(g.end), minutes: Number(g.minutes) || 60 } : null;
    if (gm && gm.start !== null) act = { label: 'Block it', icon: 'calendar-plus', run: (b) => _hdBlock(gm, b) };
  } else if (ev) act = { label: 'Open', icon: 'calendar', run: (b) => (typeof homeCalOpenEvent === 'function' ? homeCalOpenEvent(ev.ref, b) : null) };
  else if (task && getItem(task.ref)) act = { label: 'Open', icon: 'arrow-right', run: (b) => homeOpenTask(task.ref, b) };
  else if (s.kind === 'overdue') act = { label: 'See them', icon: 'arrow-right', run: () => setView('today') };
  else if (s.kind === 'roll') act = { label: 'Roll over', icon: 'arrow-right', run: () => setView('home:evening') };
  const el = document.createElement('article'); el.className = 'hd-idea';
  el.innerHTML = `<span class="hd-ii">${icon(_HD_IDEA_ICON[s.kind] || 'sparkles')}</span><p>${esc(s.text)}</p>`;
  if (act) el.appendChild(uiButton({ label: act.label, icon: act.icon, size: 'sm', bubble: true, run: (e, b) => act.run(b) }));
  return el;
}
/** A free stretch: the event editor opens on it, prefilled (the user adjusts, then Saves). */
function _hdBlock(g, from) {
  const f0 = typeof homeFocusTasks === 'function' ? homeFocusTasks(1)[0] : null;
  const title = f0 ? `Focus: ${effTitle(f0.i)}` : 'Focus time';
  const len = Math.min(g.minutes, 120);
  const start = `${todayStr()}T${homeHM(g.start)}`, end = `${todayStr()}T${homeHM(g.start + len)}`;
  if (typeof openEvent === 'function' && typeof evcOpenCreate === 'function' && window.CalWrite) {
    openEvent(null, { from, context: 'home', create: { title, start, end, relatedTaskId: f0 ? f0.i.id : '', origin: 'brief' } });
    return;
  }
  if (typeof tcOpenCreate === 'function') tcOpenCreate({ title, date: todayStr(), time: homeHM(g.start), minutes: len });
}
