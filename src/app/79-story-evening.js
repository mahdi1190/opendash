/* ============================================================
   FINISH THE DAY STORY (owner: Evening story). The evening's full-screen,
   read-aloud story, built on the story engine (79-story-engine.js) with
   storyRegisterBuilder('evening') and six beat types (storyboard v1, E1-E6):
     done      ev-done      a giant count-up, a tile per kind of work, each
                            with its own mini celebration, the biggest win
     people    ev-people    who you saw today (cards light up as each name is
                            spoken), a note per person, follow up, a nudge
     slipped   ev-slipped   what slipped, with an inline roll-over (Tomorrow /
                            the day after / Next week / Drop) and an optional
                            why (it feeds the weekly review's "slipped and why")
     tomorrow  ev-tomorrow  tomorrow's first event (the time counts down into
                            place), tomorrow's weather, pick your top 3
     reflect   ev-reflect   "today in one line" (Claude's sentence, read aloud
                            word by word, avatars in the text), mood, a journal line
     outro     ev-outro     "Good job." while the sun sets into a night sky,
                            then Close the day (saves the recap) or Replay
   Content-aware: the kind of day (festive, a big win, quiet, weekend, a
   deadline tomorrow) sets the palette, mood, pace, confetti and the order.
   Beats with nothing to show are dropped. Interactive beats stop
   auto-advancing as soon as the user types or clicks; a Continue button moves on.
   Actions reuse the Finish-the-day page (76-brief-evening.js): _evRoll,
   eveningModel, eveningSetTop3, reviewSave. Session choices (rows moved, the
   why, the top 3, notes, mood) last for the day, so Replay keeps them.
   Styles: src/styles/79-story-evening.css.
   ============================================================ */
const SEV_WHY = ['No time', 'Too big', 'Blocked', 'Not important'];
const SEV_MOODS = [['rough', 'Rough', 'var(--sw-red)'], ['low', 'Low', 'var(--sw-orange)'], ['okay', 'Okay', 'var(--sw-amber)'], ['good', 'Good', 'var(--sw-green)'], ['great', 'Great', 'var(--sw-teal)']];
/** Per kind of work: the badge on its tile after the mini celebration. */
const SEV_BADGE = {
  writing: ['pen-tool', 'written'], email: ['send', 'sent'], admin: ['receipt', 'stamped'], finance: ['coins', 'paid'],
  run: ['zap', 'moved'], gym: ['zap', 'moved'], sport: ['zap', 'moved'], coding: ['code', 'shipped'], reading: ['book-open', 'read'],
  review: ['check-check', 'reviewed'], deadline: ['flag', 'met'], meeting: ['users', 'held'], 'one-on-one': ['users', 'held'],
  'video-call': ['video', 'held'], call: ['phone', 'called'], lab: ['flask-conical', 'run'], idea: ['lightbulb', 'captured'],
  shopping: ['shopping-cart', 'got'], home: ['house', 'sorted'], delivery: ['package', 'sorted'], health: ['heart', 'looked after'],
  dentist: ['heart', 'looked after'], lecture: ['school', 'given'], interview: ['handshake', 'done'],
};
/** This evening's choices (one day; Replay and Back keep them). */
const _sevFresh = (date) => ({ date, moved: new Map(), why: new Map(), undo: [], picked: null, committed: false, mood: '', journal: '', saved: new Set(), followed: new Set(), drafts: new Map(), dismissed: false, closed: false });
const _sev = _sevFresh('');

/* ---------- small helpers ---------- */
function _sevSession(date) {
  if (_sev.date !== date) Object.assign(_sev, _sevFresh(date));
  return _sev;
}
const _SEV_NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
function sevNumWord(n, cap) { const w = Number.isInteger(n) && n >= 0 && n < _SEV_NUM.length ? _SEV_NUM[n] : String(n); return cap ? w.charAt(0).toUpperCase() + w.slice(1) : w; }
/** "09:00" -> "9 am", "14:30" -> "2:30 pm", "12:00" -> "noon": how it is read out. */
function sevSpokenTime(hm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || ''));
  if (!m) return String(hm || '');
  const h = Number(m[1]), mi = Number(m[2]);
  if (h === 12 && mi === 0) return 'noon';
  return `${h % 12 || 12}${mi ? ':' + m[2] : ''} ${h < 12 ? 'am' : 'pm'}`;
}
function _sevShort(ctx, type, ref, fallback) { const e = ctx.entity(type, ref); return (e && e.text) || fallback || ''; }
function _sevTimers() {
  const hs = [];
  return { set(fn, ms) { const h = setTimeout(fn, ms); hs.push(h); return h; }, clear() { hs.forEach(h => clearTimeout(h)); hs.length = 0; } };
}
function _sevIco(name, cls) { return typeof icon === 'function' ? icon(name, cls || 'i-sm') : ''; }
function _sevStreamDot(sid) {
  const s = typeof STREAMS !== 'undefined' && sid ? STREAMS[sid] : null;
  return `<span class="sev-dot" style="--c:${escAttr(safeColor(s && s.color, '#9aa0ae'))}"></span>`;
}
function _sevTomorrowIso(date) { return briefAddDays(date, 1); }

/** People seen today: a meeting today that has already happened. */
function sevPeopleMet(d) {
  const held = new Set(d.held || []);
  return (d.people || []).filter(p => (p.meetings || []).some(m => m.date === d.date && (held.has(m.eventId) || m.allDay)))
    .map(p => Object.assign({}, p, { met: (p.meetings || []).find(m => m.date === d.date && (held.has(m.eventId) || m.allDay)) }));
}
/** Someone worth a nudge who was not seen today: owed a reply, or not seen for three weeks or more. */
function sevNudge(d, met) {
  const seen = new Set(met.map(p => p.id));
  const cand = (d.people || []).filter(p => !seen.has(p.id));
  const owed = cand.find(p => (p.counts && (p.counts.owe || p.counts.followUps)) && !(p.meetings || []).some(m => m.date === (d.tomorrow && d.tomorrow.date)));
  if (owed) return { p: owed, kind: 'owe', text: `${owed.first} is waiting on you`, sub: owed.owe && owed.owe[0] ? shortTitleSafe(owed.owe[0].title) : 'A quick reply would do.' };
  const quiet = cand.filter(p => p.lastContact && p.lastContact.daysAgo >= 21).sort((a, b) => b.lastContact.daysAgo - a.lastContact.daysAgo)[0];
  if (quiet) { const w = Math.round(quiet.lastContact.daysAgo / 7); return { p: quiet, kind: 'quiet', text: `You haven't seen ${quiet.first} in ${w} weeks`, sub: 'Plan a catch-up for next week?' }; }
  return null;
}
/**
 * The one open thing with someone you just met (what makes the card worth a glance):
 * you owe them, a follow-up, or you are waiting on them. {kind, label, icon, title, full, more} | null.
 */
function sevOpenLoop(p, ctx) {
  const seen = new Set(), all = [];
  for (const [kind, list] of [['owe', p && p.owe], ['follow', p && p.followUps], ['wait', p && p.waiting]]) {
    for (const t of list || []) if (t && t.id && !seen.has(t.id)) { seen.add(t.id); all.push([kind, t]); }
  }
  if (!all.length) return null;
  const [kind, t] = all[0];
  const L = { owe: ['You owe them', 'send'], follow: ['Follow up', 'repeat'], wait: ['Waiting on them', 'hourglass'] }[kind];
  const title = ctx ? _sevShort(ctx, 'task', t.id, shortTitleSafe(t.title)) : shortTitleSafe(t.title);
  return { kind, label: L[0], icon: L[1], title, full: String(t.title || ''), more: all.length - 1 };
}
/** How an event is said: "Sam Bday" / "Sam's birthday" -> "Sam's birthday"; anything else as it is. */
function sevEventPhrase(ev, short) {
  const t = String((ev && ev.title) || short || '').trim();
  const m = /^(.{2,40}?)['’]s\s+(birthday|bday|b-day)\b/i.exec(t) || /^(?!(?:my|our|the|a)\b)(\p{Lu}[\p{L}'’-]*(?:\s+\p{Lu}[\p{L}'’-]*){0,2})\s+(birthday|b-?day)\s*$/iu.exec(t);
  return m ? `${m[1].trim()}'s birthday` : (short || t);
}
/** A title short enough to show in a chip or say: the part before a colon / bracket / " - " when that is a real name (as lib/story-data.mjs shortTitle). */
function shortTitleSafe(t) {
  let s = String(t || '').replace(/\s+/g, ' ').trim();
  const head = s.split(/\s*(?::(?!\d)|;|\s[–—-]\s|\(|\[|\|)\s*/)[0];
  if (head.length >= 8 && head.length < s.length) s = head.replace(/[\s,.;:–—-]+$/, '');
  return s.length > 60 ? s.slice(0, 57).replace(/\s+\S*$/, '') + '…' : s;
}

/**
 * What kind of evening it is: festive (a party, dinner, a birthday), a big win (a deadline or
 * the top-priority task done), quiet (nothing ticked off), weekend, focused (a deadline
 * tomorrow), full (six or more done) or steady. Sets palette, mood, pace and confetti.
 */
function sevDayType(d, met) {
  const on = (e) => e.date === d.date || (e.until && e.date <= d.date && e.until >= d.date);
  const todayEv = (d.events || []).filter(on);
  const festive = todayEv.find(e => ['party', 'birthday', 'celebration', 'wedding', 'drinks', 'concert', 'dinner'].includes(e.type))
    || (d.people || []).find(p => p.celebration && p.celebration.date === d.date);
  const n = d.doneCount || 0;
  const win = (d.done || []).find(t => t.type === 'deadline' || t.priority === 'p1');
  const tom = d.tomorrow && d.tomorrow.date;
  const tomDeadline = (d.deadlines || []).find(t => t.due === tom);
  const weekend = /^(Sat|Sun)/.test(String(d.weekday || ''));
  const T = (type, palette, mood, pace, confetti, line) => ({ type, palette, mood, pace, confetti, line });
  if (!n && !d.subtasksDone && !d.meetingsHeld && !met.length) return T('quiet', 'lavender', 'gentle', 1.25, false, 'Rest counts too');
  if (festive) return T('festive', 'ember', 'celebratory', 1, true, 'Enjoy the evening');
  if (win) return T('win', 'sunset', 'bright', 1, true, 'The important one is done');
  if (tomDeadline) return T('focused', 'slate', 'focused', 1.15, n >= 5, 'Rest first, then the deadline');
  if (weekend) return T('weekend', 'lavender', 'gentle', 1.2, n >= 5, 'A good day off');
  if (n >= 6) return T('full', 'sunset', 'bright', 1, true, 'A full day');
  return T('steady', 'sunset', 'reflective', 1, false, "That's a wrap");
}
/** Done tasks grouped by kind of work, at most four tiles (the rest share one). */
function sevDoneGroups(done) {
  const by = new Map();
  for (const t of done || []) { const k = t.type || 'task'; if (!by.has(k)) by.set(k, []); by.get(k).push(t); }
  let g = [...by.entries()].sort((a, b) => b[1].length - a[1].length);
  if (g.length > 4) g = [...g.slice(0, 3), ['task', g.slice(3).flatMap(x => x[1])]];
  return g.map(([type, items], i) => {
    const streams = [...new Set(items.map(t => t.stream).filter(Boolean))];
    const scene = typeof animScene === 'function' ? animScene(type) : { label: 'Tasks' };
    const label = i === 3 && g.length === 4 && type === 'task' && items.length > 1 ? 'Everything else' : streams.length === 1 && type === 'task' ? streams[0] : (scene && scene.label ? scene.label.split(/\s*[/(]/)[0] : 'Tasks');
    return { type, items, label, badge: SEV_BADGE[type] || ['check', 'done'] };
  });
}
/** The reflection: Claude's first sentence or two, else one written from the day. */
function sevReflection(ctx, met) {
  const d = ctx.data, sc = ctx.script || {};
  const ss = (sc.sentences || []).filter(s => s && s.text);
  const words = (s) => s.split(/\s+/).filter(Boolean).length;
  // A reflection on today, not an inventory or a plan: a sentence that names two or more tasks, runs past 22 words or is about tomorrow is skipped.
  const reads = (s) => words(s.text) <= 22 && !/\b(tomorrow|next week)\b/i.test(s.text) && (s.entities || []).filter(e => e.type === 'task' || e.type === 'deadline').length < 2;
  const k = sc.source === 'ai' ? ss.findIndex(reads) : -1;
  if (k >= 0) {
    const a = ss[k];
    const b = ss[k + 1] && reads(ss[k + 1]) ? ss[k + 1] : null;
    // One line: the second sentence joins only when both together still read as one.
    if (!b || words(a.text) >= 14 || words(a.text + ' ' + b.text) > 24) return { text: a.text, entities: a.entities || [] };
    const off = a.text.length + 1;
    return { text: a.text + ' ' + b.text, entities: [...(a.entities || []), ...(b.entities || []).map(e => Object.assign({}, e, Number.isInteger(e.start) ? { start: e.start + off, end: e.end + off } : {}))] };
  }
  const top = (d.done || [])[0];
  const topT = top ? _sevShort(ctx, 'task', top.id, shortTitleSafe(top.title)) : '';
  // Nobody twice: someone already in the task's name ("Weekly 1:1 with Priya") is not added again.
  const who = met.filter(p => !(p.first && new RegExp(`\\b${String(p.first).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(topT))).slice(0, 2);
  const ents = [];
  const lead = { quiet: 'A gentle day', festive: 'A good day', win: 'A day that counted', focused: 'A steady day', weekend: 'An easy day', full: 'A full day', steady: 'A steady day' }[sevDayType(d, met).type] || 'A steady day';
  let text = lead;
  if (topT) { text += `: you finished ${topT}`; ents.push({ type: 'task', ref: top.id, text: topT }); }
  else if (d.subtasksDone) text += `: ${sevNumWord(d.subtasksDone)} small steps forward`;
  if (who.length) {
    text += `${topT || d.subtasksDone ? ', and still made time for ' : ', with time for '}${STORY_KIT.list(who.map(p => p.first))}`;
    for (const p of who) ents.push({ type: 'person', ref: p.id, text: p.first });
  }
  if (!topT && !d.subtasksDone && !who.length) text += ', and that is allowed';
  return { text: text + '.', entities: ents };
}

/* ---------- interactive beats: stop auto-advance on the first touch ---------- */
function _sevHoldable(f, b) {
  if (!Object.prototype.hasOwnProperty.call(b, '_auto0')) b._auto0 = b.auto;
  b.auto = b._auto0;
  const root = f.root;
  root.classList.remove('sev-held');
  const hold = (e) => {
    if (e && e.target && e.target.closest && e.target.closest('.sev-continue')) return;
    if (b.auto === false) return;
    b.auto = false;
    root.classList.add('sev-held');
  };
  // Pointer, keyboard focus, a click from the keyboard or typing: any of them means "wait for me".
  for (const ev of ['pointerdown', 'focusin', 'click', 'input']) f.cards.addEventListener(ev, hold, true);
  return () => root.classList.remove('sev-held');
}
/** The Continue button (shown once auto-advance has stopped). A sibling of the beat's .sev, outside its scroll mask. */
function _sevAddContinue(f) {
  const c = document.createElement('button');
  c.type = 'button'; c.className = 'sev-continue'; c.dataset.sev = 'continue';
  c.innerHTML = `<span>Continue</span>${_sevIco('arrow-right')}`;
  c.addEventListener('click', () => { if (typeof Story !== 'undefined') Story.next(); });
  f.cards.appendChild(c);
}
/** A heading that IS the narration: words light up with the voice, people get avatars. */
function _sevSaidHtml(text, entities, ctx, cls) {
  return `<p class="st-sentence sev-said${cls ? ' ' + cls : ''}" data-caption="1">${STORY_KIT.sentenceHtml(text, entities || [], { mode: 'word' })}</p>`;
}
/** Put an avatar (people), a scene (events) or a ring (tasks) at the start of each entity in el. */
function _sevDecorateEntities(el, ctx) {
  el.querySelectorAll('.st-ent').forEach(span => {
    const [type, ref] = String(span.dataset.key || '').split('|');
    let lead = '';
    if (type === 'person') { const p = ctx.person(ref); if (p) lead = STORY_KIT.avatarHtml({ id: p.id, name: p.name, color: p.color, avatarUrl: p.avatarUrl, kind: p.kind }, 40); }
    else if (type === 'event') { const ev = ctx.event(ref); lead = animSceneHtml(ev ? ev.type : 'event', { size: 'sm' }); }
    else if (type === 'task' || type === 'deadline') lead = '<i class="sev-ring" aria-hidden="true"></i>';
    if (!lead) return;
    const s = document.createElement('span'); s.className = 'sev-lead'; s.setAttribute('aria-hidden', 'true'); s.innerHTML = lead;
    // Inside the first word (an inline block), so the avatar never ends a line on its own.
    (span.querySelector('.st-w') || span).prepend(s);
    span.classList.add('sev-ent');
  });
}

/* ---------- entry points ---------- */
/**
 * "Finish the day" (Home's banner, the top-bar pill, the palette): the evening page goes
 * underneath ("Open details" and closing land there) and the story plays over it.
 * Already open: a no-op (re-selecting the current thing never replays it).
 */
function storyFinishTheDay() {
  if (typeof storyOpen !== 'function') { setView('review:evening'); return; }
  if (typeof storyIsOpen === 'function' && storyIsOpen() && _story.kind === 'evening') return;
  if (!String(state.view || '').startsWith('review:evening')) setView('review:evening');
  storyOpen('evening', { autoplay: true });
}
/** Whether Home should offer "Finish the day" now: from the evening hour (Settings, 17:00) until today's recap is saved. */
function storyEveningDue() {
  const hour = typeof briefPrefs === 'function' ? briefPrefs().eveningHour : 17;
  if (new Date().getHours() < hour) return false;
  return !(state.reviews || []).some(r => r && r.kind === 'evening' && r.date === todayStrSafe());
}

/* ---------- the builder ---------- */
storyRegisterBuilder('evening', (ctx) => {
  const d = ctx.data || {}, sc = ctx.script || {};
  _sevSession(d.date);
  const met = sevPeopleMet(d);
  const dt = sevDayType(d, met);
  const bg = { tod: 'dusk', palette: sc.source === 'ai' && sc.palette && dt.type !== 'quiet' ? sc.palette : dt.palette, mood: dt.mood };
  const extra = ctx.reduced ? 1500 : 0;
  const after = (ms) => Math.round(ms * dt.pace) + extra;
  const beats = [];
  const n = d.doneCount || 0;
  const top = (d.done || [])[0];
  const topT = top ? _sevShort(ctx, 'task', top.id, shortTitleSafe(top.title)) : '';
  // 1. Done today.
  const quiet = dt.type === 'quiet' || (!n && !d.subtasksDone && !(d.held || []).length);
  const doneSay = quiet ? 'A quiet day on the list. Rest counts too.'
    : n ? `${sevNumWord(n, true)} ${n === 1 ? 'thing' : 'things'} done today${topT && n > 1 ? `, including ${topT}` : topT ? `: ${topT}` : ''}.`
      : d.subtasksDone ? `${sevNumWord(d.subtasksDone, true)} small ${d.subtasksDone === 1 ? 'step' : 'steps'} forward today.`
        : `You got through ${sevNumWord((d.held || []).length)} ${(d.held || []).length === 1 ? 'event' : 'events'} today.`;
  beats.push({ id: 'done', type: 'ev-done', say: doneSay, bg, after: after(1400), dt, quiet });
  // 2. People you met (dropped when nobody).
  const peopleBeat = met.length ? (() => {
    const names = met.slice(0, 3).map(p => p.first);
    const more = met.length - names.length;
    const text = `You saw ${more > 0 ? names.join(', ') + ` and ${more} more` : STORY_KIT.list(names)}. Anything to remember?`;
    const entities = met.slice(0, 3).map(p => ({ type: 'person', ref: p.id, text: p.first }));
    return { id: 'people', type: 'ev-people', text, entities, say: text, bg, after: after(3600), met, nudge: sevNudge(d, met) };
  })() : null;
  // 3. What slipped (dropped when nothing did).
  const slipped = (d.slipped || []).filter(x => x && x.id);
  const slipBeat = slipped.length ? {
    id: 'slipped', type: 'ev-slipped', items: slipped, bg, after: after(3600),
    say: `${sevNumWord(slipped.length, true)} ${slipped.length === 1 ? 'thing' : 'things'} slipped. Want to move ${slipped.length === 1 ? 'it' : 'them'} to tomorrow?`,
  } : null;
  // 4. Tomorrow.
  const first = d.tomorrow && d.tomorrow.first ? ctx.event(d.tomorrow.first) : null;
  const firstT = first ? _sevShort(ctx, 'event', first.id, shortTitleSafe(first.title)) : '';
  // No timed event: an all-day one (a trip, a birthday) still sets the tone.
  const allDay = first ? null : ((d.tomorrow && d.tomorrow.events) || []).map(id => ctx.event(id)).find(e => e && e.allDay) || null;
  const allDayT = allDay ? sevEventPhrase(allDay, _sevShort(ctx, 'event', allDay.id, shortTitleSafe(allDay.title))) : '';
  const tomSay = first ? `Tomorrow starts at ${sevSpokenTime(first.start)} with ${firstT}. Pick your top three.` : allDay ? `Tomorrow: ${allDayT}${allDay.type === 'birthday' ? '' : ', all day'}. Pick your top three.` : 'Tomorrow is open. Pick your top three.';
  const tomBeat = { id: 'tomorrow', type: 'ev-tomorrow', say: tomSay, first, allDay, bg, after: after(3600) };
  // 5. Today in one line.
  const r = sevReflection(ctx, met);
  const reflect = { id: 'reflect', type: 'ev-reflect', text: r.text, entities: r.entities, say: r.text, bg, after: after(2600) };
  // 6. Good job.
  const name = String(d.userName || (typeof userName === 'function' ? userName() : '') || '').split(/\s+/)[0];
  const head = quiet ? `Rest well${name ? ', ' + name : ''}.` : dt.type === 'festive' ? `Enjoy tonight${name ? ', ' + name : ''}.` : `Good job${name ? ', ' + name : ''}.`;
  const closing = sc.closing && !/^rest well\.?$/i.test(sc.closing) ? sc.closing : quiet ? 'Tomorrow is a fresh page.' : 'Rest well.';
  const outro = { id: 'outro', type: 'ev-outro', head, say: `${head} ${closing}`, closing, bg, dt, first, firstT, allDayT, topT, auto: false };
  // Order: a social day leads with the people; slipped always comes before tomorrow (rolled items prefill the top 3).
  if (peopleBeat && dt.type === 'festive' && met.length >= 2 && n <= 2) beats.unshift(peopleBeat); else if (peopleBeat) beats.push(peopleBeat);
  if (slipBeat) beats.push(slipBeat);
  beats.push(tomBeat, reflect, outro);
  return beats;
});

/* ---------- E1: done today ---------- */
storyRegisterBeatType('ev-done', (f, b, ctx) => {
  const d = ctx.data, T = _sevTimers();
  const n = d.doneCount || 0, held = (d.held || []).length, steps = d.subtasksDone || 0;
  const top = (d.done || [])[0];
  // Three or more: a tile per kind of work plus the biggest win. One or two: a card each.
  const showWin = top && n >= 3;
  // The biggest win has its own card, so the tiles show the rest (never the same task twice).
  const groups = sevDoneGroups(showWin ? (d.done || []).slice(1) : d.done);
  const few = n > 0 && n <= 2 ? (d.done || []).slice(0, 2) : [];
  const lede = b.quiet ? 'Nothing ticked off today, and that is fine.'
    : [n ? `${n === 1 ? 'thing' : 'things'} finished` : steps ? `${steps === 1 ? 'step' : 'steps'} ticked off` : `${held === 1 ? 'event' : 'events'} attended`,
      n && held ? `and ${held} ${held === 1 ? 'event' : 'events'} attended` : '', n && steps ? `${steps} ${steps === 1 ? 'step' : 'steps'} along the way` : ''].filter(Boolean).join(', ') + '.';
  const big = n || steps || held;
  const pills = [];
  if (d.streak && d.streak.days >= 2) pills.push(`<span class="sev-pill">${_sevIco('flame')}<span>${esc(d.streak.days)}-day streak</span></span>`);
  if (d.thisWeek) pills.push(`<span class="sev-pill">${_sevIco('chart-column')}<span>${esc(d.thisWeek)} done this week</span></span>`);
  const fewHtml = few.map((t, i) => {
    const bd = SEV_BADGE[t.type] || ['check', 'done'];
    return `
      <div class="sev-win sev-one sev-card" style="--i:${i + 1}" data-type="${escAttr(t.type || 'task')}">
        ${animSceneHtml(t.type || 'task', { size: 'xl', once: true, cls: 'sev-tile-scene' })}
        <div class="sev-win-b"><small class="sev-over">${esc(i === 0 && (t.priority === 'p1' || t.type === 'deadline') ? 'Biggest win' : t.stream || 'Done')}</small><b>${esc(t.title)}</b></div>
        <span class="sev-badge">${_sevIco(bd[0])}<span>${esc(bd[1])}</span></span>
      </div>`;
  }).join('');
  const tiles = fewHtml || (n >= 3 ? groups : []).map((g, i) => `
      <div class="sev-tile sev-card${i === groups.length - 1 && groups.length % 2 ? ' is-wide' : ''}" style="--i:${i + 1}" data-type="${escAttr(g.type)}">
        ${animSceneHtml(g.type, { size: 'xl', once: true, cls: 'sev-tile-scene' })}
        ${g.items.length === 1
          // One thing of this kind: its name is the headline (a big "1" says nothing).
          ? `<div class="sev-tile-b is-one"><span class="sev-tile-k">${esc(g.label)}</span><b class="sev-tile-t" title="${escAttr(g.items[0].title)}">${esc(_sevShort(ctx, 'task', g.items[0].id, shortTitleSafe(g.items[0].title)))}</b></div>`
          : `<div class="sev-tile-b"><b class="sev-tile-n num" data-n="${escAttr(g.items.length)}">${esc(g.items.length)}</b><span class="sev-tile-l">${esc(g.label)}</span>
          <small class="sev-tile-x">${esc(g.items.map(t => _sevShort(ctx, 'task', t.id, t.title)).slice(0, 3).join(', '))}</small></div>`}
        <span class="sev-badge">${_sevIco(g.badge[0])}<span>${esc(g.badge[1])}</span></span>
      </div>`).join('');
  const win = showWin ? `
      <div class="sev-win sev-card" style="--i:${Math.min(groups.length, 4) + 1}">
        ${animSceneHtml(top.type === 'task' ? 'celebration' : top.type, { size: 'lg', cls: 'sev-win-scene' })}
        <div class="sev-win-b"><small class="sev-over">${esc(n >= 2 ? 'Biggest win' : 'Done today')}</small><b>${esc(top.title)}</b></div>
      </div>` : '';
  const el = document.createElement('div');
  el.className = 'sev sev-done' + (b.quiet ? ' is-quiet' : '') + (tiles ? '' : ' no-tiles') + (few.length ? ' is-few' : '');
  el.innerHTML = b.quiet ? `
    <div class="sev-quiet">
      ${animSceneHtml('rest', { size: 'hero', cls: 'sev-quiet-scene' })}
      <div class="sev-over" style="--i:1">Finish the day</div>
      <h2 class="sev-h sev-in" style="--i:2">A quiet day.</h2>
      <p class="sev-lede sev-in" style="--i:3">${esc(lede)} Rest counts too.</p>
      ${pills.length ? `<div class="sev-pills sev-in" style="--i:4">${pills.join('')}</div>` : ''}
    </div>` : `
    <div class="sev-count">
      <div class="sev-over sev-in" style="--i:0">Done today</div>
      <b class="sev-big num" data-n="${escAttr(big)}">${ctx.reduced ? esc(big) : '0'}</b>
      <p class="sev-lede sev-in" style="--i:2">${esc(lede)}</p>
      ${pills.length ? `<div class="sev-pills sev-in" style="--i:3">${pills.join('')}</div>` : ''}
    </div>
    ${tiles || win ? `<div class="sev-tiles">${tiles}${win}</div>` : ''}`;
  f.cards.appendChild(el);
  const bigEl = el.querySelector('.sev-big');
  if (bigEl) STORY_KIT.countUp(bigEl, big, { duration: 900, delay: 260 });
  // Each tile's scene plays its little celebration once, as the tile lands; the badge pops after it.
  const tileEls = [...el.querySelectorAll('.sev-tile, .sev-one')];
  if (!ctx.reduced) {
    tileEls.forEach((t, i) => {
      const s = t.querySelector('.anim-scene');
      if (s) s.classList.remove('is-live');
      T.set(() => { if (s) s.classList.add('is-live'); t.classList.add('is-landed'); }, 420 + i * 90);
    });
  } else tileEls.forEach(t => t.classList.add('is-landed'));
  // Confetti on the biggest win: once a day (Replay never repeats it).
  const w = el.querySelector('.sev-win');
  if (w && b.dt && b.dt.confetti && !ctx.reduced) {
    T.set(() => {
      let seen = '';
      try { seen = localStorage.getItem('dashboard-story-ev-confetti') || ''; } catch (e) { /* private mode */ }
      if (seen === d.date || !w.isConnected || document.hidden) return;
      try { localStorage.setItem('dashboard-story-ev-confetti', d.date); } catch (e) { /* private mode */ }
      w.classList.add('is-burst');
      if (typeof animBurst === 'function') animBurst(w.querySelector('.anim-scene') || w, 'celebration');
    }, 900 + tileEls.length * 90);
  }
  return () => T.clear();
});

/* ---------- E2: people you met ---------- */
storyRegisterBeatType('ev-people', (f, b, ctx) => {
  const S = _sevSession(ctx.data.date), T = _sevTimers();
  const unhold = _sevHoldable(f, b);
  const cards = (b.met || []).slice(0, 3);
  const extra = (b.met || []).length - cards.length;
  const nudge = !S.dismissed && b.nudge && !b.nudge.p.celebration ? b.nudge : null;
  const el = document.createElement('div');
  el.className = 'sev sev-people';
  el.dataset.n = String(cards.length);
  el.innerHTML = `
    <header class="sev-head"><div class="sev-over">People you met</div>${_sevSaidHtml(b.text, b.entities, ctx)}</header>
    <div class="sev-met">${cards.map((p, i) => {
      const ev = p.met && p.met.eventId ? ctx.event(p.met.eventId) : null;
      const when = [ev ? _sevShort(ctx, 'event', ev.id, ev.title) : p.met && p.met.title, p.met && p.met.start].filter(Boolean).join(' · ');
      const saved = S.saved.has(p.id), followed = S.followed.has(p.id);
      const loop = sevOpenLoop(p, ctx);
      return `<article class="sev-mc sev-card${saved ? ' is-saved' : ''}" style="--i:${i}" data-key="${escAttr('person|' + p.id)}" data-pid="${escAttr(p.id)}">
        <div class="sev-mc-top"><span class="sev-ava">${STORY_KIT.avatarHtml({ id: p.id, name: p.name, color: p.color, avatarUrl: p.avatarUrl, kind: p.kind }, 56)}${animSceneHtml(ev ? ev.type : 'one-on-one', { size: 'xs', cls: 'sev-ava-scene' })}<i class="sev-tick">${_sevIco('check')}</i></span>
          <div class="sev-mc-n"><b>${esc(p.name)}</b><small>${esc(when || p.why || '')}</small></div></div>
        ${loop ? `<div class="sev-loop is-${escAttr(loop.kind)}" title="${escAttr(loop.full)}">${_sevIco(loop.icon)}<span class="sev-loop-k">${esc(loop.label)}</span><span class="sev-loop-t">${esc(loop.title)}</span>${loop.more ? `<span class="sev-loop-n">+${esc(loop.more)}</span>` : ''}</div>` : ''}
        <label class="sev-note-l"><span class="sr-only">Note about ${esc(p.first)}</span><textarea class="sev-note" rows="2" maxlength="4000" placeholder="${escAttr(saved ? 'Saved to their notes. Add another…' : `Add a note for ${p.first}…`)}"></textarea></label>
        <div class="sev-mc-acts">
          <button type="button" class="sev-btn" data-sev="save" disabled>${_sevIco('notebook-pen')}<span>Save to notes</span></button>
          <button type="button" class="sev-btn" data-sev="follow"${followed ? ' disabled' : ''}>${_sevIco(followed ? 'check' : 'repeat')}<span>${followed ? 'Follow-up added' : 'Follow up'}</span></button>
        </div>
      </article>`;
    }).join('')}</div>
    ${extra > 0 ? `<p class="sev-more">and ${esc(extra)} more in Open details</p>` : ''}
    ${nudge ? `<div class="sev-nudge sev-card" data-pid="${escAttr(nudge.p.id)}">${STORY_KIT.avatarHtml({ id: nudge.p.id, name: nudge.p.name, color: nudge.p.color, avatarUrl: nudge.p.avatarUrl, kind: nudge.p.kind }, 32)}
        <span class="sev-nudge-t"><b>${esc(nudge.text)}.</b> <span>${esc(nudge.sub)}</span></span>
        <button type="button" class="sev-btn is-pri" data-sev="catchup">${_sevIco('calendar-plus')}<span>${esc(nudge.kind === 'owe' ? 'Remind me tomorrow' : 'Plan a catch-up')}</span></button>
        <button type="button" class="sev-btn" data-sev="dismiss">Not now</button></div>` : ''}`;
  f.cards.appendChild(el);
  _sevDecorateEntities(el.querySelector('.sev-said'), ctx);
  _sevAddContinue(f);
  const tomorrow = _sevTomorrowIso(ctx.data.date);
  el.querySelectorAll('.sev-mc').forEach(card => {
    const pid = card.dataset.pid, p = ctx.person(pid) || { first: '' };
    const ta = card.querySelector('textarea'), save = card.querySelector('[data-sev="save"]'), follow = card.querySelector('[data-sev="follow"]');
    // An unsaved note survives Back / Replay (kept for the day, never saved on its own).
    if (S.drafts.get(pid)) { ta.value = S.drafts.get(pid); save.disabled = false; }
    ta.addEventListener('input', () => { save.disabled = !ta.value.trim(); S.drafts.set(pid, ta.value); });
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save.click(); } });
    save.addEventListener('click', () => {
      const text = ta.value.trim();
      if (!text || typeof addPersonNote !== 'function' || !addPersonNote(pid, text)) return;
      S.saved.add(pid);
      // The note flies into the avatar, then a tick pops.
      const ghost = document.createElement('span'); ghost.className = 'sev-ghost'; ghost.textContent = text.slice(0, 80);
      card.appendChild(ghost);
      const a = card.querySelector('.sev-ava').getBoundingClientRect(), g = ta.getBoundingClientRect();
      if (!ctx.reduced && ghost.animate) {
        ghost.style.left = (g.left - card.getBoundingClientRect().left) + 'px'; ghost.style.top = (g.top - card.getBoundingClientRect().top) + 'px';
        ghost.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${a.left - g.left}px, ${a.top - g.top}px) scale(.4)`, opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
      }
      T.set(() => ghost.remove(), 460);
      ta.value = ''; S.drafts.delete(pid); save.disabled = true; ta.placeholder = 'Saved to their notes. Add another…';
      card.classList.remove('is-saved'); void card.offsetWidth; card.classList.add('is-saved');
    });
    follow.addEventListener('click', () => {
      if (S.followed.has(pid) || typeof addCustomTask !== 'function') return;
      const id = addCustomTask(`Follow up with ${p.first || p.name || 'them'}`, briefAddDays(tomorrow, 1), 'p0', [], null, 'none', { people: [pid] });
      if (!id) return;
      S.followed.add(pid);
      follow.disabled = true; follow.innerHTML = `${_sevIco('check')}<span>Follow-up added</span>`;
      follow.classList.add('is-done');
    });
  });
  const nd = el.querySelector('.sev-nudge');
  if (nd) {
    const pid = nd.dataset.pid, p = ctx.person(pid) || {};
    nd.querySelector('[data-sev="catchup"]').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const owe = btn.textContent.includes('Remind');
      const id = typeof addCustomTask === 'function' ? addCustomTask(owe ? `Reply to ${p.first || p.name}` : `Catch up with ${p.first || p.name}`, owe ? tomorrow : reviewWeekRange(ctx.data.date, APP_CONFIG.weekStart || 'Mon').nextFrom, 'p0', [], null, 'none', { people: [pid] }) : null;
      if (!id) return;
      btn.disabled = true; btn.innerHTML = `${_sevIco('check')}<span>${owe ? 'On tomorrow’s list' : 'Added to next week'}</span>`;
    });
    nd.querySelector('[data-sev="dismiss"]').addEventListener('click', () => { S.dismissed = true; nd.classList.add('is-gone'); T.set(() => nd.remove(), ctx.reduced ? 0 : 280); });
  }
  // A card whose name was never spoken (a different voice, a skipped word) still comes in.
  T.set(() => el.querySelectorAll('.sev-mc').forEach(c => c.classList.add('is-hot')), ctx.reduced ? 0 : 5200);
  return () => { T.clear(); unhold(); };
});

/* ---------- E3: what slipped ---------- */
function _sevSlipTargets(date) {
  const tom = _sevTomorrowIso(date), after = briefAddDays(date, 2);
  const wk = reviewWeekRange(date, (APP_CONFIG && APP_CONFIG.weekStart) || 'Mon').nextFrom;
  const short = (iso) => { try { return _calParse(iso).toLocaleDateString(APP_CONFIG.locale || undefined, { weekday: 'short' }); } catch (e) { return iso; } };
  const out = [['tomorrow', 'Tomorrow', tom], ['after', short(after), after]];
  if (wk > after) out.push(['week', 'Next week', wk]);
  out.push(['drop', 'Drop', null]);
  return out;
}
/** Move (or drop) one slipped task; remembers how to put it back. Returns true when changed. */
function _sevMove(x, target, date, why) {
  const it = typeof getItem === 'function' ? getItem(x.id) : null;
  if (!it) return false;
  _sevRestore(x.id, true);
  const before = { dueDate: it.dueDate || null, dueTime: it.dueTime || null, plannedFor: it.plannedFor || null, status: statusOf(x.id), resolution: it.resolution || null, resolvedAt: it.resolvedAt || null, acts: (state.taskActivity[x.id] || []).length };
  if (target === 'drop') setStatus(x.id, 'done', { wontDo: true, noSave: true });
  else _evRoll(x.id, x.field === 'planned' ? 'planned' : 'due', date, why || EVENING_ROLL_REASON);
  _sev.moved.set(x.id, { target, date, before });
  return true;
}
/** Put a moved task back as it was (dates, status, the activity entries the move added). */
function _sevRestore(id, quiet) {
  const m = _sev.moved.get(id), it = typeof getItem === 'function' ? getItem(id) : null;
  if (!m || !it) return false;
  const b = m.before;
  if (b.dueDate) it.dueDate = b.dueDate; else delete it.dueDate;
  if (b.dueTime) it.dueTime = b.dueTime;
  if (b.plannedFor) it.plannedFor = b.plannedFor; else delete it.plannedFor;
  if (m.target === 'drop') {
    state.statuses[id] = b.status || 'todo';
    if (b.resolution) { it.resolution = b.resolution; it.resolvedAt = b.resolvedAt; } else { delete it.resolution; delete it.resolvedAt; }
  }
  if (Array.isArray(state.taskActivity[id])) state.taskActivity[id] = state.taskActivity[id].slice(0, b.acts);
  _sev.moved.delete(id);
  if (!quiet) { saveData(); render(); }
  return true;
}
storyRegisterBeatType('ev-slipped', (f, b, ctx) => {
  const S = _sevSession(ctx.data.date), date = ctx.data.date;
  const unhold = _sevHoldable(f, b);
  const targets = _sevSlipTargets(date);
  const narrow = window.innerWidth < 600 || window.innerHeight < 640;
  const rows = (b.items || []).slice(0, window.innerHeight < 560 ? 2 : narrow ? 3 : 4);
  const more = (b.items || []).length - rows.length;
  const n = (b.items || []).length;
  const el = document.createElement('div');
  el.className = 'sev sev-slipped';
  const rowHtml = (x, i) => {
    const it = typeof getItem === 'function' ? getItem(x.id) : null;
    const type = it && typeof animForTask === 'function' ? animForTask(it).type : 'task';
    const why = x.why === 'overdue' ? `${x.days || ''} ${x.days === 1 ? 'day' : 'days'} overdue`.trim() : x.why === 'due' ? 'due today' : 'planned today';
    return `<div class="sev-row sev-card" style="--i:${i}" data-id="${escAttr(x.id)}">
      ${animSceneHtml(type, { size: 'md', cls: 'sev-row-scene' })}
      <div class="sev-row-b">
        <b class="sev-row-t"><span>${esc(x.title)}</span></b>
        <div class="sev-row-m">${it ? _sevStreamDot(it.stream) + `<span>${esc((STREAMS[it.stream] && STREAMS[it.stream].label) || '')}</span><span aria-hidden="true">·</span>` : ''}<span class="${x.why === 'overdue' ? 'is-late' : ''}">${esc(why)}</span><span class="sev-row-done">${_sevIco('check')}<span></span></span></div>
        <div class="sev-why" role="group" aria-label="Why did it slip?"><span>Why?</span>${SEV_WHY.map(w => `<button type="button" class="sev-chip" data-why="${escAttr(w)}" aria-pressed="false">${esc(w)}</button>`).join('')}</div>
      </div>
      <div class="sev-seg" role="radiogroup" aria-label="Move ${escAttr(x.title)}"><i class="sev-thumb" aria-hidden="true"></i>${targets.map(([k, label]) => `<button type="button" role="radio" aria-checked="false" data-t="${escAttr(k)}">${esc(label)}</button>`).join('')}</div>
    </div>`;
  };
  el.innerHTML = `
    <header class="sev-head"><div class="sev-over">What slipped</div><h2 class="sev-h">${esc(`${sevNumWord(n, true)} ${n === 1 ? 'thing' : 'things'} slipped.`)} <span class="sev-h-soft">That’s fine.</span></h2></header>
    <div class="sev-rows">${rows.map(rowHtml).join('')}</div>
    <div class="sev-acts">
      <button type="button" class="sev-btn" data-sev="undo" disabled>${_sevIco('undo-2')}<span>Undo</span></button>
      <button type="button" class="sev-btn is-pri" data-sev="all">${_sevIco('sunrise')}<span>Move all to tomorrow</span></button>
      ${more > 0 ? `<span class="sev-more">+${esc(more)} more in Open details</span>` : ''}
    </div>`;
  f.cards.appendChild(el);
  _sevAddContinue(f);
  const byId = new Map((b.items || []).map(x => [x.id, x]));
  const paint = (row) => {
    const id = row.dataset.id, m = S.moved.get(id), why = S.why.get(id) || '';
    row.classList.toggle('is-moved', !!m);
    row.classList.toggle('is-dropped', !!m && m.target === 'drop');
    const btns = [...row.querySelectorAll('.sev-seg button')];
    const k = m ? btns.findIndex(x => x.dataset.t === m.target) : -1;
    btns.forEach((x, j) => x.setAttribute('aria-checked', j === k ? 'true' : 'false'));
    const thumb = row.querySelector('.sev-thumb');
    if (k >= 0) { const t = btns[k]; thumb.style.setProperty('--x', t.offsetLeft + 'px'); thumb.style.setProperty('--w', t.offsetWidth + 'px'); }
    row.querySelector('.sev-seg').classList.toggle('has-pick', k >= 0);
    const label = m ? (m.target === 'drop' ? 'dropped' : m.target === 'tomorrow' ? 'moved to tomorrow' : m.target === 'week' ? 'moved to next week' : `moved to ${btns[k] ? btns[k].textContent : 'later'}`) : '';
    row.querySelector('.sev-row-done > span').textContent = label;
    row.querySelectorAll('.sev-why button').forEach(x => x.setAttribute('aria-pressed', x.dataset.why === why ? 'true' : 'false'));
  };
  const undoBtn = el.querySelector('[data-sev="undo"]');
  const syncUndo = () => { undoBtn.disabled = !S.undo.length; };
  const apply = (ids, target) => {
    const t = targets.find(x => x[0] === target);
    const done = [];
    for (const id of ids) {
      const x = byId.get(id); if (!x) continue;
      const cur = S.moved.get(id);
      if (cur && cur.target === target) continue;
      if (_sevMove(x, target, t ? t[2] : null, S.why.get(id))) done.push(id);
    }
    if (!done.length) return;
    S.undo.push(done);
    saveData(); render();
    el.querySelectorAll('.sev-row').forEach(paint);
    syncUndo();
  };
  el.querySelectorAll('.sev-row').forEach(row => {
    const id = row.dataset.id;
    row.querySelectorAll('.sev-seg button').forEach(btn => btn.addEventListener('click', () => {
      const cur = S.moved.get(id);
      if (cur && cur.target === btn.dataset.t) return;          // re-selecting is a no-op
      apply([id], btn.dataset.t);
    }));
    row.querySelectorAll('.sev-why button').forEach(btn => btn.addEventListener('click', () => {
      const w = btn.dataset.why;
      if (S.why.get(id) === w) S.why.delete(id); else S.why.set(id, w);
      // Already moved: the reason goes on the move (the weekly review reads it).
      const m = S.moved.get(id);
      const acts = state.taskActivity[id];
      if (m && m.target !== 'drop' && Array.isArray(acts) && acts.length > m.before.acts) { acts[acts.length - 1].reason = S.why.get(id) || EVENING_ROLL_REASON; saveData(); }
      paint(row);
    }));
    paint(row);
  });
  undoBtn.addEventListener('click', () => {
    const last = S.undo.pop(); if (!last) return;
    for (const id of last) _sevRestore(id, true);
    saveData(); render();
    el.querySelectorAll('.sev-row').forEach(paint);
    syncUndo();
  });
  el.querySelector('[data-sev="all"]').addEventListener('click', () => apply((b.items || []).map(x => x.id).filter(id => !S.moved.has(id)), 'tomorrow'));
  syncUndo();
  // Thumb positions need layout: paint again once the rows have landed.
  const h = setTimeout(() => el.isConnected && el.querySelectorAll('.sev-row').forEach(paint), 700);
  return () => { clearTimeout(h); unhold(); };
});

/* ---------- E4: tomorrow ---------- */
function sevTop3Candidates(ctx) {
  const S = _sevSession(ctx.data.date), tom = _sevTomorrowIso(ctx.data.date);
  const out = [], seen = new Set();
  const add = (id, why) => {
    if (!id || seen.has(id)) return;
    const it = typeof getItem === 'function' ? getItem(id) : null;
    if (!it || statusOf(id) === 'done') return;
    seen.add(id); out.push({ id, title: _sevShort(ctx, 'task', id, shortTitleSafe(effTitle(it))), full: effTitle(it), stream: it.stream, why });
  };
  for (const [id, m] of S.moved) if (m.target === 'tomorrow') add(id, 'rolled over');
  try { for (const c of eveningModel().cand) add(c.i.id, c.why); } catch (e) { /* the page model needs the calendar: fall back to the story data */ }
  for (const t of (ctx.data.tomorrow && ctx.data.tomorrow.tasks) || []) add(t.id, 'Due tomorrow');
  for (const t of ctx.data.focus || []) add(t.id, 'In focus');
  return { list: out.slice(0, 10), tom };
}
storyRegisterBeatType('ev-tomorrow', (f, b, ctx) => {
  const d = ctx.data, S = _sevSession(d.date), T = _sevTimers();
  const unhold = _sevHoldable(f, b);
  const { list: cand, tom } = sevTop3Candidates(ctx);
  const byId = new Map(cand.map(c => [c.id, c]));
  if (!Array.isArray(S.picked)) {
    S.picked = (typeof _ev !== 'undefined' && _ev.pickedFor === d.date && Array.isArray(_ev.picked) ? _ev.picked : []).filter(id => byId.has(id));
    for (const c of cand) if (S.picked.length < 3 && c.why === 'rolled over' && !S.picked.includes(c.id)) S.picked.push(c.id);
  }
  S.picked = S.picked.filter(id => byId.has(id)).slice(0, 3);
  const ev = b.first || b.allDay;
  // An all-day birthday reads "Birthday" + "Sam's birthday"; other all-day events "All day" + their title.
  const bday = !b.first && ev && (ev.type === 'birthday' || /\b(birthday|b-?day)\b/i.test(String(ev.title || '')));
  const wx = d.weather && d.weather.tomorrow;
  const wxLine = wx ? `${wx.label || ''}${typeof wx.hi === 'number' ? `, ${Math.round(wx.hi)}°` : ''}.` : '';
  const rain = wx && typeof wx.rainChance === 'number' ? (wx.rainChance >= 60 ? `Rain likely (${wx.rainChance}%): take a coat.` : wx.rainChance <= 15 ? 'Dry all day.' : `${wx.rainChance}% chance of rain.`) : '';
  const tomTask = ((d.tomorrow && d.tomorrow.tasks) || [])[0];
  const meta = ev ? [ev.location, ev.minutes ? (ev.minutes >= 60 ? `${Math.round(ev.minutes / 6) / 10} h` : `${ev.minutes} min`) : '', (ev.people || []).length ? 'with ' + STORY_KIT.list((ev.people || []).map(id => (ctx.person(id) || {}).first).filter(Boolean).slice(0, 3)) : ''].filter(Boolean).join(' · ') : '';
  const el = document.createElement('div');
  el.className = 'sev sev-tomorrow' + (cand.length ? '' : ' no-pick');
  el.innerHTML = `
    <header class="sev-head"><div class="sev-over">Tomorrow · ${esc(d.tomorrow && d.tomorrow.weekday || '')}</div><h2 class="sev-h">${esc(cand.length ? 'Set up tomorrow in ten seconds' : 'Tomorrow, at a glance')}</h2></header>
    <div class="sev-tom-grid">
      <section class="sev-first sev-card" style="--i:0">
        <div class="sev-over">${esc(b.first ? 'First up' : ev ? (bday ? 'All day' : 'Tomorrow') : 'An open day')}</div>
        <div class="sev-first-row">${animSceneHtml(ev ? ev.type : tomTask ? tomTask.type : 'rest', { size: 'xl', cls: 'sev-first-scene' })}${b.first ? `<b class="sev-time num">${esc(ev.start || '')}</b>` : `<b class="sev-time sev-time-word">${esc(ev ? (bday ? 'Birthday' : 'All day') : 'Free')}</b>`}</div>
        <b class="sev-first-t" title="${escAttr(ev ? ev.title : tomTask ? tomTask.title : '')}">${esc(ev ? (b.first ? ev.title : sevEventPhrase(ev, ev.title)) : tomTask ? shortTitleSafe(tomTask.title) : 'Nothing booked yet')}</b>
        ${ev ? (meta ? `<small class="sev-first-m">${esc(meta)}</small>` : '') : `<small class="sev-first-m">${esc(tomTask ? 'Due tomorrow' : 'No events and nothing due.')}</small>`}
        ${wx ? `<div class="sev-wx">${briefWxIcon(wx.cond, true, 'i-lg')}<span><b>${esc(wxLine)}</b> ${esc(rain)}</span></div>` : ''}
      </section>
      ${cand.length ? `<section class="sev-pick sev-in" style="--i:1">
        <div class="sev-over">Pick your top 3</div>
        <ol class="sev-slots"></ol>
        <div class="sev-sug-l">Suggested</div>
        <div class="sev-cands"></div>
        <div class="sev-pick-acts"><button type="button" class="sev-btn is-pri" data-sev="set">${_sevIco('target')}<span>Make these tomorrow’s focus</span></button></div>
      </section>` : ''}
    </div>`;
  f.cards.appendChild(el);
  _sevAddContinue(f);
  // 09:07 -> 09:00: the time settles into place.
  const tEl = el.querySelector('.sev-time.num');
  if (tEl && b.first && ev.startMin !== null && ev.startMin !== undefined && !ctx.reduced) {
    const end = Number(ev.startMin), fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const t0 = performance.now() + 380;
    tEl.textContent = fmt(end + 7);
    const tick = (t) => {
      if (!tEl.isConnected) return;
      const p = Math.max(0, Math.min(1, (t - t0) / 700));
      tEl.textContent = fmt(end + Math.round(7 * (1 - (1 - Math.pow(1 - p, 3)))));
      if (p < 1 && !document.hidden) requestAnimationFrame(tick); else tEl.textContent = fmt(end);
    };
    requestAnimationFrame(tick);
  }
  const slots = el.querySelector('.sev-slots'), cands = el.querySelector('.sev-cands'), setBtn = el.querySelector('[data-sev="set"]');
  if (!slots) return () => { T.clear(); unhold(); };
  const paint = (flyFrom, flyId) => {
    slots.innerHTML = [0, 1, 2].map(k => {
      const c = byId.get(S.picked[k]);
      return c ? `<li class="sev-slot sev-card" data-id="${escAttr(c.id)}"><span class="sev-slot-n num">${k + 1}</span>${_sevStreamDot(c.stream)}<span class="sev-slot-t" title="${escAttr(c.full)}">${esc(c.title)}</span>${c.why === 'rolled over' ? '<span class="sev-tag">rolled over</span>' : ''}<button type="button" class="sev-x" aria-label="Remove ${escAttr(c.title)}">${_sevIco('x')}</button></li>`
        : `<li class="sev-slot is-empty"><span class="sev-slot-n num">${k + 1}</span>${k === S.picked.length ? `<input class="sev-slot-in" type="text" maxlength="200" placeholder="Tap a suggestion or type one" aria-label="Add a task for tomorrow">` : '<span class="sev-slot-t">&nbsp;</span>'}</li>`;
    }).join('');
    const rest = cand.filter(c => !S.picked.includes(c.id)).slice(0, window.innerWidth < 600 ? 2 : window.innerHeight < 700 ? 3 : 6);
    cands.innerHTML = rest.map(c => `<button type="button" class="sev-cand" data-id="${escAttr(c.id)}" title="${escAttr(c.full + ' · ' + c.why)}">${_sevIco('plus')}${_sevStreamDot(c.stream)}<span>${esc(c.title)}</span></button>`).join('');
    cands.hidden = !rest.length || S.picked.length >= 3;
    el.querySelector('.sev-sug-l').hidden = cands.hidden;
    setBtn.disabled = !S.picked.length;
    setBtn.classList.toggle('is-done', S.committed);
    setBtn.innerHTML = S.committed ? `${_sevIco('check')}<span>Tomorrow’s focus is set</span>` : `${_sevIco('target')}<span>Make these tomorrow’s focus</span>`;
    // The chip flies into its slot.
    if (flyFrom && flyId && !ctx.reduced) {
      const li = slots.querySelector(`.sev-slot[data-id="${CSS.escape(flyId)}"]`);
      if (li && li.animate) {
        const to = li.getBoundingClientRect();
        const dx = flyFrom.left - to.left, dy = flyFrom.top - to.top, sx = Math.max(0.3, flyFrom.width / Math.max(1, to.width));
        li.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${Math.max(0.4, flyFrom.height / Math.max(1, to.height))})`, transformOrigin: '0 0', opacity: 0.6 }, { transform: 'none', transformOrigin: '0 0', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.34,1.4,.64,1)' });
      }
    }
    wire();
  };
  const changed = () => { S.committed = false; if (typeof _ev !== 'undefined') { _ev.picked = S.picked.slice(); _ev.pickedFor = d.date; } };
  const wire = () => {
    cands.querySelectorAll('.sev-cand').forEach(btn => btn.addEventListener('click', () => {
      if (S.picked.length >= 3 || S.picked.includes(btn.dataset.id)) return;
      const r = btn.getBoundingClientRect();
      S.picked.push(btn.dataset.id); changed();
      paint(r, btn.dataset.id);
    }));
    slots.querySelectorAll('.sev-x').forEach(x => x.addEventListener('click', () => {
      const id = x.closest('.sev-slot').dataset.id;
      S.picked = S.picked.filter(v => v !== id); changed(); paint();
    }));
    const inp = slots.querySelector('.sev-slot-in');
    if (inp) inp.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !inp.value.trim() || typeof addTaskFromText !== 'function') return;
      e.preventDefault();
      const id = addTaskFromText(inp.value.trim(), { plannedFor: tom });
      if (!id) return;
      const it = getItem(id);
      const c = { id, title: shortTitleSafe(effTitle(it)), full: effTitle(it), stream: it.stream, why: 'New' };
      cand.unshift(c); byId.set(id, c);
      S.picked.push(id); changed(); paint();
      const next = slots.querySelector('.sev-slot-in'); if (next) next.focus();
    });
  };
  setBtn.addEventListener('click', () => {
    if (!S.picked.length || S.committed || typeof eveningSetTop3 !== 'function') return;
    eveningSetTop3(S.picked);
    S.committed = true; paint();
  });
  paint();
  return () => { T.clear(); unhold(); };
});

/* ---------- E5: today in one line ---------- */
storyRegisterBeatType('ev-reflect', (f, b, ctx) => {
  const S = _sevSession(ctx.data.date);
  const unhold = _sevHoldable(f, b);
  const el = document.createElement('div');
  el.className = 'sev sev-reflect';
  el.innerHTML = `
    <div class="sev-over">Today in one line</div>
    ${_sevSaidHtml(b.text, b.entities, ctx, 'sev-reflect-t' + (String(b.text || '').split(/\s+/).length > 17 ? ' is-long' : ''))}
    <div class="sev-mood-l sev-in" style="--i:1">How did it feel?</div>
    <div class="sev-mood sev-in" role="radiogroup" aria-label="How did today feel?" style="--i:2">${SEV_MOODS.map(([k, label, c]) => `<button type="button" role="radio" aria-checked="${S.mood === k ? 'true' : 'false'}" data-mood="${escAttr(k)}" style="--c:${c}"><i></i><span>${esc(label)}</span></button>`).join('')}</div>
    <label class="sev-journal sev-card sev-in" style="--i:3"><small>One line for your journal</small><input type="text" maxlength="300" placeholder="Saved with today’s recap" value="${escAttr(S.journal)}"></label>`;
  f.cards.appendChild(el);
  _sevDecorateEntities(el.querySelector('.sev-said'), ctx);
  _sevAddContinue(f);
  el.querySelectorAll('.sev-mood button').forEach(btn => btn.addEventListener('click', () => {
    if (S.mood === btn.dataset.mood) return;                  // re-selecting is a no-op
    S.mood = btn.dataset.mood;
    el.querySelectorAll('.sev-mood button').forEach(x => x.setAttribute('aria-checked', x === btn ? 'true' : 'false'));
  }));
  const inp = el.querySelector('.sev-journal input');
  inp.addEventListener('input', () => { S.journal = inp.value; });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
  return () => unhold();
});

/* ---------- E6: good job (dusk to night) ---------- */
function _sevNightHtml() {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let stars = '';
  for (let i = 0; i < 46; i++) stars += `<i class="sev-star" style="--x:${(rnd() * 100).toFixed(1)}%;--y:${(rnd() * 64).toFixed(1)}%;--s:${(0.5 + rnd() * 1.3).toFixed(2)};--i:${i};--tw:${(rnd() * 4).toFixed(2)}s"></i>`;
  return `<div class="sev-night" aria-hidden="true"><i class="sev-night-sky"></i>${stars}<i class="sev-moon"></i>
    <svg class="sev-hills" viewBox="0 0 1440 260" preserveAspectRatio="none"><path class="h1" d="M0 150 C 220 70 420 60 640 120 S 1060 210 1440 90 V260 H0Z"/><path class="h2" d="M0 210 C 260 140 520 150 760 196 S 1180 250 1440 170 V260 H0Z"/></svg></div>`;
}
/** Save the evening recap (review.save kind 'evening'): done, what slipped and why, top 3, mood and journal. */
async function sevSaveRecap(ctx) {
  const S = _sevSession(ctx.data.date);
  if (typeof eveningModel !== 'function' || typeof reviewSave !== 'function') return false;
  const m = eveningModel();
  const slipped = (ctx.data.slipped || []).map(x => ({ taskId: x.id, title: String(x.title || '').slice(0, 300), ...(S.why.get(x.id) ? { reason: S.why.get(x.id) } : {}) })).slice(0, 50);
  const mood = (SEV_MOODS.find(x => x[0] === S.mood) || [])[1];
  const notes = [mood ? `Mood: ${mood}` : '', String(S.journal || '').trim()].filter(Boolean).join('\n');
  const ai = typeof _bf !== 'undefined' && _bf.summary.evening && _bf.summary.evening.date === m.date ? _bf.summary.evening.text : null;
  const op = {
    op: 'review.save', kind: 'evening', date: m.date,
    done: [...m.done.map(x => ({ taskId: x.i.id, title: effTitle(x.i).slice(0, 300), kind: 'task' })), ...m.subs.slice(0, 30).map(x => ({ taskId: x.i.id, title: String(x.s.title || '').slice(0, 300), kind: 'subtask' })), ...m.happened.slice(0, 20).map(e => ({ title: String(e.title || '').slice(0, 300), kind: 'event' }))].slice(0, 80),
    rolled: [...S.moved.values()].filter(x => x.target !== 'drop').length || m.rolledToday,
    top3: (S.picked || []).filter(id => getItem(id)).slice(0, 3),
    stats: { completed: m.done.length, meetings: m.meetings.length, streak: m.streak.days, slipped: slipped.length },
    ...(slipped.length ? { slipped } : {}), ...(notes ? { notes } : {}), ...(ai ? { summary: ai } : {}),
  };
  const ok = await reviewSave(op, 'Recap saved. Have a good evening.');
  if (!ok) return false;
  if (typeof _ev !== 'undefined') _ev.savedFor = m.date;
  _bfPost('/api/brief/snapshot', { date: m.date, kind: 'evening', snapshot: {
    summary: { praise: eveningPraise(m), done: m.done.length, steps: m.subs.length, meetings: m.meetings.length, slipped: m.slipped.length, rolled: op.rolled, streak: m.streak.days, ai, ...(mood ? { mood } : {}) },
    done: m.done.slice(0, 20).map(x => ({ id: x.i.id, title: effTitle(x.i), type: x.type })),
    meetings: m.happened.slice(0, 12).map(e => ({ title: e.title, type: e.type })),
    top3: op.top3.map(id => { const it = getItem(id); return it ? { id, title: effTitle(it) } : null; }).filter(Boolean),
  } }).catch(() => {});
  return true;
}
storyRegisterBeatType('ev-outro', (f, b, ctx) => {
  const d = ctx.data, S = _sevSession(d.date);
  f.scene.innerHTML = _sevNightHtml();
  f.scene.classList.add('sev-night-frame');
  const moved = [...S.moved.values()].filter(x => x.target !== 'drop').length;
  const met = sevPeopleMet(d).length;
  const pills = [
    d.doneCount ? [`${d.doneCount} done`, 'circle-check'] : null,
    met ? [`${met} ${met === 1 ? 'person' : 'people'}`, 'users'] : null,
    moved ? [`${moved} moved`, 'arrow-right'] : null,
    S.committed || (S.picked && S.picked.length) ? [S.committed ? 'top 3 set' : `${S.picked.length} picked for tomorrow`, 'target'] : null,
    S.mood ? [`felt ${(SEV_MOODS.find(x => x[0] === S.mood) || [])[1].toLowerCase()}`, 'heart'] : null,
  ].filter(Boolean);
  const tomLine = b.first ? `Tomorrow starts at ${b.first.start} with ${b.firstT}.` : b.allDayT ? `Tomorrow: ${b.allDayT}.` : /tomorrow/i.test(b.closing || '') ? '' : 'Tomorrow is open.';
  // The closing line joins in unless it would say "tomorrow" twice.
  const closeLine = b.closing && !/^rest well\.?$/i.test(b.closing) && !(tomLine && /tomorrow/i.test(b.closing)) ? b.closing : '';
  const sum = [b.topT ? `${b.topT} is done.` : '', tomLine, closeLine].filter(Boolean).join(' ');
  const el = document.createElement('div');
  el.className = 'sev sev-outro';
  el.innerHTML = `
    <div class="sev-over sev-in" style="--i:0">${esc(b.dt ? b.dt.line : "That's a wrap")}</div>
    <h2 class="sev-hero">${STORY_KIT.driftHtml(b.head, { delay: 280 })}</h2>
    <p class="sev-lede sev-in" style="--i:9">${esc(sum)}</p>
    ${pills.length ? `<div class="sev-pills sev-in" style="--i:10">${pills.map(([t, ic]) => `<span class="sev-pill">${_sevIco(ic)}<span>${esc(t)}</span></span>`).join('')}</div>` : ''}
    <div class="sev-outro-acts sev-in" style="--i:11">
      <button type="button" class="sev-xl" data-sev="close">${_sevIco('moon', 'i-lg')}<span>${S.closed ? 'Day closed' : 'Close the day'}</span></button>
      <button type="button" class="sev-btn" data-sev="replay">${_sevIco('rotate-ccw')}<span>Replay</span></button>
    </div>`;
  f.cards.appendChild(el);
  const close = el.querySelector('[data-sev="close"]');
  close.addEventListener('click', async () => {
    if (close.disabled) return;
    close.disabled = true;
    if (!S.committed && S.picked && S.picked.length && typeof eveningSetTop3 === 'function') { eveningSetTop3(S.picked); S.committed = true; }
    const ok = S.closed || await sevSaveRecap(ctx);
    if (!ok) { close.disabled = false; return; }
    S.closed = true;
    if (typeof Story !== 'undefined') Story.close();
  });
  el.querySelector('[data-sev="replay"]').addEventListener('click', () => { if (typeof Story !== 'undefined') Story.replay(); });
  return () => {};
});
