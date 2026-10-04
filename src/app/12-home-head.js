/* ============================================================
   HOME's HEAD: what sits above the widgets on the Today tab. Owner: Brief + Review.
   The Morning brief and Home became one page (user request, 4 Oct): the top of Home
   is the brief's hero at its full size (74-brief-ui.js briefRender: the greeting
   over the weather sky, the day in three sentences), with:
     - Play my morning, big, in the hero (homeHeadPlayRow). It plays the story INSIDE
       the page (Story.open('morning', {container})) with its own controls (play/pause,
       back, next, read aloud, full screen, stop); Full screen zooms it up
       (Story.expand) and Esc there brings it back. Re-renders carry the player along
       (Story.attach). A phone, or an engine without inline play: full screen;
     - the stage of the inline story (homeHeadStage), between the hero and the three
       sentences, only while it plays;
     - Ideas for today (homeHeadIdeas): the suggestions engine's cards for the brief
       and the hero (sgCards 'brief' + 'hero', minus the ones the Suggestions widget
       already shows), else the story's own suggestions, each with one action.
   The tabs (Today / Evening / Week / History) are 77-brief-review.js; the board of
   widgets under all this is 12-home.js. CSS: 13-home-head.css.
   Reduced motion / Animations off: the story opens on its poster frames; nothing loops.
   ============================================================ */

/* Lucide geometry (ISC, vendor/icons/Lucide-LICENSE.txt). Trusted constant markup. */
const _HD_SVG = {
  play: '<path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5Z"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>',
  prev: '<path d="M18 19.5 9 12l9-7.5v15Z"/><path d="M6 5v14"/>',
  next: '<path d="m6 4.5 9 7.5-9 7.5v-15Z"/><path d="M18 5v14"/>',
  vol: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mute: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m22 9-6 6M16 9l6 6"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
};
function _hdSvg(name, cls) { return `<svg class="i hd-i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${_HD_SVG[name] || ''}</svg>`; }

let _hd = { play: null, st: null, quiet: false, focusPlay: false, stageW: 0, story: null, storyAt: 0, storyLoading: false };

function _hdStory() { return typeof window !== 'undefined' && window.Story && typeof window.Story.open === 'function' ? window.Story : null; }
function _hdInline() { const st = _hdStory(); return !!(st && typeof st.attach === 'function' && typeof st.expand === 'function'); }
function _hdReduced() {
  if (window.Motion && typeof Motion.prefersReduced === 'function' && Motion.prefersReduced()) return true;
  return typeof animEnabled === 'function' ? !animEnabled() : false;
}
function _hdRoot() { const r = document.querySelector('#main-body .home-head'); return r && state.view === 'home' ? r : null; }
/** Repaint the Play row and the stage in place (never the whole page: the widgets hold still). */
function _hdRepaint() {
  const root = _hdRoot();
  if (!root) return;
  const row = root.querySelector('.bf-play-row');
  if (row) homeHeadPlayRow(row);
  const old = root.querySelector(':scope > [data-region="stage"]');
  const next = homeHeadStage();
  if (old && next) old.replaceWith(next);
  else if (old) old.remove();
  else if (next) { const ai = root.querySelector(':scope > [data-region="ai"]'); root.insertBefore(next, ai || null); }
  homeHeadAttach(root);
}

/* ---------- Play my morning (in the hero) ---------- */
function homeHeadPlayRow(row) {
  if (!row) return;
  row.innerHTML = '';
  const st = _hdStory();
  if (!st) { row.hidden = true; return; }
  row.hidden = false;
  const playing = !!_hd.play;
  const played = typeof st.playedToday === 'function' && st.playedToday('morning');
  const b = document.createElement('button'); b.type = 'button';
  b.className = 'btn btn-lg hd-play' + (playing ? ' is-playing' : '');
  const label = playing ? 'Playing' : played ? 'Replay my morning' : 'Play my morning';
  b.innerHTML = `${_hdSvg('play')}<span>${esc(label)}</span>`;
  b.setAttribute('aria-label', playing ? 'Your morning story is playing below' : `${label}: your morning story, here on Home`);
  b.setAttribute('data-tip', 'Plays here. Full screen with the button beside it');
  if (playing) b.setAttribute('aria-disabled', 'true');
  b.onclick = () => { if (!_hd.play) _hdPlay(); };
  row.appendChild(b);
  const x = document.createElement('button'); x.type = 'button'; x.className = 'btn btn-ghost btn-icon hd-full';
  x.innerHTML = icon('maximize-2'); x.setAttribute('aria-label', 'Play my morning full screen'); x.setAttribute('data-tip', 'Full screen');
  x.onclick = () => _hdFullScreen();
  row.appendChild(x);
  if (_hd.focusPlay) { _hd.focusPlay = false; requestAnimationFrame(() => { try { b.focus({ preventScroll: true }); } catch (e) { /* gone */ } }); }
}

/* ---------- the story, inline ---------- */
function _hdPlay() {
  const st = _hdStory();
  if (!st) return;
  // An older engine, or a phone (a window-shaped stage would fill the screen anyway): full screen.
  if (!_hdInline() || window.innerWidth < 600) { st.open('morning', { autoplay: true }); return; }
  const root = _hdRoot();
  if (!root) { st.open('morning', { autoplay: true }); return; }
  _hd.play = { kind: 'morning', starting: true };
  _hd.st = null;
  _hd.stageW = Math.max(0, root.clientWidth - 32);                          // the player's side padding
  _hdRepaint();                                                             // paints the stage host
  const host = root.querySelector('.hd-stage');
  if (!host) { _hd.play = null; st.open('morning', { autoplay: true }); return; }
  st.open('morning', { container: host, autoplay: true, onState: _hdOnState, onClose: _hdOnClose });
  if (_hd.play) _hd.play.starting = false;
  const box = root.querySelector('.hd-player');
  if (box && !_hdReduced()) try { box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { /* old engine */ }
  const tog = root.querySelector('.hd-tog'); if (tog) try { tog.focus({ preventScroll: true }); } catch (e) { /* gone */ }
}
function _hdFullScreen() {
  const st = _hdStory(); if (!st) return;
  if (_hd.play && _hdInline() && st.isInline()) { st.expand(); return; }
  if (_hd.play) _hdStop(true);
  st.open('morning', { autoplay: true });
}
function _hdStop(quiet) {
  const st = _hdStory();
  _hd.play = null;
  if (!st || !st.isOpen() || !(_hdInline() && st.isInline())) { if (!quiet) _hdRepaint(); return; }
  _hd.quiet = !!quiet;
  try { st.close(); } finally { _hd.quiet = false; }
  if (!quiet) { _hd.focusPlay = true; _hdRepaint(); }
}
function _hdOnState(s) {
  const prev = _hd.st;
  _hd.st = s;
  if (!_hd.play) return;
  if (prev ? prev.expanded !== s.expanded : s.expanded) {
    _hdRepaint();
    // Back from full screen: keyboard focus lands on the stage's own Full screen button.
    if (prev && prev.expanded && !s.expanded) { const r = _hdRoot(); const b = r && r.querySelector('.hd-exp'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { /* gone */ } }
    return;
  }
  _hdSyncCtrl(s);
}
function _hdOnClose() {
  _hd.st = null;
  if (_hd.quiet) return;
  _hd.play = null;
  _hd.focusPlay = true;
  _hdRepaint();
}
/** The stage (and its controls) while the story plays here; null otherwise. */
function homeHeadStage() {
  const st = _hdStory();
  if (!_hd.play || !st) return null;
  if (!_hd.play.starting && !st.isOpen()) { _hd.play = null; return null; }   // it ended somewhere else
  const s = _hd.st || (st.state ? st.state() : {});
  const box = document.createElement('section'); box.className = 'hd-player' + (s.expanded ? ' is-away' : ''); box.dataset.region = 'stage';
  box.setAttribute('aria-label', 'Your morning story');
  const stage = document.createElement('div'); stage.className = 'hd-stage';
  if (s.expanded) stage.innerHTML = `<div class="hd-away">${typeof animSceneHtml === 'function' ? animSceneHtml('idea', { size: 'lg' }) : ''}<b>Playing full screen</b><span>Esc brings it back here.</span></div>`;
  // The stage's height from the start (the engine sets the same): no jump when it starts.
  else if (_hd.stageW && typeof storyInlineFit === 'function') stage.style.height = storyInlineFit(_hd.stageW, window.innerWidth, window.innerHeight).height + 'px';
  box.appendChild(stage);
  const bar = document.createElement('div'); bar.className = 'hd-ctrl'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Story controls');
  const btn = (cls, html, label, run) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'hd-cb ' + cls; b.innerHTML = html; b.setAttribute('aria-label', label); b.setAttribute('data-tip', label); b.onclick = run; bar.appendChild(b); return b; };
  btn('hd-prev', _hdSvg('prev'), 'Back', () => st.prev());
  btn('hd-tog', _hdSvg('pause', 'hd-i-pause') + _hdSvg('play', 'hd-i-play'), 'Pause', () => st.toggle());
  btn('hd-next', _hdSvg('next'), 'Next', () => st.next());
  btn('hd-mute', _hdSvg('vol', 'hd-i-vol') + _hdSvg('mute', 'hd-i-mute'), 'Read aloud', () => st.toggleMute());
  bar.insertAdjacentHTML('beforeend', '<span class="hd-pos" aria-live="off"></span><span class="spacer"></span>');
  if (s.expanded) btn('hd-back', icon('minimize-2'), 'Back to Home', () => st.collapse());
  else btn('hd-exp', icon('maximize-2'), 'Full screen', () => st.expand());
  btn('hd-stop', _hdSvg('stop'), 'Stop', () => _hdStop(false));
  box.appendChild(bar);
  // Keys while focus is on the controls: arrows step, M mutes, F full screen, Esc stops.
  bar.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    const run = k === 'ArrowRight' ? () => st.next() : k === 'ArrowLeft' ? () => st.prev() : (k === 'm' || k === 'M') ? () => st.toggleMute() : (k === 'f' || k === 'F') ? () => (s.expanded ? null : st.expand()) : k === 'Escape' ? () => _hdStop(false) : null;
    if (run) { e.preventDefault(); e.stopPropagation(); run(); }
  });
  _hdSyncCtrl(s, box);
  return box;
}
/** After the head is on the page: the player moves into the fresh stage (a re-render carries it along). */
function homeHeadAttach(root) {
  const st = _hdStory();
  const stage = root && root.querySelector('.hd-stage');
  if (stage && st && _hdInline() && st.isOpen() && st.isInline()) st.attach(stage, { onState: _hdOnState, onClose: _hdOnClose });
}
function _hdSyncCtrl(s, scope) {
  const r = _hdRoot();
  const box = scope || (r && r.querySelector('.hd-player'));
  if (!box || !s) return;
  const playing = s.state === 'playing';
  box.classList.toggle('is-paused', !playing);
  box.classList.toggle('is-muted', !!s.muted);
  const tog = box.querySelector('.hd-tog');
  if (tog) { const l = playing ? 'Pause' : s.state === 'ended' ? 'Replay' : 'Play'; tog.setAttribute('aria-label', l); tog.setAttribute('data-tip', l); }
  const mu = box.querySelector('.hd-mute');
  if (mu) { mu.setAttribute('aria-pressed', s.muted ? 'true' : 'false'); const l = s.muted ? 'Read aloud' : 'Mute'; mu.setAttribute('aria-label', l); mu.setAttribute('data-tip', l); }
  const pos = box.querySelector('.hd-pos');
  if (pos) pos.textContent = s.loading ? 'Loading…' : s.error ? 'Could not load' : s.count && s.index >= 0 ? `${s.index + 1} of ${s.count}` : '';
}
/** Home is left: a story playing on Home stops; one expanded to full screen carries on. */
function homeHeadUnmount() {
  const st = _hdStory();
  if (_hd.play && st && _hdInline() && st.isOpen() && st.isInline() && !st.isExpanded()) _hdStop(true);
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
