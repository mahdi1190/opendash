/* ============================================================
   HOME widget "schedule": Today's schedule. Owner: HB3 (schedule, week,
   countdowns). Data and the day's model: 12-home-cal.js. CSS: 13-home-w-schedule.css.

   S (a third, the default, beside Focus), M (half width) and L below 560 px of
   its own width: a vertical list.
     all-day chips (scene, title, calendar colour), then the day in order:
     each event with its time, calendar colour bar, scene, title and who /
     where; timed tasks inline (a ring instead of a scene, click = the task);
     past ones dimmed with a check; the now line (red, pulsing dot); the next
     event lifted with an "in 42 min" pill; free stretches of 45 min or more
     as hatched bands ("Free 2 h · best for focus", Block it); a long free
     morning or an empty day as one calm banner; Tomorrow's first event at
     the foot. More than 3 finished events fold into "N earlier".
   L (two thirds): the same day on a horizontal track (08:00-22:00, wider
     when events fall outside): coloured blocks, hatched free gaps, the past
     shaded, a pulsing now marker, and event cards alternating above and
     below the track (lanes, so they never overlap).
   States: loading (a 2-line skeleton, same box), no calendar ("Your day,
     hour by hour" + Connect calendar; timed tasks still show), the calendar
     unreadable (Retry), switched off in Settings (only timed tasks; hidden
     when there are none), stale data (> 6 h: "Updated 07:02" in the header,
     click to read it again).
   Live: a minute tick updates "in 42 min" and the now line in place (no
     repaint); when something starts or ends (or a gap appears) the widget
     repaints and the rows glide (FLIP, data-flip). The tick stops when Home
     is gone and while the tab is hidden; pulses pause too (html.anim-paused)
     and are off with reduced motion. Only the next / current event's scene
     loops; the others move on hover.
   Click an event: openEvent (61-task-card.js) when it exists, else the
     calendar; that row is aria-current while its card is open. A task: the
     task card (ctx.openTask). Block it: a new task in that slot
     (tcOpenCreate with date, time and minutes), else the quick-add dialog.
   ============================================================ */
registerHomeWidget({
  id: 'schedule', title: 'Today’s schedule', icon: 'calendar-days', order: 30,
  description: 'Today’s events with their scenes, a line for now, free gaps and what is next',
  sizes: ['s', 'm', 'l'], defaultSize: 's',                              // S sits beside Focus (L): the day at a glance
  render(el, ctx) { return _hsRender(el, ctx); },
  unmount() { clearTimeout(_hsTimer); _hsTimer = 0; },
});

const _HS_TRACK_MIN_W = 560;                    // narrower than this, L shows the list
const _HS_CARD = Object.freeze({ w: 168, h: 54, gapX: 10, gapY: 8, rail: 22, ticks: 22 });
const _HS_FOLD_PAST = 3;                        // more finished events than this fold away
let _hsTimer = 0;
let _hsVisBound = false;
let _hsEarlier = false;                         // "N earlier" unfolded (until Home is left)
let _hsOpenId = '';                             // the event whose card was opened from here
// Widths at the last layout (kept by the ResizeObserver), so a re-render does not force a
// layout halfway through building Home; the observer corrects them before paint if they moved.
let _hsW = { size: '', w: 0, track: 0 };

function _hsRender(el, ctx) {
  const today = todayStr();
  const cal = homeCalStatus(() => { if (typeof state !== 'undefined' && state.view === 'home') homeRerenderWidget('schedule'); });
  const tasks = homeTimedTasks(today);
  if (cal.off && !tasks.length && !ctx.editing) return false;
  const events = cal.ok ? homeCalEvents(today) : [];
  const m = homeDayModel({ events, tasks, nowMin: homeNowMin(), nowMs: Date.now() });
  if (ctx.firstPaint) _hsEarlier = false;
  if (_hsOpenId && !(typeof tcIsOpen === 'function' && tcIsOpen())) _hsOpenId = '';

  const card = document.createElement('section');
  card.className = 'card home-card hs';
  card.dataset.day = today;
  card.dataset.sig = m.sig;
  el.appendChild(card);
  card.appendChild(_hsHead(cal, m));
  const body = document.createElement('div'); body.className = 'card-b hs-b';
  card.appendChild(body);
  _hsWire(card, ctx);

  if (cal.loading && !tasks.length) {
    body.innerHTML = '<div class="hs-skel" role="status" aria-label="Loading today’s events"><span class="skeleton"></span><span class="skeleton"></span></div>';
    return true;
  }
  if (!m.timed.length && !m.allDay.length && !cal.ok) { body.appendChild(_hsGate(cal)); return true; }

  const w0 = ctx.size !== 'l' ? 0 : _hsW.size === ctx.size && _hsW.w ? _hsW.w : el.clientWidth;
  const wantTrack = ctx.size === 'l' && w0 >= _HS_TRACK_MIN_W;
  card.classList.toggle('is-track', wantTrack);
  if (m.allDay.length) body.insertAdjacentHTML('beforeend', _hsAllDayHtml(m.allDay));
  const banner = _hsBanner(m, cal);
  if (banner) body.insertAdjacentHTML('beforeend', banner.html);
  if (wantTrack && m.timed.length) _hsTrack(body, m, _hsW.size === ctx.size && _hsW.w === w0 ? _hsW.track : 0);
  else if (m.timed.length) body.insertAdjacentHTML('beforeend', _hsListHtml(m, banner));
  if (cal.error) body.insertAdjacentHTML('beforeend', `<div class="hs-note">${icon('circle-alert', 'i-xs')}<span>Couldn’t read the calendar.</span><button type="button" class="hs-note-btn" data-act="retry">Retry</button></div>`);
  else if (cal.none) body.insertAdjacentHTML('beforeend', `<div class="hs-note">${icon('plug', 'i-xs')}<span>Only timed tasks so far.</span><button type="button" class="hs-note-btn" data-act="connect">Connect a calendar</button></div>`);
  const foot = (wantTrack && !banner ? _hsTrackFootHtml(m) : '') + (cal.ok ? _hsTomorrowHtml(today) : '');
  if (foot) body.insertAdjacentHTML('beforeend', `<div class="hs-foot">${foot}</div>`);

  _hsMarkOpen(card);
  ctx.enterNew(body.querySelectorAll('.hs-ev[data-flip], .hs-ad[data-flip], .hs-card[data-flip]'), (x) => x.dataset.flip);
  if (typeof animActivate === 'function') requestAnimationFrame(() => { if (card.isConnected) animActivate(card); });
  _hsObserve(card, el, ctx, wantTrack, w0);
  _hsTickStart();
  return true;
}

/* ---------- header ---------- */
function _hsHead(cal, m) {
  const h = document.createElement('div'); h.className = 'card-h hs-h';
  const n = m.eventCount ? `${m.eventCount} event${m.eventCount === 1 ? '' : 's'}`
    : m.timed.length ? `${m.timed.length} timed task${m.timed.length === 1 ? '' : 's'}` : '';
  h.innerHTML = `${icon('calendar-days')}<h3>Today’s schedule</h3>${n ? `<span class="n">${esc(n)}</span>` : ''}<span class="spacer"></span>`;
  if (cal.ok && (cal.stale || cal.running) && cal.label) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'hs-upd' + (cal.running ? ' is-running' : ''); b.dataset.act = 'refresh';
    b.innerHTML = icon('refresh-cw') + `<span>${esc(cal.running ? 'Updating…' : cal.label)}</span>`;
    b.setAttribute('data-tip', cal.running ? 'Reading your calendars' : 'Read the calendar again');
    b.setAttribute('aria-label', cal.running ? 'Updating the calendar' : `${cal.label}. Read the calendar again`);
    h.appendChild(b);
  }
  if (!cal.off) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm hs-link'; b.dataset.act = 'calendar';
    b.innerHTML = '<span>Calendar</span>' + icon('arrow-right');
    h.appendChild(b);
  }
  return h;
}

/* ---------- no calendar / can't read it / switched off ---------- */
function _hsGate(cal) {
  const box = document.createElement('div'); box.className = 'hs-emp hs-gate';
  const btn = (act, ic, label) => `<button type="button" class="btn btn-secondary btn-sm" data-act="${act}">${icon(ic)}<span>${esc(label)}</span></button>`;
  if (cal.error) {
    box.innerHTML = `${homeScene('event', { size: 'lg' })}<h4>Couldn’t read the calendar</h4><p>The events could not be loaded. The rest of Home is fine.</p><div class="acts">${btn('retry', 'refresh-cw', 'Retry')}</div>`;
  } else if (cal.off) {
    box.innerHTML = `${homeScene('event', { size: 'lg' })}<h4>The calendar is switched off</h4><p>Turn it on in Settings to see today’s events here. Tasks with a time still show.</p>`;
  } else {
    box.innerHTML = `${homeScene('meeting', { size: 'lg' })}<h4>Your day, hour by hour</h4><p>Connect a calendar (read-only) to see events with their scenes, a now line and your free gaps.</p><div class="acts">${btn('connect', 'calendar-plus', 'Connect calendar')}</div>`;
  }
  return box;
}

/* ---------- all-day chips ---------- */
function _hsAllDayHtml(list) {
  const chips = list.slice(0, 6).map(e => {
    const sub = e.until ? `until ${_hsShortDay(e.until)}` : e.bg ? 'busy' : '';
    return `<button type="button" class="hs-ad anim-hover-host${e.bg ? ' is-bg' : ''}" data-ev="${escAttr(e.id)}" data-flip="${escAttr(e.key)}" data-scene-key="${escAttr(e.key)}" style="--c:${escAttr(homeCalColor(e.color))}" title="${escAttr(e.title + (e.calendar ? ' · ' + e.calendar : ''))}">`
      + `${homeScene(e.type, { size: 'dense', hover: true })}<span class="hs-ad-t">${esc(e.title)}</span>${sub ? `<small>· ${esc(sub)}</small>` : ''}</button>`;
  }).join('');
  const more = list.length > 6 ? `<span class="hs-ad hs-ad-more">+${list.length - 6}</span>` : '';
  return `<div class="hs-allday" aria-label="All day">${chips}${more}</div>`;
}
function _hsShortDay(iso) {
  try { return new Date(iso + 'T00:00:00').toLocaleDateString(APP_CONFIG.locale || undefined, { weekday: 'short', day: 'numeric' }); } catch (e) { return iso; }
}

/* ---------- a free morning, or nothing timed at all: one calm banner ---------- */
function _hsBanner(m, cal) {
  const lead = m.gaps.find(g => g.lead);
  const block = lead ? _hsBlockBtn(lead, 'Block some') : '';
  if (!m.timed.length) {
    if (!cal.ok) return null;
    // All-day entries only (a birthday): the same words as the hero's Events number ("No meetings").
    const title = m.eventCount ? 'No meetings today' : 'No events today, a clear day';
    const sub = lead ? `Free from ${homeHM(lead.start)} to the evening. Block some time for focus?` : homeNowMin() >= HOME_WORK_END ? 'The evening is yours.' : 'Nothing on the calendar.';
    return { gap: lead || null, html: `<div class="hs-free">${homeScene('rest', { size: 'sm' })}<div><b>${esc(title)}</b><span>${esc(sub)}</span></div>${block}</div>` };
  }
  if (lead && lead.minutes >= 180) {
    const sub = `${homeDur(lead.minutes)} clear. Block some for focus?`;
    return { gap: lead, html: `<div class="hs-free">${homeScene('rest', { size: 'sm' })}<div><b>Free until ${esc(homeHM(lead.end))}</b><span>${esc(sub)}</span></div>${block}</div>` };
  }
  return null;
}
function _hsCanBlock() { return typeof tcOpenCreate === 'function' || typeof openNewTask === 'function'; }
function _hsBlockBtn(g, label) {
  if (!_hsCanBlock()) return '';
  return `<button type="button" class="hs-block" data-block="${g.start}-${g.end}" aria-label="Block ${escAttr(homeHM(g.start))} to ${escAttr(homeHM(g.end))} for focus">${icon('calendar-plus')}<span>${esc(label || 'Block it')}</span></button>`;
}

/* ---------- the list (M, and L when narrow) ---------- */
function _hsListHtml(m, banner) {
  let rows = m.rows.filter(r => !(banner && r === banner.gap));
  const past = rows.filter(r => r.t === 'item' && r.state === 'past');
  let fold = '';
  if (past.length > _HS_FOLD_PAST) {
    const n = past.length;
    fold = `<button type="button" class="hs-fold" data-act="earlier" aria-expanded="${_hsEarlier}" data-flip="fold">${icon(_hsEarlier ? 'chevron-up' : 'history', 'i-xs')}<span>${_hsEarlier ? 'Hide earlier events' : `${n} earlier event${n === 1 ? '' : 's'}`}</span></button>`;
    if (!_hsEarlier) rows = rows.filter(r => !(r.t === 'item' && r.state === 'past'));
  }
  const html = rows.map(r => (r.t === 'item' ? _hsItemHtml(r, m) : r.t === 'now' ? _hsNowHtml(r.min) : _hsGapHtml(r))).join('');
  return `<div class="hs-list">${fold}${html}</div>`;
}
function _hsInText(min) { return min <= 0 ? 'now' : 'in ' + homeDur(min); }
function _hsItemHtml(r, m) {
  const x = r.item, task = x.kind === 'task', live = r.next || r.state === 'now';
  const end = x.end > x.start && (!task || x.estimated) ? homeHM(x.end) : '';
  const cls = `hs-ev is-${r.state}${r.next ? ' is-next' : ''}${task ? ' is-task' : ''} anim-hover-host`;
  const lead = task ? `<span class="hs-ck" aria-hidden="true"></span>` : homeScene(x.type, { size: 'xs', hover: !live });
  const meta = task ? (x.stream ? `<span>${esc(x.stream)}</span>` : '') : _hsMetaHtml(x);
  const right = r.next && m.nextIn !== null ? `<span class="hs-in"><i class="hs-pulse" aria-hidden="true"></i><span data-in>${esc(_hsInText(m.nextIn))}</span></span>`
    : r.state === 'now' ? '<span class="hs-nowpill">Now</span>'
    : r.state === 'past' ? `<span class="hs-done" aria-hidden="true">${icon('check')}</span>` : '';
  const say = `${homeHM(x.start)}${end ? ' to ' + end : ''}, ${x.title}${x.location ? ', ' + x.location : ''}${r.next && m.nextIn !== null ? ', ' + _hsInText(m.nextIn) : r.state === 'now' ? ', happening now' : r.state === 'past' ? ', finished' : ''}${task ? ', task' : ''}`;
  const ids = task ? `data-id="${escAttr(x.id)}" data-task="${escAttr(x.id)}"` : `data-ev="${escAttr(x.id)}" data-scene-key="${escAttr(x.key)}"`;
  const color = homeCalColor(x.color, task ? 'var(--fg-subtle)' : 'var(--sw-blue)');
  return `<div class="${cls}" role="button" tabindex="0" ${ids} data-flip="${escAttr(x.key)}" style="--c:${escAttr(color)}" aria-label="${escAttr(say)}">`
    + `<time class="hs-tm num">${homeHM(x.start)}${end ? `<small>${end}</small>` : ''}</time><span class="hs-bar" aria-hidden="true"></span>${lead}`
    + `<span class="hs-tt"><span class="hs-t">${esc(x.title)}</span>${meta ? `<span class="hs-m">${meta}</span>` : ''}</span>${right}</div>`;
}
function _hsMetaHtml(x) {
  const p = x.people.length && typeof getPerson === 'function' ? getPerson(x.people[0]) : null;
  if (p) {
    const first = String(p.name || '').split(/\s+/)[0] || p.name || '';
    const more = x.people.length > 1 ? ` +${x.people.length - 1}` : '';
    return `${typeof homeAvatar === 'function' ? homeAvatar(p, 14) : ''}<span>${esc(first + more)}${x.location ? ' · ' + esc(x.location) : ''}</span>`;
  }
  if (x.location) return `${icon('map-pin', 'i-xs')}<span>${esc(x.location)}</span>`;
  if (x.join) return `${icon('video', 'i-xs')}<span>Video call</span>`;
  if (x.calendar) return `<span>${esc(x.calendar)}</span>`;
  return '';
}
function _hsNowHtml(min) {
  return `<div class="hs-now" data-flip="now" role="img" aria-label="Now,${escAttr(homeHM(min))}"><b class="num" data-now-t>${esc(homeHM(min))}</b><span class="hs-nd" aria-hidden="true"><i class="hs-pulse"></i></span></div>`;
}
function _hsGapHtml(g) {
  const small = g.best ? 'best for focus' : g.lead ? `until ${homeHM(g.end)}` : '';
  return `<div class="hs-gap" data-flip="${g.lead ? 'gap:lead' : 'gap:' + g.start}"><time class="num">${esc(homeHM(g.start))}</time>`
    + `<span class="t">Free ${esc(homeDur(g.minutes))}${small ? `<small>${esc(small)}</small>` : ''}</span>${_hsBlockBtn(g)}</div>`;
}

/* ---------- Tomorrow, at the foot ---------- */
function _hsTomorrowHtml(today) {
  const tom = _homeAddDays(today, 1);
  // Something that carries on from today (a trip, a two-day birthday) is not news for tomorrow.
  const evs = homeCalEvents(tom).filter(e => !e.bg && (!e.allDay || !e.first || e.first >= tom));
  const first = evs.find(e => !e.allDay) || evs[0];
  if (!first) return '';
  return `<button type="button" class="hs-tom" data-ev="${escAttr(first.id)}" aria-label="Tomorrow: ${escAttr((first.allDay ? 'all day' : homeHM(first.start)) + ', ' + first.title)}">`
    + `<span class="hs-ovl">Tomorrow</span><b class="num">${esc(first.allDay ? 'All day' : homeHM(first.start))}</b><span class="hs-tom-t">${esc(first.title)}</span>${evs.length > 1 ? `<span class="hs-tom-n num">+${evs.length - 1}</span>` : ''}</button>`;
}

/* ---------- L: the horizontal track ---------- */
function _hsSpan(m) {
  const first = m.timed.length ? m.timed[0].start : HOME_WORK_START;
  const last = m.timed.reduce((n, x) => Math.max(n, x.end), 0);
  return { from: Math.min(8 * 60, Math.floor(first / 60) * 60), to: Math.min(24 * 60, Math.max(22 * 60, Math.ceil(last / 60) * 60)) };
}
function _hsTrack(body, m, knownW) {
  const { from, to } = _hsSpan(m);
  const pct = (min) => Math.max(0, Math.min(100, (min - from) / (to - from) * 100));
  const now = homeNowMin();
  const wrap = document.createElement('div'); wrap.className = 'hs-track';
  wrap.dataset.from = from; wrap.dataset.to = to;
  const blocks = m.timed.map(x => `<span class="hs-tk-blk${x.kind === 'task' ? ' is-task' : ''}${x.end <= now ? ' is-past' : ''}" style="left:${pct(x.start)}%;width:${Math.max(0.5, pct(x.end) - pct(x.start))}%;--c:${escAttr(homeCalColor(x.color, 'var(--fg-subtle)'))}"></span>`).join('');
  const gaps = m.gaps.map(g => `<span class="hs-tk-gap${g.best ? ' is-best' : ''}" data-min="${g.minutes}" style="left:${pct(g.start)}%;width:${pct(g.end) - pct(g.start)}%" title="${escAttr(`Free ${homeHM(g.start)}–${homeHM(g.end)}${g.best ? ' · best for focus' : ''}`)}"><span></span></span>`).join('');
  const ticks = [];
  const step = to - from > 14 * 60 ? 180 : 120;
  for (let h = Math.ceil(from / 60) * 60; h <= to; h += step) ticks.push(`<span class="hs-tk-tick num" style="left:${pct(h)}%">${esc(homeHM(h))}</span>`);
  const nowOn = now >= from && now <= to;
  wrap.innerHTML = `<div class="hs-tk-rail" aria-hidden="true"><span class="hs-tk-past" style="width:${pct(now)}%"></span>${gaps}${blocks}</div>`
    + `<div class="hs-tk-ticks" aria-hidden="true">${ticks.join('')}</div>`
    + (nowOn ? `<span class="hs-tk-now" style="left:${pct(now)}%" aria-hidden="true"><i class="hs-pulse"></i></span>` : '')
    + `<div class="hs-tk-cards"></div>`;
  body.appendChild(wrap);
  wrap._hsModel = m;
  _hsTrackLayout(wrap, knownW);
}
/** Cards above and below the rail, alternating, in lanes so none overlap. knownW: the track's width at the last layout. */
function _hsTrackLayout(wrap, knownW) {
  const m = wrap._hsModel;
  const W = knownW || wrap.clientWidth;
  if (!m || !W) return;
  const from = Number(wrap.dataset.from), to = Number(wrap.dataset.to);
  const C = _HS_CARD;
  // Free-gap labels that fit their band: "Free 1 h 30 min", "1 h 30 min", "1 h 30", or none.
  for (const g of wrap.querySelectorAll('.hs-tk-gap[data-min]')) {
    const min = Number(g.dataset.min), px = min / (to - from) * W;
    const long = 'Free ' + homeDur(min), mid = homeDur(min), short = mid.replace(' min', '');
    const fit = [long, mid, short].find(t => t.length * 6.2 + 10 <= px) || '';
    const s = g.querySelector('span'); if (s && s.textContent !== fit) s.textContent = fit;
  }
  const right = { up1: -Infinity, dn1: -Infinity, up2: -Infinity, dn2: -Infinity };
  const placed = [], hidden = [];
  m.rows.filter(r => r.t === 'item').forEach((r, i) => {
    const anchor = (r.item.start - from) / (to - from) * W;
    const want = Math.max(0, Math.min(W - C.w, anchor - 22));
    const order = i % 2 ? ['dn1', 'up1', 'dn2', 'up2'] : ['up1', 'dn1', 'up2', 'dn2'];
    let lane = order.find(l => right[l] + C.gapX <= want), left = want;
    if (!lane) {
      lane = order.reduce((b, l) => (right[l] < right[b] ? l : b), order[0]);
      left = right[lane] + C.gapX;
      if (left > W - C.w + 1) { hidden.push(r); return; }
    }
    right[lane] = left + C.w;
    placed.push({ r, lane, left: Math.round(left), anchor: Math.round(anchor) });
  });
  const used = new Set(placed.map(p => p.lane));
  const U = used.has('up2') ? 2 : used.has('up1') ? 1 : 0, D = used.has('dn2') ? 2 : used.has('dn1') ? 1 : 0;
  const T = U ? U * C.h + (U - 1) * C.gapY + 16 : 6;
  const dn0 = T + C.rail + C.ticks + 6;
  wrap.style.setProperty('--T', T + 'px');
  wrap.style.height = (D ? dn0 + D * C.h + (D - 1) * C.gapY : T + C.rail + C.ticks) + 4 + 'px';
  let html = '';
  for (const p of placed) {
    const up = p.lane.startsWith('up'), row = p.lane.endsWith('2') ? 1 : 0;
    const top = up ? T - 10 - C.h - row * (C.h + C.gapY) : dn0 + row * (C.h + C.gapY);
    const cx = Math.max(p.left + 12, Math.min(p.left + C.w - 12, p.anchor));
    const conn = up ? `top:${top + C.h}px;height:${T - top - C.h}px` : `top:${T + C.rail}px;height:${top - T - C.rail}px`;
    html += `<i class="hs-tk-conn${p.r.state === 'past' ? ' is-past' : ''}" style="left:${cx}px;${conn}" aria-hidden="true"></i>${_hsCardHtml(p.r, m, p.left, top)}`;
  }
  if (hidden.length) html += `<span class="hs-tk-more num" style="top:${T + C.rail + 2}px">+${hidden.length} more</span>`;
  wrap.querySelector('.hs-tk-cards').innerHTML = html;
  wrap.dataset.w = W;
}
function _hsCardHtml(r, m, left, top) {
  const x = r.item, task = x.kind === 'task', live = r.next || r.state === 'now';
  const time = homeHM(x.start) + (x.end > x.start && (!task || x.estimated) ? '–' + homeHM(x.end) : '');
  const tag = r.next && m.nextIn !== null ? `<span class="hs-card-in"><i class="hs-pulse" aria-hidden="true"></i><span data-in>${esc(_hsInText(m.nextIn))}</span></span>` : r.state === 'now' ? '<span class="hs-card-in is-now">Now</span>' : '';
  const ids = task ? `data-id="${escAttr(x.id)}" data-task="${escAttr(x.id)}"` : `data-ev="${escAttr(x.id)}" data-scene-key="${escAttr(x.key)}"`;
  const say = `${time.replace('–', ' to ')}, ${x.title}${r.next && m.nextIn !== null ? ', ' + _hsInText(m.nextIn) : r.state === 'past' ? ', finished' : r.state === 'now' ? ', happening now' : ''}`;
  return `<div class="hs-card is-${r.state}${r.next ? ' is-next' : ''}${task ? ' is-task' : ''} anim-hover-host" role="button" tabindex="0" ${ids} data-flip="${escAttr(x.key)}" style="left:${left}px;top:${top}px;--c:${escAttr(homeCalColor(x.color, 'var(--fg-subtle)'))}" aria-label="${escAttr(say)}">`
    + (task ? '<span class="hs-ck" aria-hidden="true"></span>' : homeScene(x.type, { size: 'xs', hover: !live }))
    + `<span class="hs-tt"><span class="hs-card-tm num">${esc(time)}${tag}</span><span class="hs-t">${esc(x.title)}</span></span></div>`;
}
function _hsTrackFootHtml(m) {
  const g = m.gaps.find(x => x.best) || m.gaps[0];
  if (!g) return '';
  return `<span class="hs-bestgap"><span class="hs-gap-sw" aria-hidden="true"></span><span>Free <b class="num">${esc(homeHM(g.start))}–${esc(homeHM(g.end))}</b>${g.best ? ' · best for focus' : ''}</span>${_hsBlockBtn(g)}</span>`;
}

/* ---------- clicks, keys, the open event ---------- */
function _hsWire(card, ctx) {
  card.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act], [data-block], [data-ev], [data-task]');
    if (!b || !card.contains(b)) return;
    if (b.dataset.block) { _hsBlock(b.dataset.block, b); return; }
    const act = b.dataset.act;
    if (act === 'calendar') { setView('calendar'); return; }
    if (act === 'connect') { if (window.Connections && typeof Connections.open === 'function') Connections.open('calendar'); else setView('connections'); return; }
    if (act === 'retry') { const s = _homeCalStore(); if (s) s.load(true); else if (typeof calendarSoon === 'function') calendarSoon(() => homeRerenderWidget('schedule'), true); return; }
    if (act === 'refresh') { _hsRefresh(b); return; }
    if (act === 'earlier') { _hsEarlier = !_hsEarlier; ctx.rerender(); return; }
    if (b.dataset.task) { ctx.openTask(b.dataset.task, b); return; }
    if (b.dataset.ev !== undefined) {
      homeCalOpenEvent(b.dataset.ev, b);
      if (b.dataset.ev && typeof tcIsOpen === 'function' && tcIsOpen()) { _hsOpenId = b.dataset.ev; _hsMarkOpen(card); }
    }
  });
  card.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role~="button"][data-ev], [role~="button"][data-task]')) { e.preventDefault(); e.target.click(); }
  });
  // The card hands focus back to its row when it closes: drop the highlight then.
  card.addEventListener('focusin', () => { if (_hsOpenId && !(typeof tcIsOpen === 'function' && tcIsOpen())) { _hsOpenId = ''; _hsMarkOpen(card); } });
}
function _hsMarkOpen(card) {
  for (const el of card.querySelectorAll('[data-ev][aria-current]')) el.removeAttribute('aria-current');
  if (!_hsOpenId) return;
  for (const el of card.querySelectorAll(`[data-ev="${CSS.escape(_hsOpenId)}"]`)) el.setAttribute('aria-current', 'true');
}
function _hsRefresh(btn) {
  const s = _homeCalStore();
  btn.classList.add('is-running');
  const t = btn.querySelector('span'); if (t) t.textContent = 'Updating…';
  if (s && typeof s.update === 'function') s.update({ force: true });
  else if (typeof calendarSoon === 'function') calendarSoon(() => homeRerenderWidget('schedule'), true);
}
/** "Block it": a new task in that free slot (the user names it). */
function _hsBlock(spec, from) {
  const [a, b] = String(spec).split('-').map(Number);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return;
  const minutes = Math.max(15, Math.min(120, b - a));
  if (typeof tcOpenCreate === 'function') tcOpenCreate({ title: '', date: todayStr(), time: homeHM(a), minutes }, { from });
  else if (typeof openNewTask === 'function') openNewTask(`today ${homeHM(a)}`, { from });
}

/* ---------- size changes: L switches between list and track; the track re-lays its cards ---------- */
function _hsObserve(card, el, ctx, track, assumedW) {
  if (typeof ResizeObserver !== 'function') return;
  let last = assumedW || 0;          // what the render assumed (it runs after layout: reading here is free)
  const ro = new ResizeObserver(() => {
    if (!card.isConnected) { ro.disconnect(); return; }
    const w = el.clientWidth;
    const wrap = card.querySelector('.hs-track');
    _hsW = { size: ctx.size, w, track: wrap ? wrap.clientWidth : 0 };
    if (Math.abs(w - last) < 2) {
      if (wrap && Math.abs(wrap.clientWidth - Number(wrap.dataset.w)) >= 2) _hsTrackLayout(wrap);
      return;
    }
    last = w;
    const want = ctx.size === 'l' && w >= _HS_TRACK_MIN_W;
    if (want !== track) { ro.disconnect(); homeRerenderWidget('schedule'); return; }
    if (wrap) _hsTrackLayout(wrap);
  });
  ro.observe(el);
}

/* ---------- the minute tick ---------- */
function _hsTickStart() {
  if (!_hsVisBound) {
    _hsVisBound = true;
    document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(_hsTimer); _hsTimer = 0; } else _hsTick(); });
  }
  if (_hsTimer) return;
  _hsTimer = setTimeout(_hsTick, 60000 - (Date.now() % 60000) + 120);
}
function _hsTick() {
  clearTimeout(_hsTimer); _hsTimer = 0;
  const card = document.querySelector('#main-body .hs[data-sig]');
  if (!card || typeof state === 'undefined' || state.view !== 'home') return;    // Home is gone: it starts again on the next render
  if (document.hidden) return;                                                  // paused; visibilitychange resumes
  const today = todayStr();
  if (card.dataset.day !== today) { render(); return; }                          // a new day: the whole page (the week moves too)
  const cal = homeCalStatus();
  const m = homeDayModel({ events: cal.ok ? homeCalEvents(today) : [], tasks: homeTimedTasks(today), nowMin: homeNowMin(), nowMs: Date.now() });
  if (m.sig !== card.dataset.sig) { homeRerenderWidget('schedule'); return; }   // something started or ended: repaint, rows glide
  _hsLive(card, m);
  _hsTickStart();
}
/** The minute's changes in place: "in 41 min", the now time, the track's now marker. */
function _hsLive(card, m) {
  const now = homeNowMin();
  const reduced = !window.Motion || Motion.prefersReduced();
  for (const el of card.querySelectorAll('[data-in]')) {
    const txt = m.nextIn !== null ? _hsInText(m.nextIn) : '';
    if (el.textContent === txt) continue;
    el.textContent = txt;
    if (!reduced) Motion.animate(el, [{ opacity: 0.35 }, { opacity: 1 }], { duration: 120, easing: 'ease-out' });
  }
  for (const el of card.querySelectorAll('[data-now-t]')) el.textContent = homeHM(now);
  const wrap = card.querySelector('.hs-track');
  if (wrap) {
    const from = Number(wrap.dataset.from), to = Number(wrap.dataset.to);
    const p = Math.max(0, Math.min(100, (now - from) / (to - from) * 100)) + '%';
    const mk = wrap.querySelector('.hs-tk-now'); if (mk) mk.style.left = p;
    const past = wrap.querySelector('.hs-tk-past'); if (past) past.style.width = p;
  }
}
