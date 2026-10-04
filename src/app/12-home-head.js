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
  return _hd.story && _hd.story.data ? _hd.story : null;
}
function _hdRepaintIdeas() {
  const root = _hdRoot(); if (!root) return;
  const old = root.querySelector(':scope > .hd-ideas');
  const next = homeHeadIdeas();
  if (old && next) old.replaceWith(next); else if (old) old.remove(); else if (next) root.appendChild(next);
}
function homeHeadIdeas() {
  const max = 3;
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
  wrap.innerHTML = `<header class="hd-ideas-h">${icon('lightbulb')}<h2 class="overline">Ideas for today</h2></header>`;
  const row = document.createElement('div'); row.className = 'hd-idea-row';
  if (cards) {
    row.classList.add('is-engine');
    for (const c of cards) { try { const el = cardEl(c, { surface: 'brief', size: 'card' }); if (el) row.appendChild(el); } catch (e) { console.error('[home ideas] card', e); } }
  } else {
    const p = _hdStoryData();
    const list = p && Array.isArray(p.data.suggestions) ? p.data.suggestions : [];
    for (const s of list.slice(0, max)) { const el = _hdIdea(s, p); if (el) row.appendChild(el); }
  }
  if (!row.firstChild) return null;
  [...row.children].forEach((c, i) => c.style.setProperty('--i', i));
  wrap.appendChild(row);
  return wrap;
}
const _HD_IDEA_ICON = { gap: 'calendar-plus', 'follow-up': 'users', prep: 'list-checks', weather: 'umbrella', overdue: 'circle-alert', focus: 'target', roll: 'arrow-right', tomorrow: 'sunrise', top: 'flag', capacity: 'calendar-range', pattern: 'lightbulb', deadline: 'hourglass', chase: 'hourglass' };
/** One of the story's suggestions with ONE action that opens the normal editor or page, prefilled. */
function _hdIdea(s, p) {
  if (!s || !s.text) return null;
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
  if (act) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm';
    b.innerHTML = icon(act.icon) + `<span>${esc(act.label)}</span>`;
    b.onclick = () => act.run(b);
    el.appendChild(b);
  }
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
