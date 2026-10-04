/* ============================================================
   HOME widget "countdowns": the dates you are counting down to, as big
   numbers. Owner: HB3 (schedule, week, countdowns). CSS: 13-home-w-schedule.css.
   Data: the top bar's own list (state.countdowns through tbList / tbCompute /
   tbColorAttrs, 10-header.js), read-only here; edits go through the top-bar
   editor (openCountdownEditor / openTopbarCustomiser, 10-header-editor.js).

   S (a third): the most urgent one as a tinted hero ("1 day", light 40 px
     numerals; amber when it is inside its warning window, else its own
     colour) with a scene, then up to 4 more rows: the number and unit, the
     label, the date and a thin progress bar in its colour (when it has one).
   M (half): a 2 x 2 grid of countdown cards, the most urgent first.
   Click one: the top-bar editor with it selected. "Edit" in the header: the
   editor. Past countdowns (and finished progress bars) are left out.
   Nothing to show: hidden, so a new Home stays calm; while customising it
   shows "Add a date to count down to" with Add a countdown.
   Once per entry: the bars grow from 0 on the widget's first paint only
   (no count-up: Home is calm); later re-renders show them settled.
   ============================================================ */
registerHomeWidget({
  id: 'countdowns', title: 'Countdowns', icon: 'timer', order: 75,       // (Waiting on has the hourglass)
  description: 'The dates you are counting down to, as big numbers. Edit them in the top bar',
  sizes: ['s', 'm'], defaultSize: 's',
  available: () => typeof tbList === 'function' && typeof tbCompute === 'function',
  render(el, ctx) { return _hcdRender(el, ctx); },
});

const _HCD_UNIT = { d: ['day', 'days'], w: ['week', 'weeks'], wd: ['workday', 'workdays'], h: ['hour', 'hours'], min: ['min', 'min'] };

/**
 * PURE: order countdowns for the widget. items [{w:{id, date, ...}, c:{num, unit,
 * warn, past, hidden, pct}}] -> the shown ones, most urgent first: those inside
 * their warning window (soonest first), then the rest by date; count-ups last.
 */
function homeCountdownOrder(items) {
  const live = (items || []).filter(x => x && x.w && x.c && !x.c.hidden && !x.c.past && x.w.date);
  const rank = (x) => (x.w.type === 'countup' ? 2 : x.c.warn ? 0 : 1);
  return live.slice().sort((a, b) => (rank(a) - rank(b)) || String(a.w.date).localeCompare(String(b.w.date)) || String(a.w.label || '').localeCompare(String(b.w.label || '')));
}
function _hcdList() {
  const types = typeof TB_TYPES !== 'undefined' ? TB_TYPES : {};
  const items = tbList().filter(w => w && types[w.type] && types[w.type].dated).map(w => {
    let c = null;
    try { c = tbCompute(w); } catch (e) { c = null; }
    return { w, c };
  });
  return homeCountdownOrder(items);
}
/** "1" + "day", "72" + "days", "Today" + "": the hero's words for a tbCompute result. */
function _hcdAmount(c) {
  const num = String(c.num == null ? '' : c.num);
  const u = String(c.unit || '');
  const base = u.split(' ')[0], rest = u.slice(base.length);
  const names = _HCD_UNIT[base];
  if (!names) return { num, unit: u };
  return { num, unit: (Number(num) === 1 ? names[0] : names[1]) + rest };
}
function _hcdWhen(w) {
  let s = w.date;
  try { s = new Date(w.date + 'T00:00:00').toLocaleDateString(APP_CONFIG.locale || undefined, { weekday: 'long', day: 'numeric', month: 'short' }); } catch (e) { /* iso */ }
  return s + (w.time ? ' · ' + w.time : '');
}
function _hcdShortWhen(w) {
  return typeof _tbShortDate === 'function' ? _tbShortDate(w.date, true) : w.date;
}
function _hcdScene(w) {
  let type = 'deadline';
  try {
    if (typeof animClassify === 'function' && typeof _animOpts === 'function') {
      const r = animClassify({ kind: 'task', id: 'cd:' + w.id, title: w.label || '', tags: [], stream: '', priority: 'p0' }, _animOpts());
      if (r && r.type && r.type !== 'task') type = r.type;
    }
  } catch (e) { /* the deadline scene */ }
  return homeScene(type, { size: 'md' });
}
function _hcdColor(w) {
  const a = typeof tbColorAttrs === 'function' ? tbColorAttrs(w.color) : { cls: '', style: '' };
  return { cls: a.cls || '', style: a.style || '' };
}
function _hcdBar(c) {
  if (c.pct === null || c.pct === undefined) return '';
  const p = Math.max(0, Math.min(100, Number(c.pct) || 0));
  return `<span class="hcd-bar" aria-hidden="true"><i style="--pct:${p}%"></i></span>`;
}

function _hcdRender(el, ctx) {
  const list = _hcdList();
  const canEdit = typeof openTopbarCustomiser === 'function';
  if (!list.length) {
    if (!ctx.editing) return false;
    const box = document.createElement('section'); box.className = 'card home-card hcd';
    box.innerHTML = `<div class="card-h">${icon('timer')}<h3>Countdowns</h3></div><div class="card-b"><div class="hs-emp">${homeScene('deadline', { size: 'lg' })}<h4>Add a date to count down to</h4><p>A deadline, a trip or a launch: it shows here and in the top bar.</p></div></div>`;
    el.appendChild(box);
    return true;
  }
  const card = document.createElement('section');
  card.className = 'card home-card hcd is-' + (ctx.size === 'm' ? 'grid' : 'list');
  card.innerHTML = `<div class="card-h">${icon('timer')}<h3>Countdowns</h3><span class="n num">${esc(list.length)}</span><span class="spacer"></span>`
    + (canEdit ? `<button type="button" class="btn btn-ghost btn-sm" data-act="edit"><span>Edit</span>${icon('pencil')}</button>` : '') + `</div><div class="card-b hcd-b"></div>`;
  el.appendChild(card);
  const body = card.querySelector('.hcd-b');
  if (ctx.size === 'm') {
    const shown = list.slice(0, 4);
    body.innerHTML = `<div class="hcd-grid">${shown.map((x, i) => _hcdCardHtml(x, i === 0)).join('')}</div>` + _hcdMore(list.length - shown.length, canEdit);
  } else {
    const [hero, ...rest] = list;
    const rows = rest.slice(0, 4);
    body.innerHTML = _hcdHeroHtml(hero) + (rows.length ? `<div class="hcd-rows">${rows.map(_hcdRowHtml).join('')}</div>` : '') + _hcdMore(rest.length - rows.length, canEdit);
  }
  homeGrowEntering(card, 'countdowns', ctx.firstPaint);
  card.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act], [data-cd]');
    if (!t || !card.contains(t)) return;
    if (t.dataset.act === 'edit' || t.dataset.act === 'more') { if (canEdit) openTopbarCustomiser({}); return; }
    if (t.dataset.cd) {
      if (typeof openCountdownEditor === 'function') openCountdownEditor(t.dataset.cd);
      else if (canEdit) openTopbarCustomiser({ select: t.dataset.cd });
    }
  });
  card.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-cd]')) { e.preventDefault(); e.target.click(); }
  });
  ctx.enterNew(body.querySelectorAll('[data-cd]'), (x) => x.dataset.cd);
  if (typeof animActivate === 'function') requestAnimationFrame(() => { if (card.isConnected) animActivate(card); });
  return true;
}
function _hcdMore(n, canEdit) {
  return n > 0 ? `<button type="button" class="hcd-more" data-act="more"${canEdit ? '' : ' disabled'}>+${n} more</button>` : '';
}
function _hcdHeroHtml(x) {
  const { w, c } = x;
  const a = _hcdAmount(c), col = _hcdColor(w);
  const say = `${w.label || 'Countdown'}: ${a.num} ${a.unit}, ${_hcdWhen(w)}`;
  return `<div class="hcd-hero ${escAttr(col.cls)}${c.warn ? ' is-warn' : ''} anim-hover-host" role="button" tabindex="0" data-cd="${escAttr(w.id)}" data-flip="${escAttr('cd:' + w.id)}" data-scene-key="${escAttr('cd:' + w.id)}"${col.style ? ` style="${escAttr(col.style)}"` : ''} aria-label="${escAttr(say)}" title="${escAttr(c.tip || '')}">`
    + `<div class="hcd-hero-t"><div class="hcd-big num">${esc(a.num)}${a.unit ? `<small>${esc(a.unit)}</small>` : ''}</div>`
    + `<div class="hcd-l">${esc(w.label || 'Countdown')}</div><div class="hcd-s">${esc(_hcdWhen(w))}</div>${_hcdBar(c)}</div>${_hcdScene(w)}</div>`;
}
function _hcdRowHtml(x) {
  const { w, c } = x;
  const col = _hcdColor(w);
  const say = `${w.label || 'Countdown'}: ${c.num} ${c.unit}, ${_hcdShortWhen(w)}`;
  return `<div class="hcd-row ${escAttr(col.cls)}${c.warn ? ' is-warn' : ''}" role="button" tabindex="0" data-cd="${escAttr(w.id)}" data-flip="${escAttr('cd:' + w.id)}"${col.style ? ` style="${escAttr(col.style)}"` : ''} aria-label="${escAttr(say)}" title="${escAttr(c.tip || '')}">`
    + `<span class="hcd-n num">${esc(c.num)}${c.unit ? `<small>${esc(c.unit)}</small>` : ''}</span>`
    + `<div class="hcd-tt"><div class="hcd-l">${esc(w.label || 'Countdown')}</div><div class="hcd-s"><span>${esc(_hcdShortWhen(w))}</span>${_hcdBar(c)}</div></div></div>`;
}
function _hcdCardHtml(x, first) {
  const { w, c } = x;
  const a = _hcdAmount(c), col = _hcdColor(w);
  const say = `${w.label || 'Countdown'}: ${a.num} ${a.unit}, ${_hcdWhen(w)}`;
  return `<div class="hcd-card ${escAttr(col.cls)}${c.warn ? ' is-warn' : ''}${first ? ' is-first' : ''}" role="button" tabindex="0" data-cd="${escAttr(w.id)}" data-flip="${escAttr('cd:' + w.id)}"${col.style ? ` style="${escAttr(col.style)}"` : ''} aria-label="${escAttr(say)}" title="${escAttr(c.tip || '')}">`
    + `<div class="hcd-big num">${esc(a.num)}${a.unit ? `<small>${esc(a.unit)}</small>` : ''}</div>`
    + `<div class="hcd-l">${esc(w.label || 'Countdown')}</div><div class="hcd-s">${esc(_hcdShortWhen(w))}</div>${_hcdBar(c)}</div>`;
}
