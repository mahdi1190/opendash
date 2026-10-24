/* ============================================================
   WHAT'S NEW IN 2.16 (tour) + QUICK START (first run). Owner: Shell/Design.

   A data-driven registry: one entry per 2.16 feature. The dialog lists them by
   group; each has a "Show me" that opens the feature (a palette command), or
   goes to its view and puts a spotlight on its element. "Take the tour" walks
   the entries one by one with the spotlight. Features live in other modules
   (several landed in other branches), so nothing here is assumed to exist:
   a command, view or element that is not there is skipped silently, and an
   entry with nothing to show keeps only its description.

   Entry: { id, group, icon, title, text, note?, cmd?: [command ids], view?: [view
   names, first valid wins], mode?: 'kanban'|..., sel?: [CSS selectors], present?() }
     The element found is the first match of [data-whats-new~="<id>"] (a feature
     can mark its own control with that attribute), then each of sel.
     registerWhatsNew(entry) adds or replaces one (by id) from a feature module.

   Shown once, automatically, after updating to 2.16 (not to a brand-new user):
   state.seen.once['whatsNew:2.16'] (synced, 06-core-seen.js), so a computer that
   saw it does not show it on the other. Reopen: More / workspace menu > What's
   new, or the palette ("What's new"). Waits while the opening, a story, the
   brief, a dialog or the welcome set-up is on screen.

   QUICK START: after the welcome set-up (59-onboarding.js sets the per-browser
   flag 'dashboard-quickstart' before it reloads), a short card with three tips
   (add a task, search, make Home yours), each with a Show me. Skippable; never
   shown again on that browser.

     openWhatsNew({auto})      the dialog
     whatsNewShowMe(id)        open / spotlight one entry
     whatsNewTour()            the walk-through
     whatsNewSpotlight(el, o)  the ring + bubble on any element (o: {kicker, title, text, note, next, onEnd})
     openQuickStart()          the first-run card
   Styles: src/styles/95-whats-new.css. Reduced motion: no glides, no pulse.
   ============================================================ */
const WHATS_NEW_VERSION = '2.16';
const _WN_SEEN = 'whatsNew:2.16';
const _WN_QS_KEY = 'dashboard-quickstart';

const WHATS_NEW_GROUPS = Object.freeze([
  ['plan', 'Plan your days', 'calendar-range'],
  ['boards', 'Boards and lists', 'kanban'],
  ['capture', 'Capture in a flash', 'zap'],
  ['places', 'Places and memories', 'map-pin'],
  ['fun', 'Fun and motivation', 'party-popper'],
  ['money', 'Money', 'wallet'],
]);

const WHATS_NEW = [
  // ---- plan ----
  { id: 'week-timeline', group: 'plan', icon: 'calendar-range', title: 'Your week as a timeline',
    text: 'See the whole week laid out in one timeline. It sits where the Calendar link used to be, so planning is one click from any list.',
    cmd: ['view-mode-timeline'], view: ['week'], sel: ['.view-mode-toggle .mode[data-mode="timeline"]', '.view-mode-toggle'] },
  { id: 'priority-matrix', group: 'plan', icon: 'layout-grid', title: 'Priority matrix',
    text: 'Sort tasks into urgent and important at a glance, and move them between the four boxes as things change.',
    cmd: ['view-mode-matrix'], view: ['all'], sel: ['.view-mode-toggle .mode[data-mode="matrix"]', '.view-mode-toggle'] },
  { id: 'row-fields', group: 'plan', icon: 'sliders-horizontal', title: 'Choose what each row shows',
    text: 'Pick the details a task row shows, such as due date, people, tags or estimate, and keep the rest out of the way (Display › Show on rows).',
    view: ['all'], sel: ['#display-btn'] },
  { id: 'weekly-review', group: 'plan', icon: 'list-checks', title: 'A guided weekly review',
    text: 'A calm, step-by-step look back at your week and a gentle plan for the next one. Ten minutes, and you start Monday clear.',
    cmd: ['rf-weekly-review'], view: ['home'], sel: ['.hg-w[data-wid="review"]'] },
  { id: 'sweep', group: 'plan', icon: 'sunset', title: 'Today → Tomorrow sweep',
    text: 'At the end of the day, move what is left over to tomorrow in one go, or choose task by task. No more red overdue pile.',
    cmd: ['rf-sweep'], view: ['home'], sel: ['.hg-w[data-wid="review"]'] },
  { id: 'plan-week', group: 'plan', icon: 'calendar-days', title: 'Plan my week',
    text: 'Spread your tasks across the week with a suggested plan that respects your meetings. Tweak it, then save it in one click.',
    cmd: ['rf-plan-week'], view: ['home'], sel: ['.hg-w[data-wid="review"]'] },

  // ---- boards ----
  { id: 'boards', group: 'boards', icon: 'columns-3', title: 'Real boards',
    text: 'Choose the columns (status, priority, stream, tag, person, due date or your own), add swimlanes and soft limits, and save the boards you want to come back to.',
    cmd: ['new-board'], view: ['all'], mode: 'kanban', sel: ['.board-bar', '#sidebar [data-view^="taskboard:"]', '.view-mode-toggle .mode[data-mode="kanban"]'] },
  { id: 'waiting', group: 'boards', icon: 'hourglass', title: 'Waiting on people',
    text: 'Mark a task as waiting on someone. It shows on their card and on Home, so you know exactly who to chase and when.',
    cmd: ['rf-waiting'], view: ['waiting', 'home'], sel: ['#sidebar [data-view="waiting"]', '.hg-w[data-wid="waiting"]'] },
  { id: 'blocked', group: 'boards', icon: 'link', title: 'Blocked by',
    text: 'Say which task is holding another one up. Blocked tasks step aside until the way is clear, then come back on their own.',
    view: ['all'], sel: ['.rf-chip-block', '.rf-blocked'] },
  { id: 'cleanup', group: 'boards', icon: 'wand-sparkles', title: 'Clean-up helper',
    text: 'Finds stale, duplicate and dateless tasks and helps you tidy them up in a few clicks. Nothing goes without your say-so.',
    cmd: ['rf-cleanup'] },
  { id: 'smart-lists', group: 'boards', icon: 'list-filter', title: 'Smart lists',
    text: 'Save any filter as a list of its own, like “Quick wins” or “Work, due this week”, and keep it one click away in the sidebar.',
    cmd: ['smart-list-new'], sel: ['#sidebar [data-view^="list:"]'] },
  { id: 'sidebar', group: 'boards', icon: 'panel-left', title: 'A sidebar that’s yours',
    text: 'Reorder, hide, rename and pin what the sidebar shows, so the places you use most are always at the top.',
    cmd: ['sidebar-customise'], sel: ['#sidebar'] },

  // ---- capture ----
  { id: 'quick-add', group: 'capture', icon: 'message-circle', title: 'Type it the way you say it',
    text: 'Quick add understands things like “Call Sam tomorrow 3pm #admin !p1 ~30m @phone” and fills in the date, time, tag, priority, estimate and context for you.',
    cmd: ['new-task'] },
  { id: 'capture-anywhere', group: 'capture', icon: 'circle-plus', title: 'Quick capture, anywhere',
    text: 'Catch a thought from any page with one shortcut, without losing your place. It lands in your inbox to sort later.',
    cmd: ['quick-capture'], sel: ['#sidebar [data-view="inbox"]'] },
  { id: 'what-now', group: 'capture', icon: 'battery-charging', title: 'What can I do now?',
    text: 'Give tasks a context and an energy level, then ask for what fits where you are and how you feel right now.',
    cmd: ['do-now'], view: ['now'] },

  // ---- places and memories ----
  { id: 'locations', group: 'places', icon: 'map-pin', title: 'Locations, with your full history',
    text: 'A new Locations tab shows the places you have been, with firsts, badges and spending by country, and the history is kept for good, so you can look back years from now.',
    note: 'Private by design: your location history stays in your own data folder (it reaches your other devices only end-to-end encrypted), and you can switch it off or delete it any time.',
    view: ['locations'], sel: ['.loc-hero', '#sidebar [data-view="locations"]', '#main-body'] },
  { id: 'journal', group: 'places', icon: 'notebook-pen', title: 'A daily journal',
    text: 'A few lines a day, with a friendly prompt if you want one. Your entries build into a story you can scroll back through.',
    cmd: ['mem-journal'], view: ['memories'], sel: ['#sidebar [data-view="memories"]', '#main-body'] },
  { id: 'on-this-day', group: 'places', icon: 'history', title: 'On this day',
    text: 'What you were doing a week, a month or a year ago today: the tasks you finished, the places you went, the notes you wrote.',
    view: ['home'], sel: ['.hg-w[data-wid="onthisday"]'] },
  { id: 'postcards', group: 'places', icon: 'image', title: 'Postcards',
    text: 'Your first visit to a new country makes a postcard to keep: a picture of the place and the trip’s numbers, with room for a line from you.',
    cmd: ['mem-postcards'], view: ['memories:postcards', 'locations'], sel: ['.mpc-album'] },
  { id: 'capsule', group: 'places', icon: 'gift', title: 'Time capsule',
    text: 'Write a note to future you and pick the day it opens. It stays sealed until then.',
    cmd: ['mem-capsule'], view: ['memories:capsules'] },
  { id: 'heatmap', group: 'places', icon: 'chart-column', title: 'Your year as a heatmap',
    text: 'Every day you got things done, as a calendar of colour. Spot your busiest weeks and your quiet ones.',
    view: ['home', 'memories:year'], sel: ['.hg-w[data-wid="heatmap"]', '.mhm-svg'] },
  { id: 'wrapped', group: 'places', icon: 'sparkles', title: 'Wrapped',
    text: 'Your year in highlights: busiest days, top streams, the people you worked with and the places you went.',
    cmd: ['mem-wrapped'] },

  // ---- fun ----
  { id: 'xp', group: 'fun', icon: 'trophy', title: 'XP, levels and streaks',
    text: 'Finishing things now earns XP. Level up, keep your streaks going, take on quests, and unlock achievements and personal records.',
    cmd: ['game-open'], view: ['game'], sel: ['.gm-chip', '.hg-w[data-wid="game"]'] },
  { id: 'focus-timer', group: 'fun', icon: 'timer', title: 'Focus timer',
    text: 'Start a focus timer on any task and watch the minutes add up. Stop it to log the time, or log it and tick the task off in one go.',
    cmd: ['game-focus-next', 'game-focus-this'] },
  { id: 'boss', group: 'fun', icon: 'crown', title: 'Boss tasks',
    text: 'Big, scary tasks become bosses you wear down one step at a time. Each subtask you finish lands a hit.',
    view: ['game'], sel: ['.gm-bosses', '.gm-boss'] },
  { id: 'fun-level', group: 'fun', icon: 'party-popper', title: 'Choose your Fun level',
    text: 'Off, Subtle or Full: decide how much celebration you want, and change it whenever you like.',
    view: ['settings:game'], sel: ['[data-whats-new~="fun-level"]'] },
  { id: 'living-home', group: 'fun', icon: 'sun', title: 'A living Home scene',
    text: 'Home’s animation of the day now follows how your day is going: calm, lively or buzzing, with fireworks on a great day.',
    view: ['home'], sel: ['.hg-w[data-wid="animday"]'] },
  { id: 'garden', group: 'fun', icon: 'sprout', title: 'Your garden',
    text: 'Every task you finish helps something grow. Look after it and watch it bloom through the seasons.',
    view: ['home'], sel: ['.hg-w[data-wid="garden"]'] },
  { id: 'fun-facts', group: 'fun', icon: 'lightbulb', title: 'Fun facts',
    text: 'A small, surprising fact about your own days to brighten the morning.',
    view: ['home'], sel: ['.hg-w[data-wid="funfact"]'] },
  { id: 'birthdays', group: 'fun', icon: 'cake', title: 'Birthdays',
    text: 'Never miss one: add a birthday to someone and it shows up ahead of time, with a nudge to say something.',
    view: ['memories:people'], sel: ['#main-body'] },
  { id: 'seasonal', group: 'fun', icon: 'snowflake', title: 'Seasonal moments',
    text: 'An advent calendar in December, New Year goals in January and other little rituals through the year, right on Home.',
    view: ['home'], sel: ['.hg-w[data-wid="seasonal"]'] },

  // ---- money ----
  { id: 'money', group: 'money', icon: 'wallet', title: 'The new My money page',
    text: '25 widgets to arrange as you like, ready-made presets, spending by country, a travel passport, a payday countdown, no-spend days, and “What if I cut…?” to see what a change would save you.',
    view: ['finance'], sel: ['.fvb-layout', '.fvb-cust', '#main-body'] },
];

/** A feature module adds (or replaces, by id) its own entry. */
function registerWhatsNew(entry) {
  if (!entry || typeof entry.id !== 'string' || !entry.title) return;
  const i = WHATS_NEW.findIndex(e => e.id === entry.id);
  if (i >= 0) WHATS_NEW[i] = Object.assign({}, WHATS_NEW[i], entry); else WHATS_NEW.push(entry);
}

/* ---------- what an entry can show here ---------- */
function _wnReduced() { return !!(window.Motion && Motion.prefersReduced && Motion.prefersReduced()); }
function _wnViewOk(v) { try { return typeof v === 'string' && !!_viewFromHash('#view=' + v); } catch (e) { return false; } }
function _wnView(e) { return [].concat(e.view || []).find(_wnViewOk) || null; }
function _wnCmd(e) {
  if (typeof PALETTE_COMMANDS === 'undefined') return null;
  for (const id of [].concat(e.cmd || [])) {
    const c = PALETTE_COMMANDS.find(x => x.id === id);
    if (c && (typeof c.when !== 'function' || c.when())) return c;
  }
  return null;
}
function _wnFind(e) {
  const sels = [`[data-whats-new~="${String(e.id).replace(/[^\w-]/g, '')}"]`].concat(e.sel || []);
  for (const s of sels) {
    let el = null;
    try { el = document.querySelector(s); } catch (x) { el = null; }
    if (el && el.getClientRects().length && !el.closest('[hidden], [inert]')) return el;
  }
  return null;
}
/** Something to show: a command, a view, or an element already on screen. */
function _wnCanShow(e) {
  if (typeof e.present === 'function') { try { if (!e.present()) return false; } catch (x) { return false; } }
  return !!(_wnCmd(e) || _wnView(e) || ((e.sel || []).length && _wnFind(e)));
}
function _wnVisible() {
  return WHATS_NEW.filter(e => { if (typeof e.present !== 'function') return true; try { return !!e.present(); } catch (x) { return false; } });
}

/** Go to an entry's view (and layout mode); resolves to its element, or null after ~1.5 s. */
function _wnGoAndFind(e) {
  const v = _wnView(e);
  if (v) {
    if (e.mode && state.viewMode !== e.mode) { state.viewMode = e.mode; saveUI(); }
    if (state.view !== v) setView(v); else if (e.mode) render();
  }
  return new Promise((resolve) => {
    let n = 0;
    const tick = () => {
      const el = _wnFind(e);
      if (el || ++n > 15) { resolve(el); return; }
      setTimeout(tick, 100);
    };
    setTimeout(tick, v ? 160 : 0);
  });
}

/* ---------- the spotlight ---------- */
let _wnSpotClose = null;
function whatsNewSpotlight(el, o) {
  if (_wnSpotClose) _wnSpotClose(true);
  o = o || {};
  const reduced = _wnReduced();
  try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); } catch (x) { /* old browser */ }
  const ring = document.createElement('div'); ring.className = 'wn-ring'; ring.setAttribute('aria-hidden', 'true');
  const tip = document.createElement('div'); tip.className = 'wn-tip'; tip.setAttribute('role', 'dialog');
  tip.setAttribute('aria-labelledby', 'wn-tip-t'); tip.setAttribute('aria-describedby', 'wn-tip-s');
  tip.innerHTML = (o.kicker ? `<div class="wn-tip-k">${esc(o.kicker)}</div>` : '')
    + `<div class="wn-tip-t" id="wn-tip-t">${esc(o.title || '')}</div><div class="wn-tip-s" id="wn-tip-s">${esc(o.text || '')}</div>`
    + (o.note ? `<div class="wn-tip-note">${icon('lock', 'i-xs')}<span>${esc(o.note)}</span></div>` : '')
    + '<div class="wn-tip-acts"></div>';
  const acts = tip.querySelector('.wn-tip-acts');
  const btn = (label, cls, run) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + cls; b.textContent = label; b.onclick = run; acts.appendChild(b); return b; };
  const prev = document.activeElement;
  let done = false;
  function close(silent) {
    if (done) return; done = true;
    _wnSpotClose = null;
    window.removeEventListener('resize', place);
    document.removeEventListener('scroll', place, true);
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('mousedown', onDown, true);
    ring.remove(); tip.remove();
    if (!silent && prev && prev.focus && prev.isConnected) try { prev.focus({ preventScroll: true }); } catch (x) { /* gone */ }
  }
  const end = () => { close(); if (o.onEnd) o.onEnd(); };
  if (o.action) btn(o.action.label, 'btn-secondary', () => { close(true); o.action.run(); });
  if (o.next) { btn(o.skipLabel || 'End tour', 'btn-ghost', end); btn(o.nextLabel || 'Next', 'btn-primary', () => { close(true); o.next(); }); }
  else btn(o.doneLabel || 'Got it', 'btn-primary', end);
  function place() {
    if (!el.isConnected) { end(); return; }
    const r = el.getBoundingClientRect(), pad = 6, vw = window.innerWidth, vh = window.innerHeight;
    const L = Math.max(4, r.left - pad), T = Math.max(4, r.top - pad);
    const W = Math.min(vw - 8, r.right + pad) - L, H = Math.min(vh - 8, r.bottom + pad) - T;
    Object.assign(ring.style, { left: L + 'px', top: T + 'px', width: Math.max(0, W) + 'px', height: Math.max(0, H) + 'px' });
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let top = T + H + 10;
    if (top + th > vh - 8) top = T - th - 10;
    if (top < 8) top = Math.min(vh - th - 16, T + 16);          // a big target: the bubble sits inside it
    const left = Math.min(Math.max(8, L + W / 2 - tw / 2), vw - tw - 8);
    tip.style.left = Math.round(left) + 'px'; tip.style.top = Math.round(Math.max(8, top)) + 'px';
  }
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); }
    else if (e.key === 'Enter' && o.next && !(e.target && e.target.closest && e.target.closest('.wn-tip'))) { e.preventDefault(); close(true); o.next(); }
  };
  const onDown = (e) => { if (!tip.contains(e.target)) end(); };     // a click anywhere else ends it (and does its own thing)
  document.body.append(ring, tip);
  place();
  if (!reduced) setTimeout(() => { if (!done) place(); }, 360);   // after the smooth scroll
  window.addEventListener('resize', place);
  document.addEventListener('scroll', place, true);
  document.addEventListener('keydown', onKey, true);
  setTimeout(() => { if (!done) document.addEventListener('mousedown', onDown, true); }, 0);
  setTimeout(() => { const b = acts.querySelector('.btn-primary'); if (b && !done) try { b.focus({ preventScroll: true }); } catch (x) { /* gone */ } }, 30);
  _wnSpotClose = close;
  return close;
}

/* ---------- Show me ---------- */
async function whatsNewShowMe(id) {
  const e = typeof id === 'string' ? WHATS_NEW.find(x => x.id === id) : id;
  if (!e) return false;
  const cmd = _wnCmd(e);
  if (cmd) { try { cmd.run(); } catch (x) { console.error('[whats-new]', x); } return true; }   // the feature opens itself
  const el = await _wnGoAndFind(e);
  if (!el) return !!_wnView(e);                                                                 // there, but nothing to point at: skipped silently
  whatsNewSpotlight(el, { kicker: 'New in ' + WHATS_NEW_VERSION, title: e.title, text: e.text, note: e.note });
  return true;
}

/* ---------- the tour: entries with a view or an element, one at a time ---------- */
function whatsNewTour() {
  const steps = _wnVisible().filter(e => _wnView(e) || (e.sel || []).length);
  let i = 0, shown = 0;
  const finish = () => toast(shown ? 'That’s the tour. Find it again under Help › What’s new.' : 'Nothing to point at on this page yet. The list in What’s new has everything.', { kind: 'info', icon: 'sparkles' });
  const next = async () => {
    while (i < steps.length) {
      const e = steps[i++];
      const el = await _wnGoAndFind(e);
      if (!el) continue;                                              // not on this build: skipped silently
      shown++;
      const group = (WHATS_NEW_GROUPS.find(g => g[0] === e.group) || [])[1] || 'New';
      const cmd = _wnCmd(e);
      whatsNewSpotlight(el, {
        kicker: `${group} · ${shown}`, title: e.title, text: e.text, note: e.note,
        action: cmd ? { label: 'Try it', run: () => cmd.run() } : null,
        next, nextLabel: i < steps.length ? 'Next' : 'Finish', skipLabel: 'End tour',
      });
      return;
    }
    finish();
  };
  next();
}

/* ---------- the dialog ---------- */
function openWhatsNew(o) {
  o = o || {};
  if (_wnSpotClose) _wnSpotClose(true);
  const list = _wnVisible();
  openDialog({
    title: `What’s new in OpenDash ${WHATS_NEW_VERSION}`, width: 780, resizeKey: 'whats-new',
    body: (b, close) => {
      b.classList.add('wn-body');
      const hero = document.createElement('div'); hero.className = 'wn-hero';
      hero.innerHTML = `<div class="wn-hero-art" aria-hidden="true">${icon('party-popper')}</div>`
        + `<div class="wn-hero-txt"><div class="wn-hero-k">OpenDash ${esc(WHATS_NEW_VERSION)}</div><h3 class="wn-hero-t">A fresh dashboard</h3>`
        + `<p class="wn-hero-s">A new look, smarter ways to plan, places and memories, and a lot more fun. ${esc(String(list.length))} new things, all yours to explore.</p></div>`
        + '<div class="wn-hero-acts"></div>';
      const ha = hero.querySelector('.wn-hero-acts');
      const tour = document.createElement('button'); tour.type = 'button'; tour.className = 'btn btn-primary';
      tour.innerHTML = icon('compass') + '<span>Take the tour</span>';
      tour.onclick = () => { close(); setTimeout(whatsNewTour, 60); };
      ha.appendChild(tour);
      b.appendChild(hero);
      // Jump chips: one per group.
      const chips = document.createElement('div'); chips.className = 'wn-jump'; chips.setAttribute('role', 'navigation'); chips.setAttribute('aria-label', 'Groups');
      b.appendChild(chips);
      for (const [g, label, ic] of WHATS_NEW_GROUPS) {
        const items = list.filter(e => e.group === g);
        if (!items.length) continue;
        const sec = document.createElement('section'); sec.className = 'wn-sec'; sec.id = 'wn-sec-' + g;
        sec.innerHTML = `<h3 class="wn-sec-h">${icon(ic)}<span>${esc(label)}</span><span class="wn-sec-n">${esc(String(items.length))}</span></h3>`;
        const grid = document.createElement('div'); grid.className = 'wn-grid';
        for (const e of items) {
          const card = document.createElement('div'); card.className = 'wn-card';
          card.innerHTML = `<span class="wn-ic">${icon(e.icon || 'sparkles')}</span><div class="wn-txt"><div class="wn-t">${esc(e.title)}</div><div class="wn-s">${esc(e.text)}</div>`
            + (e.note ? `<div class="wn-note">${icon('lock', 'i-xs')}<span>${esc(e.note)}</span></div>` : '') + '</div>';
          if (_wnCanShow(e)) {
            const go = document.createElement('button'); go.type = 'button'; go.className = 'btn btn-sm btn-secondary wn-go';
            go.innerHTML = '<span>Show me</span>' + icon('arrow-right', 'i-sm');
            go.setAttribute('aria-label', 'Show me: ' + e.title);
            go.onclick = () => { close(); setTimeout(() => whatsNewShowMe(e), 60); };
            card.querySelector('.wn-txt').appendChild(go);
          }
          grid.appendChild(card);
        }
        sec.appendChild(grid);
        b.appendChild(sec);
        const c = document.createElement('button'); c.type = 'button'; c.className = 'chip wn-chip';
        c.innerHTML = icon(ic, 'i-xs') + `<span>${esc(label)}</span>`;
        c.onclick = () => { try { sec.scrollIntoView({ block: 'start', behavior: _wnReduced() ? 'auto' : 'smooth' }); } catch (x) { /* old browser */ } };
        chips.appendChild(c);
      }
      const foot = document.createElement('p'); foot.className = 'wn-foot';
      foot.textContent = 'Open this again any time from the menu (What’s new) or the command palette.';
      b.appendChild(foot);
    },
    actions: [{ label: 'Got it', primary: true }],
  });
  if (o.auto) { try { seenMarkOnce(_WN_SEEN); } catch (x) { /* the next save carries it */ } }
}

/* ---------- quick start (first run) ---------- */
const QUICK_START = [
  { icon: 'square-check-big', title: 'Add your first task', text: 'Press Q anywhere and just type, like “Email Sam on Friday #work”. The date and tag fill themselves in.',
    act: 'Add a task', run: () => openNewTask() },
  { icon: 'search', title: 'Find anything', text: 'Press Ctrl+K to search tasks, people and pages, or to run any command by name.',
    act: 'Open search', run: () => openCommandPalette() },
  { icon: 'layout-grid', title: 'Make Home yours', text: 'Pick a layout that suits you: Focused, Balanced, Everything or Fun. You can move and resize any widget later.',
    act: 'Choose a layout', run: () => { homeEditStart(); setTimeout(() => { const b = document.querySelector('.home-editbar .heb-presets'); if (b && typeof homePresetsMenu === 'function') homePresetsMenu(b); }, 140); } },
];
function openQuickStart() {
  if (document.querySelector('.wn-qs')) return;
  let step = 0;
  const card = document.createElement('div'); card.className = 'wn-qs'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-labelledby', 'wn-qs-t');
  const close = () => { card.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Escape' && card.isConnected && !document.querySelector('.modal, .pop')) { e.preventDefault(); close(); } };
  function paint() {
    const s = QUICK_START[step];
    card.innerHTML = `<div class="wn-qs-top"><span class="wn-qs-k">Quick start · ${step + 1} of ${QUICK_START.length}</span>`
      + `<button type="button" class="btn-icon btn-sm wn-qs-x" aria-label="Skip the quick start">${icon('x', 'i-sm')}</button></div>`
      + `<div class="wn-qs-main"><span class="wn-ic">${icon(s.icon)}</span><div><div class="wn-qs-t" id="wn-qs-t">${esc(s.title)}</div><div class="wn-qs-s">${esc(s.text)}</div></div></div>`
      + `<div class="wn-qs-dots" aria-hidden="true">${QUICK_START.map((x, i) => `<i class="${i === step ? 'on' : i < step ? 'done' : ''}"></i>`).join('')}</div>`
      + '<div class="wn-qs-acts"></div>';
    card.querySelector('.wn-qs-x').onclick = close;
    const acts = card.querySelector('.wn-qs-acts');
    const btn = (label, cls, run) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + cls; b.textContent = label; b.onclick = run; acts.appendChild(b); return b; };
    btn(s.act, 'btn-secondary', () => { try { s.run(); } catch (x) { console.error('[quick-start]', x); } });
    const sp = document.createElement('span'); sp.className = 'spacer'; acts.appendChild(sp);
    if (step < QUICK_START.length - 1) btn('Next', 'btn-primary', () => { step++; paint(); card.querySelector('.btn-primary').focus(); });
    else btn('Done', 'btn-primary', close);
  }
  paint();
  document.body.appendChild(card);
  document.addEventListener('keydown', onKey, true);
}

/* ---------- once, after updating (or the quick start after the welcome) ---------- */
function _wnBusy() {
  return document.hidden || !!document.querySelector('.ap-opening:not(.anim-scene), .modal, .story, .bf-overlay, .ob-card, .anew-card, .wn-ring, .scrim')
    || document.documentElement.classList.contains('story-open');
}
function _wnAuto(tries) {
  if (typeof _uiSharedBooted !== 'undefined' && !_uiSharedBooted) { if (tries > 0) setTimeout(() => _wnAuto(tries - 1), 1000); return; }   // the state file first: it holds the seen flag
  if (_wnBusy()) { if (tries > 0) setTimeout(() => _wnAuto(tries - 1), 3000); return; }
  let qs = false;
  try { qs = localStorage.getItem(_WN_QS_KEY) === '1'; if (qs) localStorage.removeItem(_WN_QS_KEY); } catch (x) { qs = false; }
  const firstRun = !APP_CONFIG.onboardedAt && typeof getAllItems === 'function' && !getAllItems().length;
  if (qs || firstRun) {
    if (!seenOnce(_WN_SEEN)) seenMarkOnce(_WN_SEEN);   // a new user starts on 2.16: nothing to call new
    if (qs) openQuickStart();
    return;
  }
  if (seenOnce(_WN_SEEN)) return;
  openWhatsNew({ auto: true });
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('load', () => setTimeout(() => _wnAuto(40), 4500), { once: true });
}

/* ---------- reopen: the menu and the palette ---------- */
registerMoreItem({ id: 'whats-new', label: 'What’s new', icon: 'gift', order: 425, where: ['more', 'workspace'], hint: () => WHATS_NEW_VERSION, run: () => openWhatsNew() });
registerCommand({ id: 'whats-new', label: `What’s new in ${WHATS_NEW_VERSION}`, icon: 'gift', keywords: 'whats new release notes changes tour features update help', run: () => openWhatsNew() });
registerCommand({ id: 'whats-new-tour', label: 'Take the 2.16 tour', icon: 'compass', keywords: 'whats new tour walkthrough features help spotlight', run: () => whatsNewTour() });
registerCommand({ id: 'quick-start', label: 'Quick start tips', icon: 'rocket', keywords: 'help getting started onboarding tips first', run: () => openQuickStart() });
