/* ============================================================
   MEMORIES: Wrapped, your year in OpenDash (owner: Memories). A full-screen,
   story-like sequence (memWrappedOpen(year)): the tasks you finished, your
   biggest day, your rhythm, your year of squares, where your effort went, the
   people you worked with most, your places and postcards, money highlights
   (when Finances has data; amounts follow Home's "hide amounts"), fun facts, your
   journal and milestones, agent game's level when it is there, your goals, and a
   card to save as an image.
   Keys: Right / Space next, Left back, P pause, Esc close; click the left or right
   of the screen; hold to pause. Slides advance by themselves (7 s), except under
   reduced motion. Everything is worked out on this computer; nothing is sent.
   ============================================================ */
let _mwr = null;   // {el, i, slides, year, Y, t0, timer, paused, fin}
const _MWR_MS = 7000;

function _mwrMoneyFmt(n) {
  if (typeof homeAmountsHidden === 'function' && homeAmountsHidden()) return '••••';
  return typeof _homeFmtMoney === 'function' ? _homeFmtMoney(n) : String(Math.round(n));
}
/** Money highlights for a year from /api/finance (null when there is no data). */
async function _mwrMoney(year) {
  if (APP_CONFIG.features && APP_CONFIG.features.finance === false) return null;
  if (typeof _serverAvailable !== 'undefined' && !_serverAvailable) return null;
  try {
    const r = await fetch('/api/finance', { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    const j = await r.json();
    const a = j && j.status === 'ok' ? j.analysis : null;
    if (!a || !Array.isArray(a.transactions)) return null;
    const exclude = Array.isArray(a.exclude_from_spending) && a.exclude_from_spending.length ? a.exclude_from_spending.map(String) : ['Income', 'Internal transfers'];
    const y = String(year), cats = new Map(), shops = new Map();
    let spent = 0, n = 0;
    for (const t of a.transactions) {
      if (!t || typeof t.d !== 'string' || t.d.slice(0, 4) !== y) continue;
      const amt = -Number(t.a); const c = String(t.c || 'Uncategorised');
      if (!Number.isFinite(amt) || exclude.includes(c)) continue;
      spent += amt; if (amt > 0) n++;
      cats.set(c, (cats.get(c) || 0) + amt);
      if (amt > 0) { const m = String(t.m || '').trim(); if (m) { const e = shops.get(m) || { m, n: 0, v: 0 }; e.n++; e.v += amt; shops.set(m, e); } }
    }
    if (n < 5) return null;
    const topCat = [...cats.entries()].filter(x => x[1] > 0).sort((p, q) => q[1] - p[1])[0];
    const fav = [...shops.values()].sort((p, q) => q.n - p.n)[0];
    return { spent, n, topCat: topCat ? { c: topCat[0], v: topCat[1] } : null, fav: fav && fav.n >= 3 ? fav : null, cats: [...cats.entries()].filter(x => x[1] > 0).sort((p, q) => q[1] - p[1]).slice(0, 4) };
  } catch (e) { return null; }
}

/* ---------- the slides ---------- */
function _mwrSlides(Y) {
  const S = [], yr = Y.year, first = typeof userName === 'function' ? String(userName() || '').split(/\s+/)[0] : '';
  const big = (n, label) => `<div class="mwr-big"><b data-count="${n}">${esc(String(n))}</b><span>${esc(label)}</span></div>`;
  S.push({ id: 'intro', html: `<div class="mwr-over">${esc(first ? `Hello, ${first}` : 'Hello')}</div><h1 class="mwr-h1">Your <span>${yr}</span> in Freeflo</h1><p class="mwr-p">${esc(Y.partial ? 'The year so far, wrapped up.' : 'A whole year, wrapped up.')}</p><div class="mwr-hint">Tap or press → to begin</div>` });
  S.push({ id: 'total', html: `<div class="mwr-over">This year you finished</div>${big(Y.total, Y.total === 1 ? 'task' : 'tasks')}<p class="mwr-p">${esc(`On ${_memPlural(Y.activeDays, 'different day')}: about ${Y.perWeek} a week.`)}</p>` });
  if (Y.total) S.push({ id: 'squares', html: `<div class="mwr-over">Your year in squares</div><div class="mwr-hm" data-heatmap="${yr}"></div><p class="mwr-p">${esc(Y.streak.days > 1 ? `Your longest streak: ${Y.streak.days} days in a row, from ${_memFmt(Y.streak.from, { day: 'numeric', month: 'short' })} to ${_memFmt(Y.streak.to, { day: 'numeric', month: 'short' })}.` : 'Every square is a day you showed up.')}</p>` });
  if (Y.busiest.n >= 2) S.push({ id: 'busiest', html: `<div class="mwr-over">Your biggest day</div><h2 class="mwr-h2">${esc(_memFmt(Y.busiest.iso, { weekday: 'long', day: 'numeric', month: 'long' }))}</h2>${big(Y.busiest.n, 'tasks in one day')}<ul class="mwr-list">${Y.busiest.titles.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` });
  if (Y.total >= 10) {
    const dn = _memFmt('2026-01-' + String(4 + Y.weekday.dow).padStart(2, '0'), { weekday: 'long' });
    const hmax = Math.max(1, ...Y.months);
    S.push({ id: 'rhythm', html: `<div class="mwr-over">Your rhythm</div><h2 class="mwr-h2">${esc(`${dn}s, around ${_memHourLabel(Y.hour.h)}`)}</h2><p class="mwr-p">${esc(`is when you got the most done. Your busiest month was ${_memFmt(`${yr}-${String(Y.busiestMonth.m + 1).padStart(2, '0')}-01`, { month: 'long' })}.`)}</p>`
      + `<div class="mwr-months">${Y.months.map((n, m) => `<span style="--h:${(n / hmax * 100).toFixed(1)}%" class="${m === Y.busiestMonth.m ? 'is-top' : ''}"><i></i><small>${esc(_memFmt(`${yr}-${String(m + 1).padStart(2, '0')}-01`, { month: 'narrow' }))}</small></span>`).join('')}</div>` });
  }
  if (Y.streams.length) {
    const max = Y.streams[0].n;
    S.push({ id: 'streams', html: `<div class="mwr-over">Where your effort went</div><h2 class="mwr-h2">${esc(Y.streams[0].label)}</h2><p class="mwr-p">${esc(`took ${Math.round(Y.streams[0].n / Math.max(1, Y.total) * 100)}% of everything you finished.`)}</p>`
      + `<div class="mwr-bars-list">${Y.streams.map(s => `<div class="mwr-sbar"><span>${esc(s.label)}</span><i style="--w:${(s.n / max * 100).toFixed(1)}%;--c:${escAttr(safeColor(s.color || 'var(--accent)'))}"></i><b>${s.n}</b></div>`).join('')}</div>` });
  }
  const ppl = Y.people.map(x => ({ p: getPerson(x.id), n: x.n })).filter(x => x.p);
  if (ppl.length) S.push({ id: 'people', html: `<div class="mwr-over">The people you worked with most</div><div class="mwr-people">${ppl.map((x, i) => `<div class="mwr-person${i === 0 ? ' is-top' : ''}">${avatarHtml(x.p, i === 0 ? 88 : 56)}<b>${esc(x.p.name)}</b><span>${esc(_memPlural(x.n, 'day'))}</span></div>`).join('')}</div><p class="mwr-p">${esc(`You and ${_pplFirst(ppl[0].p)}: ${_memPlural(ppl[0].n, 'day')} in touch this year.`)}</p>` });
  const locTab = typeof sectionFor === 'function' && !!sectionFor('locations');
  if (Y.places.length || Y.postcards.length) S.push({ id: 'places', html: `<div class="mwr-over">Your places</div>${Y.places.length ? `<ol class="mwr-places">${Y.places.map(p => `<li><b>${esc(p.name)}</b><span>${esc(_memPlural(p.days, 'day'))}</span></li>`).join('')}</ol>` : ''}${Y.postcards.length ? `<p class="mwr-p">${esc(`${_memPlural(Y.postcards.length, 'new country', 'new countries')} this year`)}</p><div class="mwr-cards" data-album="1"></div>` : ''}`, album: !locTab || Y.postcards.length });
  S.push({ id: 'money', html: '', money: true });
  const facts = memFunFacts().filter(f => f.id !== 'pace').slice(0, 3);
  if (facts.length) S.push({ id: 'facts', html: `<div class="mwr-over">Fun facts</div><ul class="mwr-facts">${facts.map(f => `<li>${icon(f.icon || 'sparkles', 'i-md')}<span>${esc(f.text)}</span></li>`).join('')}</ul>` });
  if (Y.journalLines || Y.milestones.length) S.push({ id: 'journal', html: `<div class="mwr-over">Things worth keeping</div>`
    + (Y.favouriteLine ? `<blockquote class="mwr-quote">${esc(Y.favouriteLine.line)}<cite>${esc(_memFmt(Y.favouriteLine.iso, { day: 'numeric', month: 'long' }))}</cite></blockquote>` : '')
    + (Y.journalLines ? `<p class="mwr-p">${esc(`You wrote a line on ${_memPlural(Y.journalLines, 'day')}.`)}</p>` : '')
    + (Y.milestones.length ? `<div class="mwr-ms">${Y.milestones.map(m => `<span>${icon('trophy', 'i-xs')}${esc(m.n === 1 ? 'Your first task' : `Task #${m.n}`)}<small>${esc(_memFmt(m.iso, { day: 'numeric', month: 'short' }))}</small></span>`).join('')}</div>` : '') });
  const g = Y.game;
  if (g && (g.level || g.xp)) S.push({ id: 'game', html: `<div class="mwr-over">Your game</div>${g.level ? big(g.level, g.title ? `level: ${g.title}` : 'level reached') : ''}<p class="mwr-p">${esc([g.xp ? `${g.xp.toLocaleString()} XP this year` : '', g.focusMin >= 60 ? `${Math.round(g.focusMin / 60)} hours of focus` : '', g.bosses ? _memPlural(g.bosses, 'boss task') + ' beaten' : ''].filter(Boolean).join(' · '))}</p>` });
  if (Y.goals.length) { const done = Y.goals.filter(x => x.done).length; S.push({ id: 'goals', html: `<div class="mwr-over">Your goals for ${yr}</div><h2 class="mwr-h2">${esc(`${done} of ${Y.goals.length} done`)}</h2><ul class="mwr-goals">${Y.goals.map(x => `<li class="${x.done ? 'is-done' : ''}">${icon(x.done ? 'check' : 'target', 'i-sm')}<span>${esc(x.text)}</span></li>`).join('')}</ul><p class="mwr-p subtle">${esc('Tick them in Memories or on Home at New Year.')}</p>` }); }
  S.push({ id: 'outro', html: `<div class="mwr-over">That was ${yr}</div><div class="mwr-card" data-card="1"></div><div class="mwr-actions"></div>` });
  return S;
}
function _mwrMoneyHtml(m) {
  if (!m) return '';
  return `<div class="mwr-over">Money</div><h2 class="mwr-h2">${esc(m.topCat ? m.topCat.c : 'Your spending')}</h2><p class="mwr-p">${esc(m.topCat ? `was where most of your money went: ${_mwrMoneyFmt(m.topCat.v)}.` : '')}</p>`
    + `<div class="mwr-bars-list">${m.cats.map(([c, v]) => `<div class="mwr-sbar"><span>${esc(c)}</span><i style="--w:${(v / m.cats[0][1] * 100).toFixed(1)}%;--c:var(--sw-teal)"></i><b>${esc(_mwrMoneyFmt(v))}</b></div>`).join('')}</div>`
    + (m.fav ? `<p class="mwr-p">${esc(`Your favourite place: ${m.fav.m}, ${m.fav.n} visits.`)}</p>` : '') + `<p class="mwr-p subtle">${esc(`${m.n} payments in all.`)}</p>`;
}

/* ---------- the player ---------- */
function memWrappedOpen(year) {
  year = +year || +todayStr().slice(0, 4);
  if (_mwr) memWrappedClose();
  const Y = memYearStats(year);
  if (!Y.total && !Y.journalLines) { toast(`Nothing to wrap for ${year} yet. Finish a task or two first.`, { icon: 'party-popper' }); return; }
  const slides = _mwrSlides(Y);
  const el = document.createElement('div');
  el.className = 'mwr'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `Your ${year} in Freeflo`);
  el.innerHTML = `<div class="mwr-bars">${slides.map(() => '<i><b></b></i>').join('')}</div>`
    + `<div class="mwr-top"><span class="mwr-brand">${icon('party-popper', 'i-sm')}<span>Wrapped ${year}</span></span><span class="spacer"></span>`
    + `<button type="button" class="mwr-ctl" data-act="pause" aria-label="Pause or play"><span class="mwr-pz" aria-hidden="true"></span></button><button type="button" class="mwr-ctl" data-act="close" aria-label="Close">${icon('x', 'i-sm')}</button></div>`
    + `<div class="mwr-stage" aria-live="polite"></div>`
    + `<button type="button" class="mwr-hot mwr-prev" data-act="prev" aria-label="Back"></button><button type="button" class="mwr-hot mwr-next" data-act="next" aria-label="Next"></button>`;
  document.body.appendChild(el);
  _mwr = { el, i: -1, slides, year, Y, t0: 0, timer: 0, paused: false, fin: undefined, prevFocus: document.activeElement, auto: _memMotionOn() };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !_mwr) return;
    if (_mwr.swallow) { _mwr.swallow = false; return; }   // the click that ends a hold
    const a = b.dataset.act;
    if (a === 'close') memWrappedClose(); else if (a === 'next') _mwrGo(_mwr.i + 1); else if (a === 'prev') _mwrGo(_mwr.i - 1); else if (a === 'pause') _mwrPause(!_mwr.paused);
  });
  let hold = 0;
  el.addEventListener('pointerdown', (e) => { if (e.target.closest('.mwr-hot') && _mwr && !_mwr.paused) hold = setTimeout(() => _mwrPause(true, true), 280); });
  el.addEventListener('pointerup', () => { clearTimeout(hold); if (_mwr && _mwr.held) { _mwr.held = false; _mwr.swallow = true; _mwrPause(false); } });
  document.addEventListener('keydown', _mwrKey, true);
  _mwrMoney(year).then(m => {
    if (!_mwr || _mwr.year !== year) return;
    _mwr.fin = m;
    const k = _mwr.slides.findIndex(s => s.money);
    if (k < 0) return;
    if (k === _mwr.i) { _mwr.i = -2; _mwrGo(k); }            // on it: draw it now (or move on when there is nothing)
    else if (!m && k > _mwr.i) { _mwr.slides.splice(k, 1); _mwrBars(); }
  });
  _mwrGo(0);
  requestAnimationFrame(() => el.classList.add('is-on'));
  setTimeout(() => { const n = el.querySelector('.mwr-next'); if (n) n.focus({ preventScroll: true }); }, 0);
}
function _mwrBars() {
  if (!_mwr) return;
  const bars = _mwr.el.querySelector('.mwr-bars');
  bars.innerHTML = _mwr.slides.map((s, k) => `<i class="${k < _mwr.i ? 'is-done' : k === _mwr.i ? 'is-now' : ''}"><b></b></i>`).join('');
  const now = bars.children[_mwr.i];
  if (now) { now.firstChild.style.animationDuration = _MWR_MS + 'ms'; if (_mwr.paused || !_mwr.auto) now.classList.add('is-paused'); }
}
function _mwrKey(e) {
  if (!_mwr) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); memWrappedClose(); }
  else if (e.key === 'ArrowRight' || (e.key === ' ' && !e.target.closest('button'))) { e.preventDefault(); e.stopPropagation(); _mwrGo(_mwr.i + 1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); _mwrGo(_mwr.i - 1); }
  else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); _mwrPause(!_mwr.paused); }
}
function _mwrPause(on, held) {
  if (!_mwr) return;
  _mwr.paused = !!on; if (held) _mwr.held = true;
  _mwr.el.classList.toggle('is-paused', _mwr.paused);
  const now = _mwr.el.querySelector('.mwr-bars .is-now');
  if (now) now.classList.toggle('is-paused', _mwr.paused || !_mwr.auto);
  clearTimeout(_mwr.timer);
  if (!_mwr.paused && _mwr.auto) _mwr.timer = setTimeout(() => _mwrGo(_mwr.i + 1), Math.max(800, _MWR_MS - (_mwr.spent || 0)));
  if (_mwr.paused) _mwr.spent = (_mwr.spent || 0) + (Date.now() - _mwr.t0); else _mwr.t0 = Date.now();   // clock-ok: a timer
}
function _mwrGo(i) {
  if (!_mwr) return;
  if (i >= _mwr.slides.length) { if (_mwr.i === _mwr.slides.length - 1) return; i = _mwr.slides.length - 1; }
  if (i < 0) i = 0;
  if (i === _mwr.i) return;
  let s = _mwr.slides[i];
  const back = i < _mwr.i;
  if (s.money) {
    // no money data: the slide goes, and we carry on in the direction of travel
    if (_mwr.fin === null) { _mwr.slides.splice(i, 1); if (back) { _mwr.i--; return _mwrGo(i - 1); } return _mwrGo(i); }
    s = Object.assign({}, s, { html: _mwr.fin ? _mwrMoneyHtml(_mwr.fin) : `<div class="mwr-over">Money</div><p class="mwr-p">Adding up your year…</p>` });
  }
  _mwr.i = i;
  const stage = _mwr.el.querySelector('.mwr-stage');
  const slide = document.createElement('section');
  slide.className = 'mwr-slide mwr-s-' + s.id + (back ? ' from-left' : '');
  slide.style.setProperty('--k', String(i % 7));
  slide.innerHTML = `<div class="mwr-in">${s.html}</div>`;
  _mwrFill(slide, s);
  const old = stage.querySelector('.mwr-slide');
  if (old) { old.classList.add('is-out'); setTimeout(() => old.remove(), 420); }
  stage.appendChild(slide);
  requestAnimationFrame(() => slide.classList.add('is-on'));
  _mwrCount(slide);
  _mwr.el.setAttribute('data-slide', s.id);
  _mwrBars();
  clearTimeout(_mwr.timer); _mwr.spent = 0; _mwr.t0 = Date.now();   // clock-ok: a timer
  if (_mwr.auto && !_mwr.paused && i < _mwr.slides.length - 1) _mwr.timer = setTimeout(() => _mwrGo(_mwr.i + 1), _MWR_MS);
  if (s.id === 'outro') { if (memFunLevel() !== 'off') setTimeout(() => memBurst(), 350); memAward('wrapped', { key: String(_mwr.year), label: `Your ${_mwr.year} Wrapped` }); }
}
function _mwrFill(slide, s) {
  const Y = _mwr.Y;
  const hm = slide.querySelector('[data-heatmap]');
  if (hm) hm.appendChild(memHeatmapEl({ year: Y.year, labels: false, cell: 9, cls: 'mwr-heat' }));
  const al = slide.querySelector('[data-album]');
  if (al) { const a = memPostcardAlbumEl({ compact: true, limit: 6 }); a.querySelectorAll('.mpc-note').forEach(b => b.remove()); al.appendChild(a); }
  const card = slide.querySelector('[data-card]');
  if (card) {
    const top = Y.streams[0], tp = Y.people[0] && getPerson(Y.people[0].id);
    card.innerHTML = `<div class="mwr-sum"><span class="mwr-sum-y">${Y.year}</span><b>${Y.total}</b><span>tasks finished</span>`
      + `<dl>${[['Active days', Y.activeDays], ['Best streak', `${Y.streak.days} days`], ['Biggest day', Y.busiest.n ? `${Y.busiest.n} tasks` : '–'], ['Top stream', top ? top.label : '–'], ['Most in touch', tp ? tp.name : '–'], ['Countries', Y.postcards.length || '–']].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(String(v))}</dd></div>`).join('')}</dl></div>`;
    const act = slide.querySelector('.mwr-actions');
    act.append(uiButton({ label: 'Save as image', icon: 'download', kind: 'primary', run: () => _mwrSaveImage(Y) }), uiButton({ label: 'Play again', icon: 'history', run: () => _mwrGo(0) }));
    const ny = memSeason(); if (ny && ny.kind === 'newyear' && ny.year === Y.year + 1) act.append(uiButton({ label: `Set my ${Y.year + 1} goals`, icon: 'target', run: () => { memWrappedClose(); memGoalsDialog(Y.year + 1); } }));
    act.append(uiButton({ label: 'Close', icon: 'x', run: () => memWrappedClose() }));
  }
}
function _mwrCount(slide) {
  const els = slide.querySelectorAll('[data-count]');
  if (!els.length || !_memMotionOn()) return;
  const t0 = performance.now(), ms = 1100;
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    els.forEach(x => { x.textContent = String(Math.round(+x.dataset.count * e)); });
    if (k < 1 && slide.isConnected) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function memWrappedClose() {
  if (!_mwr) return;
  const { el, prevFocus } = _mwr;
  clearTimeout(_mwr.timer);
  document.removeEventListener('keydown', _mwrKey, true);
  _mwr = null;
  el.classList.remove('is-on'); el.classList.add('is-closing');
  setTimeout(() => el.remove(), 300);
  try { if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true }); } catch (e) { /* gone */ }
}

/* ---------- the shareable card ---------- */
function _mwrSaveImage(Y) {
  try {
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const font = (getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif');
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#4f46e5'); grad.addColorStop(0.55, '#9333ea'); grad.addColorStop(1, '#ec4899');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.12; g.fillStyle = '#fff';
    for (let i = 0; i < 26; i++) { const x = (_memHash('x' + i) % W), y = (_memHash('y' + i) % H), r = 6 + _memHash('r' + i) % 40; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    g.font = `600 44px ${font}`; g.fillText(`My ${Y.year} in Freeflo`, 90, 170);
    g.font = `800 300px ${font}`; g.fillText(String(Y.total), 80, 500);
    g.font = `500 52px ${font}`; g.fillText('tasks finished', 92, 580);
    const top = Y.streams[0], tp = Y.people[0] && getPerson(Y.people[0].id);
    const rows = [['Active days', String(Y.activeDays)], ['Best streak', `${Y.streak.days} days`], ['Biggest day', Y.busiest.n ? `${Y.busiest.n} tasks, ${_memFmt(Y.busiest.iso, { day: 'numeric', month: 'short' })}` : '–'], ['Top stream', top ? top.label : '–'], ['Most in touch', tp ? tp.name : '–'], ['New countries', String(Y.postcards.length || 0)]];
    let y = 720;
    for (const [k, v] of rows) {
      g.globalAlpha = 0.75; g.font = `500 34px ${font}`; g.fillText(k.toUpperCase(), 92, y);
      g.globalAlpha = 1; g.font = `700 50px ${font}`; g.fillText(String(v).slice(0, 34), 92, y + 58);
      y += 110;
    }
    g.globalAlpha = 0.7; g.font = `500 30px ${font}`; g.fillText('Made with Freeflo', 92, H - 70);
    c.toBlob((blob) => {
      if (!blob) { toastError('make the picture', null, () => _mwrSaveImage(Y)); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `opendash-wrapped-${Y.year}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Saved your Wrapped card to Downloads', { kind: 'ok', icon: 'download' });
    }, 'image/png');
  } catch (e) { toastError('make the picture', e, () => _mwrSaveImage(Y)); }
}
