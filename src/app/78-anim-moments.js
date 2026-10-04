/* ============================================================
   MOMENTS ACROSS THE APP (v2.2 wave 4). The page side of the "moments" pack
   (72-anim-pack-moments.js) and the event scenes of the core pack. Every
   moment is a library item (Settings > Animations: pin, favourite, block,
   packs on/off, the intensity level) picked by animPickFor (71-anim-registry.js).
     animEventSceneHtml(ev, o)    the event's scene (the classifier picks the type,
                                  the registry the drawing; a blocked scene shows none)
     animSoonInfo(ev)             {min} when an event starts within 15 minutes, else null
     animTaskDone(item, x, y)     the stream's completion style (one per stream)
     animBossCheck(item, due)     a task 7+ days overdue, finally done
     animStreakHtml(days)         the flame beside the streak (grows over a week)
     animMomentsApply()           html[data-ap-ring|soon|vendor|living|idle]: the
                                  styles 71-anim-moments.css draws (per render)
     animLivingPaint(root)        Home hero: the light that moves through the day
     animFocusStart(min) / animFocusStop()   a focus block with a growing scene
     animMoneyMoment(kind, el)    payday rain / under-budget burst (the Finances view)
     animPaydayCheck(txs)         payday: an income of note today or yesterday
     animPersonMomentHtml(kind)   a birthday or "it's been a while" on a person
     animCountdownAttrs(date)     the heat attributes of a countdown
   Rules kept: nothing moves with animations off or reduced motion (still art, or
   nothing); the intensity level filters the items; a big moment plays once (per
   entry, per day or per task); overlays never take clicks; no user text in art.
   ============================================================ */
const _am = { boss: new Set(), focusTimer: 0 };
function _amLevel() {
  if (typeof animEnabled === 'function' && !animEnabled()) return 'off';
  return window.Motion && Motion.level ? Motion.level() : 'standard';
}
function _amOn() { const l = _amLevel(); return l !== 'off' && l !== 'reduced'; }
function _amPick(slot, o) {
  try {
    const lv = _amLevel();
    return animPickFor(slot, todayStr(), animLook(), { level: lv === 'off' || lv === 'reduced' ? 'standard' : lv, theme: animThemeFor(todayStr(), animLook()) }, o);
  } catch (e) { return null; }
}
/** True once per key per day on this device (payday, a month under budget, a birthday). */
function _amOnceToday(key) {
  try {
    const k = 'dashboard-anim-moment', day = todayStr();
    let rec = JSON.parse(localStorage.getItem(k) || '{}');
    if (!rec || rec.day !== day) rec = { day, keys: [] };
    if (rec.keys.includes(key)) return false;
    rec.keys = rec.keys.concat([key]).slice(-60);
    localStorage.setItem(k, JSON.stringify(rec));
    return true;
  } catch (e) { return true; }
}
/** A short overlay: the item, live, at a point or centred; never clickable. */
function animMomentPlay(it, o) {
  o = o || {};
  if (!it || !_amOn() || document.hidden) return false;
  const el = document.createElement('div');
  el.className = 'ap-moment' + (o.center ? ' is-center' : '') + (o.cls ? ' ' + o.cls : '');
  el.setAttribute('aria-hidden', 'true');
  const ms = o.ms || 1600;
  el.style.setProperty('--ap-m-ms', ms + 'ms');
  if (!o.center) { el.style.left = Math.round(o.x || 0) + 'px'; el.style.top = Math.round(o.y || 0) + 'px'; }
  el.innerHTML = animItemHtml(it, { size: o.size || 'md', live: true }) + (o.caption ? `<span class="ap-moment-cap">${esc(o.caption)}</span>` : '');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms + 80);
  return true;
}

/* ---------- calendar ---------- */
function animEventSceneHtml(ev, o) {
  o = o || {};
  try {
    if (!ev || typeof animForEvent !== 'function') return '';
    const type = animForEvent(ev).type || 'event';
    const look = animLook();
    const pool = animItems({ slot: 'event-scene', look }).filter(it => !look.block.includes(it.ref) && (it.id === 'scene-' + type || it.tags.includes('scene-' + type)));
    if (!pool.length) return '';
    const fav = pool.filter(it => look.fav.includes(it.ref));
    const bag = fav.length ? fav : pool;
    const it = bag[motionHash(todayStr() + '|' + (ev.id || '')) % bag.length];
    const on = _amOn();
    return animItemHtml(it, { size: o.size || 'xs', hover: on, reduced: !on, cls: o.cls || '' });
  } catch (e) { return ''; }
}
function animSoonInfo(ev) {
  try {
    if (!ev || ev.allDay || !ev.start || !ev.start.dateTime) return null;
    const min = Math.ceil((calEventStart(ev).getTime() - Clock.now()) / 60000);
    return min > 0 && min <= 15 ? { min } : null;
  } catch (e) { return null; }
}

/* ---------- tasks ---------- */
function animTaskDone(item, x, y) {
  if (!item || !_amOn()) return false;
  const it = _amPick('task-done', { key: typeof effStream === 'function' ? effStream(item) : '', daily: false });
  return animMomentPlay(it, { x, y, size: 'lg', ms: 1300, cls: 'ap-halo' });
}
/** due: the task's date before it was closed. true when the boss moment played. */
function animBossCheck(item, due) {
  if (!item || !due || !_amOn() || _am.boss.has(item.id)) return false;
  const today = todayStr();
  if (!(due < today)) return false;
  const days = Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(due + 'T12:00:00Z')) / 86400000);
  if (days < ANIM_BOSS_DAYS) return false;
  const it = _amPick('boss');
  if (!it) return false;
  _am.boss.add(item.id);
  const lv = _amLevel();
  const ok = animMomentPlay(it, { center: true, size: 'hero', ms: lv === 'playful' ? 2800 : 2000, cls: 'ap-boss', caption: days >= 30 ? 'A month overdue, and done' : 'Long overdue, and done' });
  if (ok && typeof animBurst === 'function') { const c = document.querySelector('.ap-moment.ap-boss'); if (c) animBurst(c, 'celebration'); }
  return ok;
}
function animStreakHtml(days) {
  const g = animStreakGrow(days);
  if (!g) return '';
  const it = _amPick('streak');
  if (!it) return '';
  const on = _amOn();
  const live = on && (typeof _awEntryOnce !== 'function' || _awEntryOnce('streak'));
  return `<span class="ap-streak" style="--ap-grow:${g}" aria-hidden="true">${animItemHtml(it, { size: 'xs', live, reduced: !live })}</span>`;
}

/* ---------- the styles the CSS draws ---------- */
function animMomentsApply() {
  const html = document.documentElement;
  const on = _amOn();
  const set = (attr, slot, tag) => {
    const it = on ? _amPick(slot, tag ? { tag } : undefined) : null;
    const v = it && it.fx ? it.fx : '';
    if ((html.getAttribute(attr) || '') !== v) { if (v) html.setAttribute(attr, v); else html.removeAttribute(attr); }
  };
  set('data-ap-ring', 'progress');
  set('data-ap-soon', 'meeting');
  set('data-ap-vendor', 'money', 'vendor');
  set('data-ap-living', 'home', 'living');
  set('data-ap-idle', 'home', 'idle');
  // Home's hero keeps its element across renders: bring its light up to date (the hour, the prefs)
  const hh = document.querySelector('#main-body .hh');
  if (hh) animLivingPaint(hh);
}

/* ---------- Home: the living background ---------- */
function animLivingPaint(root) {
  if (!root) return;
  const old = root.querySelector(':scope > .ap-living');
  const it = _amOn() ? _amPick('home', { tag: 'living' }) : null;
  if (!it) { if (old) old.remove(); return; }
  const p = Clock.parts(Clock.now());
  const hr = p.h + p.mi / 60;
  const f = Math.max(0, Math.min(1, (hr - 6) / 15));          // 06:00 .. 21:00 across the arc
  const night = hr < 6 || hr >= 21;
  const x = Math.round(8 + 84 * f), y = Math.round(78 - 62 * Math.sin(Math.PI * f));
  const el = old || document.createElement('div');
  el.className = 'ap-living' + (night ? ' is-night' : '');
  el.setAttribute('aria-hidden', 'true');
  el.dataset.fx = it.fx || '';
  el.style.setProperty('--ap-sx', x + '%'); el.style.setProperty('--ap-sy', y + '%');
  if (!old) { el.innerHTML = '<i class="ap-orb"></i><i class="ap-blob a"></i><i class="ap-blob b"></i>'; root.prepend(el); }
}

/* ---------- focus sessions ---------- */
const _AM_FOCUS_KEY = 'dashboard-anim-focus';
function _amFocusRec() {
  try { const r = JSON.parse(localStorage.getItem(_AM_FOCUS_KEY) || 'null'); return r && isFinite(r.start) && isFinite(r.ms) ? r : null; } catch (e) { return null; }
}
function animFocusStart(min) {
  const ms = Math.max(5, Math.min(120, Number(min) || 25)) * 60000;
  const it = _amPick('focus');
  try { localStorage.setItem(_AM_FOCUS_KEY, JSON.stringify({ start: Clock.now(), ms, ref: it ? it.ref : '' })); } catch (e) { /* private mode */ }
  animFocusPaint();
  if (typeof toast === 'function') toast(`Focus block: ${Math.round(ms / 60000)} minutes. The scene grows as you go.`, { icon: 'timer' });
}
function animFocusStop(quiet) {
  try { localStorage.removeItem(_AM_FOCUS_KEY); } catch (e) { /* private mode */ }
  clearTimeout(_am.focusTimer);
  const el = document.getElementById('ap-focus');
  if (el) el.remove();
  document.documentElement.classList.remove('ap-focusing');
  if (!quiet && typeof toast === 'function') toast('Focus block stopped.', { icon: 'timer' });
}
function animFocusPaint() {
  clearTimeout(_am.focusTimer);
  const r = _amFocusRec();
  let el = document.getElementById('ap-focus');
  const root = document.documentElement;
  if (!r) { if (el) el.remove(); root.classList.remove('ap-focusing'); return; }
  const left = r.start + r.ms - Clock.now();
  const done = left <= 0;
  // Focus mode (v2.2 wave 6): while the block runs, the rest of the page dims (71-anim-make.css);
  // the Focus widget and the pill stay bright, and hovering anything brings it back.
  root.classList.toggle('ap-focusing', !done);
  const g = Math.max(0.05, Math.min(1, 1 - left / r.ms));
  const it = (r.ref && animItem(r.ref)) || _amPick('focus');
  if (!el) {
    el = document.createElement('div'); el.id = 'ap-focus'; el.className = 'ap-focus';
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="ap-focus-art"></span><span class="ap-focus-t"><b></b><small></small></span><button type="button" class="btn btn-ghost btn-sm btn-icon ap-focus-x" aria-label="Stop the focus block" data-tip="Stop">' + icon('x') + '</button>';
    el.querySelector('.ap-focus-x').onclick = () => animFocusStop(done);
    document.body.appendChild(el);
  }
  const on = _amOn();
  const art = el.querySelector('.ap-focus-art');
  art.style.setProperty('--ap-grow', String(Math.round(g * 100) / 100));
  const key = (it ? it.ref : '') + '|' + on + '|' + done;
  if (art.dataset.k !== key) { art.dataset.k = key; art.innerHTML = it ? animItemHtml(it, { size: 'md', live: on, reduced: !on }) : icon('timer'); }
  el.classList.toggle('is-done', done);
  el.querySelector('b').textContent = done ? 'Focus block done' : `${Math.ceil(left / 60000)} min left`;
  el.querySelector('small').textContent = done ? 'Take a short break.' : 'Focus block';
  if (done) {
    if (!r.told) {
      try { localStorage.setItem(_AM_FOCUS_KEY, JSON.stringify(Object.assign({}, r, { told: true }))); } catch (e) { /* private mode */ }
      if (on && typeof animBurst === 'function') animBurst(art, 'celebration');
      if (typeof achNote === 'function') achNote('focus');   // the first focus block (78-achievements.js)
    }
    _am.focusTimer = setTimeout(() => animFocusStop(true), 60000);
    return;
  }
  _am.focusTimer = setTimeout(animFocusPaint, Math.min(15000, left + 50));
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('load', () => setTimeout(animFocusPaint, 500), { once: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && _amFocusRec()) animFocusPaint(); });
}
if (typeof registerCommand === 'function') {
  registerCommand({ id: 'focus-block', label: 'Start a 25-minute focus block', icon: 'timer', keywords: 'focus pomodoro timer session grow plant', run: () => animFocusStart(25) });
  registerCommand({ id: 'focus-block-stop', label: 'Stop the focus block', icon: 'timer', keywords: 'focus pomodoro timer', when: () => !!_amFocusRec(), run: () => animFocusStop(false) });
}

/* ---------- money (called by the Finances view, src/finance) ---------- */
function animMoneyMoment(kind, at, key) {
  if (!_amOn() || !_amOnceToday(kind + '|' + (key || ''))) return false;
  if (kind === 'payday') {
    const it = _amPick('money', { tag: 'payday' });
    if (!it || document.hidden) return false;
    const n = _amLevel() === 'playful' ? 12 : _amLevel() === 'subtle' ? 0 : 7;
    if (!n) return false;
    const box = document.createElement('div'); box.className = 'ap-rain'; box.setAttribute('aria-hidden', 'true');
    let h = '';
    for (let i = 0; i < n; i++) {
      const x = 4 + (motionHash('rain' + i + todayStr()) % 92), d = (i * 0.17) % 1.1;
      h += `<span class="ap-drop" style="left:${x}%;--d:${d.toFixed(2)}s">${animItemHtml(it, { size: 'md', live: true })}</span>`;
    }
    box.innerHTML = h + '<span class="ap-moment-cap">Payday</span>';
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3400);
    return true;
  }
  if (kind === 'under-budget') {
    const it = _amPick('money', { tag: 'under-budget' });
    if (!it || !at || !at.getBoundingClientRect) return false;
    const r = at.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > window.innerHeight) return false;
    const ok = animMomentPlay(it, { x: r.left + r.width / 2, y: r.top + r.height / 2, size: 'xl', ms: 2000, cls: 'ap-under', caption: 'Under budget' });
    if (ok && typeof animBurst === 'function') animBurst(at, 'celebration');
    return ok;
  }
  return false;
}
/** txs: [{d: 'YYYY-MM-DD', inc: amount}]. An income of note (the biggest of the last 90 days, or near it) today or yesterday. */
function animPaydayCheck(txs) {
  try {
    if (!Array.isArray(txs) || !txs.length) return false;
    const today = todayStr(), yday = Clock.addDays(today, -1), from = Clock.addDays(today, -90);
    let top = 0, hit = null;
    for (const t of txs) {
      if (!t || !(t.inc > 0) || t.d < from || t.d > today) continue;
      if (t.inc > top) top = t.inc;
      if ((t.d === today || t.d === yday) && (!hit || t.inc > hit.inc)) hit = t;
    }
    if (!hit || hit.inc < Math.max(100, top * 0.6)) return false;
    return animMoneyMoment('payday', null, hit.d);
  } catch (e) { return false; }
}

/* ---------- people ---------- */
/** kind 'birthday' | 'while': the art for a person's row or card (live once per entry). */
function animPersonMomentHtml(kind, size) {
  const it = _amPick('people', { tag: kind });
  if (!it) return '';
  const on = _amOn();
  const live = on && (typeof _awEntryOnce !== 'function' || _awEntryOnce('people-' + kind));
  return `<span class="ap-person ap-person-${kind === 'birthday' ? 'bday' : 'while'}" aria-hidden="true">${animItemHtml(it, { size: size || 'sm', live, reduced: !live })}</span>`;
}

/** The person card's moment (on the cover): a birthday today (a birthday event naming them,
 *  as Home's People widget reads it), else a wave after 30+ days without contact. */
function animPersonCardMoment(p) {
  try {
    if (!p || p.self || p.isSelf) return '';
    const today = todayStr();
    let bday = false;
    if (typeof homePeopleToday === 'function' && typeof _hbpEvents === 'function') {
      const res = homePeopleToday({ people: [p], idx: typeof pplIndex === 'function' ? pplIndex() : undefined, events: _hbpEvents(today, tomorrowStr()), tasks: [], today, nowHM: '00:00', locale: APP_CONFIG.locale, max: 3 });
      bday = !!(res && res.rows || []).find(r => r.id === p.id && r.why.some(w => w.k === 'celebrate' && /today/.test(w.b)));
    }
    let days = 0;
    if (!bday && typeof peopleLastContact === 'function') { const lc = peopleLastContact(); const l = lc && lc.get ? lc.get(p.id) : null; days = l && l.daysAgo >= 30 ? l.daysAgo : 0; }
    if (!bday && !days) return '';
    const art = animPersonMomentHtml(bday ? 'birthday' : 'while', 'lg');
    if (!art) return '';
    return `<span class="ap-pc-moment${bday ? ' is-bday' : ''}">${art}<span>${esc(bday ? 'Birthday today' : `${days} days since you were last in touch`)}</span></span>`;
  } catch (e) { return ''; }
}

/* ---------- countdowns ---------- */
/** ' data-ap-cd="stage" style="--ap-heat:h"' for a countdown's date ('' when it is far). */
function animCountdownAttrs(date) {
  if (!date || typeof daysUntil !== 'function' || !_amOn()) return { cls: '', style: '', heat: 0 };
  const d = daysUntil(date);
  const heat = animCountdownHeat(d);
  if (!heat) return { cls: '', style: '', heat: 0 };
  return { cls: ' ap-cd ap-cd-' + animCountdownStage(heat), style: `--ap-heat:${heat}`, heat };
}
function animCountdownArtHtml(heat) {
  if (!heat) return '';
  const it = _amPick('countdown');
  if (!it) return '';
  return `<span class="ap-cd-art" style="--ap-grow:${Math.max(0.3, heat)}" aria-hidden="true">${animItemHtml(it, { size: 'sm', hover: true })}</span>`;
}
