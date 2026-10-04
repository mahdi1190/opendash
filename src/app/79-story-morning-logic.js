/* ============================================================
   MORNING STORY - LOGIC (owner: Morning story). PURE classic script: no DOM,
   no page globals, nothing runs at load except constants, so
   tests/story-morning.test.mjs evaluates it in Node exactly as the page does.

   79-story-morning.js renders what this file decides:
     smBuildMorning(data, script, o) -> beats  the whole morning story, in the
        order the day calls for (content-aware), with narration, pacing and
        the view model of every beat. data/script: GET /api/story?kind=morning
        (lib/story-data.mjs, lib/story-script.mjs). o: {nowMin, countdowns,
        itemInfo(id), personNote(id)} - the page's live clock and state.
   Beat ids are stable (intro, s0.., schedule, people, focus, ahead, close):
   a later AI script replaces the beats after the one on screen by id.
   Every string here is plain text; the renderer escapes it.
   ============================================================ */
const SM_NUM_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const SM_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SM_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SM_MAX_SENTENCES = 4;
/** Card geometry of the desktop timeline (px; the CSS uses the same numbers). */
const SM_TL = Object.freeze({ cardW: 228, cardH: 96, gap: 12, lanes: ['up1', 'dn1', 'up2', 'dn2'] });

/* ---------- words ---------- */
function smNum(n) { return Number.isInteger(n) && n >= 0 && n <= 10 ? SM_NUM_WORDS[n] : String(n); }
function smCap(s) { s = String(s || ''); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function smPlural(n, one, many) { return `${smNum(n)} ${n === 1 ? one : (many || one + 's')}`; }
function smList(a) { a = (a || []).filter(Boolean); return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
/** A title short enough to say: the part before a colon / dash / bracket when that is a real name. */
function smShort(t, max) {
  max = max || 48;
  let s = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
  const head = s.split(/\s*(?::|;|\s[–—-]\s|\(|\[|\|)\s*/)[0];
  if (head.length >= 6 && head.length < s.length) s = head;
  if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '') + '…';
  return s.replace(/[\s,.;:–—-]+$/, '');
}
/** A title to read aloud: short, no ellipsis, never ending on a little word ("for the..."). */
function smSayTitle(t, max) {
  let s = smShort(t, max || 42).replace(/…$/, '');
  for (let i = 0; i < 3; i++) s = s.replace(/\s+(the|a|an|for|to|of|and|with|on|in|at|by|from|&|\+)$/i, '');
  return s.replace(/[\s,.;:–—-]+$/, '');
}
function smClip(t, max) { const s = String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : s; }

/* ---------- time ---------- */
function smMin(hm) { const m = /^(\d{1,2}):(\d{2})/.exec(String(hm || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function smHM(min) { min = Math.max(0, Math.round(min)); return String(Math.floor(min / 60) % 24).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }
/** "3 pm", "11 am", "noon", "half past 3", for narration and labels. */
function smHourText(hm) {
  const m = smMin(hm); if (m === null) return '';
  const h = Math.floor(m / 60), mm = m % 60;
  if (h === 12 && mm === 0) return 'noon';
  const h12 = h % 12 || 12, ap = h < 12 ? 'am' : 'pm';
  return mm ? `${h12}:${String(mm).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
}
/** "2 h", "45 min", "1 h 30" (labels). */
function smDur(min) { const h = Math.floor(min / 60), r = Math.round(min % 60); return !h ? `${r} min` : r ? `${h} h ${r}` : `${h} h`; }
/** "two hours", "an hour and a half", "45 minutes" (spoken). */
function smDurSay(min) {
  const h = Math.floor(min / 60), r = Math.round(min % 60);
  if (!h) return `${r} minutes`;
  const hs = h === 1 ? 'an hour' : `${smNum(h)} hours`;
  if (!r || r < 10) return hs;
  if (r >= 25 && r <= 35) return h === 1 ? 'an hour and a half' : `${smNum(h)} and a half hours`;
  return h === 1 ? `an hour and ${r} minutes` : `${hs} and ${r} minutes`;
}
function _smDay(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN; }
function smDaysBetween(a, b) { const x = _smDay(a), y = _smDay(b); return Number.isFinite(x) && Number.isFinite(y) ? Math.round((y - x) / 86400000) : null; }
function smWeekday(iso) { const x = _smDay(iso); return Number.isFinite(x) ? SM_WEEKDAYS[new Date(x).getUTCDay()] : ''; }
/** "today", "tomorrow", "Monday", "18 Dec", "2 days late". */
function smDueText(iso, today) {
  const n = smDaysBetween(today, iso);
  if (n === null) return '';
  if (n === 0) return 'today'; if (n === 1) return 'tomorrow'; if (n === -1) return 'yesterday';
  if (n < 0) return `${-n} days late`;
  if (n < 7) return smWeekday(iso);
  const d = new Date(_smDay(iso)); return `${d.getUTCDate()} ${SM_MONTHS[d.getUTCMonth()]}`;
}
/** "today", "yesterday", "3 days ago", "2 weeks ago", "3 months ago". */
function smAgo(days) {
  if (!Number.isFinite(days) || days < 0) return '';
  if (days === 0) return 'today'; if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

/* ---------- the kind of day ---------- */
const SM_CELEBRATE = ['birthday', 'celebration', 'party', 'wedding'];
/**
 * The day in one word, which sets the order, palette and pace:
 * 'celebrate' | 'deadline' | 'meetings' | 'travel' | 'gentle' (weekend, day off) | 'light' | 'normal'.
 */
function smDayKind(d) {
  d = d || {};
  const dt = (d.dayType && d.dayType.type) || 'normal';
  const flags = (d.dayType && d.dayType.flags) || {};
  const today = d.date;
  const cel = flags.birthday || flags.celebrate
    || (d.people || []).some(p => p && p.celebration && p.celebration.date === today)
    || (d.events || []).some(e => e && e.date === today && SM_CELEBRATE.includes(e.type));
  if (dt === 'deadline') return 'deadline';
  if (cel) return 'celebrate';
  if (dt === 'meetings') return 'meetings';
  if (dt === 'travel') return 'travel';
  if (dt === 'weekend' || dt === 'off') return 'gentle';
  if (dt === 'light') return 'light';
  return 'normal';
}
/** Pace per kind: ms after the narration before moving on, and the enter time. */
const SM_PACE = Object.freeze({
  deadline: { after: 900, enter: 820 }, celebrate: { after: 700, enter: 760 }, meetings: { after: 520, enter: 680 },
  travel: { after: 600, enter: 720 }, gentle: { after: 1250, enter: 950 }, light: { after: 900, enter: 820 }, normal: { after: 700, enter: 760 },
});
/** The beat order for a kind (beats without data are dropped later). */
function smOrder(kind) {
  switch (kind) {
    case 'meetings': case 'travel': return ['intro', 'schedule', 'say', 'people', 'focus', 'ahead', 'close'];
    case 'deadline': return ['intro', 'ahead', 'say', 'schedule', 'focus', 'people', 'close'];
    case 'celebrate': return ['intro', 'say', 'people', 'schedule', 'focus', 'ahead', 'close'];
    case 'gentle': return ['intro', 'say', 'people', 'schedule', 'ahead', 'close'];
    default: return ['intro', 'say', 'schedule', 'people', 'focus', 'ahead', 'close'];
  }
}
/** Palette for the sky tint when the script did not pick one. */
function smPalette(kind, tod) {
  if (kind === 'deadline') return 'ember';
  if (kind === 'celebrate') return 'sunset';
  if (kind === 'gentle') return tod === 'dawn' ? 'dawn' : 'forest';
  if (kind === 'meetings') return 'ocean';
  return tod === 'dawn' ? 'dawn' : 'sky';
}

/* ---------- weather ---------- */
const _SM_WET = ['rain', 'showers', 'drizzle', 'thunder', 'snow'];
/** First wet hour in the next hours (>= 50% chance or a wet condition): {time, hour, word, chance, cond} | null. */
function smRainFrom(next) {
  for (const h of Array.isArray(next) ? next : []) {
    if (!h) continue;
    const wet = _SM_WET.includes(h.cond) || (Number(h.rain) >= 50);
    if (!wet) continue;
    const cond = _SM_WET.includes(h.cond) ? h.cond : 'showers';
    return { time: h.time, hour: smHourText(h.time), chance: Number(h.rain) || null, cond, word: cond === 'snow' ? 'snow' : cond === 'thunder' ? 'storms' : cond === 'drizzle' ? 'drizzle' : cond === 'rain' ? 'rain' : 'showers' };
  }
  return null;
}
/** "It's 14 degrees and mainly clear, with showers from 3 pm." */
function smWeatherSay(w) {
  if (!w || !w.ok) return '';
  const t = typeof w.temp === 'number' && isFinite(w.temp) ? Math.round(w.temp) : null;
  const label = String(w.label || '').toLowerCase();
  const rain = smRainFrom(w.next);
  const first = t !== null ? `It's ${t} degrees${label ? ' and ' + label : ''}` : label ? `It's ${label}` : '';
  if (!first) return '';
  return `${first}${rain ? `, with ${rain.word} from ${rain.hour}` : ''}.`;
}
/** The hourly strip: up to `max` hours [{time, label, cond, temp, rain, now, ev:[colourType]}]. */
function smHours(w, events, max) {
  const list = (w && Array.isArray(w.next) ? w.next : []).slice(0, max || 13);
  return list.map((h, i) => {
    const hm = smMin(h.time);
    const evs = (events || []).filter(e => !e.allDay && e.startMin !== null && hm !== null && e.startMin >= hm && e.startMin < hm + 60).map(e => e.type);
    return { time: h.time, label: i === 0 ? 'Now' : String(h.time || '').slice(0, 2), cond: h.cond, temp: typeof h.temp === 'number' ? Math.round(h.temp) : null, rain: Math.max(0, Math.min(100, Number(h.rain) || 0)), now: i === 0, ev: evs.slice(0, 2) };
  });
}
/** Weather words in a sentence as extra entity spans (type 'weather'), never over an existing one. */
const _SM_WX_RE = /\b(heavy rain|light rain|rain|showers?|drizzle|thunder(?:storms?)?|storms?|snow|sunshine|sunny|mainly clear|clear skies|umbrella|frost|fog)\b/gi;
/** One weather chip per sentence at most: the first weather word that is not already an entity. */
function smWeatherEntities(text, entities, cond) {
  const s = String(text || ''), taken = (entities || []).map(e => [Number(e.start), Number(e.end)]);
  const out = [];
  let m;
  _SM_WX_RE.lastIndex = 0;
  while ((m = _SM_WX_RE.exec(s)) && out.length < 1) {
    const a = m.index, b = a + m[0].length;
    if (taken.some(([x, y]) => a < y && b > x)) continue;
    const w = m[0].toLowerCase();
    const c = /snow|frost/.test(w) ? 'snow' : /thunder|storm/.test(w) ? 'thunder' : /sun|clear/.test(w) ? 'clear' : /fog/.test(w) ? 'fog' : /drizzle/.test(w) ? 'drizzle' : /umbrella/.test(w) ? (cond && _SM_WET.includes(cond) ? cond : 'rain') : /shower/.test(w) ? 'showers' : 'rain';
    out.push({ type: 'weather', ref: c, text: m[0], start: a, end: b });
    taken.push([a, b]);
  }
  return out;
}

/* ---------- the timeline ---------- */
/**
 * Today's calendar as a track: {from, to (minutes), events (timed, in order), allDay,
 * gaps (with .best), next {id, mins}, nowMin, freeMin, title}.
 */
function smTimeline(d, nowMin) {
  d = d || {};
  const today = d.date;
  const evs = (d.events || []).filter(e => e && (e.date === today || (e.until && e.date <= today && e.until >= today)));
  const timed = evs.filter(e => !e.allDay && e.date === today && Number.isFinite(e.startMin)).map(e => ({ ...e, endMin: Number.isFinite(e.endMin) && e.endMin > e.startMin ? e.endMin : e.startMin + 30 }))
    .sort((a, b) => a.startMin - b.startMin);
  const allDay = evs.filter(e => e.allDay || e.date !== today);
  const first = timed.length ? timed[0].startMin : 9 * 60, last = timed.length ? Math.max(...timed.map(e => e.endMin)) : 18 * 60;
  const from = Math.max(6 * 60, Math.min(8 * 60, Math.floor(first / 60) * 60));
  const to = Math.min(24 * 60, Math.max(20 * 60, Math.ceil(last / 60) * 60));
  const now = Number.isFinite(nowMin) ? nowMin : null;
  const nx = now === null ? null : timed.find(e => e.endMin > now) || null;
  const gaps = (d.gaps || []).map(g => ({ ...g, startMin: smMin(g.start), endMin: smMin(g.end) })).filter(g => g.startMin !== null && g.endMin !== null && g.endMin > g.startMin && g.minutes >= 45);
  let best = null; for (const g of gaps) if (!best || g.minutes > best.minutes) best = g;
  const freeMin = gaps.reduce((n, g) => n + g.minutes, 0);
  return {
    from, to, events: timed, allDay, nowMin: now,
    gaps: gaps.map(g => ({ start: g.start, end: g.end, startMin: g.startMin, endMin: g.endMin, minutes: g.minutes, best: g === best })),
    next: nx ? { id: nx.id, mins: Math.round(nx.startMin - now), on: nx.startMin <= now } : null,
    freeMin,
    title: `${timed.length + allDay.length === 1 ? '1 event' : `${timed.length + allDay.length} events`}${freeMin >= 60 ? `, ${smFreeLabel(freeMin)} free` : ''}`,
  };
}
function smFreeLabel(min) { const h = Math.round(min / 30) / 2; return h === 1 ? '1 hour' : h % 1 ? smDur(Math.round(min / 30) * 30) : `${h} hours`; }
/**
 * Card lanes for the desktop track: events in order, each card as close to its
 * start as it can go without overlapping another card in the same lane.
 * items [{id, anchor (px)}] -> {cards:[{id, lane, left, anchor}], hidden:[id], lanes:{up, dn}}
 */
function smLanes(items, width, o) {
  o = Object.assign({ cardW: SM_TL.cardW, gap: SM_TL.gap, lanes: SM_TL.lanes }, o || {});
  const right = new Map(o.lanes.map(l => [l, -Infinity]));
  const cards = [], hidden = [];
  for (const it of items || []) {
    const want = Math.max(0, Math.min(width - o.cardW, it.anchor - 26));
    let lane = o.lanes.find(l => right.get(l) + o.gap <= want);
    let left = want;
    if (!lane) {
      lane = o.lanes.reduce((b, l) => (right.get(l) < right.get(b) ? l : b), o.lanes[0]);
      left = right.get(lane) + o.gap;
      if (left > width - o.cardW + 1) { hidden.push(it.id); continue; }
    }
    right.set(lane, left + o.cardW);
    cards.push({ id: it.id, lane, left: Math.round(left), anchor: Math.round(it.anchor) });
  }
  const used = new Set(cards.map(c => c.lane));
  return { cards, hidden, lanes: { up: used.has('up2') ? 2 : used.has('up1') ? 1 : 0, dn: used.has('dn2') ? 2 : used.has('dn1') ? 1 : 0 } };
}
/** "Four things on the calendar. Next up, Coffee with Sam in 42 minutes." */
function smTimelineSay(tl, name) {
  const n = tl.events.length + tl.allDay.length;
  if (!n) return '';
  const head = `${smCap(smNum(n))} ${n === 1 ? 'thing' : 'things'} on the calendar.`;
  const nx = tl.next && tl.events.find(e => e.id === tl.next.id);
  if (!nx) {
    const g = tl.gaps.find(x => x.best);
    return g ? `${head} Otherwise you're free from ${g.start}.` : head;
  }
  const what = name || smSayTitle(nx.title);
  const when = tl.next.on ? 'is on now' : tl.next.mins < 60 ? `in ${tl.next.mins} ${tl.next.mins === 1 ? 'minute' : 'minutes'}` : `at ${nx.start}`;
  return `${head} Next up, ${what}${tl.next.on ? ' ' : ', '}${when}.`;
}

/* ---------- people ---------- */
/**
 * People cards: [{id, name, first, role, color, avatarUrl, kind, meet, tag, tone, why, task, last}].
 * personNote(id) -> latest note text (optional, from the page's state).
 */
function smPeople(d, o) {
  d = d || {}; o = o || {};
  const today = d.date;
  const ev = new Map((d.events || []).map(e => [e.id, e]));
  const focus = new Map((d.focus || []).map(f => [f.id, f]));
  return (d.people || []).slice(0, 6).map(p => {
    const m0 = (p.meetings || []).find(m => m.date === today) || null;
    const e0 = m0 && ev.get(m0.eventId);
    const meet = m0 ? { eventId: m0.eventId, title: smShort(m0.title, 40), start: m0.start, end: m0.end, allDay: !!m0.allDay, type: e0 ? e0.type : 'meeting', where: e0 && e0.location ? smClip(e0.location, 40) : null } : null;
    const cel = p.celebration && p.celebration.date === today ? p.celebration : null;
    const pick = (list) => (list || []).slice().sort((a, b) => String(a.due || '9999').localeCompare(String(b.due || '9999')))[0] || null;
    let why = '', tag = null, tone = null, task = null;
    const fu = pick(p.followUps), wt = pick(p.waiting), ow = pick(p.owe);
    const fo = (p.focus || []).map(id => focus.get(id)).find(Boolean);
    if (cel) { tag = cel.kind === 'birthday' ? 'Birthday today' : 'Celebrating today'; tone = 'cel'; why = cel.kind === 'birthday' ? 'It’s their birthday: say something nice.' : `${smShort(cel.title, 50)} today.`; }
    else if (fu) { tag = 'Follow-up due'; tone = 'owe'; why = `${smCap(smShort(fu.title, 60))}${fu.due && fu.due < today ? ' (overdue)' : fu.due === today ? ' (due today)' : ''}.`; task = fu; }
    else if (wt) { why = `You’re waiting on them for ${smShort(wt.title)}${p.counts && p.counts.waiting > 1 ? ` and ${p.counts.waiting - 1} more` : ''}.`; task = wt; tag = 'Waiting on them'; }
    else if (fo) { why = `On today’s focus: ${smShort(fo.title)}.`; task = fo; }
    else if (ow) { why = `Next for them: ${smShort(ow.title)}${ow.due ? `, due ${smDueText(ow.due, today)}` : ''}.`; task = ow; if (!m0 && ow.due && ow.due <= today) { tag = 'Due for them'; tone = 'owe'; } }
    const openN = p.counts ? (p.counts.owe || 0) + (p.counts.waiting || 0) : 0;
    const more = task && openN > 1 ? `${openN - 1} more open with them` : '';
    const note = typeof o.personNote === 'function' ? smClip(o.personNote(p.id) || '', 110) : '';
    if (!why && note) why = note;
    // Only a meeting: the card already says when, so say what the gap has been (and not twice).
    const lastSaid = !why && !!meet && !!(p.lastContact && p.lastContact.daysAgo > 0);
    if (!why && meet) why =p.lastContact && p.lastContact.daysAgo >= 14 ? `It’s been ${smAgo(p.lastContact.daysAgo).replace(/ ago$/, '')} since you last met: time for a proper catch-up.` : p.lastContact && p.lastContact.daysAgo > 0 ? `Last in touch ${smAgo(p.lastContact.daysAgo)}.` : 'Time together today.';
    if (!why) why = p.role ? smClip(p.role, 60) : 'On your mind today.';
    const lc = p.lastContact;
    const via = lc ? { meeting: 'last met', email: 'last emailed', note: 'last note', task: 'last worked together' }[lc.via] || 'last in touch' : '';
    return {
      id: p.id, name: p.name, first: p.first || String(p.name || '').split(/\s+/)[0], role: p.role || p.org || null, color: p.color || null, avatarUrl: p.avatarUrl || null, kind: p.kind || 'person',
      meet, tag, tone, why, more, note: note && note !== why ? note : '', task: task ? { id: task.id, title: smShort(task.title, 60) } : null,
      last: lc && lc.daysAgo > 0 ? `${via} ${smAgo(lc.daysAgo)}` : null, lastSaid,
    };
  });
}
function smPeopleTitle(cards) {
  const meet = cards.filter(c => c.meet).length, owe = cards.filter(c => c.tone === 'owe').length, cel = cards.filter(c => c.tone === 'cel').length;
  if (cel && !meet) return cel === 1 ? 'A birthday to remember' : `${smCap(smNum(cel))} celebrations today`;
  if (meet) return `${smCap(smNum(meet))} ${meet === 1 ? 'person' : 'people'} to see${owe ? `, ${smNum(owe)} waiting on you` : ''}`;
  return cards.length === 1 ? 'Someone to keep in mind' : `${smCap(smNum(cards.length))} people to keep in mind`;
}
/** "You'll see Sam and Alex today, and Jo is waiting on a follow-up." */
function smPeopleSay(cards) {
  if (!cards.length) return '';
  const meet = cards.filter(c => c.meet), cel = cards.find(c => c.tone === 'cel'), fu = cards.find(c => c.tone === 'owe' && c.tag === 'Follow-up due');
  const bits = [];
  if (cel) bits.push(`it's ${cel.first}'s ${cel.tag === 'Birthday today' ? 'birthday' : 'big day'}`);
  if (meet.length) bits.push(meet.length <= 3 ? `you'll see ${smList(meet.map(c => c.first))}` : `you'll see ${smNum(meet.length)} people`);
  if (fu) bits.push(`${fu.first} is waiting on a follow-up`);
  if (!bits.length) return `${smCap(smNum(Math.min(cards.length, 4)))} ${cards.length === 1 ? 'person' : 'people'} to keep in mind today: ${smList(cards.slice(0, 3).map(c => c.first))}.`;
  return smCap(bits.length === 1 ? bits[0] + ' today' : bits.slice(0, -1).join(', ') + ', and ' + bits[bits.length - 1]) + '.';
}

/* ---------- focus ---------- */
/**
 * Focus cards: [{id, n, title, stream, color, type, done, total, subs:[{title, done, next}], more, meta:[..], folder}].
 * itemInfo(id) -> {subtasks:[{title, done}], estimate, color, folder:{id, label, path}} (optional).
 */
function smFocus(d, o) {
  d = d || {}; o = o || {};
  const gaps = (d.gaps || []).slice().sort((a, b) => b.minutes - a.minutes);
  return (d.focus || []).slice(0, 3).map((f, i) => {
    const info = (typeof o.itemInfo === 'function' && o.itemInfo(f.id)) || {};
    const src = Array.isArray(info.subtasks) ? info.subtasks : f.subtasks && Array.isArray(f.subtasks.items) ? f.subtasks.items : null;
    const all = src ? src.filter(s => s && (s.title || s.text)).map(s => ({ title: smClip(s.title || s.text, 80), done: !!s.done })) : null;
    const total = all ? all.length : (f.subtasks && f.subtasks.total) || 0;
    const done = all ? all.filter(s => s.done).length : (f.subtasks && f.subtasks.done) || 0;
    let subs = all || (f.subtasks && f.subtasks.next || []).map(t => ({ title: smClip(t, 80), done: false }));
    // Done first (struck), then the next one highlighted; at most five lines.
    const firstOpen = subs.findIndex(s => !s.done);
    subs = subs.map((s, k) => ({ ...s, next: k === firstOpen }));
    const shown = subs.length > 5 ? [...subs.filter(s => s.done).slice(-2), ...subs.filter(s => !s.done)].slice(0, 5) : subs;
    const meta = [];
    if (f.stream) meta.push(f.stream);
    if (Number(info.estimate) > 0) meta.push('~' + smDur(Number(info.estimate)));
    if (f.due) meta.push(`due ${smDueText(f.due, d.date)}`);
    if (i === 0 && gaps[0] && gaps[0].minutes >= 60) meta.push(`best at ${gaps[0].start} (free)`);
    return { id: f.id, n: i + 1, title: f.title, short: smShort(f.title, 60), stream: f.stream || null, color: info.color || null, type: f.type || 'task', done, total, subs: shown, more: Math.max(0, subs.length - shown.length), meta, folder: info.folder || null };
  });
}
function smFocusSay(cards) {
  if (!cards.length) return '';
  const left = cards[0].total - cards[0].done;
  const head = `${smCap(smNum(cards.length))} ${cards.length === 1 ? 'thing matters' : 'things matter'} today.`;
  return `${head} Start with ${smSayTitle(cards[0].title, 44)}${cards[0].total && left > 0 ? `: ${smPlural(left, 'step')} left` : ''}.`;
}

/* ---------- deadlines, countdowns, money ---------- */
/**
 * {hero, rest:[..], money} where an item is {id, kind 'task'|'countdown', label, date, daysLeft,
 * num, unit, urgent, type, sub, progress (0..1|null)}. countdowns: extra ones from the page
 * (the top bar's dated widgets), merged with data.countdowns.
 */
function smAhead(d, o) {
  d = d || {}; o = o || {};
  const today = d.date;
  const items = [];
  const seen = new Set();
  for (const t of d.deadlines || []) {
    if (!t || seen.has(t.id) || !Number.isFinite(t.daysLeft) || t.daysLeft < 0) continue;
    seen.add(t.id);
    const st = t.subtasks || {};
    items.push({ id: t.id, kind: 'task', label: smShort(t.title, 44), date: t.due, daysLeft: t.daysLeft, type: t.type || 'deadline', progress: st.total ? st.done / st.total : null,
      sub: [t.daysLeft <= 6 ? t.weekday || smWeekday(t.due) : smDueText(t.due, today), t.stream, st.total ? `${st.done} of ${st.total} steps` : null].filter(Boolean).join(' · ') });
  }
  const cds = [...(d.countdowns || []), ...(o.countdowns || [])];
  for (const c of cds) {
    if (!c || !c.date) continue;
    const id = String(c.id || '').startsWith('cd:') ? c.id : 'cd:' + c.id;
    if (seen.has(id)) continue;
    const n = Number.isFinite(c.daysLeft) ? c.daysLeft : smDaysBetween(today, c.date);
    if (n === null || n < 0 || n > 200) continue;
    seen.add(id);
    const dd = _smDay(c.date), dt = new Date(dd);
    items.push({ id, kind: 'countdown', label: smShort(c.label, 44), date: c.date, daysLeft: n, type: 'deadline', progress: null, sub: `${smWeekday(c.date)} ${dt.getUTCDate()} ${SM_MONTHS[dt.getUTCMonth()]}` });
  }
  for (const it of items) {
    it.urgent = it.daysLeft <= 3;
    if (it.daysLeft === 0) { it.num = 'Today'; it.unit = ''; }
    else if (it.daysLeft < 100) { it.num = String(it.daysLeft); it.unit = it.daysLeft === 1 ? 'day' : 'days'; }
    else { const w = Math.round(it.daysLeft / 7); it.num = String(w); it.unit = 'weeks'; }
  }
  // The hero is a date the user chose to count down to (the nearest countdown), else the nearest
  // deadline; the urgent ones sit beside it, in date order.
  items.sort((a, b) => a.daysLeft - b.daysLeft);
  const hero = items.find(x => x.kind === 'countdown' && x.daysLeft > 0) || items[0] || null;
  const rest = items.filter(x => x !== hero).slice(0, 2);
  return { hero, rest, money: smMoney(d.money) };
}
/** The money card: {big, label, bar:{pct, pace}|null, lines:[{k, v, type}]} | null. */
function smMoney(m) {
  if (!m || !m.month) return null;
  const mo = m.month, lines = [];
  if (m.yesterday && m.yesterday.text) lines.push({ k: 'Yesterday', v: `${m.yesterday.text}${m.yesterday.count ? ` · ${m.yesterday.count} ${m.yesterday.count === 1 ? 'payment' : 'payments'}` : ''}`, type: 'shopping' });
  if (m.week && m.week.text) lines.push({ k: 'This week', v: m.week.avgText ? `${m.week.text} · usually ${m.week.avgText}` : m.week.text, type: 'finance' });
  if (typeof mo.lastMonthSameDay === 'number' && typeof mo.toDate === 'number' && mo.lastMonthSameDay > 0) {
    const diff = Math.round((mo.toDate - mo.lastMonthSameDay) / mo.lastMonthSameDay * 100);
    lines.push({ k: 'Against last month', v: diff === 0 ? 'the same' : diff < 0 ? `${-diff}% less` : `${diff}% more`, type: 'admin', good: diff <= 0 });
  }
  const budget = typeof mo.budget === 'number' && mo.budget > 0;
  return {
    big: mo.text || '', amount: typeof mo.toDate === 'number' ? mo.toDate : null, currency: m.currency || null, label: budget ? `spent of ${mo.budgetText}` : 'spent this month', title: mo.label || 'This month',
    bar: budget ? { pct: Math.max(0, Math.min(1, mo.toDate / mo.budget)), pace: Math.max(0, Math.min(1, (Number(mo.monthPct) || 0) / 100)) } : null,
    lines: lines.slice(0, 3), stale: m.staleDays > 3 ? m.staleDays : 0,
  };
}
function smAheadSay(ah, today) {
  if (!ah || !ah.hero) return '';
  const one = (x0) => {
    const x = { ...x0, label: smSayTitle(x0.label, 40) };
    if (x.kind === 'task') return `${x.label} is due ${x.daysLeft === 0 ? 'today' : x.daysLeft === 1 ? 'tomorrow' : x.daysLeft < 7 ? 'on ' + smWeekday(x.date) : 'in ' + smNum(x.daysLeft) + ' days'}`;
    return x.daysLeft === 0 ? `${x.label} is today` : x.daysLeft === 1 ? `${x.label} is tomorrow` : `${x.label} is ${x.daysLeft} days away`;
  };
  const parts = [one(ah.hero)];
  if (ah.rest[0] && ah.rest[0].daysLeft <= 7) parts.push(one(ah.rest[0]));
  return parts.map(p => smCap(p) + '.').join(' ');
}

/* ---------- ideas (the last beat) ---------- */
/** "Reply to Sam about the link." (the task says it) or "Follow up with Sam: the link." */
function _smFollowText(s, t, p) {
  const task = t && p && [...(p.followUps || []), ...(p.owe || [])].find(x => x.id === t.ref);
  if (!task) return s.text;
  const title = smShort(task.title, 70);
  return p.first && title.toLowerCase().includes(String(p.first).toLowerCase()) ? smCap(title) + '.' : `Follow up with ${p.first}: ${title}.`;
}
function _smWetTip(r) { return r && r.cond === 'snow' ? 'wrap up warm.' : 'take an umbrella.'; }
function _smWetSay(r) { return r && r.cond === 'snow' ? 'Wrap up warm.' : 'Take an umbrella.'; }
function _smWxDetail(w, r) {
  if (r && r.chance) return `${r.chance}% chance then.`;
  if (!w) return '';
  return [w.label, typeof w.hi === 'number' ? `up to ${Math.round(w.hi)}°` : '', w.rainChance ? `${w.rainChance}% chance of rain` : ''].filter(Boolean).join(', ') + '.';
}
/**
 * Up to three practical ideas: [{kind, label, text, detail, scene, cond, act:{label, icon, do, ref}}].
 * do: 'plan' (plan the task for today), 'task' (open it), 'person' (open them), 'ok' (just acknowledge).
 */
function smIdeas(d) {
  d = d || {};
  const out = [];
  const person = new Map((d.people || []).map(p => [p.id, p]));
  const focus = new Map((d.focus || []).map(f => [f.id, f]));
  const refOf = (s, type) => (s.refs || []).find(r => r.type === type);
  const rain = d.weather && smRainFrom(d.weather.next);
  for (const s of d.suggestions || []) {
    if (out.length >= 3) break;
    const t = refOf(s, 'task'), p = refOf(s, 'person');
    if (s.kind === 'gap') {
      const f = t && focus.get(t.ref), tm = refOf(s, 'time'), gp = tm && (d.gaps || []).find(x => x.start === tm.ref);
      out.push({ kind: 'gap', label: 'Free time', text: s.text, detail: 'Your longest clear stretch today.', scene: f ? f.type : 'writing', say: gp ? `You're free for ${smDurSay(gp.minutes)} from ${gp.start}.` : '', act: t ? { label: 'Plan for today', icon: 'sun', do: 'plan', ref: t.ref } : null });
    }
    else if (s.kind === 'follow-up') out.push({ kind: 'follow-up', label: 'Follow-up', text: _smFollowText(s, t, p && person.get(p.ref)), say: p && person.get(p.ref) ? `There's a follow-up for ${person.get(p.ref).first}.` : 'There is a follow-up to send.', detail: p && person.get(p.ref) && person.get(p.ref).lastContact ? `Last in touch ${smAgo(person.get(p.ref).lastContact.daysAgo)}.` : '', scene: 'email', act: t ? { label: 'Open it', icon: 'external-link', do: 'task', ref: t.ref } : null });
    else if (s.kind === 'prep') out.push({ kind: 'prep', label: 'Before your meeting', text: s.text, say: s.text, detail: '', scene: 'one-on-one', act: p ? { label: 'Open profile', icon: 'user', do: 'person', ref: p.ref } : null });
    else if (s.kind === 'weather') out.push({ kind: 'weather', label: 'Weather', say: _smWetSay(rain), text: rain ? `${smCap(rain.word)} from ${rain.hour}: ${_smWetTip(rain)}` : s.text, detail: _smWxDetail(d.weather, rain), scene: null, cond: rain ? rain.cond : 'rain', act: null });
    else if (s.kind === 'overdue') out.push({ kind: 'overdue', label: 'Overdue', text: s.text, say: s.text, detail: '', scene: 'deadline', act: null });
    else if (s.kind === 'focus') out.push({ kind: 'focus', label: 'Start here', text: s.text, say: s.text, detail: '', scene: t && focus.get(t.ref) ? focus.get(t.ref).type : 'idea', act: t ? { label: 'Plan for today', icon: 'sun', do: 'plan', ref: t.ref } : null });
  }
  // The weather from the hourly forecast, when the server did not already suggest it.
  if (out.length < 3 && rain && !out.some(x => x.kind === 'weather')) out.push({ kind: 'weather', label: 'Weather', say: _smWetSay(rain), text: `${smCap(rain.word)} from ${rain.hour}: ${_smWetTip(rain)}`, detail: _smWxDetail(d.weather, rain), scene: null, cond: rain.cond, act: null });
  // A free stretch with nothing aimed at it yet.
  const g = (d.gaps || []).slice().sort((a, b) => b.minutes - a.minutes)[0];
  if (out.length < 3 && g && g.minutes >= 90 && !out.some(x => x.kind === 'gap')) {
    const nx = (d.events || []).find(e => e && e.date === d.date && !e.allDay && e.start === g.end);
    out.push({ kind: 'gap', label: 'Free time', say: `You're free for ${smDurSay(g.minutes)} from ${g.start}.`, text: `${smDur(g.minutes)} free from ${g.start}.`, detail: nx ? `Until ${smShort(nx.title, 30)} at ${g.end}.` : 'Nothing booked: yours to spend.', scene: 'rest', act: null });
  }
  return out.slice(0, 3);
}
function smIdeasSay(ideas, closing) {
  const bits = (ideas || []).map(x => x.say).filter(Boolean);
  const lead = bits.slice(0, 2).join(' ');
  const tail = String(closing || '').trim() || "Let's go.";
  return [lead, tail].filter(Boolean).join(' ');
}

/* ---------- greeting ---------- */
function smGreeting(d, script) {
  d = d || {}; script = script || {};
  const name = d.userName ? String(d.userName).split(/\s+/)[0] : '';
  const hello = d.part === 'afternoon' ? 'Good afternoon' : d.part === 'evening' ? 'Good evening' : 'Good morning';
  const head = String(script.headline || '').trim();
  // The AI headline replaces the greeting only when it is one ("Good morning, Sam").
  const isGreeting = /^good (morning|afternoon|evening)\b/i.test(head);
  const line = isGreeting ? head.replace(/[.!]+$/, '') : `${hello}${name ? ', ' + name : ''}`;
  const lede = !isGreeting && head ? head : (d.dayType && d.dayType.tagline) || '';
  return { line, lede, hello, name };
}
/** Fact pills on the greeting: [{icon, text, tone}]. */
function smFacts(d) {
  d = d || {};
  const today = d.date;
  const out = [];
  const evs = (d.events || []).filter(e => e && (e.date === today || (e.until && e.date <= today && e.until >= today)));
  if (evs.length) out.push({ icon: 'calendar', text: evs.length === 1 ? '1 event' : `${evs.length} events` });
  if ((d.focus || []).length) out.push({ icon: 'target', text: `${d.focus.length} focus ${d.focus.length === 1 ? 'task' : 'tasks'}` });
  if ((d.people || []).length) out.push({ icon: 'users', text: d.people.length === 1 ? '1 person' : `${d.people.length} people` });
  const due = (d.deadlines || []).filter(t => t && t.daysLeft >= 0 && t.daysLeft <= 7).length;
  if (due) out.push({ icon: 'hourglass', text: `${due} due this week`, tone: 'warn' });
  if (d.tasks && d.tasks.overdue) out.push({ icon: 'alarm-clock', text: `${d.tasks.overdue} overdue`, tone: 'warn' });
  return out.slice(0, 5);
}

/* ---------- the story ---------- */
/**
 * The morning story's beats. o: {nowMin (the page clock), countdowns, itemInfo, personNote, reduced}.
 * Each beat: {id, type, say, hold?, after?, enter?, auto?, scene?, className, m: view model}.
 */
function smBuildMorning(data, script, o) {
  const d = data || {}, sc = script || {};
  o = o || {};
  const kind = smDayKind(d);
  const pace = SM_PACE[kind] || SM_PACE.normal;
  const nowMin = Number.isFinite(o.nowMin) ? o.nowMin : smMin(d.now);
  const base = (b) => Object.assign({ after: pace.after, enter: pace.enter, className: 'sm-b sm-k-' + kind }, b);
  const out = {};
  // 1. Greeting and weather.
  const g = smGreeting(d, sc);
  const w = d.weather && d.weather.ok ? d.weather : null;
  const tl = smTimeline(d, nowMin);
  const intro = base({
    id: 'intro', type: 'm-greet', say: [g.line + '.', smWeatherSay(w)].filter(Boolean).join(' '),
    scene: kind === 'celebrate' ? 'celebration' : (d.headline && d.headline.type) || (kind === 'gentle' ? 'rest' : 'idea'),
    m: { kind, greeting: g, facts: smFacts(d), weather: w ? { temp: typeof w.temp === 'number' ? Math.round(w.temp) : null, cond: w.cond, isDay: w.isDay !== false, label: w.label, hi: w.hi, lo: w.lo, place: w.place, rain: smRainFrom(w.next), hours: smHours(w, tl.events, 13) } : null, date: d.date, weekday: d.weekday, confetti: kind === 'celebrate' },
  });
  out.intro = [intro];
  // 2. The day in sentences.
  const sents = (sc.sentences || []).filter(s => s && s.text).slice(0, SM_MAX_SENTENCES);
  out.say = sents.map((s, i) => base({
    id: 's' + i, type: 'm-say', text: s.text, say: s.text,
    entities: [...(s.entities || []), ...smWeatherEntities(s.text, s.entities, w && w.cond)].sort((a, b) => a.start - b.start),
    m: { i, n: sents.length, prev: sents.slice(0, i).map(x => x.text), fallbackScene: i === 0 ? (d.headline && d.headline.type) || null : null, rain: /\b(rain|showers?|drizzle|umbrella|storm)/i.test(s.text) },
  }));
  // 3. Timeline.
  if (tl.events.length || tl.allDay.length) {
    const nx = tl.next && tl.events.find(e => e.id === tl.next.id);
    const who = nx && (nx.people || []).map(id => (d.people || []).find(p => p.id === id)).filter(Boolean)[0];
    out.schedule = [base({ id: 'schedule', type: 'm-day', say: smTimelineSay(tl, nx ? (who && !String(nx.title).toLowerCase().includes(String(who.first).toLowerCase()) ? `${smSayTitle(nx.title, 36)} with ${who.first}` : smSayTitle(nx.title, 40)) : ''), m: { tl, nextWho: who ? who.id : null } })];
  }
  // 4. People.
  const ppl = smPeople(d, o);
  if (ppl.length) out.people = [base({ id: 'people', type: 'm-people', say: smPeopleSay(ppl), m: { cards: ppl.slice(0, 4), title: smPeopleTitle(ppl.slice(0, 4)), more: Math.max(0, ppl.length - 4) } })];
  // 5. Focus.
  const foc = smFocus(d, o);
  if (foc.length) out.focus = [base({ id: 'focus', type: 'm-focus', say: smFocusSay(foc), m: { cards: foc } })];
  // 6. Deadlines, countdowns, money.
  const ah = smAhead(d, o);
  // A gentle day only mentions what is close.
  if (kind === 'gentle' && ah.hero && ah.hero.daysLeft > 3) { ah.rest = []; ah.hero = null; ah.money = null; }
  if (ah.hero || ah.money) out.ahead = [base({ id: 'ahead', type: 'm-ahead', say: smAheadSay(ah, d.date) || (ah.money ? 'Here is where the money stands.' : ''), m: ah })];
  // 7. Ideas and Let's go (waits for a click).
  const ideas = smIdeas(d);
  out.close = [base({ id: 'close', type: 'm-go', auto: false, say: smIdeasSay(ideas, sc.closing), m: { ideas, closing: sc.closing || '', kind } })];
  const beats = [];
  for (const k of smOrder(kind)) for (const b of out[k] || []) beats.push(b);
  return beats;
}
