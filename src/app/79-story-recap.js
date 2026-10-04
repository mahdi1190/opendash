/* ============================================================
   YEAR / MONTH IN OPENDASH (v2.2 wave 5): an animated recap on the story
   engine (storyRegisterKind('recap') + storyRegisterBuilder('recap')). The
   aggregates are pure (71-achievements.js recapRange / recapBuild); this file
   gathers the input on the page and draws two beat types:
     recap-look    the look of the year (the opening that came up most, the theme)
     recap-close   the closing, with "Save a summary card"
     recapOpen(period, ref)   'year' ('YYYY') | 'month' ('YYYY-MM')
     recapCardCanvas(R, o)    the summary card as a canvas (1080 x 1350);
                              o.names (streams, people) and o.money are off by
                              default: no personal data unless the user ticks them
   Input: the completion log (every task done, with its stream), past timed events
   with people in the loaded calendar, /api/finance totals (aggregates only; when
   Finances is on), the achievements. Nothing leaves the device; the PNG is made
   only on an explicit click. Reduced motion / animations off: the story engine's
   still mode, and the look's art is drawn still.
   ============================================================ */
function _rcInput() {
  const completions = [];
  for (const [id, arr] of Object.entries(state.completionLog || {})) {
    if (!Array.isArray(arr)) continue;
    const it = typeof getItem === 'function' ? getItem(id) : null;
    const stream = it ? effStream(it) || '' : '';
    for (const ts of arr) { const n = Number(ts); if (isFinite(n)) completions.push({ day: Clock.parts(n).iso, stream }); }
  }
  const meetings = [];
  try {
    const ix = homeMeetIndex(), now = Date.now();
    for (const ev of calAllEvents()) {
      if (!ev || ev.allDay || !ev.start || !ev.start.dateTime || calEventEnd(ev).getTime() > now) continue;
      const people = homeEventPeople(ev, ix);
      if (people.length) meetings.push({ day: Clock.parts(calEventStart(ev).getTime()).iso, people });
    }
  } catch (e) { /* no calendar */ }
  return { completions, meetings, unlocked: achState().unlocked };
}
async function _rcMoney() {
  if (APP_CONFIG.features && APP_CONFIG.features.finance === false) return null;
  if (typeof _serverAvailable !== 'undefined' && _serverAvailable === false) return null;
  try {
    const r = await fetch('/api/finance', { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    const a = await r.json();
    return a && Array.isArray(a.transactions) ? { tx: a.transactions, exclude: a.exclude_from_spending } : null;
  } catch (e) { return null; }
}
/** The look of the range: the opening that came up most, and the theme most used. */
function _rcLook(range) {
  const look = animLook(), ctx = Object.assign(typeof animCtx === 'function' ? animCtx() : {}, { level: _agLevel() });
  const opens = new Map(), themes = new Map();
  let d = range.from, guard = 0;
  while (d <= range.to && guard++ < 370) {
    const th = animThemeFor(d, look); themes.set(th, (themes.get(th) || 0) + 1);
    const it = animDailyPick('opening', d, look, ctx); if (it) opens.set(it.ref, (opens.get(it.ref) || 0) + 1);
    d = Clock.addDays(d, 1);
  }
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0];
  const o = top(opens), t = top(themes);
  return { ref: o ? o[0] : '', days: o ? o[1] : 0, theme: t ? t[0] : look.theme };
}
function _rcStreamName(id) { const s = (state.streams || []).find(x => x && x.id === id); return s ? s.label || s.id : String(id || 'No stream'); }
function _rcFirst(id) { const p = typeof getPerson === 'function' ? getPerson(id) : null; return p ? String(p.name || '').split(/\s+/)[0] || 'Someone' : 'Someone'; }
function _rcMoneyFmt(v) {
  const ccy = (APP_CONFIG && APP_CONFIG.currency) || 'GBP';
  try { return new Intl.NumberFormat((APP_CONFIG && APP_CONFIG.locale) || undefined, { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(v); } catch (e) { return `${ccy} ${Math.round(v)}`; }
}
function _rcTitle(range) { return range.period === 'year' ? `Your ${range.label} in OpenDash` : `${range.month} in OpenDash`; }

async function _rcLoad(o) {
  o = o || {};
  const range = recapRange(o.period === 'month' ? 'month' : 'year', o.ref, todayStr());
  const input = _rcInput();
  input.money = await _rcMoney();
  const R = recapBuild(input, range);
  R.look = _rcLook(range);
  const closing = R.tasksDone ? `${R.tasksDone === 1 ? 'One task' : R.tasksDone + ' tasks'} done. Here's to the next ${range.period === 'year' ? 'year' : 'month'}.` : 'A quiet stretch. Here\'s to what comes next.';
  return { kind: 'recap', date: todayStr(), data: { R, tod: 'night' }, script: { headline: _rcTitle(range), closing, sentences: [], theme: range.label }, ai: { state: 'off', model: '' } };
}

storyRegisterBuilder('recap', (ctx) => {
  const R = ctx.data && ctx.data.R; if (!R) return [];
  const rg = R.range, yr = rg.period === 'year';
  const beats = [{ id: 'intro', type: 'title', overline: yr ? 'Year in review' : 'Month in review', title: _rcTitle(rg), sub: R.activeDays ? `${R.activeDays} day${R.activeDays === 1 ? '' : 's'} with something done` : '', say: _rcTitle(rg) + '.', scene: 'review' }];
  const stats = [{ n: R.tasksDone, label: R.tasksDone === 1 ? 'task done' : 'tasks done' }];
  if (R.bestStreak > 1) stats.push({ n: R.bestStreak, label: 'days in a row, at best' });
  if (R.meetings) stats.push({ n: R.meetings, label: R.meetings === 1 ? 'meeting' : 'meetings' });
  if (R.achievements.length) stats.push({ n: R.achievements.length, label: R.achievements.length === 1 ? 'achievement' : 'achievements' });
  beats.push({ id: 'stats', type: 'stats', items: stats, say: '', hold: 2800 });
  if (R.busiestDay) beats.push({ id: 'busiest', type: 'title', overline: 'Your busiest day', title: STORY_KIT.fmtDay(R.busiestDay.day, { weekday: 'long', day: 'numeric', month: 'long' }), sub: `${R.busiestDay.n} tasks done${R.busiestWeekday ? ` · ${R.busiestWeekday.name}s were the busiest` : ''}`, say: '', scene: 'deadline', hold: 2600 });
  if (R.topStreams.length) beats.push({ id: 'streams', type: 'list', title: 'Where the work went', items: R.topStreams.map(s => ({ title: _rcStreamName(s.id), meta: `${s.n} done` })), say: '', hold: 2600 });
  if (R.topPeople.length) beats.push({ id: 'people', type: 'list', title: 'People you met most', items: R.topPeople.map(p => ({ scene: 'one-on-one', title: _rcFirst(p.id), meta: `${p.n} meeting${p.n === 1 ? '' : 's'}` })), say: '', hold: 2600 });
  if (R.money) {
    const m = R.money, items = [{ title: _rcMoneyFmt(m.spent), meta: 'spent' }];
    if (m.income) items.push({ title: _rcMoneyFmt(m.income), meta: 'came in' });
    if (m.topCategory) items.push({ title: m.topCategory.name, meta: `the biggest category, ${_rcMoneyFmt(m.topCategory.amount)}` });
    beats.push({ id: 'money', type: 'list', title: 'Money, in totals', items, say: '', hold: 2600, scene: 'finance' });
  }
  if (R.achievements.length) beats.push({ id: 'ach', type: 'list', title: 'Achievements unlocked', items: R.achievements.map(id => ({ title: achDef(id).label, meta: achDef(id).hint })), say: '', hold: 2600 });
  if (R.look && R.look.ref) beats.push({ id: 'look', type: 'recap-look', look: R.look, yr, say: '', hold: 3000 });
  beats.push({ id: 'close', type: 'recap-close', text: ctx.script.closing || '', say: ctx.script.closing || '', auto: false });
  return beats;
});
storyRegisterBeatType('recap-look', (f, b) => {
  const it = animItem(b.look.ref);
  const th = ANIM_THEMES.find(t => t.id === b.look.theme);
  const still = storyReduced();
  f.scene.innerHTML = it ? `<div class="rc-look" data-anim-theme="${escAttr(b.look.theme)}">${animItemHtml(it, { size: 'hero', live: !still, reduced: still })}</div>` : '';
  f.type.innerHTML = `<div class="st-title"><div class="st-over">${esc(b.yr ? 'The look of the year' : 'The look of the month')}</div><h2 class="st-h">${STORY_KIT.driftHtml(it ? it.label : 'Your look')}</h2><p class="st-sub">${esc(`${b.look.days} day${b.look.days === 1 ? '' : 's'} as your opening${th ? ' · the ' + th.label + ' theme' : ''}`)}</p></div>`;
});
storyRegisterBeatType('recap-close', (f, b, ctx) => {
  STORY_BEAT_TYPES.closing(f, b, ctx);
  const acts = f.cards.querySelector('.st-close-acts');
  const first = acts && acts.firstChild;
  if (first) first.remove();   // "Open details": a recap has no page of its own
  const x = document.createElement('button'); x.type = 'button'; x.className = 'btn btn-primary btn-lg';
  x.innerHTML = icon('download') + '<span>Save a summary card</span>';
  const R = ctx.data && ctx.data.R;
  x.addEventListener('click', () => { storyClose(); recapExportDialog(R); });
  if (acts) acts.prepend(x);
});
storyRegisterKind('recap', {
  label: 'Year in OpenDash', view: 'home', dark: true,
  load: (o) => _rcLoad(o),
  details() { if (typeof achOpenPanel === 'function') achOpenPanel(); },
});
function recapOpen(period, ref) {
  const p = period === 'month' ? 'month' : 'year';
  return storyOpen('recap', { autoplay: true, period: p, ref, variant: p + ':' + (ref || '') });
}
registerCommand({ id: 'story-recap-year', label: 'Play my year in OpenDash', icon: 'sparkles', group: 'Go to', keywords: 'year in review recap wrapped story annual summary achievements', run: () => recapOpen('year', todayStr().slice(0, 4)) });
registerCommand({ id: 'story-recap-month', label: 'Play my month in OpenDash', icon: 'calendar-days', group: 'Go to', keywords: 'month in review recap wrapped story monthly summary', run: () => recapOpen('month', todayStr().slice(0, 7)) });

/* ---------- the summary card (a PNG, only on an explicit click) ---------- */
function recapCardCanvas(R, o) {
  o = o || {};
  const W = 1080, H = 1350;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (!g) return c;
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#141a3d'); bg.addColorStop(1, '#3a1d5c');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 46; i++) {   // a fixed starfield (seeded, the same every time)
    const x = (i * 241) % W, y = (i * 433) % 520, r = 1 + (i % 3);
    g.fillStyle = `rgba(255,255,255,${0.15 + (i % 5) * 0.08})`; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const font = (w, px) => `${w} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = font(600, 34); g.fillText('OPENDASH', 80, 130);
  g.fillStyle = '#fff'; g.font = font(800, 92); g.fillText(R.range.period === 'year' ? `My ${R.range.label}` : R.range.month, 80, 240);
  g.font = font(500, 44); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillText(R.range.period === 'year' ? 'in OpenDash' : `${R.range.label.slice(-4)} in OpenDash`, 80, 304);
  const tiles = [[R.tasksDone, R.tasksDone === 1 ? 'task done' : 'tasks done'], [R.activeDays, 'active days'], [R.bestStreak, 'best streak (days)'], [R.meetings, 'meetings'], [R.achievements.length, 'achievements'], [R.busiestWeekday ? R.busiestWeekday.name.slice(0, 3) : '–', 'busiest weekday']];
  tiles.forEach(([v, label], i) => {
    const x = 80 + (i % 2) * 470, y = 380 + Math.floor(i / 2) * 200;
    g.fillStyle = 'rgba(255,255,255,0.09)'; _rcRound(g, x, y, 440, 170, 28); g.fill();
    g.fillStyle = '#ffd68a'; g.font = font(800, 76); g.fillText(String(v), x + 36, y + 100);
    g.fillStyle = 'rgba(255,255,255,0.78)'; g.font = font(500, 32); g.fillText(label, x + 36, y + 146);
  });
  let y = 1010;
  const line = (label, text) => {
    if (!text) return;
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = font(600, 28); g.fillText(label.toUpperCase(), 80, y);
    g.fillStyle = '#fff'; g.font = font(600, 38); g.fillText(_rcClip(g, text, W - 160), 80, y + 48); y += 110;
  };
  if (o.names) {
    line('Top streams', R.topStreams.map(s => _rcStreamName(s.id)).join(' · '));
    line('Met most', R.topPeople.map(p => _rcFirst(p.id)).join(' · '));
  }
  if (o.money && R.money) line('Money', [`${_rcMoneyFmt(R.money.spent)} spent`, R.money.income ? `${_rcMoneyFmt(R.money.income)} in` : ''].filter(Boolean).join(' · '));
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.font = font(500, 26); g.fillText('Made with OpenDash, from data on my own device', 80, H - 70);
  return c;
}
function _rcRound(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function _rcClip(g, s, max) { s = String(s); if (g.measureText(s).width <= max) return s; while (s.length > 1 && g.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…'; }
function recapExportDialog(R) {
  if (!R) return;
  const o = { names: false, money: false };
  openDialog({
    title: 'Save a summary card', width: 520, resizeKey: 'recap-card',
    body: (el) => {
      const p = document.createElement('p'); p.className = 'muted';
      p.textContent = 'Counts only, unless you tick more below. The image is made here and saved to this computer; nothing is uploaded.';
      const wrap = document.createElement('div'); wrap.className = 'rc-card-pv';
      const paint = () => { wrap.replaceChildren(recapCardCanvas(R, o)); };
      const tick = (key, label) => {
        const l = document.createElement('label'); l.className = 'rc-tick';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!o[key];
        cb.onchange = () => { o[key] = cb.checked; paint(); };
        l.append(cb, document.createTextNode(' ' + label));
        return l;
      };
      el.append(p, tick('names', 'Include stream names and first names of people'));
      if (R.money) el.appendChild(tick('money', 'Include money totals'));
      el.appendChild(wrap);
      paint();
    },
    actions: [{ label: 'Cancel' }, 'spacer', { label: 'Save PNG', icon: 'download', primary: true, run: () => { recapSavePng(R, o); } }],
  });
}
function recapSavePng(R, o) {
  const c = recapCardCanvas(R, o);
  const name = `opendash-${String(R.range.key).replace(/[^0-9-]/g, '')}.png`;
  c.toBlob((blob) => {
    if (!blob) { toast('The card could not be made in this browser.', { kind: 'err' }); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast(`Saved ${name}`, { kind: 'ok', icon: 'download' });
  }, 'image/png');
}
